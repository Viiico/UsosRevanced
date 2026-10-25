import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type {
  BaseActivityKind,
  BaseDocument,
  BaseGradeScale,
  BaseNode,
  BaseNodeType,
  BaseRequirement,
  BaseRequirementKind,
  BaseSubject,
  BaseTeacher,
  BaseTerm,
  BaseTermKind,
  BaseWeek,
} from '../app/types/base.ts'

/**
 * Migracja `base.json` v1 → v2.
 *
 * Użycie:
 *   bun scripts/migrate-v1-to-v2.ts [wejście] [wyjście]
 *
 * Domyślnie czyta `.tmp/base.v1.json` i zapisuje `app/data/base.json`.
 * Skrypt jest jednorazowy, ale trzymany w repo, żeby dało się odtworzyć
 * migrację z historii git.
 */

type V1Node = {
  id: string
  kind: string
  name: string
  short?: string
  visual?: string
  weight: number
  points?: { max: number; earned: number | null }
  requirements?: V1Requirement[]
  children?: V1Node[]
  termIds?: string[]
  info?: string
  description?: string
  assumption?: string
}

type V1Requirement = {
  id: string
  kind: BaseRequirementKind
  label: string
  threshold?: number
  targetNodeId?: string
  note?: string
}

type V1Term = {
  id: string
  subjectId: string
  nodeId?: string
  kind: string
  title: string
  date: string
  start?: string
  end?: string
  location?: string
  group?: string
  pointsMax?: number
  canBeDoneBefore?: boolean
  requirement?: string
  notes?: string
  weekNo?: number
}

type V1Subject = {
  id: string
  code: string
  name: string
  semesterId: string
  group?: string
  teachers: { name: string; email?: string; room?: string }[]
  policy: {
    ects: number
    totalPoints: number
    passingPoints: number
    gradeScale: { min: number; grade: string }[]
    rules: string[]
  }
  tree: V1Node
  demoData?: boolean
}

type V1Document = {
  version: number
  semester: {
    id: string
    code: string
    name: string
    academicYear: string
    startsAt: string
    endsAt: string
  }
  subjects: V1Subject[]
  terms: V1Term[]
}

const inputPath = resolve(process.argv[2] ?? '.tmp/base.v1.json')
const outputPath = resolve(process.argv[3] ?? 'app/data/base.json')

const v1 = JSON.parse(await readFile(inputPath, 'utf8')) as V1Document

const DAY = 86_400_000

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`)
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(value: string, days: number): string {
  return formatDate(new Date(parseDate(value).getTime() + days * DAY))
}

function mondayOf(value: string): string {
  const date = parseDate(value)
  const offset = (date.getUTCDay() + 6) % 7
  return formatDate(new Date(date.getTime() - offset * DAY))
}

function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / DAY)
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function surnameId(name: string): string {
  const parts = name.replace(/\./g, '').split(/\s+/).filter(Boolean)
  return slug(parts[parts.length - 1] ?? name)
}

function nodeId(id: string): string {
  return `n:${id}`
}

function termId(id: string): string {
  return `t:${id}`
}

/* ------------------------------------------------------------------ */
/* Prowadzący                                                          */
/* ------------------------------------------------------------------ */

const teachers: BaseTeacher[] = []
const teacherIdByName = new Map<string, string>()
const usedTeacherIds = new Set<string>()

for (const subject of v1.subjects) {
  for (const teacher of subject.teachers) {
    if (teacherIdByName.has(teacher.name)) continue
    const base = surnameId(teacher.name)
    let id = base
    let suffix = 2
    while (usedTeacherIds.has(id)) id = `${base}-${suffix++}`
    usedTeacherIds.add(id)
    teacherIdByName.set(teacher.name, id)
    teachers.push({
      id,
      name: teacher.name,
      ...(teacher.email ? { email: teacher.email } : {}),
      ...(teacher.room ? { room: teacher.room } : {}),
    })
  }
}

/* ------------------------------------------------------------------ */
/* Skale ocen                                                          */
/* ------------------------------------------------------------------ */

const scaleSignature = (rows: { min: number; grade: string }[]) =>
  JSON.stringify(rows.map((row) => [row.min, row.grade]))

const signatureCount = new Map<string, number>()
for (const subject of v1.subjects) {
  const signature = scaleSignature(subject.policy.gradeScale)
  signatureCount.set(signature, (signatureCount.get(signature) ?? 0) + 1)
}
const mostCommonSignature = [...signatureCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

const gradeScales: Record<string, BaseGradeScale> = {}
const scaleIdBySignature = new Map<string, string>()

for (const subject of v1.subjects) {
  const signature = scaleSignature(subject.policy.gradeScale)
  if (scaleIdBySignature.has(signature)) continue
  const id = signature === mostCommonSignature ? 'standard' : subject.id
  scaleIdBySignature.set(signature, id)
  gradeScales[id] = {
    passing: subject.policy.passingPoints,
    rows: subject.policy.gradeScale.map((row) => ({ min: row.min, grade: String(row.grade) })),
  }
}

/* ------------------------------------------------------------------ */
/* Drzewo                                                              */
/* ------------------------------------------------------------------ */

type TypeMap = {
  type: BaseNodeType
  activityKind?: BaseActivityKind
}

function nodeType(node: V1Node): TypeMap {
  switch (node.kind) {
    case 'subject':
      return { type: 'subject' }
    case 'category':
      return { type: 'group' }
    case 'stage':
      return { type: 'stage', activityKind: 'project' }
    case 'milestone':
      return { type: 'milestone' }
    case 'activity':
    default: {
      if (node.visual === 'lab') return { type: 'activity', activityKind: 'lab' }
      if (node.visual === 'colloquium') return { type: 'activity', activityKind: 'colloquium' }
      if (node.visual === 'project') return { type: 'activity', activityKind: 'project' }
      if (/lab|laborator/i.test(node.name)) return { type: 'activity', activityKind: 'lab' }
      if (/kolokwium|sprawdzian|egzamin/i.test(node.name)) {
        return { type: 'activity', activityKind: 'colloquium' }
      }
      if (/projekt/i.test(node.name)) return { type: 'activity', activityKind: 'project' }
      return { type: 'activity' }
    }
  }
}

type RequirementEntry = {
  node: BaseNode
  requirement: BaseRequirement
  key: string
  depth: number
}

const requirementEntries: RequirementEntry[] = []

function convertNode(
  old: V1Node,
  subject: V1Subject,
  depth: number,
  isRoot = false,
): BaseNode {
  const mapped = nodeType(old)
  const children = (old.children ?? []).map((child) =>
    convertNode(child, subject, depth + 1, false),
  )
  const node: BaseNode = {
    id: nodeId(old.id),
    type: mapped.type,
    ...(mapped.activityKind ? { activityKind: mapped.activityKind } : {}),
    ...(isRoot ? {} : { name: old.name }),
  }
  if (!isRoot && old.short) node.short = old.short
  // Grupa dziedziczy rodzaj zajęć z v1 `visual`, żeby UI nadal miało ikonę
  // i odmianę podsumowania, zanim wyliczy je z typu.
  if (mapped.type === 'group' && old.visual) {
    node.activityKind = old.visual as BaseActivityKind
  }

  // Maksimum trzymamy tylko na liściach ocenianych; grupy liczą z dzieci.
  if (!children.length && mapped.type !== 'milestone' && old.points) {
    node.max = old.points.max
  }

  const requirements = (old.requirements ?? []).map((requirement) => {
    const resolvedTarget = requirement.targetNodeId ?? old.id
    const base: BaseRequirement = {
      id: requirement.id,
      kind: requirement.kind,
      label: requirement.label,
      ...(requirement.note ? { note: requirement.note } : {}),
    }
    if (requirement.kind !== 'min-total' && requirement.threshold != null) {
      base.threshold = requirement.threshold
    }
    if (resolvedTarget !== old.id) base.targetId = nodeId(resolvedTarget)

    const key =
      requirement.kind === 'manual' || requirement.kind === 'min-total'
        ? `${requirement.kind}|${requirement.label}|${resolvedTarget}`
        : `${requirement.kind}|${requirement.threshold ?? ''}|${resolvedTarget}`

    requirementEntries.push({ node, requirement: base, key, depth })
    return base
  })
  if (requirements.length) node.requirements = requirements
  if (children.length) node.children = children

  if (old.info) node.info = old.info
  if (old.description) node.description = old.description
  if (old.assumption) node.assumptionNote = old.assumption

  return node
}

const subjects: BaseSubject[] = v1.subjects.map((subject) => {
  const tree = convertNode(subject.tree, subject, 0, true)
  const groupCode = /Lab\s+(\d+)/i.exec(subject.group ?? '')?.[1] ?? ''
  return {
    id: subject.id,
    code: subject.code,
    name: subject.name,
    ects: subject.policy.ects,
    gradeScaleId: scaleIdBySignature.get(scaleSignature(subject.policy.gradeScale))!,
    group: { code: groupCode, label: subject.group ?? '' },
    teachers: subject.teachers.map((teacher) => ({
      id: teacherIdByName.get(teacher.name)!,
      role: 'teacher',
    })),
    policyNotes: [...subject.policy.rules],
    tree,
  }
})

// Deduplikacja wymagań: ten sam warunek na przodku i potomku zostaje tylko
// w głębszym węźle (poza min-total, które jest warunkiem przedmiotu).
const entriesByKey = new Map<string, RequirementEntry[]>()
for (const entry of requirementEntries) {
  const list = entriesByKey.get(entry.key) ?? []
  list.push(entry)
  entriesByKey.set(entry.key, list)
}

const dropped = new Set<BaseRequirement>()
for (const [key, list] of entriesByKey) {
  if (list.length < 2) continue
  if (key.startsWith('min-total|')) continue
  list.sort((a, b) => b.depth - a.depth)
  for (const entry of list.slice(1)) dropped.add(entry.requirement)
}

function pruneRequirements(node: BaseNode) {
  if (node.requirements) {
    const kept = node.requirements.filter((requirement) => !dropped.has(requirement))
    if (kept.length) node.requirements = kept
    else delete node.requirements
  }
  for (const child of node.children ?? []) pruneRequirements(child)
}
for (const subject of subjects) pruneRequirements(subject.tree)

/* ------------------------------------------------------------------ */
/* Terminy                                                             */
/* ------------------------------------------------------------------ */

const TERM_KINDS = new Set<BaseTermKind>([
  'lecture',
  'lab',
  'colloquium',
  'project-stage',
  'project-deadline',
  'exam',
  'other',
])

const terms: BaseTerm[] = v1.terms.map((term) => {
  const starts = term.start?.trim()
  const ends = term.end?.trim()
  const kind = TERM_KINDS.has(term.kind as BaseTermKind)
    ? (term.kind as BaseTermKind)
    : 'other'
  const base: BaseTerm = {
    id: termId(term.id),
    subjectId: term.subjectId,
    ...(term.nodeId ? { nodeId: nodeId(term.nodeId) } : {}),
    kind,
    title: term.title,
    date: term.date,
  }
  if (starts) {
    base.start = starts
    if (ends) base.end = ends
  } else {
    base.due = ends || '23:59'
  }
  if (term.location) base.location = term.location
  if (term.group) base.group = term.group
  if (term.pointsMax != null && term.pointsMax > 0) base.graded = true
  if (/retake|poprawk/i.test(term.id) || /poprawk/i.test(term.title)) base.attempt = 2
  if (term.requirement) base.requirementNote = term.requirement
  if (term.notes) base.notes = term.notes
  return base
})

/* ------------------------------------------------------------------ */
/* Postęp                                                              */
/* ------------------------------------------------------------------ */

const progress: BaseDocument['progress'] = {}
for (const subject of v1.subjects) {
  const walk = (node: V1Node) => {
    if (!node.children?.length && node.points?.earned != null) {
      progress[nodeId(node.id)] = { earned: node.points.earned }
    }
    for (const child of node.children ?? []) walk(child)
  }
  walk(subject.tree)
}

/* ------------------------------------------------------------------ */
/* Kalendarz                                                           */
/* ------------------------------------------------------------------ */

const weekStarts = new Map<number, string>()
for (const term of v1.terms) {
  if (term.weekNo == null) continue
  const monday = mondayOf(term.date)
  const existing = weekStarts.get(term.weekNo)
  if (!existing || monday < existing) weekStarts.set(term.weekNo, monday)
}

const weeks: BaseWeek[] = []
let previousEnd: string | null = null
for (const [no, monday] of [...weekStarts.entries()].sort((a, b) => a[0] - b[0])) {
  if (previousEnd && daysBetween(previousEnd, monday) > 1) {
    weeks.push({ from: addDays(previousEnd, 1), to: addDays(monday, -1), kind: 'break' })
  }
  const end = addDays(monday, 6)
  weeks.push({ no, from: monday, to: end, kind: 'teaching' })
  previousEnd = end
}
if (previousEnd && previousEnd < v1.semester.endsAt) {
  weeks.push({ from: addDays(previousEnd, 1), to: v1.semester.endsAt, kind: 'exam' })
}

/* ------------------------------------------------------------------ */
/* Dokument                                                            */
/* ------------------------------------------------------------------ */

const allDemo = v1.subjects.every((subject) => subject.demoData !== false)

const document: BaseDocument = {
  schemaVersion: 2,
  meta: {
    updatedAt: new Date().toISOString(),
    source: allDemo ? 'demo' : 'syllabus',
    timeZone: 'Europe/Warsaw',
  },
  semester: {
    ...v1.semester,
    weeks,
    dayOverrides: [],
  },
  gradeScales,
  subjects,
  teachers,
  terms,
  progress,
}

await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8')

console.log(`zapisano ${outputPath}`)
console.log(
  `przedmioty=${subjects.length} węzły=${subjects.reduce((n, s) => n + countNodes(s.tree), 0)} terminy=${terms.length} prowadzący=${teachers.length} skale=${Object.keys(gradeScales).length} postęp=${Object.keys(progress).length}`,
)
console.log(`wymagania: usunięto ${dropped.size} duplikatów, tygodnie=${weeks.length}`)

function countNodes(node: BaseNode): number {
  return 1 + (node.children ?? []).reduce((sum, child) => sum + countNodes(child), 0)
}
