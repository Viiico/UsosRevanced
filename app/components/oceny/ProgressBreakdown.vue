<script setup lang="ts">
import { computed } from 'vue'
import { formatPercent } from '~/lib/format'
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
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span />
        <span class="text-sm font-semibold tracking-[0.14em] uppercase">Postęp</span>
        <span v-if="score && showScale" class="justify-self-end text-2xs text-muted-foreground">
          {{ score.scope }}
        </span>
      </div>

      <div class="mt-2 flex items-end justify-between gap-3">
        <div class="tnum text-4xl leading-none font-semibold tracking-tight">
          {{ formatPercent(ratio) }}
        </div>
        <div class="tnum pb-1 text-base">
          <span class="font-semibold">{{ progress.earned }}</span>
          <span class="text-muted-foreground">/ {{ progress.max }} pkt</span>
        </div>
      </div>
    </CardHeader>

    <CardContent class="flex flex-1 flex-col justify-between gap-4">
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
        <div class="mt-1.5 flex justify-between text-3xs text-muted-foreground">
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
            <span class="tnum w-10 text-right text-xs font-medium">{{ formatPercent(seg.ratio) }}</span>
          </component>
        </li>
      </ul>

      <div v-if="score && showScale" class="flex gap-1">
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
