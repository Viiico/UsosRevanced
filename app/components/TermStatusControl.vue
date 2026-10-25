<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import type { Term } from '~/types'
import { TERM_STATUS } from '~/lib/node-meta'

/**
 * Stan terminu + ręczne „zrobione”. Po terminie bez oceny dane nie mówią, czy
 * zadanie przepadło, czy tylko czeka na ocenę - to rozstrzyga użytkownik.
 * Stan `upcoming` jest domyślny i nie dostaje plakietki.
 */
const props = defineProps<{ term: Term }>()

const { termStatus } = useGrades()

const status = computed(() => termStatus(props.term))
const meta = computed(() => TERM_STATUS[status.value])
/** Ocena w danych przesądza sprawę - wtedy nie ma czego przełączać. */
const graded = computed(() => status.value === 'done' && !props.term.submitted)

function toggle() {
  props.term.submitted = !props.term.submitted
}
</script>

<template>
  <span class="inline-flex items-center gap-1.5">
    <button
      v-if="!graded"
      type="button"
      :aria-pressed="!!term.submitted"
      class="inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-3xs font-medium transition-colors"
      :class="
        term.submitted
          ? 'border-primary/45 bg-primary/12 text-primary'
          : 'border-border/70 text-muted-foreground hover:border-border hover:text-foreground'
      "
      @click.prevent.stop="toggle"
    >
      <span
        class="grid size-3 place-items-center rounded-[3px] border transition-colors"
        :class="
          term.submitted ? 'border-primary/60 bg-primary/25 text-primary' : 'border-border text-transparent'
        "
      >
        <Check class="size-2" />
      </span>
      zrobione
    </button>

    <!-- Ręczne „zrobione” bez punktów mówi już samo za siebie - druga plakietka by je dublowała. -->
    <Badge v-if="status !== 'upcoming' && !(status === 'done' && term.submitted)" :variant="meta.variant" class="gap-1">
      <component :is="meta.icon" class="size-3" />
      {{ meta.label }}
    </Badge>
  </span>
</template>
