<script setup lang="ts">
import { computed } from 'vue'
import { formatPercent } from '~/lib/format'
import { segmentColor, segmentWidth } from '~/lib/segments'

const { progress, segments, segmentDenominator, score, select, children, scoringSubject, showScale } =
  useGrades()

const canDrill = computed(() => children.value.length > 0)
const ratio = computed(() => progress.value.ratio)

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
      <div class="flex items-center justify-center">
        <span class="text-sm font-semibold tracking-[0.14em] uppercase">Postęp</span>
      </div>

      <div class="mt-2 flex items-end justify-between gap-3">
        <div class="tnum text-4xl leading-none font-semibold tracking-tight">
          {{ formatPercent(ratio) }}
        </div>
      </div>
    </CardHeader>

    <CardContent class="flex flex-1 flex-col gap-4">
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
          <div class="mt-1.5 flex justify-between text-3xs text-muted-foreground">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        <ul
          class="grid gap-x-4 gap-y-1"
          :class="segments.length > 2 ? 'grid-cols-2' : 'grid-cols-1'"
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
              <span class="min-w-0 flex-1 truncate text-dense">{{ seg.label }}</span>
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
</template>
