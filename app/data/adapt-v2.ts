import type {
  AppData,
  GradeNode,
  GradeScaleRow,
  Requirement,
  Semester,
  Subject,
  Term,
} from '../types/index'
import type {
  BaseDocument,
  BaseNode,
  BaseRequirement,
  BaseSubject,
  BaseTerm,
} from '../types/base'

/**
 * Adapter v2 → runtime `AppData` (v1).
 *
 * `base.json` jest kanoniczny, ale widoki i edytor nadal czytają stary kształt.
 * Adapter jest jedynym miejscem tej translacji; gdy UI przejdzie na v2, ten
 * plik znika. Dzięki niemu migracja danych nie wymaga przepisywania widoków.
 */

const NODE_PREFIX = 'n:'
const TERM_PREFIX = 't:'

const stripNode = (id: string) => (id.startsWith(NODE_PREFIX) ? id.slice(NODE_PREFIX.length) : id)
const stripTerm = (id: string) => (id.startsWith(TERM_PREFIX) ? id.slice(TERM_PREFIX.length) : id)

const KIND_BY_TYPE: Record<BaseNode['type'], GradeNode['kind']> = {
  subject: 'subject',
  group: 'category',
  activity: 'activity',
  stage: 'stage',
  milestone: 'milestone',
}

const VISUALS = new Set(['lab', 'colloquium', 'project'])

function visualOf(node: BaseNode): GradeNode['visual'] {
  return node.activityKind && VISUALS.has(node.activityKind)
    ? (node.activityKind as GradeNode['visual'])
    : undefined
}

function collectLeaves(node: GradeNode): GradeNode[] {
  if (node.children?.length) return node.children.flatMap(collectLeaves)
  return node.points ? [node] : []
}

function stats(node: GradeNode): { max: number; earned: number | null } {
  const leaves = collectLeaves(node)
  const max = leaves.reduce((sum, leaf) => sum + (leaf.points?.max ?? 0), 0)
  const graded = leaves.filter((leaf) => leaf.points?.earned != null)
  return {
    max,
    earned: graded.length
      ? graded.reduce((sum, leaf) => sum + (leaf.points?.earned ?? 0), 0)
      : null,
  }
}

function weekNoFor(weeks: BaseDocument['semester']['weeks'], date: string): number | undefined {
  for (const week of weeks) {
    if (week.kind === 'teaching' && week.no != null && date >= week.from && date <= week.to) {
      return week.no
    }
  }
  return undefined
}

export function adaptBase(doc: BaseDocument): AppData {
  const nodeById = new Map<string, BaseNode>()
  const subjectByNodeId = new Map<string, BaseSubject>()
  const walk = (node: BaseNode, subject: BaseSubject) => {
    nodeById.set(node.id, node)
    subjectByNodeId.set(node.id, subject)
    for (const child of node.children ?? []) walk(child, subject)
  }
  for (const subject of doc.subjects) walk(subject.tree, subject)

  const teacherById = new Map(doc.teachers.map((teacher) => [teacher.id, teacher]))

  const directTermIds = new Map<string, string[]>()
  for (const term of doc.terms) {
    if (!term.nodeId) continue
    const ids = directTermIds.get(term.nodeId) ?? []
    ids.push(stripTerm(term.id))
    directTermIds.set(term.nodeId, ids)
  }

  function convertRequirement(
    requirement: BaseRequirement,
    scalePassing: number,
  ): Requirement {
    return {
      id: requirement.id,
      kind: requirement.kind,
      label: requirement.label,
      ...(requirement.kind === 'min-total'
        ? { threshold: scalePassing }
        : requirement.threshold != null
          ? { threshold: requirement.threshold }
          : {}),
      ...(requirement.targetId ? { targetNodeId: stripNode(requirement.targetId) } : {}),
      ...(requirement.note ? { note: requirement.note } : {}),
    }
  }

  function convertNode(
    node: BaseNode,
    subject: BaseSubject,
    scalePassing: number,
    isRoot = false,
  ): GradeNode {
    const children = (node.children ?? []).map((child) =>
      convertNode(child, subject, scalePassing),
    )
    const kind = KIND_BY_TYPE[node.type]
    const gradeNode: GradeNode = {
      id: stripNode(node.id),
      kind,
      name: isRoot ? subject.name : (node.name ?? stripNode(node.id)),
      weight: 0,
      ...(node.short ? { short: node.short } : {}),
      ...(visualOf(node) ? { visual: visualOf(node) } : {}),
    }

    if (children.length) {
      gradeNode.children = children
      if (!isRoot) {
        const { max, earned } = stats(gradeNode)
        if (max > 0 || children.some((child) => child.points)) {
          gradeNode.points = { max, earned }
        }
        const termIds = [
          ...(directTermIds.get(node.id) ?? []),
          ...children.flatMap((child) => child.termIds ?? []),
        ]
        if (termIds.length) gradeNode.termIds = termIds
      }
      gradeNode.weight =
        node.weight != null
          ? node.weight
          : children.reduce((sum, child) => sum + child.weight, 0)
    } else {
      const max = node.max ?? 0
      const earned = doc.progress[node.id]?.earned ?? null
      gradeNode.points = { max, earned }
      gradeNode.weight = node.weight != null ? node.weight : max
      const termIds = directTermIds.get(node.id) ?? []
      if (termIds.length) gradeNode.termIds = termIds
    }

    if (node.requirements?.length) {
      gradeNode.requirements = node.requirements.map((requirement) =>
        convertRequirement(requirement, scalePassing),
      )
    }
    if (node.info) gradeNode.info = node.info
    if (node.description) gradeNode.description = node.description
    if (node.assumptionNote) gradeNode.assumption = node.assumptionNote

    return gradeNode
  }

  const subjects: Subject[] = doc.subjects.map((subject) => {
    const scale = doc.gradeScales[subject.gradeScaleId]
    if (!scale) throw new Error(`Brak skali ${subject.gradeScaleId} dla ${subject.id}`)
    const tree = convertNode(subject.tree, subject, scale.passing, true)
    tree.weight = subject.ects
    const gradeScale: GradeScaleRow[] = scale.rows.map((row) => ({
      min: row.min,
      grade: row.grade,
    }))
    return {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      semesterId: doc.semester.id,
      group: subject.group.label,
      teachers: subject.teachers.map((entry) => {
        const teacher = teacherById.get(entry.id)
        return {
          name: teacher?.name ?? entry.id,
          ...(teacher?.email ? { email: teacher.email } : {}),
          ...(teacher?.room ? { room: teacher.room } : {}),
        }
      }),
      demoData: doc.meta.source === 'demo',
      policy: {
        ects: subject.ects,
        totalPoints: stats(tree).max,
        passingPoints: scale.passing,
        gradeScale,
        rules: [...subject.policyNotes],
      },
      tree,
    }
  })

  const terms: Term[] = doc.terms.map((term) => {
    const baseNode = term.nodeId ? nodeById.get(term.nodeId) : undefined
    const nodeMax =
      baseNode && !baseNode.children?.length ? (baseNode.max ?? 0) : null
    return {
      id: stripTerm(term.id),
      subjectId: term.subjectId,
      ...(term.nodeId ? { nodeId: stripNode(term.nodeId) } : {}),
      kind: term.kind as Term['kind'],
      title: term.title,
      date: term.date,
      ...(term.start ? { start: term.start } : {}),
      ...(term.end ? { end: term.end } : {}),
      ...(term.due ? { end: term.due } : {}),
      ...(term.location ? { location: term.location } : {}),
      ...(term.group ? { group: term.group } : {}),
      ...(term.graded && nodeMax && nodeMax > 0 ? { pointsMax: nodeMax } : {}),
      canBeDoneBefore: !term.start,
      ...(term.requirementNote ? { requirement: term.requirementNote } : {}),
      ...(term.notes ? { notes: term.notes } : {}),
      ...(weekNoFor(doc.semester.weeks, term.date) != null
        ? { weekNo: weekNoFor(doc.semester.weeks, term.date) }
        : {}),
    }
  })

  const semester: Semester = {
    id: doc.semester.id,
    code: doc.semester.code,
    name: doc.semester.name,
    academicYear: doc.semester.academicYear,
    startsAt: doc.semester.startsAt,
    endsAt: doc.semester.endsAt,
    ectsTotal: doc.semester.ectsTotal,
  }

  return { version: 2, semester, subjects, terms }
}
