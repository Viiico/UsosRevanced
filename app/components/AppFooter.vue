<script setup lang="ts">
import { computed } from 'vue'
import { Download } from 'lucide-vue-next'
import { base } from '~/data'
import { downloadAppData, useAppDataSaveState } from '~/composables/useAppData'

/**
 * Stopka w jednej linii: stan zapisu w przeglądarce (z kopią do pobrania - dane żyją tylko
 * w localStorage) oraz miejsce w semestrze.
 */
const data = useAppData()
const { savedAt, failed } = useAppDataSaveState()
const nowIso = useState('now-iso', () => new Date().toISOString())
const today = computed(() => nowIso.value.slice(0, 10))

const saveLabel = computed(() => {
  if (failed.value) return 'Nie udało się zapisać w przeglądarce'
  if (!savedAt.value) return 'Dane zapisywane w przeglądarce'
  const time = new Date(savedAt.value).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `Zapisano w przeglądarce o ${time}`
})

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000)
}

/** Tygodnie (z przerwą i sesją) są tylko w dokumencie bazowym - po imporcie innego semestru zostają same daty. */
const semesterLabel = computed(() => {
  const semester = data.semester
  if (today.value < semester.startsAt) {
    return `${semester.name} startuje za ${daysBetween(today.value, semester.startsAt)} dni`
  }
  if (today.value > semester.endsAt) return `${semester.name} zakończony`

  const parts: string[] = []
  if (base.semester.id === semester.id) {
    const weeks = base.semester.weeks
    const teaching = weeks.filter((week) => week.kind === 'teaching').length
    const week = weeks.find((entry) => entry.from <= today.value && today.value <= entry.to)
    if (week?.kind === 'teaching' && week.no) parts.push(`Tydzień ${week.no} z ${teaching}`)
    else if (week?.kind === 'break') parts.push('Przerwa')
    else if (week?.kind === 'exam') parts.push('Sesja')
  }
  const left = daysBetween(today.value, semester.endsAt)
  parts.push(left === 0 ? 'ostatni dzień semestru' : `${left} dni do końca semestru`)
  return parts.join(' · ')
})
</script>

<template>
  <footer class="mt-4 border-t border-border/60 py-4">
    <div
      class="mx-auto flex w-full max-w-[100rem] flex-col items-center gap-1.5 px-4 text-center text-2xs text-muted-foreground sm:flex-row sm:flex-wrap sm:justify-between sm:gap-x-4 sm:text-left sm:px-6"
    >
      <!-- Na telefonie dwa wyśrodkowane wiersze - wyrównane do lewej wyglądały na rozjechane. -->
      <span class="flex items-center gap-2">
        <span
          class="size-1.5 rounded-full"
          :class="failed ? 'bg-danger' : 'bg-success/80'"
          aria-hidden="true"
        />
        <span :class="failed ? 'text-danger' : undefined">{{ saveLabel }}</span>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          @click="downloadAppData(data)"
        >
          <Download class="size-3" />
          Eksportuj kopię
        </button>
      </span>

      <span class="tnum">{{ semesterLabel }}</span>
    </div>
  </footer>
</template>
