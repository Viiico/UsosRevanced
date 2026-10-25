<script setup lang="ts">
import { Check } from 'lucide-vue-next'

const checked = defineModel<boolean>({ required: true })
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="checked"
    class="inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-2xs font-medium transition-colors"
    :class="
      checked
        ? 'border-primary/45 bg-primary/12 text-primary'
        : 'border-border/70 text-muted-foreground hover:border-border hover:text-foreground'
    "
    @click="checked = !checked"
  >
    <span
      class="grid size-3.5 place-items-center rounded-[4px] border transition-colors"
      :class="checked ? 'border-primary/60 bg-primary/25 text-primary' : 'border-border text-transparent'"
    >
      <Check class="size-2.5" />
    </span>
    <slot />
  </button>
</template>
