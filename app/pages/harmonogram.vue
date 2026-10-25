<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CalendarX2,
  Lock,
  RotateCcw,
} from 'lucide-vue-next'
import type { Term, TermStatus } from '~/types'
import {
  TERM_GROUP,
  TERM_GROUP_LABEL,
  TERM_KIND_LABEL,
  TERM_KIND_SHORT,
} from '~/lib/node-meta'
import {
  dayOfMonth,
  formatDate,
  formatWeekday,
  monthLabel,
  monthShort,
  relativeDays,
} from '~/lib/format'

useHead({ title: 'Harmonogram' })

const data = useAppData()
const { semester, termStatus, nowIso } = useGrades()

/** Harmonogram zbiera terminy oceniane - wykłady zostają w kalendarzu. */
const items = computed(() => data.terms.filter((term) => term.nodeId))

/** Kropka na osi czasu: kolor zależy od stanu terminu. */
const STATUS_DOT: Record<TermStatus, string> = {
  done: 'bg-success',
  inProgress: 'bg-primary',
  overdue: 'bg-danger',
  upcoming: 'bg-muted-foreground/50',
}

const subjectFilter = ref('all')
const groupFilter = ref('all')
const onlyActionable = ref(false)
const hideDone = useHideDoneTerms()

const today = computed(() => nowIso.value.slice(0, 10))

const filters = computed(() => {
  const counts = new Map<string, number>()
  for (const term of items.value) {
    const group = TERM_GROUP[term.kind]
    counts.set(group, (counts.get(group) ?? 0) + 1)
  }
  return [
    { id: 'all', label: 'Wszystko', count: items.value.length },
    ...[...counts].map(([id, count]) => ({ id, label: TERM_GROUP_LABEL[id] ?? id, count })),
  ]
})

const visible = computed(() =>
  items.value
    .filter((term) => subjectFilter.value === 'all' || term.subjectId === subjectFilter.value)
    .filter((term) => groupFilter.value === 'all' || TERM_GROUP[term.kind] === groupFilter.value)
    .filter((term) => !hideDone.value || termStatus(term) !== 'done')
    .filter(
      (term) => !onlyActionable.value || (term.canBeDoneBefore && termStatus(term) === 'upcoming'),
    )
    .slice()
    .sort(byDate),
)

const groups = computed(() => {
  const out: { key: string; label: string; terms: Term[] }[] = []
  for (const term of visible.value) {
    const key = term.date.slice(0, 7)
    let group = out.find((entry) => entry.key === key)
    if (!group) {
      group = { key, label: monthLabel(term.date), terms: [] }
      out.push(group)
    }
    group.terms.push(term)
  }
  return out
})

const stats = computed(() => ({
  total: visible.value.length,
  overdue: visible.value.filter((term) => termStatus(term) === 'overdue').length,
  points: visible.value.reduce((sum, term) => sum + (term.pointsMax ?? 0), 0),
}))

const range = computed(() => {
  if (!items.value.length) return ''
  const dates = items.value.map((term) => term.date).sort()
  return `${formatDate(dates[0]!)} - ${formatDate(dates[dates.length - 1]!)}`
})

function byDate(a: Term, b: Term) {
  return `${a.date}${a.start ?? ''}`.localeCompare(`${b.date}${b.start ?? ''}`)
}

function termsLabel(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (count === 1) return 'termin'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'terminy'
  return 'terminów'
}

function subjectOf(term: Term) {
  return data.subjects.find((subject) => subject.id === term.subjectId) ?? null
}

function isToday(term: Term) {
  return term.date === today.value
}

function nodeLink(term: Term) {
  return { path: '/oceny', query: term.nodeId ? { node: term.nodeId } : {} }
}

function resetFilters() {
  subjectFilter.value = 'all'
  groupFilter.value = 'all'
  onlyActionable.value = false
  hideDone.value = false
}
</script>

<template>
  <div class="space-y-5">
    <header class="space-y-2">
      <div class="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 class="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
          Harmonogram
        </h1>

        <div class="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{{ semester.name }} {{ semester.code }}</Badge>
        </div>
      </div>

      <div class="flex h-6 items-center">
        <p class="truncate text-sm text-muted-foreground">
          Oceniane terminy całego semestru · {{ range }}
        </p>
      </div>
    </header>

    <Card class="flex flex-col">
      <CardHeader class="gap-3 pb-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div v-if="data.subjects.length > 1" class="flex flex-wrap gap-1.5">
            <button
              type="button"
              class="inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-2xs font-medium transition-colors"
              :class="
                subjectFilter === 'all'
                  ? 'border-primary/45 bg-primary/12 text-primary'
                  : 'border-border/70 text-muted-foreground hover:border-border hover:text-foreground'
              "
              :aria-pressed="subjectFilter === 'all'"
              @click="subjectFilter = 'all'"
            >
              Wszystkie przedmioty
            </button>
            <button
              v-for="subject in data.subjects"
              :key="subject.id"
              type="button"
              class="inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-2xs font-medium transition-colors"
              :class="
                subjectFilter === subject.id
                  ? 'border-primary/45 bg-primary/12 text-primary'
                  : 'border-border/70 text-muted-foreground hover:border-border hover:text-foreground'
              "
              :aria-pressed="subjectFilter === subject.id"
              @click="subjectFilter = subject.id"
            >
              {{ subject.name }}
            </button>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="item in filters"
              :key="item.id"
              type="button"
              class="inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-2xs font-medium transition-colors"
              :class="
                groupFilter === item.id
                  ? 'border-primary/45 bg-primary/12 text-primary'
                  : 'border-border/70 text-muted-foreground hover:border-border hover:text-foreground'
              "
              :aria-pressed="groupFilter === item.id"
              @click="groupFilter = item.id"
            >
              {{ item.label }}
              <span class="tnum opacity-60">{{ item.count }}</span>
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-2xs text-muted-foreground">
            {{ stats.total }} {{ termsLabel(stats.total) }} · {{ stats.points }} pkt
            <template v-if="stats.overdue"> · {{ stats.overdue }} po terminie</template>
          </p>

          <div class="flex flex-wrap gap-1.5">
            <SwitchChip v-model="hideDone">Ukryj zrobione</SwitchChip>
            <SwitchChip v-model="onlyActionable">Tylko do zrobienia teraz</SwitchChip>
          </div>
        </div>
      </CardHeader>

      <CardContent class="flex-1 pt-0">
        <div
          v-if="!groups.length"
          class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/80 px-4 py-12 text-center"
        >
          <CalendarX2 class="size-5 text-muted-foreground/70" />
          <div class="space-y-1">
            <p class="text-sm font-medium">Brak terminów w tym widoku</p>
            <p class="text-2xs text-muted-foreground">
              Zmień filtr rodzaju zajęć albo wyłącz przełączniki „ukryj zrobione” i „tylko do zrobienia teraz”.
            </p>
          </div>
          <Button variant="outline" size="sm" class="gap-1.5" @click="resetFilters">
            <RotateCcw class="size-3.5" />
            Wyczyść filtry
          </Button>
        </div>

        <div v-else class="space-y-6">
          <section v-for="group in groups" :key="group.key" class="space-y-3">
            <div class="flex items-center gap-3">
              <h2 class="eyebrow text-muted-foreground">{{ group.label }}</h2>
              <span class="h-px flex-1 bg-border/60" />
              <span class="tnum text-3xs text-muted-foreground/80">
                {{ group.terms.length }} {{ termsLabel(group.terms.length) }}
              </span>
            </div>

            <ol class="relative space-y-2.5">
              <span
                class="pointer-events-none absolute top-4 bottom-4 left-13 w-px bg-border/80"
                aria-hidden="true"
              />

              <li
                v-for="term in group.terms"
                :key="term.id"
                class="relative grid grid-cols-[3.25rem_1fr] items-start gap-4"
              >
                <div class="pt-2 text-right">
                  <div
                    class="tnum text-lg leading-none font-semibold"
                    :class="isToday(term) ? 'text-primary' : undefined"
                  >
                    {{ dayOfMonth(term.date) }}
                  </div>
                  <div class="eyebrow mt-1">{{ monthShort(term.date) }}</div>
                  <div class="mt-0.5 text-3xs text-muted-foreground/80">
                    {{ formatWeekday(term.date) }}
                  </div>
                </div>

                <div class="relative">
                  <span
                    class="absolute top-5 -left-4 size-2 -translate-x-1/2 rounded-full ring-4 ring-card"
                    :class="STATUS_DOT[termStatus(term)]"
                    aria-hidden="true"
                  />

                  <NuxtLink
                    :to="nodeLink(term)"
                    class="group block rounded-xl border border-border/70 bg-secondary/15 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-secondary/30 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                    :class="
                      isToday(term) ? 'border-primary/40 ring-1 ring-primary/25' : undefined
                    "
                  >
                    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Badge
                        :variant="term.kind === 'colloquium' ? 'default' : 'secondary'"
                        class="font-mono tracking-normal uppercase"
                      >
                        {{ TERM_KIND_SHORT[term.kind] }}
                      </Badge>
                      <span class="text-2xs text-muted-foreground">
                        {{ TERM_KIND_LABEL[term.kind] }}
                      </span>
                      <Badge
                        v-if="data.subjects.length > 1 && subjectOf(term)"
                        variant="outline"
                        class="gap-1"
                      >
                        <BookOpen class="size-3" />
                        {{ subjectOf(term)?.name }}
                      </Badge>
                      <span v-if="term.start" class="tnum text-2xs text-muted-foreground">
                        · {{ term.start }}<template v-if="term.end">-{{ term.end }}</template>
                      </span>
                      <span v-if="term.weekNo" class="tnum text-2xs text-muted-foreground/80">
                        · tydzień {{ term.weekNo }}
                      </span>
                      <span v-if="isToday(term)" class="text-2xs font-medium text-primary">
                        · dziś
                      </span>

                      <span class="ml-auto flex items-center gap-2 text-2xs">
                        <span v-if="term.pointsMax" class="tnum font-medium">
                          {{ term.pointsMax }} pkt
                        </span>
                        <span v-else class="text-muted-foreground">bez punktów</span>
                        <ArrowRight
                          class="size-3.5 -translate-x-1 text-muted-foreground/0 transition-all group-hover:translate-x-0 group-hover:text-primary"
                        />
                      </span>
                    </div>

                    <p class="mt-1.5 text-dense leading-snug font-medium text-balance">
                      {{ term.title }}
                    </p>

                    <p v-if="term.requirement" class="mt-1 text-2xs text-muted-foreground">
                      {{ term.requirement }}
                    </p>
                    <p v-if="term.notes" class="mt-0.5 text-2xs text-muted-foreground/80">
                      {{ term.notes }}
                    </p>

                    <div
                      class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-3xs text-muted-foreground"
                    >
                      <span class="inline-flex items-center gap-1">
                        <CalendarClock v-if="term.canBeDoneBefore" class="size-3" />
                        <Lock v-else class="size-3" />
                        {{ term.canBeDoneBefore ? 'przed terminem' : 'na zajęciach' }}
                      </span>
                      <span v-if="term.group" class="truncate">{{ term.group }}</span>
                      <span v-if="term.location" class="truncate">{{ term.location }}</span>

                      <span class="ml-auto flex items-center gap-1.5">
                        <span class="tnum">{{ relativeDays(term.date, nowIso) }}</span>
                        <TermStatusControl :term="term" />
                      </span>
                    </div>
                  </NuxtLink>
                </div>
              </li>
            </ol>
          </section>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
