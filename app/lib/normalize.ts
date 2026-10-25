import type { AppData, GradeNode, Subject } from '~/types'

/**
 * Normalizacja uzupełnia opcjonalne pola (puste stringi / puste listy), żeby
 * kształt dokumentu był stały - czyszczenie pola nie zostawia „nowego” klucza.
 * Działa na miejscu i zwraca ten sam obiekt.
 */
function normalizeNode(node: GradeNode) {
  node.short ??= ''
  node.info ??= ''
  node.description ??= ''
  node.assumption ??= ''
  node.children ??= []
  node.requirements ??= []
  node.termIds ??= []
  for (const child of node.children) normalizeNode(child)
}

export function normalizeSubject(subject: Subject) {
  subject.group ??= ''
  subject.teachers ??= []
  for (const teacher of subject.teachers) {
    teacher.email ??= ''
    teacher.room ??= ''
  }
  subject.policy.gradeScale ??= []
  subject.policy.rules ??= []
  normalizeNode(subject.tree)
}

export function normalizeData(data: AppData): AppData {
  for (const subject of data.subjects) normalizeSubject(subject)
  return data
}
