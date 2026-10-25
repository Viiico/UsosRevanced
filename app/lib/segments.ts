/** Kolor przedmiotu wg jego stałego slotu (8 barw w ustalonej kolejności, patrz main.css). */
export const SEGMENT_SLOTS = 8

export function segmentColor(index: number): string {
  return `var(--seg-${(index % SEGMENT_SLOTS) + 1})`
}

export function weightSumOf(segments: { weight: number }[]): number {
  return segments.reduce((sum, seg) => sum + seg.weight, 0) || 1
}

/**
 * Szerokość to udział zdobytych punktów w całości, więc segmenty stykają się
 * od lewej, a koniec paska pokazuje realny postęp.
 */
export function segmentWidth(seg: { weight: number; ratio: number }, weightSum: number): string {
  return `${((seg.weight * seg.ratio) / weightSum) * 100}%`
}
