import type { Subject } from '~/types'

/** Najniższa pozytywna ocena w skali (pierwszy próg > 0) - jej próg to próg zaliczenia. */
function passingRow(subject: Subject) {
  return [...subject.policy.gradeScale].filter((row) => row.min > 0).sort((a, b) => a.min - b.min)[0]
}

function setThreshold(subject: Subject, value: number) {
  subject.policy.passingPoints = value
  for (const requirement of subject.tree.requirements ?? []) {
    if (requirement.kind !== 'min-total') continue
    requirement.threshold = value
    // Etykieta z danych ma próg wpisany w tekst („Łącznie min. 51 pkt”) - przepisujemy liczbę.
    requirement.label = /\d/.test(requirement.label)
      ? requirement.label.replace(/\d+([.,]\d+)?/, String(value))
      : `Łącznie min. ${value} pkt`
  }
}

/**
 * Próg zaliczenia to jedno źródło prawdy: pole „Próg zaliczenia”, warunek „Łącznie min.”
 * i próg najniższej pozytywnej oceny w skali (np. 3) zawsze mają tę samą wartość.
 */
export function syncPassingFromPolicy(subject: Subject, value: number) {
  setThreshold(subject, value)
  const row = passingRow(subject)
  if (row) row.min = value
}

/** Po edycji skali: próg zaliczenia i warunek idą za najniższą pozytywną oceną. */
export function syncPassingFromScale(subject: Subject) {
  const row = passingRow(subject)
  if (row) setThreshold(subject, row.min)
}
