const DATE_FMT = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/Warsaw',
})

const WEEKDAY_FMT = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'short',
  timeZone: 'Europe/Warsaw',
})

const DAY_FMT = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit',
  timeZone: 'Europe/Warsaw',
})

const MONTH_FMT = new Intl.DateTimeFormat('pl-PL', {
  month: 'short',
  timeZone: 'Europe/Warsaw',
})

/** Południe UTC, żeby strefa nie przesuwała daty przy formatowaniu. */
function asDate(iso: string): Date {
  return new Date(iso.length <= 10 ? `${iso}T12:00:00Z` : iso)
}

export function dayOfMonth(iso: string): string {
  return DAY_FMT.format(asDate(iso))
}

export function monthShort(iso: string): string {
  return MONTH_FMT.format(asDate(iso)).replace('.', '')
}

export function formatDate(iso: string): string {
  return DATE_FMT.format(asDate(iso)).replace('.', '')
}

export function formatWeekday(iso: string): string {
  return WEEKDAY_FMT.format(asDate(iso)).replace('.', '')
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso.slice(0, 10)}T00:00:00Z`).getTime()
  const to = new Date(`${toIso.slice(0, 10)}T00:00:00Z`).getTime()
  return Math.round((to - from) / 86_400_000)
}

export function relativeDays(iso: string, nowIso: string): string {
  const diff = daysBetween(nowIso, iso)
  if (diff === 0) return 'dziś'
  if (diff === 1) return 'jutro'
  if (diff === -1) return 'wczoraj'
  if (diff > 1) return `za ${diff} dni`
  return `${Math.abs(diff)} dni temu`
}

export function formatPercent(ratio: number, digits = 0): string {
  return `${(ratio * 100).toFixed(digits).replace('.', ',')}%`
}
