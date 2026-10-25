import type { BaseDocument, BaseNode, BaseRequirement, BaseTerm } from '../types/base'

/**
 * Walidator dokumentu v2. Nie ma zależności runtime - ten sam kod działa
 * w aplikacji (szybki fail przy złym `base.json`) i w skrypcie
 * `bun run validate`.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}$/
const NODE_ID = /^n:.+/
const TERM_ID = /^t:.+/

const NODE_TYPES = new Set(['subject', 'group', 'activity', 'stage', 'milestone'])
const REQUIREMENT_KINDS = new Set(['min-total', 'min-each', 'min-node', 'manual'])
const TERM_KINDS = new Set([
  'lecture',
  'lab',
  'colloquium',
  'project-stage',
  'project-deadline',
  'exam',
  'other',
])
const WEEK_KINDS = new Set(['teaching', 'break', 'exam'])

function isDate(value: unknown): value is string {
  return typeof value === 'string' && DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && TIME.test(value)
}

function addDays(value: string, days: number): string {
  return new Date(Date.parse(`${value}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

export function validateBaseDocument(input: unknown): string[] {
  const errors: string[] = []
  const doc = input as Partial<BaseDocument>

  if (!doc || typeof doc !== 'object') return ['dokument nie jest obiektem']
  if (doc.schemaVersion !== 2) errors.push('schemaVersion musi być 2')
  if (!doc.meta?.timeZone) errors.push('meta.timeZone jest wymagane')
  if (!doc.meta?.source) errors.push('meta.source jest wymagane')

  const semester = doc.semester
  if (!semester) {
    errors.push('brak semester')
    return errors
  }
  if (!isDate(semester.startsAt) || !isDate(semester.endsAt)) {
    errors.push('semester.startsAt/endsAt muszą być datami YYYY-MM-DD')
  }

  /* ------------------------------------------------------------------ */
  /* Tygodnie                                                            */
  /* ------------------------------------------------------------------ */

  const weeks = semester.weeks ?? []
  if (!weeks.length) errors.push('semester.weeks jest puste')
  let previousEnd: string | null = null
  const weekNumbers = new Set<number>()
  for (const [index, week] of weeks.entries()) {
    const path = `semester.weeks[${index}]`
    if (!isDate(week.from) || !isDate(week.to)) errors.push(`${path}: nieprawidłowa data`)
    if (week.from > week.to) errors.push(`${path}: from > to`)
    if (!WEEK_KINDS.has(week.kind)) errors.push(`${path}: nieznany kind ${week.kind}`)
    if (week.kind === 'teaching') {
      if (week.no == null) errors.push(`${path}: teaching bez numeru tygodnia`)
      else if (weekNumbers.has(week.no)) errors.push(`${path}: duplikat tygodnia ${week.no}`)
      else weekNumbers.add(week.no)
    } else if (week.no != null) {
      errors.push(`${path}: ${week.kind} nie powinien mieć numeru tygodnia`)
    }
    if (previousEnd) {
      const expected = addDays(previousEnd, 1)
      if (week.from !== expected) {
        errors.push(`${path}: luka/nakładanie się tygodni (oczekiwano ${expected}, jest ${week.from})`)
      }
    }
    previousEnd = week.to
  }
  if (weeks.length) {
    if (weeks[0]!.from !== semester.startsAt) {
      errors.push('semester.weeks nie zaczynają się w semester.startsAt')
    }
    if (weeks[weeks.length - 1]!.to !== semester.endsAt) {
      errors.push('semester.weeks nie kończą się w semester.endsAt')
    }
  }

  /* ------------------------------------------------------------------ */
  /* Prowadzący i skale                                                  */
  /* ------------------------------------------------------------------ */

  const teacherIds = new Set<string>()
  for (const teacher of doc.teachers ?? []) {
    if (!teacher.id) errors.push('teacher bez id')
    else if (teacherIds.has(teacher.id)) errors.push(`duplikat prowadzącego ${teacher.id}`)
    else teacherIds.add(teacher.id)
  }

  const scaleIds = new Set(Object.keys(doc.gradeScales ?? {}))
  for (const [id, scale] of Object.entries(doc.gradeScales ?? {})) {
    if (!scale.rows?.length) errors.push(`skala ${id} bez rows`)
    if (typeof scale.passing !== 'number') errors.push(`skala ${id} bez passing`)
    let previousMin = Infinity
    for (const [index, row] of (scale.rows ?? []).entries()) {
      if (typeof row.min !== 'number' || !row.grade) errors.push(`skala ${id}.rows[${index}] nieprawidłowy`)
      if (row.min >= previousMin) errors.push(`skala ${id}.rows nie są malejąco`)
      previousMin = row.min
    }
  }

  /* ------------------------------------------------------------------ */
  /* Drzewo                                                              */
  /* ------------------------------------------------------------------ */

  const nodeIds = new Set<string>()
  const requirementIds = new Set<string>()
  const nodesBySubject = new Map<string, Map<string, BaseNode>>()

  const walkNode = (
    node: BaseNode,
    subjectId: string,
    path: string,
    parent: BaseNode | null,
    subjectNodes: Map<string, BaseNode>,
  ) => {
    if (!node.id || !NODE_ID.test(node.id)) errors.push(`${path}: id węzła musi mieć prefiks n:`)
    else if (nodeIds.has(node.id)) errors.push(`${path}: duplikat id ${node.id}`)
    else {
      nodeIds.add(node.id)
      subjectNodes.set(node.id, node)
    }
    if (!NODE_TYPES.has(node.type)) errors.push(`${path}: nieznany type ${node.type}`)
    if (node.type === 'subject') {
      if (parent) errors.push(`${path}: subject tylko w korzeniu`)
    } else if (!node.name) {
      errors.push(`${path}: brak name`)
    }
    if (node.type === 'group') {
      if (!node.children?.length) errors.push(`${path}: grupa bez dzieci`)
      if (node.max != null) errors.push(`${path}: grupa nie może mieć max (liczone z dzieci)`)
    }
    if ((node.type === 'activity' || node.type === 'stage') && !node.children?.length) {
      if (typeof node.max !== 'number' || node.max < 0) errors.push(`${path}: ${node.type} bez max`)
    }
    if (node.type === 'milestone' && node.max != null && node.max !== 0) {
      errors.push(`${path}: milestone nie powinien mieć punktów`)
    }
    if (node.weight != null && (typeof node.weight !== 'number' || node.weight < 0)) {
      errors.push(`${path}: weight musi być >= 0`)
    }

    for (const [index, requirement] of (node.requirements ?? []).entries()) {
      const requirementPath = `${path}.requirements[${index}]`
      if (!requirement.id) errors.push(`${requirementPath}: brak id`)
      else if (requirementIds.has(requirement.id)) {
        errors.push(`${requirementPath}: duplikat id ${requirement.id}`)
      } else requirementIds.add(requirement.id)
      if (!REQUIREMENT_KINDS.has(requirement.kind)) {
        errors.push(`${requirementPath}: nieznany kind ${requirement.kind}`)
      }
      if (requirement.kind === 'min-total') {
        if (node.type !== 'subject') errors.push(`${requirementPath}: min-total tylko na korzeniu`)
        if (requirement.threshold != null) {
          errors.push(`${requirementPath}: min-total nie ma własnego threshold`)
        }
      } else if (requirement.kind !== 'manual' && typeof requirement.threshold !== 'number') {
        errors.push(`${requirementPath}: brak threshold`)
      }
      if (requirement.targetId) {
        if (!NODE_ID.test(requirement.targetId)) {
          errors.push(`${requirementPath}: targetId bez prefiksu n:`)
        } else if (requirement.targetId === node.id) {
          errors.push(`${requirementPath}: targetId wskazuje na siebie`)
        }
      }
    }

    const childIds = new Set<string>()
    for (const [index, child] of (node.children ?? []).entries()) {
      if (childIds.has(child.id)) errors.push(`${path}: duplikat dziecka ${child.id}`)
      childIds.add(child.id)
      walkNode(child, subjectId, `${path}/${child.id}`, node, subjectNodes)
    }
  }

  for (const subject of doc.subjects ?? []) {
    const subjectPath = `subjects[${subject.id}]`
    if (!subject.id) errors.push('subject bez id')
    if (!scaleIds.has(subject.gradeScaleId)) {
      errors.push(`${subjectPath}: nieznana skala ${subject.gradeScaleId}`)
    }    if (!subject.tree) {
      errors.push(`${subjectPath}: brak tree`)
      continue
    }
    if (subject.tree.id !== `n:${subject.id}`) {
      errors.push(`${subjectPath}: korzeń musi mieć id n:${subject.id}`)
    }
    if (subject.tree.type !== 'subject') errors.push(`${subjectPath}: korzeń musi mieć type subject`)
    const subjectNodes = new Map<string, BaseNode>()
    nodesBySubject.set(subject.id, subjectNodes)
    walkNode(subject.tree, subject.id, `${subjectPath}.tree`, null, subjectNodes)
    for (const teacher of subject.teachers ?? []) {
      if (!teacherIds.has(teacher.id)) errors.push(`${subjectPath}: nieznany prowadzący ${teacher.id}`)
    }
  }

  // Referencje wymagań sprawdzamy po zbudowaniu mapy węzłów.
  for (const subject of doc.subjects ?? []) {    const subjectNodes = nodesBySubject.get(subject.id)
    if (!subjectNodes) continue
    const walk = (node: BaseNode) => {
      for (const requirement of node.requirements ?? []) {
        if (!requirement.targetId) continue
        if (!subjectNodes.has(requirement.targetId)) {
          errors.push(`subjects[${subject.id}]: wymaganie ${requirement.id} wskazuje poza przedmiot`)
        }
      }
      for (const child of node.children ?? []) walk(child)
    }
    walk(subject.tree)
  }

  /* ------------------------------------------------------------------ */
  /* Terminy                                                             */
  /* ------------------------------------------------------------------ */

  const termIds = new Set<string>()
  const termKeys = new Set<string>()
  for (const [index, term] of (doc.terms ?? []).entries()) {
    const path = `terms[${index}]`
    if (!term.id || !TERM_ID.test(term.id)) errors.push(`${path}: id terminu musi mieć prefiks t:`)
    else if (termIds.has(term.id)) errors.push(`${path}: duplikat id ${term.id}`)
    else termIds.add(term.id)
    if (!doc.subjects?.some((subject) => subject.id === term.subjectId)) {
      errors.push(`${path}: nieznany subjectId ${term.subjectId}`)
    }
    const subjectNodes = nodesBySubject.get(term.subjectId)
    if (term.nodeId) {
      if (!NODE_ID.test(term.nodeId)) errors.push(`${path}: nodeId bez prefiksu n:`)
      else if (!subjectNodes?.has(term.nodeId)) errors.push(`${path}: nieznany nodeId ${term.nodeId}`)
    }
    if (!TERM_KINDS.has(term.kind)) errors.push(`${path}: nieznany kind ${term.kind}`)
    if (!isDate(term.date)) errors.push(`${path}: nieprawidłowa data`)
    else if (term.date < semester.startsAt || term.date > semester.endsAt) {
      errors.push(`${path}: data poza semestrem`)
    }
    if (term.start != null && !isTime(term.start)) errors.push(`${path}: nieprawidłowy start`)
    if (term.end != null && !isTime(term.end)) errors.push(`${path}: nieprawidłowy end`)
    if (term.due != null && !isTime(term.due)) errors.push(`${path}: nieprawidłowy due`)
    if (term.start && term.due) errors.push(`${path}: start i due jednocześnie`)
    if (!term.start && !term.due) errors.push(`${path}: brak start/due`)
    if (term.attempt != null && ![1, 2].includes(term.attempt)) {
      errors.push(`${path}: attempt musi być 1 lub 2`)
    }
    if (term.nodeId) {
      const node = subjectNodes?.get(term.nodeId)
      if (term.graded) {
        const key = `${term.nodeId}|${term.attempt ?? 1}`
        if (termKeys.has(key)) errors.push(`${path}: duplikat ocenianego terminu dla ${key}`)
        termKeys.add(key)
        if (!node || node.children?.length) {
          errors.push(`${path}: graded musi wskazywać liść`)
        } else if (!node.max || node.max <= 0) {
          errors.push(`${path}: graded liść bez punktów`)
        }
      }
    } else if (term.graded) {
      errors.push(`${path}: graded bez nodeId`)
    }
  }

  /* ------------------------------------------------------------------ */
  /* Postęp                                                              */
  /* ------------------------------------------------------------------ */

  const nodeOwner = new Map<string, BaseNode>()
  for (const subjectNodes of nodesBySubject.values()) {
    for (const [id, node] of subjectNodes) nodeOwner.set(id, node)
  }
  for (const [id, entry] of Object.entries(doc.progress ?? {})) {
    const node = nodeOwner.get(id)
    if (!node) {
      errors.push(`progress.${id}: nieznany węzeł`)
      continue
    }
    if (node.children?.length) errors.push(`progress.${id}: postęp tylko na liściach`)
    if (typeof entry.earned !== 'number' || entry.earned < 0) {
      errors.push(`progress.${id}: earned musi być >= 0`)
    } else if (node.max != null && entry.earned > node.max) {
      errors.push(`progress.${id}: earned ${entry.earned} > max ${node.max}`)
    }
  }

  return errors
}

export function assertBaseDocument(input: unknown): asserts input is BaseDocument {
  const errors = validateBaseDocument(input)
  if (errors.length) {
    throw new Error(`base.json (v2) jest nieprawidłowy:\n- ${errors.join('\n- ')}`)
  }
}
