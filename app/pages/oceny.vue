<script setup lang="ts">
import { ChevronRight, FlaskConical } from 'lucide-vue-next'

const data = useAppData()
const { crumbs, select, activeSubject, semester, heroMeta } = useGrades()

function subjectCount(count: number) {
  if (!count) return 'brak przedmiotów'
  const mod10 = count % 10
  const mod100 = count % 100
  const label =
    count === 1
      ? 'przedmiot'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'przedmioty'
        : 'przedmiotów'
  return `${count} ${label}`
}

const heading = computed(() => (activeSubject.value ? activeSubject.value.name : 'Oceny'))
const subtitle = computed(() =>
  activeSubject.value
    ? null
    : `${semester.name} ${semester.code} · ${subjectCount(data.subjects.length)}`,
)

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

      <!-- Stały wiersz meta: w semestrze podtytuł, głębiej okruszki - ta sama wysokość. -->
      <div class="flex h-6 items-center">
        <p v-if="subtitle" class="truncate text-sm text-muted-foreground">{{ subtitle }}</p>

        <nav
          v-else
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
