<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarClock, Check, Clock3, Lock, TriangleAlert } from 'lucide-vue-next'
import type { Term, TermKind } from '~/types'
import { TERM_KIND_LABEL, TERM_KIND_SHORT } from '~/lib/node-meta'
import { dayOfMonth, formatWeekday, monthShort, relativeDays } from '~/lib/format'

const { scopedTerms, termStatus, nowIso } = useGrades()

type Filter = 'all' | 'lab' | 'colloquium' | 'project'

const filter = ref<Filter>('all')

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Wszystko' },
  { id: 'lab', label: 'Laboratoria' },
  { id: 'colloquium', label: 'Kolokwia' },
  { id: 'project', label: 'Projekt' },
]

const projectKinds: TermKind[] = ['project-stage', 'project-deadline']

const counts = computed(() => ({
  all: scopedTerms.value.length,
  lab: scopedTerms.value.filter((t) => t.kind === 'lab').length,
  colloquium: scopedTerms.value.filter((t) => t.kind === 'colloquium').length,
  project: scopedTerms.value.filter((t) => projectKinds.includes(t.kind)).length,
}))

const visibleTerms = computed(() => {
  if (filter.value === 'all') return scopedTerms.value
  if (filter.value === 'project') {
    return scopedTerms.value.filter((t) => projectKinds.includes(t.kind))
  }
  return scopedTerms.value.filter((t) => t.kind === filter.value)
})

const STATUS_META = {
  graded: { label: 'ocenione', icon: Check, class: 'text-success' },
  overdue: { label: 'po terminie', icon: TriangleAlert, class: 'text-danger' },
  pending: { label: 'oczekuje', icon: Clock3, class: 'text-muted-foreground' },
} as const

function statusOf(term: Term) {
  return STATUS_META[termStatus(term)]
}

function badgeVariant(term: Term) {
  return termStatus(term) === 'graded'
    ? 'success'
    : termStatus(term) === 'overdue'
      ? 'destructive'
      : 'outline'
}
</script>

<template>
  <Card>
    <CardHeader class="gap-3 pb-4">
      <h2
        class="inline-block self-start border-b-2 border-primary/70 pb-1 text-lg font-semibold tracking-tight"
      >
        Harmonogram
      </h2>

      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="item in FILTERS"
          :key="item.id"
          type="button"
          class="inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-2xs font-medium transition-colors"
          :class="
            filter === item.id
              ? 'border-primary/45 bg-primary/12 text-primary'
              : 'border-border/70 text-muted-foreground hover:border-border hover:text-foreground'
          "
          @click="filter = item.id"
        >
          {{ item.label }}
          <span class="tnum opacity-60">{{ counts[item.id] }}</span>
        </button>
      </div>
    </CardHeader>

    <CardContent class="pt-0">
      <ul v-if="visibleTerms.length" class="divide-y divide-border/60">
        <li
          v-for="term in visibleTerms"
          :key="term.id"
          class="group grid grid-cols-[52px_1fr] items-start gap-3 py-3.5 transition-colors first:pt-0 last:pb-0 sm:grid-cols-[60px_1fr_auto] sm:gap-4 hover:bg-secondary/20"
        >
          <div class="shrink-0 pl-1">
            <div class="tnum text-lg leading-none font-semibold">{{ dayOfMonth(term.date) }}</div>
            <div class="eyebrow mt-1">{{ monthShort(term.date) }}</div>
            <div class="mt-0.5 text-3xs text-muted-foreground/80">
              {{ formatWeekday(term.date) }}
            </div>
          </div>

          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5">
              <Badge
                :variant="term.kind === 'colloquium' ? 'default' : 'secondary'"
                class="font-mono tracking-normal uppercase"
              >
                {{ TERM_KIND_SHORT[term.kind] }}
              </Badge>
              <span class="text-2xs text-muted-foreground">
                {{ TERM_KIND_LABEL[term.kind] }}
              </span>
              <span v-if="term.start" class="tnum text-2xs text-muted-foreground">
                · {{ term.start }}<template v-if="term.end">-{{ term.end }}</template>
              </span>
              <Tooltip>
                <TooltipTrigger>
                  <span
                    class="inline-flex items-center gap-1 text-3xs transition-colors"
                    :class="
                      term.canBeDoneBefore ? 'text-primary/80' : 'text-muted-foreground/80'
                    "
                  >
                    <CalendarClock v-if="term.canBeDoneBefore" class="size-3" />
                    <Lock v-else class="size-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {{
                    term.canBeDoneBefore
                      ? 'Można (i trzeba) zrobić przed terminem - np. etap projektu.'
                      : 'Realizacja wyłącznie w terminie zajęć - nie da się zrobić wcześniej.'
                  }}
                </TooltipContent>
              </Tooltip>
              <InfoHint
                v-if="term.notes || term.requirement"
                :text="[term.requirement, term.notes].filter(Boolean).join(' · ')"
                side="right"
                class="-ml-0.5"
              />
            </div>

            <p class="mt-1.5 pr-2 text-dense leading-snug font-medium text-balance">
              {{ term.title }}
            </p>

            <p v-if="term.requirement" class="mt-1 text-2xs text-muted-foreground">
              {{ term.requirement }}
            </p>
            <p v-if="term.notes" class="mt-0.5 text-2xs text-muted-foreground/80">
              {{ term.notes }}
            </p>
          </div>

          <div class="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-start sm:gap-1.5">
            <div class="tnum text-xs font-medium">
              <template v-if="term.pointsMax">
                {{ term.pointsMax }} pkt
              </template>
              <span v-else class="text-muted-foreground">bez punktów</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="tnum text-3xs text-muted-foreground/70">
                {{ relativeDays(term.date, nowIso) }}
              </span>
              <Badge :variant="badgeVariant(term)" class="gap-1">
                <component :is="statusOf(term).icon" class="size-3" />
                {{ statusOf(term).label }}
              </Badge>
            </div>
          </div>
        </li>
      </ul>

      <div
        v-else
        class="rounded-lg border border-dashed border-border/80 px-4 py-10 text-center text-sm text-muted-foreground"
      >
        Brak terminów w tym widoku.
      </div>
    </CardContent>
  </Card>
</template>
