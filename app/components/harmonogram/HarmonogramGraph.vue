<script setup lang="ts">
import { computed } from 'vue'
import type { Subject, Term } from '~/types'
import { TERM_KIND_SHORT, TERM_STATUS } from '~/lib/node-meta'
import { formatDate } from '~/lib/format'
import { segmentColor } from '~/lib/segments'

/**
 * Widok „all branches” jak w git log --graph, ale odwrócony: najstarszy termin na górze.
 * Gałąź = przedmiot (pas w kolorze z sekcji Postęp), commit = termin.
 */
const props = defineProps<{ terms: Term[]; subjects: Subject[]; today: string }>()
const emit = defineEmits<{ select: [id: string] }>()

const { termStatus } = useGrades()

/** Szerokość pasa gałęzi w px - wiersze mają stałą wysokość, więc odcinki się stykają. */
const LANE = 16

type Row = { type: 'term'; term: Term } | { type: 'today' }

/** Pasy tylko dla przedmiotów obecnych w widoku; kolor jak w Postępie (indeks w semestrze). */
const lanes = computed(() =>
  props.subjects
    .map((subject, index) => ({ subject, color: segmentColor(index) }))
    .filter(({ subject }) => props.terms.some((term) => term.subjectId === subject.id)),
)

const rows = computed<Row[]>(() => {
  const out: Row[] = []
  let todayPlaced = false
  for (const term of props.terms) {
    if (!todayPlaced && term.date >= props.today) {
      out.push({ type: 'today' })
      todayPlaced = true
    }
    out.push({ type: 'term', term })
  }
  if (!todayPlaced && out.length) out.push({ type: 'today' })
  return out
})

/** Pierwszy i ostatni wiersz każdej gałęzi - między nimi rysujemy ciągłą linię. */
const spans = computed(() => {
  const map = new Map<string, { first: number; last: number }>()
  rows.value.forEach((row, index) => {
    if (row.type !== 'term') return
    const span = map.get(row.term.subjectId)
    if (span) span.last = index
    else map.set(row.term.subjectId, { first: index, last: index })
  })
  return map
})

/** Odcinek pasa w danym wierszu: cały, od kropki w dół, od góry do kropki albo brak. */
function segment(rowIndex: number, subjectId: string): { top: string; bottom: string } | null {
  const span = spans.value.get(subjectId)
  if (!span || span.first === span.last) return null
  if (rowIndex < span.first || rowIndex > span.last) return null
  if (rowIndex === span.first) return { top: '50%', bottom: '0' }
  if (rowIndex === span.last) return { top: '0', bottom: '50%' }
  return { top: '0', bottom: '0' }
}

function laneIndex(subjectId: string) {
  return lanes.value.findIndex((lane) => lane.subject.id === subjectId)
}

/**
 * Wypełnienie kropki = stan, obwódka = gałąź. Kształt zamiast samego koloru, bo w palecie
 * success/primary/danger częściowo się pokrywają: pełna - zrobione, środek - w trakcie,
 * czerwona - po terminie, pusta - nadchodzące.
 */
function nodeFill(term: Term, color: string | undefined) {
  switch (termStatus(term)) {
    case 'done':
      return color
    case 'inProgress':
      return `radial-gradient(circle, ${color} 0 35%, var(--card) 40%)`
    case 'overdue':
      return 'var(--danger)'
    default:
      return 'var(--card)'
  }
}

function codeOf(term: Term) {
  return props.subjects.find((subject) => subject.id === term.subjectId)?.code ?? ''
}
</script>

<template>
  <div>
    <!-- Legenda gałęzi nad grafem: kolor pasa → kod przedmiotu. -->
    <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
      <span v-for="lane in lanes" :key="lane.subject.id" class="inline-flex items-center gap-1.5">
        <span class="size-2 rounded-full" :style="{ backgroundColor: lane.color }" />
        <span :title="lane.subject.name">{{ lane.subject.code }}</span>
      </span>
    </div>

    <ol>
      <li
        v-for="(row, rowIndex) in rows"
        :key="row.type === 'term' ? row.term.id : 'today'"
        class="flex items-stretch"
        :class="row.type === 'term' ? 'h-9' : 'h-6'"
      >
        <div class="relative shrink-0" :style="{ width: `${lanes.length * LANE}px` }" aria-hidden="true">
          <template v-for="(lane, index) in lanes" :key="lane.subject.id">
            <span
              v-if="segment(rowIndex, lane.subject.id)"
              class="absolute w-0.5 -translate-x-1/2 rounded-full opacity-70"
              :style="{
                left: `${index * LANE + LANE / 2}px`,
                top: segment(rowIndex, lane.subject.id)!.top,
                bottom: segment(rowIndex, lane.subject.id)!.bottom,
                backgroundColor: lane.color,
              }"
            />
          </template>

          <!-- Commit: obwódka = gałąź (przedmiot), wypełnienie = stan terminu. -->
          <span
            v-if="row.type === 'term'"
            class="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
            :style="{
              left: `${laneIndex(row.term.subjectId) * LANE + LANE / 2}px`,
              borderColor: lanes[laneIndex(row.term.subjectId)]?.color,
              background: nodeFill(row.term, lanes[laneIndex(row.term.subjectId)]?.color),
            }"
            :title="TERM_STATUS[termStatus(row.term)].label"
          />
        </div>

        <div v-if="row.type === 'today'" class="flex flex-1 items-center gap-2 ps-3">
          <span class="text-3xs font-semibold tracking-wider text-primary uppercase">dziś</span>
          <span class="h-px flex-1 bg-primary/40" />
        </div>

        <button
          v-else
          type="button"
          class="flex min-w-0 flex-1 items-center gap-2.5 rounded-md ps-3 pe-2 text-left transition-colors hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          :class="row.term.date < today && termStatus(row.term) === 'done' ? 'opacity-60' : undefined"
          @click="emit('select', row.term.id)"
        >
          <span class="tnum w-12 shrink-0 text-2xs text-muted-foreground">
            {{ formatDate(row.term.date) }}
          </span>
          <span
            class="w-16 shrink-0 font-mono text-3xs text-muted-foreground uppercase max-sm:hidden"
          >
            {{ TERM_KIND_SHORT[row.term.kind] }}
          </span>
          <span class="min-w-0 flex-1 truncate text-dense font-medium" :title="row.term.title">
            {{ row.term.title }}
          </span>
          <span
            class="shrink-0 text-3xs font-medium"
            :style="{ color: lanes[laneIndex(row.term.subjectId)]?.color }"
          >
            {{ codeOf(row.term) }}
          </span>
          <span class="tnum w-12 shrink-0 text-right text-2xs max-sm:hidden">
            <template v-if="row.term.pointsMax">{{ row.term.pointsMax }} pkt</template>
          </span>
          <span class="sr-only">{{ TERM_STATUS[termStatus(row.term)].label }}</span>
        </button>
      </li>
    </ol>
  </div>
</template>
