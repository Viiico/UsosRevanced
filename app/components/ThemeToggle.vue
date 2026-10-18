<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'

const { isDark, toggle } = useAppTheme()
</script>

<template>
  <button
    type="button"
    class="group inline-flex h-9 items-center gap-2 rounded-lg border border-border/80 bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
    :aria-label="isDark ? 'Przełącz na tryb jasny' : 'Przełącz na tryb ciemny'"
    :title="isDark ? 'Tryb jasny (schemat 1)' : 'Tryb ciemny (schemat 3)'"
    @click="toggle"
  >
    <Sun v-if="isDark" class="size-3.5 transition-transform group-hover:rotate-45" />
    <Moon v-else class="size-3.5 transition-transform group-hover:-rotate-12" />
    <span class="hidden sm:inline">{{ isDark ? 'Ciemny' : 'Jasny' }}</span>
  </button>
</template>
