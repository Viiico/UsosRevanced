/**
 * Kontrakt danych. Wszystko jest serializowalne (bez klas, `Date`, `Map`), więc ten
 * sam kształt trafia do JSON-a albo SQLite (patrz docs/data-model.md).
 */

export type GradeNodeKind =
  | 'year'
  | 'semester'
  | 'subject'
  | 'category'
  | 'activity'
  | 'stage'
  | 'milestone'

export type RequirementKind = 'min-total' | 'min-each' | 'min-node' | 'manual'

export interface Requirement {
  id: string
  kind: RequirementKind
  label: string
  threshold?: number
  /** Węzeł, do którego odnosi się warunek. Domyślnie bieżący. */
  targetNodeId?: string
  note?: string
}

export interface NodePoints {
  max: number
  /** null = jeszcze nieocenione */
  earned: number | null
}

export interface GradeNode {
  id: string
  kind: GradeNodeKind
  name: string
  short?: string
  /** Rodzaj zajęć - z niego bierze się ikona i odmiana podsumowania. */
  visual?: 'lab' | 'colloquium' | 'project'
  /** Udział w średniej ważonej rodzeństwa. Zwykle równy maksimum punktów. */
  weight: number
  points?: NodePoints
  requirements?: Requirement[]
  children?: GradeNode[]
  termIds?: string[]
  info?: string
  /** Uwaga, gdy dana liczba jest przyjęta roboczo (np. podział punktów projektu). */
  assumption?: string
  description?: string
}

export type TermKind = 'lecture' | 'lab' | 'colloquium' | 'project-stage' | 'project-deadline'

export interface Term {
  id: string
  subjectId: string
  /** Brak = wydarzenie bez oceny (np. wykład). */
  nodeId?: string
  kind: TermKind
  title: string
  /** YYYY-MM-DD */
  date: string
  /** HH:mm */
  start?: string
  end?: string
  location?: string
  group?: string
  pointsMax?: number
  /** true = trzeba zrobić przed terminem, false = tylko na zajęciach */
  canBeDoneBefore: boolean
  requirement?: string
  notes?: string
  weekNo?: number
}

export interface GradeScaleRow {
  min: number
  grade: string
}

export interface SubjectPolicy {
  ects: number
  totalPoints: number
  passingPoints: number
  gradeScale: GradeScaleRow[]
  rules: string[]
}

export interface Teacher {
  name: string
  email?: string
  room?: string
}

export interface Subject {
  id: string
  code: string
  name: string
  semesterId: string
  group?: string
  teachers: Teacher[]
  policy: SubjectPolicy
  tree: GradeNode
  demoData?: boolean
}

export interface Semester {
  id: string
  code: string
  name: string
  academicYear: string
  startsAt: string
  endsAt: string
  /** Pula ECTS semestru; totalny postęp dzieli się przez tę wartość. */
  ectsTotal: number
}

export interface AppData {
  version: number
  semester: Semester
  subjects: Subject[]
  terms: Term[]
}

export type RequirementStatus = 'met' | 'failed' | 'pending' | 'info'

export interface EvaluatedRequirement extends Requirement {
  status: RequirementStatus
  detail?: string
}

export interface NodeProgress {
  ratio: number
  earned: number
  max: number
  gradedLeaves: number
  totalLeaves: number
  complete: boolean
}
