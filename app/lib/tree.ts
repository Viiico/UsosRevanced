import type { GradeNode, NodeProgress } from '~/types'

/** Liście z punktami; kamienie milowe (max = 0) nie wchodzą do rachunku. */
export function collectPointLeaves(node: GradeNode): GradeNode[] {
  const out: GradeNode[] = []
  const walk = (n: GradeNode) => {
    if (n.children?.length) {
      n.children.forEach(walk)
      return
    }
    if (n.points && n.points.max > 0) out.push(n)
  }
  walk(node)
  return out
}

export function findNode(root: GradeNode, id: string): GradeNode | null {
  if (root.id === id) return root
  for (const child of root.children ?? []) {
    const hit = findNode(child, id)
    if (hit) return hit
  }
  return null
}

export function findPath(root: GradeNode, id: string): GradeNode[] {
  if (root.id === id) return [root]
  for (const child of root.children ?? []) {
    const path = findPath(child, id)
    if (path.length) return [root, ...path]
  }
  return []
}

export function collectNodeIds(node: GradeNode): string[] {
  return [node.id, ...(node.children ?? []).flatMap(collectNodeIds)]
}

/**
 * Liść: earned / max. Węzeł z dziećmi: średnia ważona, więc dziecko z wagą 0
 * (np. etap organizacyjny) nie zaniża wyniku.
 */
export function computeProgress(node: GradeNode): NodeProgress {
  const leaves = collectPointLeaves(node)
  const earned = leaves.reduce((sum, leaf) => sum + (leaf.points?.earned ?? 0), 0)
  const max = leaves.reduce((sum, leaf) => sum + (leaf.points?.max ?? 0), 0)
  const gradedLeaves = leaves.filter((leaf) => leaf.points?.earned != null).length

  const children = (node.children ?? []).filter((child) => child.weight > 0)
  let ratio: number

  if (children.length) {
    const weightSum = children.reduce((sum, child) => sum + child.weight, 0)
    ratio =
      weightSum > 0
        ? children.reduce((sum, child) => sum + child.weight * computeProgress(child).ratio, 0) /
          weightSum
        : 0
  } else if (node.points && node.points.max > 0) {
    ratio = (node.points.earned ?? 0) / node.points.max
  } else {
    ratio = node.points?.earned != null ? 1 : 0
  }

  return {
    ratio: Math.min(1, Math.max(0, ratio)),
    earned,
    max,
    gradedLeaves,
    totalLeaves: leaves.length,
    complete: leaves.length > 0 && gradedLeaves === leaves.length,
  }
}
