<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * Jednolinijkowa etykieta: pełny tekst, a gdy się nie mieści - krótka wersja
 * (np. kod przedmiotu zamiast nazwy). Dopiero gdy i ona się nie mieści, ucinamy.
 * Mierzymy niewidoczną kopię pełnego tekstu, bo zależy to od długości nazwy, nie od breakpointu.
 */
const props = defineProps<{ text: string; short?: string | null }>()

const box = ref<HTMLElement | null>(null)
const probe = ref<HTMLElement | null>(null)
const fits = ref(true)

function measure() {
  if (!box.value || !probe.value) return
  fits.value = probe.value.offsetWidth <= box.value.clientWidth
}

let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(measure)
  if (box.value) observer.observe(box.value)
  measure()
})
onBeforeUnmount(() => observer?.disconnect())
watch(() => props.text, () => requestAnimationFrame(measure))
</script>

<template>
  <span ref="box" class="relative block min-w-0 truncate" :title="text">
    <span ref="probe" aria-hidden="true" class="invisible absolute w-max whitespace-nowrap">
      {{ text }}
    </span>
    {{ fits || !short ? text : short }}
  </span>
</template>
