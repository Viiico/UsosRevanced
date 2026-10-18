<script setup lang="ts">
import { ChevronRight, FlaskConical } from 'lucide-vue-next'

const { current, path, crumbs, select, activeSubject, scoringSubject, semester } = useGrades()

/**
 * Poniżej przedmiotu drzewo układa kafle w zawijany rząd zamiast jednej linii
 * z łącznikami, żeby szeroka kolumna nie rozciągała trzech kart na całą szerokość.
 */
const isDeepLevel = computed(() => path.value.length > 2)

const heading = computed(() => (activeSubject.value ? activeSubject.value.name : 'Oceny'))
const subtitle = computed(() =>
  activeSubject.value
    ? null
    : `${semester.name} ${semester.code} · ${scoringSubject.value ? '1 przedmiot' : 'brak przedmiotów'}`,
)

const ects = computed(() =>
  activeSubject.value ? `${activeSubject.value.policy.ects} ECTS` : null,
)

const hours = computed(() => {
  const subject = activeSubject.value
  if (!subject) return null
  const { lecture, lab, project } = subject.policy.hours
  return `${lecture} h wykładu · ${lab} h laboratorium · ${project} h projektu`
})

useHead({
  title: () => `Oceny · ${activeSubject.value?.name ?? `semestr ${semester.code}`}`,
})
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <header class="space-y-2">
      <div class="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div class="min-w-0">
          <h1 class="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
            {{ heading }}
          </h1>
        </div>

        <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <template v-if="activeSubject">
            <span class="inline-flex items-center gap-1.5 text-2xs text-muted-foreground">
              <FlaskConical class="size-3" />
              grupa {{ activeSubject.group ?? '-' }}
            </span>
            <span
              v-for="teacher in activeSubject.teachers"
              :key="teacher.name"
              class="inline-flex items-center gap-1.5 text-2xs text-muted-foreground"
            >
              <span class="size-1 rounded-full bg-primary/50" />
              {{ teacher.name }}
            </span>
          </template>
          <Badge v-if="ects" variant="secondary">{{ ects }}</Badge>
          <Badge v-if="hours" variant="secondary" class="hidden sm:inline-flex">{{ hours }}</Badge>
        </div>
      </div>

      <!-- Stały wiersz meta: w semestrze podtytuł, głębiej okruszki - ta sama wysokość. -->
      <div class="flex h-6 items-center">
        <p v-if="subtitle" class="truncate text-sm text-muted-foreground">{{ subtitle }}</p>

        <nav
          v-else
          aria-label="Ścieżka w drzewie ocen"
          class="flex w-full flex-wrap items-center gap-0.5 text-xs"
        >
          <template v-for="(crumb, index) in crumbs" :key="crumb.id">
            <button
              v-if="index < crumbs.length - 1"
              type="button"
              class="rounded px-1 py-0.5 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              @click="select(crumb.id)"
            >
              {{ crumb.name }}
            </button>
            <span v-else class="px-1 py-0.5 font-medium text-foreground">{{ crumb.name }}</span>
            <ChevronRight
              v-if="index < crumbs.length - 1"
              class="size-3 shrink-0 text-muted-foreground/40"
            />
          </template>
        </nav>
      </div>
    </header>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <SkillTree :compact="isDeepLevel" />
      <ProgressBreakdown />
    </div>

    <RequirementList />

    <ScopedTerms />
  </div>
</template>
