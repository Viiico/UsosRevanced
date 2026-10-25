/**
 * Wspólne dla obu harmonogramów. Domyślnie zrobione terminy są schowane - na co dzień
 * liczy się to, co zostało; „w trakcie” i „po terminie” widać zawsze.
 */
export function useShowDoneTerms() {
  return useState('show-done-terms', () => false)
}
