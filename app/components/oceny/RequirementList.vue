<script setup lang="ts">
import { computed } from 'vue'
import { REQUIREMENT_STATUS } from '~/lib/node-meta'

const { requirements } = useGrades()

const visible = computed(() => requirements.value)
</script>

<template>
  <!-- Jeden wiersz: tytuł po lewej, warunki (z bieżącym stanem) po prawej. Poziom widać w skilltree. -->
  <Card v-if="visible.length">
    <CardHeader class="flex-row flex-wrap items-center justify-between gap-x-8 gap-y-3">
      <h2
        class="inline-block self-start border-b-2 border-primary/70 pb-1 text-lg font-semibold tracking-tight"
      >
        Warunki zaliczenia
      </h2>

      <ul class="flex flex-wrap items-center gap-x-6 gap-y-2">
        <li v-for="req in visible" :key="req.id" class="flex min-w-0 items-center gap-2">
          <component
            :is="REQUIREMENT_STATUS[req.status].icon"
            class="size-3.5 shrink-0"
            :class="REQUIREMENT_STATUS[req.status].class"
          />
          <span
            class="text-dense"
            :class="req.status === 'failed' ? 'text-danger' : 'text-foreground'"
          >
            {{ req.label }}
          </span>
          <span v-if="req.detail" class="tnum text-2xs text-muted-foreground">
            · {{ req.detail }}
          </span>
          <InfoHint v-if="req.note" :text="req.note" />
        </li>
      </ul>
    </CardHeader>
  </Card>
</template>
