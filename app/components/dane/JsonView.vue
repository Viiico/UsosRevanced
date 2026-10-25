<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

/** Podgląd JSON z podświetloną linią - sam przewija się do niej, gdy edytor zmienia pole. */
const props = defineProps<{ rows: string[]; activeLine: number }>()

const container = ref<HTMLElement | null>(null)

async function scrollToActive() {
  await nextTick()
  const box = container.value
  const target = box?.querySelector<HTMLElement>(`[data-line="${props.activeLine}"]`)
  if (!box || !target) return
  box.scrollTop = Math.max(0, target.offsetTop - box.clientHeight / 2 + target.clientHeight / 2)
}

watch(() => [props.activeLine, props.rows], scrollToActive, { immediate: true })
</script>

<template>
  <div
    ref="container"
    class="relative min-h-0 overflow-auto rounded-lg border border-border/70 bg-secondary/20 py-2"
  >
    <div class="w-max min-w-full font-mono text-3xs leading-relaxed whitespace-pre">
      <div
        v-for="(line, index) in rows"
        :key="index"
        :data-line="index"
        class="px-3"
        :class="index === activeLine ? 'bg-primary/10' : undefined"
      >{{ line || ' ' }}</div>
    </div>
  </div>
</template>
