<script setup lang="ts">
import { ChevronRight, FlaskConical } from 'lucide-vue-next'

const { crumbs, select, activeSubject, semester, heroMeta } = useGrades()

useHead({
  title: () => `Oceny · ${activeSubject.value?.name ?? `semestr ${semester.code}`}`,
})
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <!-- Nagłówek tylko w przedmiocie i głębiej: na semestrze „Oceny” powtarzałyby zakładkę z navbara. -->
    <header v-if="activeSubject" class="space-y-2">
      <div class="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div class="min-w-0">
          <h1 class="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
            {{ activeSubject.name }}
          </h1>
        </div>

        <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <template v-for="item in heroMeta" :key="item.id">
            <Badge v-if="item.badge" variant="secondary">{{ item.text }}</Badge>
            <span
              v-else
              class="inline-flex items-center gap-1.5 text-2xs text-muted-foreground"
            >
              <FlaskConical v-if="item.icon === 'group'" class="size-3" />
              <span v-else class="size-1 rounded-full bg-primary/50" />
              {{ item.text }}
            </span>
          </template>
        </div>
      </div>

      <div class="flex h-6 items-center">
        <nav
          aria-label="Ścieżka w drzewie ocen"
          class="flex w-full min-w-0 items-center gap-0.5 text-xs"
        >
          <!-- Jedna linia: wiersz ma stałą wysokość, więc długie nazwy ucinamy zamiast zawijać. -->
          <template v-for="(crumb, index) in crumbs" :key="crumb.id">
            <button
              v-if="index < crumbs.length - 1"
              type="button"
              class="min-w-0 truncate rounded px-1 py-0.5 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              :title="crumb.name"
              @click="select(crumb.id)"
            >
              {{ crumb.name }}
            </button>
            <span
              v-else
              class="min-w-0 shrink-0 truncate px-1 py-0.5 font-medium text-foreground max-sm:max-w-[60%]"
              :title="crumb.name"
              >{{ crumb.name }}</span
            >
            <ChevronRight
              v-if="index < crumbs.length - 1"
              class="size-3 shrink-0 text-muted-foreground/40"
            />
          </template>
        </nav>
      </div>
    </header>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <SkillTree />
      <ProgressBreakdown />
    </div>

    <RequirementList />

    <ScopedTerms />
  </div>
</template>
