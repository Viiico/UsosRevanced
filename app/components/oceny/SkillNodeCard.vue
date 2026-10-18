<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import type { GradeNode } from '~/types'
import { terms } from '~/data/subjects'
import { computeProgress } from '~/lib/tree'
import { termsForNode } from '~/lib/requirements'
import { childSummary, nodeIcon, type NodeVisual } from '~/lib/node-meta'
import { formatDate, formatPercent } from '~/lib/format'

const props = defineProps<{ node: GradeNode; visual?: NodeVisual }>()
const emit = defineEmits<{ select: [id: string] }>()

const progress = computed(() => computeProgress(props.node))
const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0)
const hasPoints = computed(() => progress.value.max > 0)
const icon = computed(() => nodeIcon(props.node, props.visual))

const nextTerm = computed(() => termsForNode(props.node, terms)[0] ?? null)
const summary = computed(() => childSummary(props.node))
</script>

<template>
  <div
    role="button"
    tabindex="0"
    :aria-label="`Otwórz ${node.name}`"
    class="group relative flex h-full flex-col gap-3 rounded-xl border border-border/80 bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:bg-secondary/30 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    @click="emit('select', node.id)"
    @keydown.enter.prevent="emit('select', node.id)"
    @keydown.space.prevent="emit('select', node.id)"
  >
    <div class="flex items-center gap-2">
      <span
        class="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-secondary/50 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary"
      >
        <component :is="icon" class="size-4" />
      </span>

      <p class="min-w-0 flex-1 truncate text-lead leading-snug font-medium" :title="node.name">
        {{ node.short ?? node.name }}
      </p>

      <span v-if="nextTerm" class="tnum shrink-0 text-3xs text-muted-foreground">
        {{ formatDate(nextTerm.date) }}
      </span>

      <ChevronRight
        v-if="hasChildren"
        class="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
      />
    </div>

    <div class="mt-auto space-y-2">
      <div v-if="hasPoints" class="flex items-baseline justify-between gap-1">
        <span class="tnum text-2xs font-semibold whitespace-nowrap">
          {{ progress.earned }}/{{ progress.max }} pkt
        </span>
        <span class="tnum text-2xs whitespace-nowrap text-muted-foreground">
          {{ formatPercent(progress.ratio) }}
        </span>
      </div>
      <div v-else class="text-2xs text-muted-foreground">niepunktowane</div>

      <div v-if="hasPoints" class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          class="h-full rounded-full bg-primary/85 transition-all duration-500"
          :style="{ width: `${progress.ratio * 100}%` }"
        />
      </div>

      <div v-if="summary" class="truncate text-2xs text-muted-foreground">{{ summary }}</div>
    </div>
  </div>
</template>
