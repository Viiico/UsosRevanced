<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight, Plus, Trash2 } from 'lucide-vue-next'
import type { GradeNode, Subject, Term, TermKind } from '~/types'
import { TERM_KIND_LABEL } from '~/lib/node-meta'
import { formatDate } from '~/lib/format'
import { base } from '~/data'

/**
 * Terminy przedmiotu: data, godziny, sala, powiązana ocena. Zmiany od razu trafiają do
 * kalendarza i harmonogramu (to ten sam `state.terms`).
 */
const props = defineProps<{ subject: Subject }>()

const state = useAppData()

const INPUT =
  'h-8 w-full rounded-md border border-border/80 bg-secondary/20 px-2 text-2xs text-foreground outline-none transition-colors focus:border-primary/50'
const LABEL = 'text-3xs font-medium tracking-wide text-muted-foreground uppercase'

const KINDS = Object.keys(TERM_KIND_LABEL) as TermKind[]

const terms = computed(() =>
  state.terms
    .filter((term) => term.subjectId === props.subject.id)
    .slice()
    .sort((a, b) => `${a.date}${a.start ?? ''}`.localeCompare(`${b.date}${b.start ?? ''}`)),
)

const openId = ref<string | null>(null)

/** Węzły przedmiotu do powiązania z terminem, z pełną ścieżką („Laboratorium › Lab 1”). */
const nodeOptions = computed(() => {
  const out: { id: string; label: string; leaf: boolean }[] = []
  const walk = (node: GradeNode, trail: string[]) => {
    for (const child of node.children ?? []) {
      const label = [...trail, child.short || child.name]
      out.push({ id: child.id, label: label.join(' › '), leaf: !child.children?.length })
      walk(child, label)
    }
  }
  walk(props.subject.tree, [])
  return out
})

function findNodeIn(node: GradeNode, id: string): GradeNode | null {
  if (node.id === id) return node
  for (const child of node.children ?? []) {
    const found = findNodeIn(child, id)
    if (found) return found
  }
  return null
}

/** Numer tygodnia z kalendarza semestru (tylko gdy edytujemy semestr z pliku bazowego). */
function weekNoFor(date: string): number | undefined {
  if (base.semester.id !== state.semester.id) return undefined
  return base.semester.weeks.find((week) => week.no && week.from <= date && date <= week.to)?.no
}

function setText(term: Term, key: 'title' | 'location' | 'group' | 'requirement' | 'notes', event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (value) term[key] = value
  else delete term[key]
}

function setTime(term: Term, key: 'start' | 'end', event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (value) term[key] = value
  else delete term[key]
}

function setDate(term: Term, event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (!value) return
  term.date = value
  const weekNo = weekNoFor(value)
  if (weekNo) term.weekNo = weekNo
  else delete term.weekNo
}

function setKind(term: Term, event: Event) {
  term.kind = (event.target as HTMLSelectElement).value as TermKind
}

function setNode(term: Term, event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value) term.nodeId = value
  else {
    delete term.nodeId
    delete term.pointsMax
  }
}

/**
 * „Oceniany”: termin zamyka ocenę z punktami. Same punkty termin bierze na bieżąco z drzewa
 * (useGrades.termPoints), `pointsMax` jest tylko znacznikiem.
 */
function setGraded(term: Term, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  if (checked && term.nodeId) {
    const node = findNodeIn(props.subject.tree, term.nodeId)
    term.pointsMax = node?.points?.max ?? 0
  } else delete term.pointsMax
}

function setBefore(term: Term, event: Event) {
  term.canBeDoneBefore = (event.target as HTMLInputElement).checked
}

function addTerm() {
  const id = `${props.subject.id}-term-${Date.now().toString(36)}`
  const today = new Date().toISOString().slice(0, 10)
  const date =
    today >= state.semester.startsAt && today <= state.semester.endsAt ? today : state.semester.startsAt
  const term: Term = {
    id,
    subjectId: props.subject.id,
    kind: 'lab',
    title: 'Nowy termin',
    date,
    start: '08:15',
    end: '10:00',
    canBeDoneBefore: false,
  }
  const weekNo = weekNoFor(date)
  if (weekNo) term.weekNo = weekNo
  state.terms.push(term)
  openId.value = id
}

function removeTerm(term: Term) {
  state.terms = state.terms.filter((item) => item.id !== term.id)
  if (openId.value === term.id) openId.value = null
}

function isLeaf(nodeId?: string) {
  return !!nodeId && !!nodeOptions.value.find((option) => option.id === nodeId)?.leaf
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-2">
      <span :class="LABEL">Terminy ({{ terms.length }})</span>
      <Button variant="outline" size="sm" class="h-7 gap-1 text-2xs" @click="addTerm">
        <Plus class="size-3" />
        Termin
      </Button>
    </div>

    <ul class="divide-y divide-border/60 rounded-lg border border-border/70">
      <li v-for="term in terms" :key="term.id">
        <button
          type="button"
          class="flex w-full items-center gap-2 px-2.5 py-2 text-left text-2xs transition-colors hover:bg-secondary/40"
          :aria-expanded="openId === term.id"
          @click="openId = openId === term.id ? null : term.id"
        >
          <ChevronRight
            class="size-3.5 shrink-0 text-muted-foreground transition-transform"
            :class="openId === term.id ? 'rotate-90' : undefined"
          />
          <span class="tnum w-14 shrink-0 text-muted-foreground">{{ formatDate(term.date) }}</span>
          <span class="w-24 shrink-0 truncate text-muted-foreground max-sm:hidden">
            {{ TERM_KIND_LABEL[term.kind] }}
          </span>
          <span class="min-w-0 flex-1 truncate font-medium">{{ term.title }}</span>
          <span v-if="term.start" class="tnum shrink-0 text-muted-foreground">
            {{ term.start }}<template v-if="term.end">-{{ term.end }}</template>
          </span>
        </button>

        <div v-if="openId === term.id" class="grid gap-2.5 border-t border-border/60 p-2.5 sm:grid-cols-2">
          <label class="space-y-1 sm:col-span-2">
            <span :class="LABEL">Tytuł</span>
            <input :class="INPUT" :value="term.title" @input="setText(term, 'title', $event)" />
          </label>
          <label class="space-y-1">
            <span :class="LABEL">Rodzaj</span>
            <select :class="INPUT" :value="term.kind" @change="setKind(term, $event)">
              <option v-for="kind in KINDS" :key="kind" :value="kind">{{ TERM_KIND_LABEL[kind] }}</option>
            </select>
          </label>
          <label class="space-y-1">
            <span :class="LABEL">Data</span>
            <input :class="INPUT" type="date" :value="term.date" @input="setDate(term, $event)" />
          </label>
          <label class="space-y-1">
            <span :class="LABEL">Od</span>
            <input :class="INPUT" type="time" :value="term.start ?? ''" @input="setTime(term, 'start', $event)" />
          </label>
          <label class="space-y-1">
            <span :class="LABEL">Do (lub godzina oddania)</span>
            <input :class="INPUT" type="time" :value="term.end ?? ''" @input="setTime(term, 'end', $event)" />
          </label>
          <label class="space-y-1">
            <span :class="LABEL">Sala</span>
            <input :class="INPUT" :value="term.location ?? ''" @input="setText(term, 'location', $event)" />
          </label>
          <label class="space-y-1">
            <span :class="LABEL">Grupa</span>
            <input :class="INPUT" :value="term.group ?? ''" @input="setText(term, 'group', $event)" />
          </label>
          <label class="space-y-1 sm:col-span-2">
            <span :class="LABEL">Powiązana ocena</span>
            <select :class="INPUT" :value="term.nodeId ?? ''" @change="setNode(term, $event)">
              <option value="">brak (np. wykład - tylko w kalendarzu)</option>
              <option v-for="option in nodeOptions" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="flex items-center gap-2 text-2xs">
            <input
              type="checkbox"
              :checked="term.pointsMax != null"
              :disabled="!isLeaf(term.nodeId)"
              @change="setGraded(term, $event)"
            />
            Oceniany (punkty z powiązanej oceny)
          </label>
          <label class="flex items-center gap-2 text-2xs">
            <input type="checkbox" :checked="term.canBeDoneBefore" @change="setBefore(term, $event)" />
            Można zrobić przed terminem
          </label>
          <label class="space-y-1 sm:col-span-2">
            <span :class="LABEL">Wymagania</span>
            <input :class="INPUT" :value="term.requirement ?? ''" @input="setText(term, 'requirement', $event)" />
          </label>
          <label class="space-y-1 sm:col-span-2">
            <span :class="LABEL">Notatki</span>
            <input :class="INPUT" :value="term.notes ?? ''" @input="setText(term, 'notes', $event)" />
          </label>
          <div class="flex justify-end sm:col-span-2">
            <Button variant="ghost" size="sm" class="gap-1.5 text-danger" @click="removeTerm(term)">
              <Trash2 class="size-3.5" />
              Usuń termin
            </Button>
          </div>
        </div>
      </li>
      <li v-if="!terms.length" class="px-2.5 py-3 text-2xs text-muted-foreground">
        Brak terminów - dodaj pierwszy, żeby przedmiot pojawił się w kalendarzu.
      </li>
    </ul>
  </div>
</template>
