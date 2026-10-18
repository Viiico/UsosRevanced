<script setup lang="ts">
import { computed } from 'vue'
import { formatPercent, progressLabel } from '~/lib/format'
import { segmentColor, segmentWidth, weightSumOf } from '~/lib/segments'

const { progress, segments, score, select, children, scoringSubject, showScale } = useGrades()

const canDrill = computed(() => children.value.length > 0)
const ratio = computed(() => progress.value.ratio)

const weightSum = computed(() => weightSumOf(segments.value))

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
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">
          <span class="eyebrow">Postęp</span>
          <InfoHint
            text="Pasek sumuje postępy dzieci bieżącego poziomu. Każdy segment ma szerokość proporcjonalną do zdobytych punktów, więc wypełnienia układają się ciągiem od lewej, a pusta reszta paska pokazuje, ile jeszcze brakuje."
          />
        </div>
        <span v-if="score && showScale" class="text-[11px] text-muted-foreground">{{ score.scope }}</span>
      </div>

      <div class="mt-1 flex items-end justify-between gap-3">
        <div class="tnum text-4xl leading-none font-semibold tracking-tight">
          {{ formatPercent(ratio) }}
        </div>
        <div class="pb-1 text-right text-xs text-muted-foreground">
          <div class="tnum">
            <span class="text-sm font-medium text-foreground">{{ progress.earned }}</span> / {{ progress.max }} pkt
          </div>
          <div class="mt-0.5">{{ progressLabel(progress.gradedLeaves, progress.totalLeaves) }}</div>
        </div>
      </div>
    </CardHeader>

    <CardContent class="flex flex-1 flex-col gap-4">
      <div class="relative">
        <div class="relative h-3.5 w-full overflow-hidden rounded-full bg-muted">
          <div class="absolute inset-0 flex">
            <div
              v-for="seg in segments"
              :key="seg.id"
              class="h-full shrink-0 transition-[width] duration-700 ease-out"
              :style="{
                width: segmentWidth(seg, weightSum),
                backgroundColor: segmentColor(seg.colorIndex),
              }"
              :title="`${seg.label}: ${formatPercent(seg.ratio)} (${seg.earned}/${seg.max} pkt)`"
            />
          </div>
        </div>
        <div class="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      <ul class="space-y-1">
        <li v-for="seg in segments" :key="seg.id">
          <component
            :is="canDrill ? 'button' : 'div'"
            :type="canDrill ? 'button' : undefined"
            :class="[
              'flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors',
              canDrill ? 'hover:bg-secondary/50' : '',
            ]"
            @click="canDrill && select(seg.id)"
          >
            <span
              class="size-2.5 shrink-0 rounded-[3px]"
              :style="{ backgroundColor: segmentColor(seg.colorIndex) }"
            />
            <span class="min-w-0 flex-1 truncate text-xs">{{ seg.label }}</span>
            <span class="tnum text-[11px] text-muted-foreground">{{ seg.earned }}/{{ seg.max }}</span>
            <span class="tnum w-9 text-right text-[11px] font-medium">{{ formatPercent(seg.ratio) }}</span>
          </component>
        </li>
      </ul>

      <Separator v-if="score && showScale" class="mt-auto" />

      <div v-if="score && showScale" class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="eyebrow">Skala ocen</span>
          <span class="tnum text-[11px] text-muted-foreground">
            ocena {{ score.grade }}
          </span>
        </div>
        <div class="flex gap-1">
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
            <div class="tnum mt-0.5 text-[9px] opacity-70">{{ row.min }}</div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
