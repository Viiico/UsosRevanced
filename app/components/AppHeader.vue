<script setup lang="ts">
import { CalendarDays, GraduationCap, Table2 } from 'lucide-vue-next'

const route = useRoute()

const items = [
  { to: '/harmonogram', label: 'Harmonogram', icon: Table2 },
  { to: '/oceny', label: 'Oceny', icon: GraduationCap },
  { to: '/kalendarz', label: 'Kalendarz', icon: CalendarDays },
]
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
    <div class="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
      <NuxtLink to="/oceny" class="group flex items-center gap-2.5">
        <span
          class="grid size-9 place-items-center rounded-lg border border-primary/35 bg-primary/10 text-[13px] font-semibold text-primary"
        >
          UR
        </span>
        <span class="text-sm leading-none font-semibold tracking-tight">USOS Revanced</span>
      </NuxtLink>

      <nav class="ml-auto flex items-center gap-1" aria-label="Główna nawigacja">
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors"
          :class="
            route.path === item.to
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
          "
        >
          <component :is="item.icon" class="size-4" />
          <span class="hidden sm:inline">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div class="ml-1 flex items-center pl-2">
        <ThemeToggle />
      </div>
    </div>
    <div class="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
  </header>
</template>
