import type { GradeNode, NodeProgress, Term, TermStatus } from '~/types'
import { collectNodeIds, computeProgress, effectiveWeight, findNode, findPath } from '~/lib/tree'
import { evaluateRequirements, gradeForPoints, termsForNode } from '~/lib/requirements'

export interface ProgressSegment {
  id: string
  label: string
  ratio: number
  weight: number
  earned: number
  max: number
  colorIndex: number
}

/**
 * Stan widoku „Oceny”. Wybrany węzeł trzymamy w query, żeby wrócić do niego
 * z innej zakładki i móc podlinkować widok.
 */
export function useGrades() {
  const route = useRoute()
  const router = useRouter()
  const data = useAppData()

  const root = computed<GradeNode>(() => ({
    id: data.semester.id,
    kind: 'semester',
    name: `${data.semester.name} ${data.semester.code}`,
    weight: 1,
    children: data.subjects.map((subject) => subject.tree),
  }))

  const currentId = computed(() => {
    const raw = route.query.node
    const value = Array.isArray(raw) ? raw[0] : raw
    return value && findNode(root.value, value) ? value : root.value.id
  })

  const path = computed<GradeNode[]>(() => {
    const found = findPath(root.value, currentId.value)
    return found.length ? found : [root.value]
  })

  const current = computed<GradeNode>(() => path.value[path.value.length - 1] ?? root.value)

  const parent = computed<GradeNode | null>(() =>
    path.value.length > 1 ? path.value[path.value.length - 2]! : null,
  )

  const canGoUp = computed(() => parent.value !== null)

  const children = computed<GradeNode[]>(() => current.value.children ?? [])

  const progress = computed<NodeProgress>(() => {
    const base = computeProgress(current.value)
    // Totalny postęp semestru: procenty przedmiotów przeskalowane przez ECTS
    // i podzielone przez sumę ECTS przedmiotów obecnych w danych. Studenci
    // mogą brać przedmioty z wyprzedzeniem, więc nie ma stałej puli semestru.
    if (current.value.id !== root.value.id) return base
    const totalEcts = data.subjects.reduce((sum, subject) => sum + subject.policy.ects, 0)
    if (!totalEcts) return base
    const weighted = data.subjects.reduce(
      (sum, subject) => sum + subject.policy.ects * computeProgress(subject.tree).ratio,
      0,
    )
    return { ...base, ratio: weighted / totalEcts }
  })

  const segments = computed<ProgressSegment[]>(() => {
    const all = children.value
    const kids = all
      .map((child) => ({ child, weight: effectiveWeight(child, all) }))
      .filter((entry) => entry.weight > 0)
    if (!kids.length) {
      // Liść z punktami ma sens jako jeden segment; pusty kontener (np. nowy
      // przedmiot bez grup) nie powinien pokazywać sam siebie.
      if (!current.value.points || current.value.points.max === 0) return []
      const single = computeProgress(current.value)
      return [
        {
          id: current.value.id,
          label: current.value.short || current.value.name,
          ratio: single.ratio,
          weight: 1,
          earned: single.earned,
          max: single.max,
          colorIndex: 0,
        },
      ]
    }
    return kids.map(({ child, weight }, index) => {
      const childProgress = computeProgress(child)
      return {
        id: child.id,
        label: child.short || child.name,
        ratio: childProgress.ratio,
        weight,
        earned: childProgress.earned,
        max: childProgress.max,
        colorIndex: index,
      }
    })
  })

  const segmentDenominator = computed(() => {
    // Waga segmentów to ECTS przedmiotów (albo punkty w poddrzewie); mianownik
    // zawsze wynika z danych, żeby pasek domykał się do 100%.
    return segments.value.reduce((sum, segment) => sum + segment.weight, 0) || 1
  })

  const activeSubject = computed(
    () =>
      data.subjects.find((subject) => collectNodeIds(subject.tree).includes(current.value.id)) ??
      null,
  )

  /** W widoku semestru skala pochodzi z jedynego przedmiotu. */
  const scoringSubject = computed(
    () => activeSubject.value ?? (data.subjects.length === 1 ? data.subjects[0]! : null),
  )

  const requirements = computed(() => evaluateRequirements(current.value, root.value))

  /** Skala ocen dotyczy przedmiotu, nie jego poddrzewa. */
  const showScale = computed(() => {
    const subject = activeSubject.value
    return !subject || current.value.id === subject.tree.id
  })

  const scopedTerms = computed<Term[]>(() => termsForNode(current.value, data.terms))

  const nowIso = useState('now-iso', () => new Date().toISOString())

  function termStatus(term: Term): TermStatus {
    const node = term.nodeId ? findNode(root.value, term.nodeId) : null
    if (node?.points && node.points.earned != null) return 'done'
    if (term.submitted) return 'inProgress'
    if (term.date < nowIso.value.slice(0, 10)) return 'overdue'
    return 'upcoming'
  }

  const score = computed(() => {
    const subject = scoringSubject.value
    if (!subject) return null
    const { earned } = progress.value
    return {
      earned,
      total: subject.policy.totalPoints,
      passing: subject.policy.passingPoints,
      grade: gradeForPoints(earned, subject.policy.gradeScale).grade,
    }
  })

  /** Metadane nagłówka przedmiotu - dane, nie markup. */
  const heroMeta = computed(() => {
    const subject = activeSubject.value
    if (!subject) return []
    return [
      { id: 'group', text: `grupa ${subject.group || '-'}`, icon: 'group' as const },
      ...subject.teachers.map((teacher) => ({
        id: `teacher-${teacher.name}`,
        text: teacher.name,
        icon: 'dot' as const,
      })),
      { id: 'ects', text: `${subject.policy.ects} ECTS`, badge: true as const },
    ]
  })

  const crumbs = computed(() =>
    path.value.map((node) => ({ id: node.id, name: node.name, kind: node.kind })),
  )

  function select(id: string) {
    if (id === root.value.id) {
      router.push({ query: {} })
      return
    }
    router.push({ query: { ...route.query, node: id } })
  }

  function goUp() {
    if (parent.value) select(parent.value.id)
  }

  return {
    root,
    semester: data.semester,
    currentId,
    path,
    current,
    parent,
    canGoUp,
    children,
    progress,
    segments,
    segmentDenominator,
    activeSubject,
    scoringSubject,
    requirements,
    scopedTerms,
    score,
    showScale,
    heroMeta,
    crumbs,
    nowIso,
    termStatus,
    select,
    goUp,
  }
}
