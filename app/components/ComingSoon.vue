<script setup lang="ts">
import type { Component } from 'vue'
import { ArrowRight } from 'lucide-vue-next'

defineProps<{
  icon: Component
  title: string
  description: string
  plans: string[]
  note?: string
}>()
</script>

<template>
  <Card class="relative overflow-hidden">
    <div class="paper-grain pointer-events-none absolute inset-0 opacity-[0.35]" />
    <CardContent class="relative flex flex-col items-start gap-5 p-6 sm:p-10">
      <div class="flex items-center gap-2">
        <span class="grid size-10 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
          <component :is="icon" class="size-5" />
        </span>
        <Badge variant="outline">wkrótce</Badge>
      </div>

      <div class="max-w-xl space-y-2">
        <h2 class="text-xl font-semibold tracking-tight sm:text-2xl">{{ title }}</h2>
        <p class="text-sm leading-relaxed text-muted-foreground">{{ description }}</p>
      </div>

      <ul class="grid w-full gap-2 sm:grid-cols-2">
        <li
          v-for="plan in plans"
          :key="plan"
          class="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/20 px-3 py-2.5 text-[13px] text-muted-foreground"
        >
          <ArrowRight class="mt-0.5 size-3.5 shrink-0 text-primary/70" />
          <span>{{ plan }}</span>
        </li>
      </ul>

      <p v-if="note" class="text-[11px] text-muted-foreground/80">{{ note }}</p>

      <NuxtLink
        to="/oceny"
        class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-4 text-[13px] font-medium transition-colors hover:border-primary/40 hover:text-primary"
      >
        Przejdź do zakładki Oceny
        <ArrowRight class="size-3.5" />
      </NuxtLink>
    </CardContent>
  </Card>
</template>
