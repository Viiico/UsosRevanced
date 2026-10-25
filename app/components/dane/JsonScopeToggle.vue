<script setup lang="ts">
/** Zakres podglądu JSON: tylko zaznaczony element albo cały dokument. */
const scope = defineModel<'element' | 'all'>({ required: true })

const OPTIONS = [
  { id: 'element', label: 'Element' },
  { id: 'all', label: 'Całość' },
] as const
</script>

<template>
  <div class="inline-flex items-center gap-0.5 rounded-lg border border-border/80 bg-card p-0.5">
    <button
      v-for="option in OPTIONS"
      :key="option.id"
      type="button"
      class="inline-flex h-6 items-center rounded-md px-2 text-2xs font-medium transition-colors"
      :class="
        scope === option.id
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      "
      :aria-pressed="scope === option.id"
      @click="scope = option.id"
    >
      {{ option.label }}
    </button>
  </div>
</template>
