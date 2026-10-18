<script setup lang="ts">
import { computed } from 'vue'
import { REQUIREMENT_STATUS } from '~/lib/node-meta'

const { requirements, current } = useGrades()

const visible = computed(() => requirements.value)
</script>

<template>
  <Card v-if="visible.length">
    <CardHeader class="gap-2 pb-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2
          class="inline-block self-start border-b-2 border-primary/70 pb-1 text-lg font-semibold tracking-tight"
        >
          Warunki zaliczenia
        </h2>
        <span class="text-2xs text-muted-foreground">
          poziom: {{ current.short ?? current.name }}
        </span>
      </div>
    </CardHeader>

    <CardContent class="pt-0">
      <ul class="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
        <li v-for="req in visible" :key="req.id" class="flex items-start gap-2.5">
          <component
            :is="REQUIREMENT_STATUS[req.status].icon"
            class="mt-0.5 size-3.5 shrink-0"
            :class="REQUIREMENT_STATUS[req.status].class"
          />
          <div class="min-w-0 flex-1">
            <p
              class="text-dense leading-snug"
              :class="req.status === 'failed' ? 'text-danger' : 'text-foreground'"
            >
              {{ req.label }}
            </p>
            <p v-if="req.detail" class="tnum mt-1 text-2xs text-muted-foreground">
              {{ req.detail }}
            </p>
            <p v-if="req.note" class="mt-1 text-2xs leading-relaxed text-muted-foreground/80">
              {{ req.note }}
            </p>
          </div>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
