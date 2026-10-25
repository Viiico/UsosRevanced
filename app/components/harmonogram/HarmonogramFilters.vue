<script setup lang="ts">
import type { Subject } from '~/types'

/**
 * Filtry harmonogramu: przedmioty, rodzaje zajęć i „Pokaż zrobione”. Ten sam pasek stoi
 * na stronie i w widoku gałęzi, na wspólnym stanie.
 */
defineProps<{
  subjects: Subject[]
  groups: { id: string; label: string; count: number }[]
}>()

const subject = defineModel<string>('subject', { required: true })
const group = defineModel<string>('group', { required: true })
const showDone = defineModel<boolean>('showDone', { required: true })

const CHIP =
  'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-2xs font-medium transition-colors'
const CHIP_ON = 'border-primary/45 bg-primary/12 text-primary'
const CHIP_OFF =
  'border-border/70 text-muted-foreground hover:border-border hover:text-foreground'
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div v-if="subjects.length > 1" class="flex flex-wrap gap-1.5">
        <button
          type="button"
          :class="[CHIP, subject === 'all' ? CHIP_ON : CHIP_OFF]"
          :aria-pressed="subject === 'all'"
          @click="subject = 'all'"
        >
          Wszystkie<span class="hidden lg:inline">&nbsp;przedmioty</span>
        </button>
        <button
          v-for="item in subjects"
          :key="item.id"
          type="button"
          :class="[CHIP, subject === item.id ? CHIP_ON : CHIP_OFF]"
          :aria-pressed="subject === item.id"
          :title="item.name"
          @click="subject = item.id"
        >
          <!-- Poniżej lg kody - pełne nazwy zajmowały 3-6 wierszy filtrów. -->
          <span class="lg:hidden">{{ item.code }}</span>
          <span class="hidden lg:inline">{{ item.name }}</span>
        </button>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="item in groups"
          :key="item.id"
          type="button"
          :class="[CHIP, group === item.id ? CHIP_ON : CHIP_OFF]"
          :aria-pressed="group === item.id"
          @click="group = item.id"
        >
          {{ item.label }}
          <span class="tnum opacity-60">{{ item.count }}</span>
        </button>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-2xs text-muted-foreground"><slot name="meta" /></p>

      <div class="flex flex-wrap items-center gap-1.5">
        <SwitchChip v-model="showDone">Pokaż zrobione</SwitchChip>
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
