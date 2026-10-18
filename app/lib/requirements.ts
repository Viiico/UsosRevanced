import type {
  EvaluatedRequirement,
  GradeNode,
  GradeScaleRow,
  Requirement,
  Term,
} from '~/types'
import { collectPointLeaves, computeProgress, findNode } from '~/lib/tree'

export function gradeForPoints(points: number, scale: GradeScaleRow[]): GradeScaleRow {
  const sorted = [...scale].sort((a, b) => b.min - a.min)
  return sorted.find((row) => points >= row.min) ?? sorted[sorted.length - 1]!
}

export function nextGradeThreshold(points: number, scale: GradeScaleRow[]): GradeScaleRow | null {
  const sorted = [...scale].sort((a, b) => a.min - b.min)
  return sorted.find((row) => row.min > points) ?? null
}

function pkt(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)} pkt`
}

function evaluateOne(
  requirement: Requirement,
  currentNode: GradeNode,
  root: GradeNode,
): EvaluatedRequirement {
  if (requirement.kind === 'manual') {
    return { ...requirement, status: 'info' }
  }

  const threshold = requirement.threshold ?? 0

  if (requirement.kind === 'min-each') {
    const target = findNode(root, requirement.targetNodeId ?? currentNode.id) ?? currentNode
    const leaves = collectPointLeaves(target)
    const graded = leaves.filter((leaf) => leaf.points?.earned != null)

    if (!leaves.length) {
      return { ...requirement, status: 'pending', detail: 'brak elementów do oceny' }
    }

    const failing = graded.filter((leaf) => (leaf.points?.earned ?? 0) < threshold)
    const lowest = graded.length
      ? Math.min(...graded.map((leaf) => leaf.points?.earned ?? 0))
      : null

    if (failing.length) {
      const names = failing.map((leaf) => leaf.short ?? leaf.name).join(', ')
      return {
        ...requirement,
        status: 'failed',
        detail: `poniżej progu: ${names}`,
      }
    }

    if (graded.length < leaves.length) {
      return {
        ...requirement,
        status: 'pending',
        detail: `${graded.length} z ${leaves.length} ocenionych${
          lowest != null ? ` · min. ${pkt(lowest)}` : ''
        }`,
      }
    }

    return {
      ...requirement,
      status: 'met',
      detail: `min. ${pkt(lowest ?? 0)} z ${leaves.length}`,
    }
  }

  const target =
    requirement.kind === 'min-node'
      ? (findNode(root, requirement.targetNodeId ?? currentNode.id) ?? currentNode)
      : currentNode
  const { earned, max } = computeProgress(target)

  if (earned >= threshold) {
    return { ...requirement, status: 'met', detail: `${pkt(earned)} / ${pkt(threshold)}` }
  }
  if (max < threshold) {
    return {
      ...requirement,
      status: 'failed',
      detail: `maksymalnie ${pkt(max)} < ${pkt(threshold)}`,
    }
  }
  return {
    ...requirement,
    status: 'pending',
    detail: `${pkt(earned)} / ${pkt(threshold)} · brakuje ${pkt(threshold - earned)}`,
  }
}

export function evaluateRequirements(
  node: GradeNode,
  root: GradeNode,
): EvaluatedRequirement[] {
  return (node.requirements ?? []).map((req) => evaluateOne(req, node, root))
}

/** Terminy węzła i całego poddrzewa, posortowane po dacie. */
export function termsForNode(node: GradeNode, terms: Term[]): Term[] {
  const nodeIds = new Set<string>()
  const walk = (n: GradeNode) => {
    nodeIds.add(n.id)
    n.children?.forEach(walk)
  }
  walk(node)

  return terms
    .filter((term) => term.nodeId != null && nodeIds.has(term.nodeId))
    .sort((a, b) =>
      a.date === b.date
        ? (a.start ?? '').localeCompare(b.start ?? '')
        : a.date.localeCompare(b.date),
    )
}
