/**
 * Kontrakt dokumentu bazowego w wersji 2 (`app/data/base.json`).
 *
 * To jest warstwa katalogowa: semestr, skale, przedmioty, drzewo, terminy,
 * prowadzący i postęp. Nie ma tu typów widoku ani stanu edytora - te nadal
 * żyją w `app/types/index.ts` i są budowane przez adapter
 * (`app/data/adapt-v2.ts`) do czasu migracji UI.
 */

export type BaseSource = 'demo' | 'syllabus' | 'user'

export interface BaseMeta {
  updatedAt: string
  source: BaseSource
  timeZone: string
}

export type BaseWeekKind = 'teaching' | 'break' | 'exam'

export interface BaseWeek {
  /** Numer tygodnia dydaktycznego; brak dla przerw i sesji. */
  no?: number
  from: string
  to: string
  kind: BaseWeekKind
}

export interface BaseSemester {
  id: string
  code: string
  name: string
  academicYear: string
  startsAt: string
  endsAt: string
  weeks: BaseWeek[]
  dayOverrides?: { date: string; follows: string }[]
}

export interface BaseGradeRow {
  min: number
  grade: string
}

export interface BaseGradeScale {
  passing: number
  rows: BaseGradeRow[]
}

export type BaseNodeType = 'subject' | 'group' | 'activity' | 'stage' | 'milestone'

export type BaseActivityKind = 'lab' | 'colloquium' | 'project' | 'exam' | 'other'

export type BaseRequirementKind = 'min-total' | 'min-each' | 'min-node' | 'manual'

export interface BaseRequirement {
  id: string
  kind: BaseRequirementKind
  label: string
  /** Tylko dla kind != min-total; min-total bierze próg ze skali. */
  threshold?: number
  /** Węzeł, którego dotyczy warunek; brak = węzeł, w którym warunek leży. */
  targetId?: string
  note?: string
}

export interface BaseNode {
  id: string
  type: BaseNodeType
  name?: string
  short?: string
  /** Rodzaj zajęć; na grupie opisuje dzieci (dziedziczenie w UI). */
  activityKind?: BaseActivityKind
  /** Tylko liście oceniane; grupy liczą maksimum z dzieci. */
  max?: number
  /** Opcjonalne nadpisanie wagi; 0 wyłącza węzeł ze średniej. */
  weight?: number
  requirements?: BaseRequirement[]
  children?: BaseNode[]
  info?: string
  description?: string
  assumptionNote?: string
}

export interface BaseSubjectGroup {
  code: string
  label: string
}

export interface BaseSubjectTeacher {
  id: string
  role?: string
}

export interface BaseSubject {
  id: string
  code: string
  name: string
  ects: number
  gradeScaleId: string
  group: BaseSubjectGroup
  teachers: BaseSubjectTeacher[]
  /** Tekst sylabusa do wyświetlenia; nie jest źródłem progów. */
  policyNotes: string[]
  tree: BaseNode
}

export interface BaseTeacher {
  id: string
  name: string
  email?: string
  room?: string
}

export type BaseTermKind =
  | 'lecture'
  | 'lab'
  | 'colloquium'
  | 'project-stage'
  | 'project-deadline'
  | 'exam'
  | 'other'

export interface BaseTerm {
  id: string
  subjectId: string
  nodeId?: string
  kind: BaseTermKind
  title: string
  /** YYYY-MM-DD, czas lokalny strefy z meta.timeZone. */
  date: string
  start?: string
  end?: string
  /** Deadline: data + godzina, bez start. */
  due?: string
  location?: string
  group?: string
  /** 1 = termin podstawowy; 2 = poprawka. */
  attempt?: number
  /** Czy ten termin jest oceniany (punkty pochodzą z węzła, nie z terminu). */
  graded?: boolean
  /** Tekst informacyjny terminu (obecność, raport); nie próg punktowy. */
  requirementNote?: string
  notes?: string
  /** Ręczne „zrobione” (zapisy, oddane sprawozdanie); termin z punktami czeka potem na ocenę. */
  submitted?: boolean
}

export interface BaseProgress {
  earned: number
  attempt?: number
  updatedAt?: string
}

export interface BaseDocument {
  schemaVersion: 2
  meta: BaseMeta
  semester: BaseSemester
  gradeScales: Record<string, BaseGradeScale>
  subjects: BaseSubject[]
  teachers: BaseTeacher[]
  terms: BaseTerm[]
  progress: Record<string, BaseProgress>
}
