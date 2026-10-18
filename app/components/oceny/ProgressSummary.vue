<script setup lang="ts">
import { computed } from 'vue'
import { formatPercent } from '~/lib/format'
import { segmentColor, segmentWidth, weightSumOf } from '~/lib/segments'

/**
 * Poziomy pasek postępu dla niższych pięter drzewa (grupa, pojedyncza ocena).
 * Wersja pozioma, bo tam nie ma czego układać w wysokiej kolumnie obok.
 */
const { progress, segments } = useGrades()

const weightSum = computed(() => weightSumOf(segments.value))
</script>

<template>
  <Card>
    <CardContent class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">
      <div class="shrink-0 sm:w-36">
        <div class="tnum text-3xl leading-none font-semibold tracking-tight">
          {{ formatPercent(progress.ratio) }}
        </div>
        <div class="tnum mt-1.5 text-[11px] text-muted-foreground">
          {{ progress.earned }} / {{ progress.max }} pkt
        </div>
      </div>

      <div class="min-w-0 flex-1 space-y-2.5">
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

        <ul class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <li
            v-for="seg in segments"
            :key="seg.id"
            class="flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            <span
              class="size-2 shrink-0 rounded-[2px]"
              :style="{ backgroundColor: segmentColor(seg.colorIndex) }"
            />
            <span class="text-foreground">{{ seg.label }}</span>
            <span class="tnum">{{ seg.earned }}/{{ seg.max }}</span>
            <span class="tnum font-medium text-foreground">{{ formatPercent(seg.ratio) }}</span>
          </li>
        </ul>
      </div>
    </CardContent>
  </Card>
</template>
