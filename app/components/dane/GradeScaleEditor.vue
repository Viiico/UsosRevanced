<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import type { Subject } from '~/types'
import { syncPassingFromScale } from '~/lib/policy'

/**
 * Skala ocen przedmiotu (progi punktowe). Najniższa pozytywna ocena wyznacza próg
 * zaliczenia - po każdej zmianie pole „Próg zaliczenia” i warunek „Łącznie min.” idą za nią.
 */
const props = defineProps<{ subject: Subject }>()

const INPUT =
  'h-8 w-full rounded-md border border-border/80 bg-secondary/20 px-2 text-2xs text-foreground outline-none transition-colors focus:border-primary/50'
const LABEL = 'text-3xs font-medium tracking-wide text-muted-foreground uppercase'

/** Od najwyższej oceny, jak w karcie przedmiotu. */
const rows = computed(() => [...props.subject.policy.gradeScale].sort((a, b) => b.min - a.min))

function patchMin(row: { min: number }, event: Event) {
  const raw = (event.target as HTMLInputElement).value.trim()
  row.min = raw === '' ? 0 : Number(raw)
  syncPassingFromScale(props.subject)
}

function patchGrade(row: { grade: string }, event: Event) {
  row.grade = (event.target as HTMLInputElement).value
}

function addRow() {
  const top = rows.value[0]?.min ?? 0
  props.subject.policy.gradeScale.push({ min: top + 10, grade: '' })
}

function removeRow(row: { min: number; grade: string }) {
  props.subject.policy.gradeScale = props.subject.policy.gradeScale.filter((item) => item !== row)
  syncPassingFromScale(props.subject)
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-2">
      <span :class="LABEL">Skala ocen (od ilu punktów)</span>
      <Button variant="outline" size="sm" class="h-7 gap-1 text-2xs" @click="addRow">
        <Plus class="size-3" />
        Próg
      </Button>
    </div>

    <ul class="space-y-1.5">
      <li
        v-for="(row, index) in rows"
        :key="index"
        class="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2"
      >
        <input
          :class="INPUT"
          :value="row.grade"
          aria-label="Ocena"
          placeholder="ocena"
          @input="patchGrade(row, $event)"
        />
        <input
          :class="INPUT"
          type="number"
          min="0"
          :value="row.min"
          aria-label="Próg punktowy"
          @input="patchMin(row, $event)"
        />
        <button
          type="button"
          aria-label="Usuń próg"
          class="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-danger"
          @click="removeRow(row)"
        >
          <Trash2 class="size-3.5" />
        </button>
      </li>
    </ul>

    <p class="text-3xs text-muted-foreground">
      Najniższa ocena z progiem większym od 0 wyznacza próg zaliczenia
      ({{ subject.policy.passingPoints }} pkt).
    </p>
  </div>
</template>
