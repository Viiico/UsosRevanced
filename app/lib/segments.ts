export function segmentColor(index: number): string {
  return `var(--seg-${(index % 5) + 1})`
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
