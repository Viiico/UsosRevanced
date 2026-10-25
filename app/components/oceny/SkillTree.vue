<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowLeft, ArrowUpRight } from 'lucide-vue-next'
import { termsForNode } from '~/lib/requirements'
import { NODE_KIND_LABEL, nodeIcon } from '~/lib/node-meta'
import { formatDate, formatWeekday } from '~/lib/format'

const data = useAppData()
const { current, children, canGoUp, goUp, select, progress, subjectCode } = useGrades()

const icon = computed(() => nodeIcon(current.value))
const kindLabel = computed(() => NODE_KIND_LABEL[current.value.kind])
const nextTerm = computed(() => termsForNode(current.value, data.terms)[0] ?? null)
const hasPoints = computed(() => progress.value.max > 0)

/** Opis i założenia idą do dymka, żeby hub miał zawsze tę samą wysokość. */
const infoText = computed(() =>
  [current.value.info, current.value.assumption ? `Założenie: ${current.value.assumption}` : null]
    .filter(Boolean)
    .join(' · '),
)

/** Wcięcie szyny łączącej rodzic → dzieci: środek pierwszej i ostatniej kolumny. */
const railInset = computed(() => `${50 / Math.max(children.value.length, 1)}%`)

/**
 * Gałęzie w jednym rzędzie tylko wtedy, gdy każda karta ma miejsce na nazwę.
 * Inaczej (np. 6 przedmiotów przy 1024-1440 px) przechodzimy na siatkę kart bez linii drzewa.
 * Szerokość zależy od liczby dzieci, więc mierzymy ją zamiast zgadywać breakpointem.
 */
const MIN_BRANCH_WIDTH = 180
const branchesEl = ref<HTMLElement | null>(null)
const branchesWidth = ref(0)

watch(
  branchesEl,
  (el, _, onCleanup) => {
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      branchesWidth.value = entry?.contentRect.width ?? 0
    })
    observer.observe(el)
    onCleanup(() => observer.disconnect())
  },
  { flush: 'post' },
)

/** Krok pośredni przed siatką: rząd zostaje, ale przedmioty pokazują kod (TO, PCYB) zamiast nazwy. */
const MIN_COMPACT_BRANCH_WIDTH = 100
const branchWidth = computed(() => branchesWidth.value / children.value.length)
const compactRow = computed(
  () =>
    branchesWidth.value > 0 &&
    branchWidth.value < MIN_BRANCH_WIDTH &&
    branchWidth.value >= MIN_COMPACT_BRANCH_WIDTH &&
    children.value.every((child) => subjectCode(child)),
)
const fitsRow = computed(
  () => !branchesWidth.value || branchWidth.value >= MIN_BRANCH_WIDTH || compactRow.value,
)

/** Kolumny siatki tak, żeby rzędy były równe (6 kart → 3 + 3, a nie 4 + 2). Odstęp gap-2 = 8 px. */
const gridColumns = computed(() => {
  const count = children.value.length
  const maxColumns = Math.max(1, Math.floor((branchesWidth.value + 8) / (MIN_BRANCH_WIDTH + 8)))
  const rows = Math.ceil(count / maxColumns)
  return `repeat(${Math.ceil(count / rows)}, minmax(0, 1fr))`
})
</script>

<template>
  <Card class="flex h-full flex-col">
    <CardHeader class="min-h-[3.25rem] flex-row items-center justify-between gap-3 pb-0">
      <div class="flex items-center gap-2">
        <span class="eyebrow">Skilltree</span>
        <Separator orientation="vertical" class="h-3" />
        <span class="text-2xs text-muted-foreground">{{ kindLabel }}</span>
      </div>
      <Button v-if="canGoUp" variant="outline" size="sm" class="gap-1.5" @click="goUp">
        <ArrowLeft class="size-3.5" />
        Poziom wyżej
      </Button>
    </CardHeader>

    <CardContent class="flex flex-1 flex-col pt-3">
      <div
        class="relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/12 via-primary/[0.04] to-transparent p-4"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex h-5 items-center gap-2">
              <component :is="icon" class="size-4 shrink-0 text-primary" />
              <span class="eyebrow text-primary/80">{{ kindLabel }}</span>
              <InfoHint v-if="infoText" :text="infoText" />
            </div>

            <h2
              class="mt-1.5 h-7 truncate text-lg leading-7 font-semibold tracking-tight sm:text-xl"
              :title="current.name"
            >
              {{ current.name }}
            </h2>

            <p
              v-if="current.description"
              class="mt-1 h-5 truncate text-sm leading-5 text-muted-foreground"
              :title="current.description"
            >
              {{ current.description }}
            </p>
          </div>

          <div v-if="hasPoints" class="shrink-0 text-right">
            <div class="tnum text-2xl leading-none font-semibold">
              {{ progress.earned
              }}<span class="text-base font-normal text-muted-foreground">/{{ progress.max }}</span>
            </div>
            <div class="eyebrow mt-1.5">punktów</div>
          </div>
        </div>
      </div>

      <div
        v-if="children.length"
        ref="branchesEl"
        class="relative mt-3 flex flex-col sm:mt-5"
        :class="fitsRow ? 'sm:pt-6 lg:h-32' : undefined"
      >
        <template v-if="fitsRow">
          <!-- Pień startuje już pod kartą hubu (-top-5 zasypuje margines), inaczej wisiałby w powietrzu. -->
          <div
            class="absolute -top-5 left-1/2 hidden h-11 w-px -translate-x-1/2 bg-border sm:block"
          />
          <div
            class="absolute top-6 hidden h-px bg-border sm:block"
            :style="{ left: railInset, right: railInset }"
          />
        </template>

        <div
          class="flex flex-1 flex-col gap-2"
          :class="fitsRow ? 'sm:flex-row sm:gap-0' : 'sm:grid'"
          :style="fitsRow ? undefined : { gridTemplateColumns: gridColumns }"
        >
          <div
            v-for="child in children"
            :key="child.id"
            class="group/branch relative flex min-w-0 flex-1"
            :class="fitsRow ? 'sm:px-1.5' : undefined"
          >
            <div
              v-if="fitsRow"
              class="absolute top-0 left-1/2 hidden h-3 w-px -translate-x-1/2 bg-border sm:block"
            />
            <div class="flex min-w-0 flex-1 flex-col" :class="fitsRow ? 'sm:pt-3' : undefined">
              <SkillNodeCard
                :node="child"
                :visual="current.visual"
                :compact="compactRow"
                class="h-full"
                @select="select"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-else class="mt-5 flex flex-col gap-2 lg:h-32">
        <div
          v-if="nextTerm"
          class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-secondary/25 px-4 py-3"
        >
          <div class="min-w-0">
            <div class="eyebrow">Termin</div>
            <p class="mt-1 truncate text-sm font-medium">
              {{ formatWeekday(nextTerm.date) }}, {{ formatDate(nextTerm.date) }}
              <span v-if="nextTerm.start" class="tnum text-muted-foreground">
                · {{ nextTerm.start }}<template v-if="nextTerm.end">-{{ nextTerm.end }}</template>
              </span>
            </p>
          </div>
          <Badge v-if="nextTerm.requirement" variant="outline" class="whitespace-normal">
            {{ nextTerm.requirement }}
          </Badge>
        </div>

        <p v-else class="text-sm text-muted-foreground">Ten element nie ma jeszcze terminu.</p>

        <NuxtLink
          to="/kalendarz"
          class="mt-auto inline-flex items-center gap-1 text-2xs text-muted-foreground transition-colors hover:text-primary"
        >
          Zobacz w kalendarzu
          <ArrowUpRight class="size-3" />
        </NuxtLink>
      </div>
    </CardContent>
  </Card>
</template>
