<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CalendarX2,
  GitGraph,
  Lock,
  RotateCcw,
  X,
} from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import type { Term, TermStatus } from '~/types'
import {
  TERM_GROUP,
  TERM_GROUP_LABEL,
  TERM_KIND_LABEL,
  TERM_KIND_SHORT,
} from '~/lib/node-meta'
import {
  dayOfMonth,
  formatWeekday,
  monthLabel,
  monthShort,
  relativeDays,
  termsLabel,
} from '~/lib/format'

useHead({ title: 'Harmonogram' })

const data = useAppData()
const { termStatus, termPoints, nowIso } = useGrades()

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
const showDone = useShowDoneTerms()

const today = computed(() => nowIso.value.slice(0, 10))

/** Wszystkie filtry poza rodzajem zajęć - z tego liczymy liczniki przy rodzajach. */
const scoped = computed(() =>
  items.value
    .filter((term) => subjectFilter.value === 'all' || term.subjectId === subjectFilter.value)
    .filter((term) => showDone.value || termStatus(term) !== 'done'),
)

const filters = computed(() => {
  // Kolejność z pełnej listy, żeby chipy nie skakały przy zmianie przedmiotu.
  const counts = new Map<string, number>()
  for (const term of items.value) counts.set(TERM_GROUP[term.kind], 0)
  for (const term of scoped.value) {
    const group = TERM_GROUP[term.kind]
    counts.set(group, (counts.get(group) ?? 0) + 1)
  }
  return [
    { id: 'all', label: 'Wszystko', count: scoped.value.length },
    ...[...counts]
      .filter(([id, count]) => count > 0 || id === groupFilter.value)
      .map(([id, count]) => ({ id, label: TERM_GROUP_LABEL[id] ?? id, count })),
  ]
})

const visible = computed(() =>
  scoped.value
    .filter((term) => groupFilter.value === 'all' || TERM_GROUP[term.kind] === groupFilter.value)
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
  points: visible.value.reduce((sum, term) => sum + (termPoints(term) ?? 0), 0),
}))

function byDate(a: Term, b: Term) {
  return `${a.date}${a.start ?? ''}`.localeCompare(`${b.date}${b.start ?? ''}`)
}

function subjectOf(term: Term) {
  return data.subjects.find((subject) => subject.id === term.subjectId) ?? null
}

function isToday(term: Term) {
  return term.date === today.value
}

/** Kolor ramki: „dziś” złote, „po terminie” delikatnie czerwone - jedyny stan, który wymaga reakcji. */
function cardTone(term: Term) {
  if (focusedTermId.value === term.id) return 'border-primary/70 ring-2 ring-primary/40'
  if (isToday(term)) return 'border-primary/40 ring-1 ring-primary/25 hover:border-primary/60'
  if (termStatus(term) === 'overdue') return 'border-danger/35 hover:border-danger/55'
  return 'border-border/70 hover:border-primary/40'
}

/**
 * Wejście z kalendarza: `?term=` przewija do terminu i na chwilę go podświetla,
 * `?subject=` / `?group=` ustawiają filtry.
 */
const route = useRoute()
const focusedTermId = ref<string | null>(null)

/** Przewija do karty terminu i na chwilę ją podświetla - z kalendarza i z widoku gałęzi. */
async function focusTerm(termId: string) {
  const term = items.value.find((item) => item.id === termId)
  if (!term) return
  if (termStatus(term) === 'done') showDone.value = true
  focusedTermId.value = term.id
  await nextTick()
  document.getElementById(`term-${term.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  setTimeout(() => {
    if (focusedTermId.value === term.id) focusedTermId.value = null
  }, 2500)
}

onMounted(() => {
  const { subject, group, term: termId } = route.query
  if (typeof subject === 'string') subjectFilter.value = subject
  if (typeof group === 'string') groupFilter.value = group
  if (typeof termId === 'string') focusTerm(termId)
})

/** Widok gałęzi (popup): te same filtry, klik w commit zamyka go i pokazuje kartę. */
const graphOpen = ref(false)

function openFromGraph(termId: string) {
  graphOpen.value = false
  focusTerm(termId)
}

function nodeLink(term: Term) {
  return { path: '/oceny', query: term.nodeId ? { node: term.nodeId } : {} }
}

function resetFilters() {
  subjectFilter.value = 'all'
  groupFilter.value = 'all'
  showDone.value = false
}
</script>

<template>
  <div class="space-y-5">
    <Card class="flex flex-col">
      <CardHeader class="pb-4">
        <HarmonogramFilters
          v-model:subject="subjectFilter"
          v-model:group="groupFilter"
          v-model:show-done="showDone"
          :subjects="data.subjects"
          :groups="filters"
        >
          <template #meta>
            {{ stats.total }} {{ termsLabel(stats.total) }} · {{ stats.points }} pkt
            <template v-if="stats.overdue"> · {{ stats.overdue }} po terminie</template>
          </template>
          <template #actions>
            <button
              type="button"
              aria-label="Widok gałęzi"
              title="Widok gałęzi"
              class="grid size-7 place-items-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/45 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              @click="graphOpen = true"
            >
              <GitGraph class="size-3.5" />
            </button>
          </template>
        </HarmonogramFilters>
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
              Zmień filtr rodzaju zajęć albo włącz „pokaż zrobione”.
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
                class="pointer-events-none absolute top-4 bottom-4 left-14 w-px bg-border/80"
                aria-hidden="true"
              />

              <li
                v-for="term in group.terms"
                :id="`term-${term.id}`"
                :key="term.id"
                class="relative grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-6"
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
                    class="absolute top-5 -left-3 size-2 -translate-x-1/2 rounded-full ring-4 ring-card"
                    :class="STATUS_DOT[termStatus(term)]"
                    aria-hidden="true"
                  />

                  <NuxtLink
                    :to="nodeLink(term)"
                    class="group block rounded-xl border bg-secondary/15 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary/30 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                    :class="cardTone(term)"
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
                        class="max-w-full min-w-0 gap-1"
                        :title="subjectOf(term)?.name"
                      >
                        <BookOpen class="size-3" />
                        <!-- Poniżej xl kod przedmiotu - pełna nazwa (np. PSIR) łamała nagłówek na kilka linii. -->
                        <span class="xl:hidden">{{ subjectOf(term)?.code }}</span>
                        <span class="hidden truncate xl:inline">{{ subjectOf(term)?.name }}</span>
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
                        <span v-if="termPoints(term)" class="tnum font-medium">
                          {{ termPoints(term) }} pkt
                        </span>
                        <span v-else class="text-muted-foreground max-sm:hidden">bez punktów</span>
                        <ArrowRight
                          class="size-3.5 -translate-x-1 text-muted-foreground/0 transition-all group-hover:translate-x-0 group-hover:text-primary"
                        />
                      </span>
                    </div>

                    <!--
                      Tytuł i szczegóły w jednym wierszu. Szczegóły to inline-block: gdy nie mieszczą się
                      obok tytułu, przechodzą w całości do nowego wiersza zamiast łamać się w połowie.
                    -->
                    <p class="mt-1.5 text-2xs leading-snug text-muted-foreground">
                      <span class="me-2 text-dense font-medium text-foreground">{{ term.title }}</span>
                      <span v-if="term.requirement || term.notes" class="inline-block max-w-full">
                        {{ [term.requirement, term.notes].filter(Boolean).join(' · ') }}
                      </span>
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
                        <span class="tnum whitespace-nowrap">{{ relativeDays(term.date, nowIso) }}</span>
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

    <DialogRoot v-model:open="graphOpen">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
        <DialogContent
          class="fixed inset-x-2 top-4 bottom-4 z-50 mx-auto flex max-w-4xl flex-col gap-4 rounded-xl border border-border/80 bg-card p-4 shadow-xl focus:outline-none sm:inset-x-6 sm:top-[6vh] sm:bottom-[6vh] sm:p-5"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <GitGraph class="size-4 text-primary" />
              <DialogTitle class="text-lg font-semibold tracking-tight">Gałęzie</DialogTitle>
            </div>
            <DialogClose
              aria-label="Zamknij"
              class="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X class="size-4" />
            </DialogClose>
          </div>
          <DialogDescription class="sr-only">
            Terminy ułożone jak gałęzie w git - jedna gałąź na przedmiot, najstarszy na górze.
          </DialogDescription>

          <HarmonogramFilters
            v-model:subject="subjectFilter"
            v-model:group="groupFilter"
            v-model:show-done="showDone"
            :subjects="data.subjects"
            :groups="filters"
          >
            <template #meta>
              {{ stats.total }} {{ termsLabel(stats.total) }} · {{ stats.points }} pkt
            </template>
          </HarmonogramFilters>

          <div class="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
            <HarmonogramGraph
              v-if="visible.length"
              :terms="visible"
              :subjects="data.subjects"
              :today="today"
              @select="openFromGraph"
            />
            <p v-else class="py-10 text-center text-sm text-muted-foreground">
              Brak terminów w tym widoku.
            </p>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
