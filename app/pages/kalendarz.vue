<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import {
  Beaker,
  BookOpen,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Flag,
  FolderGit2,
} from 'lucide-vue-next'
import type { Term, TermKind } from '~/types'
import { findNode } from '~/lib/tree'
import { TERM_KIND_LABEL } from '~/lib/node-meta'
import { dayOfMonth, daysBetween, formatDate, formatWeekday } from '~/lib/format'

useHead({ title: 'Kalendarz' })

const data = useAppData()
const { root, nowIso } = useGrades()

const today = computed(() => nowIso.value.slice(0, 10))

/** Stała siatka 06:00-20:00 w obu widokach - ten sam układ i ta sama wysokość. */
const DAY_START = 6
const DAY_END = 20
const HOUR_HEIGHT = 44
const HOURS = Array.from({ length: DAY_END - DAY_START + 1 }, (_, index) => DAY_START + index)
const GRID_HEIGHT = (DAY_END - DAY_START) * HOUR_HEIGHT
const COMPACT_DAYS = ['pon', 'wt', 'śr', 'czw', 'pt']

const KIND_ICON: Record<TermKind, Component> = {
  lecture: BookOpen,
  lab: Beaker,
  colloquium: ClipboardCheck,
  'project-stage': FolderGit2,
  'project-deadline': Flag,
}

const KIND_STYLE: Record<TermKind, { block: string }> = {
  lecture: {
    block: 'border-border/70 bg-secondary/40 hover:bg-secondary/60',
  },
  lab: {
    block: 'border-primary/35 bg-primary/10 hover:bg-primary/15',
  },
  colloquium: {
    block: 'border-danger/35 bg-danger/10 hover:bg-danger/15',
  },
  'project-stage': {
    block: 'border-accent/40 bg-accent/10 hover:bg-accent/15',
  },
  'project-deadline': {
    block: 'border-accent/40 bg-accent/10 hover:bg-accent/15',
  },
}

const view = ref<'week' | 'compact'>('week')

function isoDay(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay()
}

function mondayOf(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

function addDays(iso: string, amount: number): string {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

function toMinutes(time?: string | null): number | null {
  if (!time) return null
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

function byDate(a: Term, b: Term): number {
  return `${a.date}${a.start ?? ''}`.localeCompare(`${b.date}${b.start ?? ''}`)
}

const weekStart = ref(mondayOf(today.value))
const weekDays = computed(() => Array.from({ length: 5 }, (_, index) => addDays(weekStart.value, index)))
const weekEnd = computed(() => addDays(weekStart.value, 6))
const currentMonday = computed(() => mondayOf(today.value))
const isCurrentWeek = computed(() => weekStart.value === currentMonday.value)

const weekTerms = computed(() =>
  data.terms.filter((term) => term.date >= weekStart.value && term.date <= weekEnd.value),
)
const weekGridTerms = computed(() =>
  weekTerms.value.filter((term) => weekDays.value.includes(term.date)),
)
const weekendTerms = computed(() =>
  weekTerms.value.filter((term) => !weekDays.value.includes(term.date)),
)

const hasDeadlines = computed(() => weekGridTerms.value.some((term) => !term.start))

const weekLabel = computed(() => {
  const end = weekDays.value[4]!
  const start = weekStart.value.slice(0, 7) === end.slice(0, 7)
    ? dayOfMonth(weekStart.value)
    : formatDate(weekStart.value)
  return `${start}-${formatDate(end)} ${end.slice(0, 4)}`
})

const nextAfterWeek = computed(
  () =>
    data.terms
      .filter((term) => term.date > weekEnd.value)
      .slice()
      .sort(byDate)[0] ?? null,
)

interface Slot {
  key: string
  subjectId: string
  subjectName: string
  subjectNodeId: string
  kind: 'lecture' | 'lab'
  weekday: number
  start: string
  end: string
  group?: string
  cadence: string
}

function cadenceOf(dates: string[]): string {
  const sorted = [...dates].sort()
  const diffs = sorted.slice(1).map((date, index) => daysBetween(sorted[index]!, date))
  const middle = [...diffs].sort((a, b) => a - b)[Math.floor(diffs.length / 2)]
  if (middle === 7) return 'co tydzień'
  if (middle === 14) return 'co 2 tygodnie'
  return `${dates.length} terminów`
}

const slots = computed<Slot[]>(() => {
  const out = new Map<string, Slot & { dates: string[] }>()
  for (const term of data.terms) {
    if (!term.start || !term.end) continue
    if (term.kind !== 'lecture' && term.kind !== 'lab') continue
    const key = [term.subjectId, term.kind, term.start, term.end, term.group ?? ''].join('|')
    let entry = out.get(key)
    if (!entry) {
      const subject = data.subjects.find((item) => item.id === term.subjectId)
      entry = {
        key,
        subjectId: term.subjectId,
        subjectName: subject?.name ?? term.subjectId,
        subjectNodeId: subject?.tree.id ?? '',
        kind: term.kind,
        weekday: isoDay(term.date),
        start: term.start,
        end: term.end,
        group: term.group,
        cadence: '',
        dates: [],
      }
      out.set(key, entry)
    }
    entry.dates.push(term.date)
  }
  return [...out.values()]
    .filter((slot) => slot.weekday >= 1 && slot.weekday <= 5)
    .map(({ dates, ...slot }) => ({
      ...slot,
      cadence: cadenceOf(dates),
    }))
})

function shiftWeek(amount: number) {
  weekStart.value = addDays(weekStart.value, amount * 7)
}

function goToday() {
  weekStart.value = currentMonday.value
}

function goNextWeek() {
  if (nextAfterWeek.value) weekStart.value = mondayOf(nextAfterWeek.value.date)
}

function isToday(day: string) {
  return day === today.value
}

function timedForDay(day: string) {
  return weekGridTerms.value
    .filter((term) => term.date === day && term.start)
    .slice()
    .sort(byDate)
}

function deadlinesForDay(day: string) {
  return weekGridTerms.value.filter((term) => term.date === day && !term.start)
}

function shortTitle(term: Term) {
  const node = term.nodeId ? findNode(root.value, term.nodeId) : null
  return node?.short || term.title
}

function nodeLink(term: Term) {
  return { path: '/oceny', query: term.nodeId ? { node: term.nodeId } : {} }
}

function slotLink(slot: Slot) {
  return { path: '/oceny', query: slot.subjectNodeId ? { node: slot.subjectNodeId } : {} }
}

function slotsFor(weekday: number) {
  return slots.value.filter((slot) => slot.weekday === weekday)
}

function blockStyle(start?: string | null, end?: string | null) {
  const startMinutes = toMinutes(start) ?? DAY_START * 60
  const endMinutes = toMinutes(end) ?? startMinutes + 90
  return {
    top: `${((startMinutes - DAY_START * 60) / 60) * HOUR_HEIGHT}px`,
    height: `${Math.max(24, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT - 2)}px`,
  }
}

interface IntervalBox {
  left: number
  width: number
}

/**
 * Układa nakładające się terminy w kolumny. Klastry to grupy przedziałów
 * połączonych nakładaniem; w każdym z nich wydarzenia dzielą szerokość
 * po równo, więc dwa zajęcia o 16:00 stoją obok siebie, a nie jedno na drugim.
 */
function layoutIntervals(items: { id: string; start: number; end: number }[]) {
  const boxes = new Map<string, IntervalBox>()
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end)
  let cluster: typeof sorted = []
  let clusterEnd = -Infinity

  const flush = () => {
    if (!cluster.length) return
    const columnEnds: number[] = []
    const columns = new Map<string, number>()
    for (const item of cluster) {
      let column = columnEnds.findIndex((end) => end <= item.start)
      if (column === -1) {
        column = columnEnds.length
        columnEnds.push(item.end)
      } else {
        columnEnds[column] = item.end
      }
      columns.set(item.id, column)
    }
    const count = columnEnds.length
    for (const item of cluster) {
      const column = columns.get(item.id) ?? 0
      boxes.set(item.id, {
        left: (column / count) * 100,
        width: (1 / count) * 100,
      })
    }
    cluster = []
    clusterEnd = -Infinity
  }

  for (const item of sorted) {
    if (cluster.length && item.start >= clusterEnd) flush()
    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  flush()
  return boxes
}

const weekLayout = computed(() => {
  const byDay = new Map<string, Map<string, IntervalBox>>()
  for (const day of weekDays.value) {
    const items = timedForDay(day).map((term) => {
      const start = toMinutes(term.start) ?? DAY_START * 60
      const end = toMinutes(term.end) ?? start + 90
      return { id: term.id, start, end }
    })
    byDay.set(day, layoutIntervals(items))
  }
  return byDay
})

const compactLayout = computed(() => {
  const byDay = new Map<number, Map<string, IntervalBox>>()
  for (const weekday of [1, 2, 3, 4, 5]) {
    const items = slotsFor(weekday).map((slot) => {
      const start = toMinutes(slot.start) ?? DAY_START * 60
      const end = toMinutes(slot.end) ?? start + 90
      return { id: slot.key, start, end }
    })
    byDay.set(weekday, layoutIntervals(items))
  }
  return byDay
})

function positionedStyle(
  box: IntervalBox | undefined,
  start?: string | null,
  end?: string | null,
) {
  const base = blockStyle(start, end)
  if (!box) return base
  return {
    ...base,
    left: `calc(${box.left}% + 1px)`,
    width: `calc(${box.width}% - 2px)`,
    right: 'auto',
  }
}

function hourTop(hour: number) {
  return `${(hour - DAY_START) * HOUR_HEIGHT}px`
}

function pad(hour: number) {
  return String(hour).padStart(2, '0')
}
</script>

<template>
  <div class="space-y-5">
    <Card v-if="view === 'week'" class="flex flex-col">
      <CardHeader class="flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <div class="flex items-center gap-2">
          <button
            type="button"
            aria-label="Poprzedni tydzień"
            class="grid size-7 place-items-center rounded-md border border-border/70 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            @click="shiftWeek(-1)"
          >
            <ChevronLeft class="size-4" />
          </button>

          <span class="tnum text-dense font-medium">{{ weekLabel }}</span>

          <button
            type="button"
            aria-label="Następny tydzień"
            class="grid size-7 place-items-center rounded-md border border-border/70 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            @click="shiftWeek(1)"
          >
            <ChevronRight class="size-4" />
          </button>
        </div>

        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" :disabled="isCurrentWeek" @click="goToday">
            Dziś
          </Button>
          <ViewToggle v-model="view" />
        </div>
      </CardHeader>

      <CardContent class="pt-0">
        <div class="relative overflow-x-auto">
          <div class="min-w-[34rem]">
            <div class="grid grid-cols-[3rem_repeat(5,minmax(0,1fr))] border-b border-border/60">
              <div />
              <div
                v-for="day in weekDays"
                :key="day"
                class="border-l border-border/40 px-2 pt-1 pb-2 text-center"
              >
                <div class="eyebrow" :class="isToday(day) ? 'text-primary' : undefined">
                  {{ formatWeekday(day) }}
                </div>
                <div
                  class="tnum mt-0.5 text-lg leading-none font-semibold"
                  :class="isToday(day) ? 'text-primary' : undefined"
                >
                  {{ dayOfMonth(day) }}
                </div>
              </div>
            </div>

            <div
              v-if="hasDeadlines"
              class="grid grid-cols-[3rem_repeat(5,minmax(0,1fr))] border-b border-border/60"
            >
              <div class="pt-2 pr-2 text-right text-3xs text-muted-foreground">terminy</div>
              <div
                v-for="day in weekDays"
                :key="day"
                class="min-h-9 border-l border-border/40 px-1 py-1.5"
              >
                <NuxtLink
                  v-for="term in deadlinesForDay(day)"
                  :key="term.id"
                  :to="nodeLink(term)"
                  class="mb-1 block truncate rounded border border-accent/40 bg-accent/10 px-1.5 py-1 text-3xs transition-colors hover:bg-accent/15"
                  :title="term.title"
                >
                  {{ shortTitle(term) }}
                </NuxtLink>
              </div>
            </div>

            <div class="grid grid-cols-[3rem_repeat(5,minmax(0,1fr))]">
              <div class="relative" :style="{ height: `${GRID_HEIGHT}px` }">
                <div
                  v-for="hour in HOURS"
                  :key="hour"
                  class="tnum absolute right-2 -translate-y-1/2 text-3xs text-muted-foreground/80"
                  :style="{ top: hourTop(hour) }"
                >
                  {{ pad(hour) }}:00
                </div>
              </div>

              <div
                v-for="day in weekDays"
                :key="day"
                class="relative border-l border-border/40"
                :class="isToday(day) ? 'bg-primary/[0.04]' : undefined"
                :style="{ height: `${GRID_HEIGHT}px` }"
              >
                <div
                  v-for="hour in HOURS.slice(1)"
                  :key="hour"
                  class="pointer-events-none absolute inset-x-0 border-t border-border/30"
                  :style="{ top: hourTop(hour) }"
                />

                <NuxtLink
                  v-for="term in timedForDay(day)"
                  :key="term.id"
                  :to="nodeLink(term)"
                  class="absolute overflow-hidden rounded-lg border px-1.5 py-1 transition-colors"
                  :class="KIND_STYLE[term.kind].block"
                  :style="positionedStyle(weekLayout.get(day)?.get(term.id), term.start, term.end)"
                  :title="term.title"
                >
                  <div class="flex items-start justify-between gap-1 text-3xs opacity-80">
                    <span class="flex min-w-0 flex-1 items-center gap-1">
                      <component :is="KIND_ICON[term.kind]" class="size-3 shrink-0" />
                      <span class="tnum min-w-0 truncate">
                        {{ term.start }}<template v-if="term.end">-{{ term.end }}</template>
                      </span>
                    </span>
                    <span
                      class="shrink-0 rounded border border-border/50 bg-background/30 px-1 text-4xs leading-4"
                    >
                      {{ term.subjectId }}
                    </span>
                  </div>
                  <p class="mt-0.5 line-clamp-2 text-2xs leading-tight font-medium">
                    {{ shortTitle(term) }}
                  </p>
                </NuxtLink>
              </div>
            </div>

            <div
              v-if="!weekTerms.length"
              class="absolute inset-0 z-10 grid place-items-center bg-background/60 p-4 backdrop-blur-[1px]"
            >
              <div class="rounded-xl border border-border/70 bg-card px-4 py-3 text-center shadow-lg">
                <CalendarX2 class="mx-auto size-5 text-muted-foreground/70" />
                <p class="mt-2 text-sm font-medium">Brak zajęć w tym tygodniu</p>
                <p v-if="nextAfterWeek" class="mt-0.5 text-2xs text-muted-foreground">
                  Najbliższe: {{ formatWeekday(nextAfterWeek.date) }},
                  {{ formatDate(nextAfterWeek.date) }}
                </p>
                <Button
                  v-if="nextAfterWeek"
                  variant="outline"
                  size="sm"
                  class="mt-2"
                  @click="goNextWeek"
                >
                  Przejdź
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="weekendTerms.length"
          class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/60 pt-3"
        >
          <span class="eyebrow">Poza siatką</span>
          <NuxtLink
            v-for="term in weekendTerms"
            :key="term.id"
            :to="nodeLink(term)"
            class="inline-flex items-center gap-1 rounded-md border border-border/70 px-1.5 py-1 text-3xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Flag class="size-3" />
            {{ formatWeekday(term.date) }} {{ formatDate(term.date) }} · {{ shortTitle(term) }}
          </NuxtLink>
        </div>
      </CardContent>
    </Card>

    <Card v-else class="flex flex-col">
      <CardHeader class="flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <h2
          class="inline-block border-b-2 border-primary/70 pb-1 text-lg font-semibold tracking-tight"
        >
          Plan
        </h2>
        <ViewToggle v-model="view" />
      </CardHeader>

      <CardContent class="pt-0">
        <div class="overflow-x-auto">
          <div class="min-w-[34rem]">
            <div class="grid grid-cols-[3rem_repeat(5,minmax(0,1fr))] border-b border-border/60">
              <div />
              <div
                v-for="label in COMPACT_DAYS"
                :key="label"
                class="border-l border-border/40 px-2 pt-1 pb-2 text-center"
              >
                <div class="eyebrow">{{ label }}</div>
              </div>
            </div>

            <div class="grid grid-cols-[3rem_repeat(5,minmax(0,1fr))]">
              <div class="relative" :style="{ height: `${GRID_HEIGHT}px` }">
                <div
                  v-for="hour in HOURS"
                  :key="hour"
                  class="tnum absolute right-2 -translate-y-1/2 text-3xs text-muted-foreground/80"
                  :style="{ top: hourTop(hour) }"
                >
                  {{ pad(hour) }}:00
                </div>
              </div>

              <div
                v-for="(label, index) in COMPACT_DAYS"
                :key="label"
                class="relative border-l border-border/40"
                :style="{ height: `${GRID_HEIGHT}px` }"
              >
                <div
                  v-for="hour in HOURS.slice(1)"
                  :key="hour"
                  class="pointer-events-none absolute inset-x-0 border-t border-border/30"
                  :style="{ top: hourTop(hour) }"
                />

                <NuxtLink
                  v-for="slot in slotsFor(index + 1)"
                  :key="slot.key"
                  :to="slotLink(slot)"
                  class="absolute overflow-hidden rounded-lg border px-1.5 py-1 transition-colors"
                  :class="KIND_STYLE[slot.kind].block"
                  :style="
                    positionedStyle(
                      compactLayout.get(index + 1)?.get(slot.key),
                      slot.start,
                      slot.end,
                    )
                  "
                >
                  <div class="flex items-start justify-between gap-1 text-3xs opacity-80">
                    <span class="flex min-w-0 flex-1 items-center gap-1">
                      <component :is="KIND_ICON[slot.kind]" class="size-3 shrink-0" />
                      <span class="min-w-0 truncate">{{ TERM_KIND_LABEL[slot.kind] }}</span>
                    </span>
                    <span
                      class="shrink-0 rounded border border-border/50 bg-background/30 px-1 text-4xs leading-4"
                    >
                      {{ slot.subjectId }}
                    </span>
                  </div>
                  <p class="mt-0.5 line-clamp-2 text-2xs leading-tight font-medium">
                    {{ slot.subjectName }}
                  </p>
                  <p class="tnum mt-0.5 text-3xs text-muted-foreground">
                    {{ slot.start }}-{{ slot.end }}
                  </p>
                  <p class="text-3xs text-muted-foreground/80">
                    {{ slot.cadence }}<template v-if="slot.group"> · {{ slot.group }}</template>
                  </p>
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
