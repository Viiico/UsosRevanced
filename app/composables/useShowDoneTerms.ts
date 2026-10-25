/** Wspólne dla obu harmonogramów: zrobione terminy znikają, „w trakcie” i „po terminie” zostają. */
export function useHideDoneTerms() {
  return useState('hide-done-terms', () => false)
}
