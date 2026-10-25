<script setup lang="ts">
import { CalendarDays, LayoutList } from 'lucide-vue-next'

/** Przełącznik widoku w nagłówku karty kalendarza; na telefonie same ikony. */
const view = defineModel<'week' | 'compact'>({ required: true })

const OPTIONS = [
  { id: 'week', label: 'Tydzień', icon: CalendarDays },
  { id: 'compact', label: 'Kompakt', icon: LayoutList },
] as const
</script>

<template>
  <div class="inline-flex items-center gap-0.5 rounded-lg border border-border/80 bg-card p-0.5">
    <button
      v-for="option in OPTIONS"
      :key="option.id"
      type="button"
      class="inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-2xs font-medium transition-colors"
      :class="
        view === option.id
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      "
      :aria-pressed="view === option.id"
      :aria-label="option.label"
      @click="view = option.id"
    >
      <component :is="option.icon" class="size-3.5" />
      <span class="max-sm:hidden">{{ option.label }}</span>
    </button>
  </div>
</template>
