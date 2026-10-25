<script setup lang="ts">
/** Wybór dnia nad siatką kalendarza - tylko na telefonie, gdzie siatka ma jedną kolumnę. */
defineProps<{ days: { label: string; sub?: string; today?: boolean }[] }>()

const selected = defineModel<number>({ required: true })
</script>

<template>
  <div class="mb-3 grid grid-cols-5 gap-1 sm:hidden" role="tablist" aria-label="Dzień tygodnia">
    <button
      v-for="(day, index) in days"
      :key="day.label"
      type="button"
      role="tab"
      :aria-selected="selected === index"
      class="flex flex-col items-center rounded-lg border py-1.5 transition-colors"
      :class="
        selected === index
          ? 'border-primary/45 bg-primary/12 text-primary'
          : 'border-border/60 text-muted-foreground hover:text-foreground'
      "
      @click="selected = index"
    >
      <span class="eyebrow" :class="selected === index || day.today ? 'text-primary' : undefined">
        {{ day.label }}
      </span>
      <span
        v-if="day.sub"
        class="tnum mt-0.5 text-sm leading-none font-semibold"
        :class="day.today && selected !== index ? 'text-primary' : undefined"
      >
        {{ day.sub }}
      </span>
    </button>
  </div>
</template>
