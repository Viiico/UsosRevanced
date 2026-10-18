import type { GradeNode, NodeProgress, Term } from '~/types'
import { subjects, terms as allTerms, semester } from '~/data/subjects'
import { collectNodeIds, computeProgress, findNode, findPath } from '~/lib/tree'
import {
  evaluateRequirements,
  gradeForPoints,
  termsForNode,
} from '~/lib/requirements'

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

  const root: GradeNode = {
    id: semester.id,
    kind: 'semester',
    name: `${semester.name} ${semester.code}`,
    weight: 1,
    children: subjects.map((subject) => subject.tree),
  }

  const currentId = computed(() => {
    const raw = route.query.node
    const value = Array.isArray(raw) ? raw[0] : raw
    return value && findNode(root, value) ? value : root.id
  })

  const path = computed<GradeNode[]>(() => {
    const found = findPath(root, currentId.value)
    return found.length ? found : [root]
  })

  const current = computed<GradeNode>(() => path.value[path.value.length - 1] ?? root)

  const parent = computed<GradeNode | null>(() =>
    path.value.length > 1 ? path.value[path.value.length - 2]! : null,
  )

  const canGoUp = computed(() => parent.value !== null)

  const children = computed<GradeNode[]>(() => current.value.children ?? [])

  const progress = computed<NodeProgress>(() => computeProgress(current.value))

  const segments = computed<ProgressSegment[]>(() => {
    const kids = children.value.filter((child) => child.weight > 0)
    if (!kids.length) {
      const single = computeProgress(current.value)
      return [
        {
          id: current.value.id,
          label: current.value.short ?? current.value.name,
          ratio: single.ratio,
          weight: 1,
          earned: single.earned,
          max: single.max,
          colorIndex: 0,
        },
      ]
    }
    return kids.map((child, index) => {
      const childProgress = computeProgress(child)
      return {
        id: child.id,
        label: child.short ?? child.name,
        ratio: childProgress.ratio,
        weight: child.weight,
        earned: childProgress.earned,
        max: childProgress.max,
        colorIndex: index,
      }
    })
  })

  const activeSubject = computed(
    () => subjects.find((subject) => collectNodeIds(subject.tree).includes(current.value.id)) ?? null,
  )

  /** W widoku semestru skala pochodzi z jedynego przedmiotu. */
  const scoringSubject = computed(
    () => activeSubject.value ?? (subjects.length === 1 ? subjects[0]! : null),
  )

  const requirements = computed(() => evaluateRequirements(current.value, root))

  /** Skala ocen dotyczy przedmiotu, nie jego poddrzewa. */
  const showScale = computed(() => {
    const subject = activeSubject.value
    return !subject || current.value.id === subject.tree.id
  })

  const scopedTerms = computed<Term[]>(() => termsForNode(current.value, allTerms))

  const nowIso = useState('now-iso', () => new Date().toISOString())

  function termStatus(term: Term): 'graded' | 'overdue' | 'pending' {
    const node = term.nodeId ? findNode(root, term.nodeId) : null
    if (node?.points && node.points.earned != null) return 'graded'
    if (term.date < nowIso.value.slice(0, 10)) return 'overdue'
    return 'pending'
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
      { id: 'group', text: `grupa ${subject.group ?? '-'}`, icon: 'group' as const },
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
    if (id === root.id) {
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
    semester,
    currentId,
    path,
    current,
    parent,
    canGoUp,
    children,
    progress,
    segments,
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
