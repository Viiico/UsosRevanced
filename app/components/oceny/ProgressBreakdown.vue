<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChartPie, X } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { formatPercent } from '~/lib/format'
import { segmentColor, segmentWidth } from '~/lib/segments'

const {
  current,
  progress,
  segments,
  segmentDenominator,
  score,
  select,
  children,
  scoringSubject,
  showScale,
} = useGrades()

/** Koło postępu w popupie: klik w pasmo przechodzi do tej oceny w skilltree. */
const pieOpen = ref(false)
function openFromPie(id: string) {
  pieOpen.value = false
  select(id)
}

const canDrill = computed(() => children.value.length > 0)

const scaleRows = computed(() => {
  const subject = scoringSubject.value
  if (!score.value || !subject || !showScale.value) return []
  return [...subject.policy.gradeScale]
    .sort((a, b) => a.min - b.min)
    .map((row) => ({ ...row, achieved: row.grade === score.value!.grade }))
})
</script>

<template>
  <Card class="flex h-full flex-col">
    <CardHeader class="pb-3">
      <div class="relative flex items-center justify-center">
        <span class="text-sm font-semibold tracking-[0.14em] uppercase">Postęp</span>
        <button
          v-if="segments.length"
          type="button"
          aria-label="Koło postępu"
          title="Koło postępu"
          class="absolute right-0 grid size-7 place-items-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/45 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          @click="pieOpen = true"
        >
          <ChartPie class="size-3.5" />
        </button>
      </div>
    </CardHeader>

    <CardContent class="@container flex flex-1 flex-col gap-4">
      <template v-if="segments.length">
        <div class="relative">
          <div class="relative h-3.5 w-full overflow-hidden rounded-full bg-muted">
            <div class="absolute inset-0 flex">
              <div
                v-for="seg in segments"
                :key="seg.id"
                class="h-full shrink-0 transition-[width] duration-700 ease-out"
                :style="{
                  width: segmentWidth(seg, segmentDenominator),
                  backgroundColor: segmentColor(seg.colorIndex),
                }"
                :title="`${seg.label}: ${formatPercent(seg.ratio)} (${seg.earned}/${seg.max} pkt)`"
              />
            </div>
          </div>
          <div class="tnum mt-1.5 text-xs font-semibold">
            {{ formatPercent(progress.ratio) }}
          </div>
        </div>

        <!-- Dwie kolumny dopiero w szerokiej karcie - obok skilltree karta ma ~1/3 strony i nazwy by znikały. -->
        <ul
          class="grid grid-cols-1 gap-x-4 gap-y-1"
          :class="segments.length > 2 ? '@[36rem]:grid-cols-2' : undefined"
        >
          <li v-for="seg in segments" :key="seg.id">
            <component
              :is="canDrill ? 'button' : 'div'"
              :type="canDrill ? 'button' : undefined"
              :class="[
                'flex w-full items-center gap-3 rounded-md px-1.5 py-2 text-left transition-colors',
                canDrill ? 'hover:bg-secondary/50' : '',
              ]"
              @click="canDrill && select(seg.id)"
            >
              <span
                class="size-3 shrink-0 rounded-sm"
                :style="{ backgroundColor: segmentColor(seg.colorIndex) }"
              />
              <FitLabel :text="seg.label" :short="seg.code" class="flex-1 text-dense" />
              <span class="tnum text-xs text-muted-foreground">{{ seg.earned }}/{{ seg.max }}</span>
              <span class="tnum w-10 text-right text-xs font-medium">
                {{ formatPercent(seg.ratio) }}
              </span>
            </component>
          </li>
        </ul>
      </template>

      <div
        v-else
        class="rounded-lg border border-dashed border-border/70 px-3 py-5 text-center"
      >
        <p class="text-2xs font-medium">Brak elementów do policzenia</p>
        <p class="mt-0.5 text-3xs text-muted-foreground">
          Dodaj grupy i oceny w zakładce Dane (albo ustaw wagi istniejącym).
        </p>
      </div>

      <div v-if="score && showScale" class="mt-auto flex gap-1">
        <div
          v-for="row in scaleRows"
          :key="row.grade"
          class="flex-1 rounded-md border px-1 py-1.5 text-center transition-colors"
          :class="
            row.achieved
              ? 'border-primary/50 bg-primary/15 text-primary'
              : 'border-border/60 bg-secondary/25 text-muted-foreground'
          "
        >
          <div class="tnum text-xs font-semibold">{{ row.grade }}</div>
          <div class="tnum mt-0.5 text-4xs opacity-70">{{ row.min }}</div>
        </div>
      </div>
    </CardContent>
  </Card>

  <DialogRoot v-model:open="pieOpen">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
      <DialogContent
        class="fixed inset-x-2 top-1/2 z-50 mx-auto flex max-h-[calc(100dvh-2rem)] max-w-xl -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-xl border border-border/80 bg-card p-4 shadow-xl focus:outline-none sm:p-5"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-2">
            <ChartPie class="size-4 shrink-0 text-primary" />
            <DialogTitle class="truncate text-lg font-semibold tracking-tight">
              {{ current.short || current.name }}
            </DialogTitle>
          </div>
          <DialogClose
            aria-label="Zamknij"
            class="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X class="size-4" />
          </DialogClose>
        </div>
        <DialogDescription class="sr-only">
          Koło postępu: wycinki to przedmioty i grupy ocen, pasma od środka - pojedyncze oceny.
        </DialogDescription>
        <ProgressPie :root="current" @select="openFromPie" />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
