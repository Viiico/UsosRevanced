<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import type { GradeNode } from '~/types'
import { termsForNode } from '~/lib/requirements'
import { nodeIcon, type NodeVisual } from '~/lib/node-meta'
import { formatDate } from '~/lib/format'

/** `compact` - za wąsko na nazwę: przedmiot pokazuje swój kod (TO, PCYB). */
const props = defineProps<{ node: GradeNode; visual?: NodeVisual; compact?: boolean }>()
const emit = defineEmits<{ select: [id: string] }>()

const data = useAppData()
const { subjectCode } = useGrades()
const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0)
const icon = computed(() => nodeIcon(props.node, props.visual))
/** Na poziomie semestru każde dziecko to przedmiot - ikona nic nie mówi, a zjada miejsce na nazwę. */
const showIcon = computed(() => props.node.kind !== 'subject')

const label = computed(
  () => (props.compact && subjectCode(props.node)) || props.node.short || props.node.name,
)
const nextTerm = computed(() => termsForNode(props.node, data.terms)[0] ?? null)
</script>

<template>
  <div
    role="button"
    tabindex="0"
    :aria-label="`Otwórz ${node.name}`"
    class="group @container relative flex h-full flex-col gap-3 rounded-xl border border-border/80 bg-card p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:bg-secondary/30 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    @click="emit('select', node.id)"
    @keydown.enter.prevent="emit('select', node.id)"
    @keydown.space.prevent="emit('select', node.id)"
  >
    <!-- W wąskiej karcie nazwa schodzi do osobnego wiersza (do dwóch linii), inaczej ikona i data zjadają ją całą. -->
    <div class="flex flex-wrap items-center gap-2">
      <span
        v-if="showIcon"
        class="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-secondary/50 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary"
      >
        <component :is="icon" class="size-4" />
      </span>

      <p
        class="order-last line-clamp-2 min-w-0 basis-full text-sm leading-snug font-medium break-words hyphens-auto @[18rem]:order-none @[18rem]:text-lead @[18rem]:flex-1 @[18rem]:basis-0"
        :title="node.name"
      >
        {{ label }}
      </p>

      <span v-if="nextTerm" class="tnum shrink-0 text-3xs text-muted-foreground">
        {{ formatDate(nextTerm.date) }}
      </span>

      <ChevronRight
        v-if="hasChildren"
        class="ms-auto size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
      />
    </div>
  </div>
</template>
