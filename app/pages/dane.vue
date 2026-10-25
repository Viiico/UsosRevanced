<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  BookOpen,
  Braces,
  CalendarRange,
  ChevronRight,
  ClipboardCheck,
  Database,
  Download,
  FileCheck2,
  Flag,
  FlaskConical,
  FolderGit2,
  FolderTree,
  GitBranch,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-vue-next'
import type { GradeNode, GradeScaleRow, Subject } from '~/types'
import { useAppData, cloneData, downloadAppData } from '~/composables/useAppData'
import { normalizeData, normalizeSubject } from '~/lib/normalize'
import { findNode, collectNodeIds } from '~/lib/tree'
import { NODE_KIND_LABEL, nodeIcon } from '~/lib/node-meta'

useHead({ title: 'Dane' })

type RowKind = 'semester' | 'subject' | 'category' | 'activity' | 'stage' | 'milestone'

interface Row {
  key: string
  kind: RowKind
  label: string
  meta?: string
  depth: number
  children: Row[]
  subject?: Subject
  node?: GradeNode
}

const INPUT =
  'h-8 w-full rounded-md border border-border/80 bg-secondary/20 px-2 text-2xs text-foreground outline-none transition-colors focus:border-primary/50'
const AREA =
  'w-full rounded-md border border-border/80 bg-secondary/20 px-2 py-1.5 text-2xs leading-relaxed text-foreground outline-none transition-colors focus:border-primary/50'
const LABEL = 'text-3xs font-medium tracking-wide text-muted-foreground uppercase'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

const state = useAppData()
const json = computed(() => JSON.stringify(state, null, 2))
const jsonRows = computed(() => json.value.split('\n'))
const jsonLines = computed(() => jsonRows.value.length)

/** Podgląd JSON podąża za edytowanym polem: podświetla i przewija właściwą linię. */
const jsonScroll = ref<HTMLElement | null>(null)
const activeLine = ref(0)
const confirmKey = ref<string | null>(null)

function locateLine(needle: string, from = 0) {
  for (let index = from; index < jsonRows.value.length; index++) {
    if (jsonRows.value[index]!.includes(needle)) return index
  }
  return from
}

function needleFor(key: string, value: unknown) {
  if (typeof value === 'string') return `"${key}": ${JSON.stringify(value)}`
  if (typeof value === 'number' || typeof value === 'boolean') return `"${key}": ${value}`
  if (value === null) return `"${key}": null`
  return `"${key}":`
}

/** Początek bloku wybranego elementu - od niego szukamy pola, żeby nie trafić w inny obiekt. */
function entityStartLine() {
  const row = selectedRow.value
  if (!row) return 0
  const id =
    row.kind === 'semester'
      ? state.semester.id
      : row.kind === 'subject'
        ? row.subject?.id
        : row.node?.id
  return id ? locateLine(`"id": ${JSON.stringify(id)}`) : 0
}

async function scrollToLine() {
  await nextTick()
  const container = jsonScroll.value
  if (!container) return
  const target = container.querySelector<HTMLElement>(`[data-line="${activeLine.value}"]`)
  if (!target) return
  const top = target.offsetTop - container.clientHeight / 2 + target.clientHeight / 2
  container.scrollTop = Math.max(0, top)
}

function focusJson(key: string, value: unknown, from = entityStartLine()) {
  activeLine.value = locateLine(needleFor(key, value), from)
  void scrollToLine()
}

function pluralSubjects(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (count === 1) return 'przedmiot'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'przedmioty'
  return 'przedmiotów'
}

function nodeRow(node: GradeNode, depth: number, subject: Subject): Row {
  return {
    key: `node:${subject.id}:${node.id}`,
    kind: node.kind as RowKind,
    label: node.short || node.name,
    meta: node.points ? `${node.points.earned ?? '–'}/${node.points.max} pkt` : undefined,
    depth,
    subject,
    node,
    children: (node.children ?? []).map((child) => nodeRow(child, depth + 1, subject)),
  }
}

const tree = computed<Row[]>(() => [
  {
    key: 'semester',
    kind: 'semester',
    label: `${state.semester.name} ${state.semester.code}`,
    meta: `${state.subjects.length} ${pluralSubjects(state.subjects.length)}`,
    depth: 0,
    children: state.subjects.map((subject) => ({
      key: `subject:${subject.id}`,
      kind: 'subject' as const,
      label: subject.name,
      meta: `${subject.policy.ects} ECTS`,
      depth: 1,
      subject,
      children: (subject.tree.children ?? []).map((child) => nodeRow(child, 2, subject)),
    })),
  },
])

/** Domyślnie widać tylko listę przedmiotów - rozwijanie ich zostawiamy użytkownikowi. */
const expanded = reactive(new Set<string>())
function resetExpanded() {
  expanded.clear()
  expanded.add('semester')
}
resetExpanded()

const selectedKey = ref('semester')

const rows = computed(() => {
  const out: Row[] = []
  const walk = (row: Row) => {
    out.push(row)
    if (expanded.has(row.key)) row.children.forEach(walk)
  }
  tree.value.forEach(walk)
  return out
})

function findRow(list: Row[], key: string): Row | null {
  for (const row of list) {
    if (row.key === key) return row
    const hit = findRow(row.children, key)
    if (hit) return hit
  }
  return null
}

const selectedRow = computed(() => findRow(tree.value, selectedKey.value) ?? tree.value[0] ?? null)
const activeSubject = computed(() => selectedRow.value?.subject ?? null)
const activeNode = computed(() => selectedRow.value?.node ?? null)

watch(selectedKey, () => {
  confirmKey.value = null
  activeLine.value = entityStartLine()
  void scrollToLine()
})

function toggle(key: string) {
  if (expanded.has(key)) expanded.delete(key)
  else expanded.add(key)
}

function rowIcon(row: Row) {
  switch (row.kind) {
    case 'semester':
      return CalendarRange
    case 'subject':
      return BookOpen
    case 'category':
      return row.node ? nodeIcon(row.node) : FolderTree
    case 'activity':
      return FileCheck2
    case 'stage':
      return GitBranch
    case 'milestone':
      return Flag
  }
}

function patch(target: object | null | undefined, key: string, event: Event) {
  if (!target) return
  const value = (event.target as HTMLInputElement).value
  ;(target as Record<string, unknown>)[key] = value
  focusJson(key, value)
}

function patchNumber(target: object | null | undefined, key: string, event: Event, empty: number | null = null) {
  if (!target) return
  const raw = (event.target as HTMLInputElement).value.trim()
  ;(target as Record<string, unknown>)[key] = raw === '' ? empty : Number(raw)
  focusJson(key, (target as Record<string, unknown>)[key])
}

function patchSubjectName(event: Event) {
  const subject = activeSubject.value
  if (!subject) return
  const value = (event.target as HTMLInputElement).value
  subject.name = value
  subject.tree.name = value
  focusJson('name', value)
}

function patchEcts(event: Event) {
  const subject = activeSubject.value
  if (!subject) return
  const raw = (event.target as HTMLInputElement).value.trim()
  const value = raw === '' ? 0 : Number(raw)
  subject.policy.ects = value
  subject.tree.weight = value
  focusJson('ects', value)
}

function patchRules(event: Event) {
  const subject = activeSubject.value
  if (!subject) return
  subject.policy.rules = (event.target as HTMLTextAreaElement).value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  focusJson('rules', subject.policy.rules)
}

function patchVisual(event: Event) {
  const node = activeNode.value
  if (!node) return
  const value = (event.target as HTMLSelectElement).value
  node.visual = value === '' ? undefined : (value as 'lab' | 'colloquium' | 'project')
  focusJson('visual', node.visual)
}

function ensurePoints(node: GradeNode) {
  node.points ??= { max: 0, earned: null }
  return node.points
}

function patchMaxPoints(event: Event) {
  const node = activeNode.value
  if (!node) return
  const raw = (event.target as HTMLInputElement).value.trim()
  const points = ensurePoints(node)
  points.max = raw === '' ? 0 : Number(raw)
  focusJson('max', points.max)
}

function patchEarnedPoints(event: Event) {
  const node = activeNode.value
  if (!node) return
  const raw = (event.target as HTMLInputElement).value.trim()
  const points = ensurePoints(node)
  points.earned = raw === '' ? null : Number(raw)
  focusJson('earned', points.earned)
}

let subjectSeq = 0

const DEFAULT_GRADE_SCALE: GradeScaleRow[] = [
  { min: 90, grade: '5' },
  { min: 80, grade: '4,5' },
  { min: 70, grade: '4' },
  { min: 60, grade: '3,5' },
  { min: 50, grade: '3' },
  { min: 0, grade: '2' },
]

function addSubject() {
  subjectSeq += 1
  const id = `subject-${Date.now().toString(36)}-${subjectSeq}`
  const name = `Nowy przedmiot ${state.subjects.length + 1}`
  const subject: Subject = {
    id,
    code: `NOWY${state.subjects.length + 1}`,
    name,
    semesterId: state.semester.id,
    group: '',
    teachers: [],
    policy: {
      ects: 0,
      totalPoints: 100,
      passingPoints: 50,
      gradeScale: clone(
        state.subjects[0]?.policy.gradeScale.length
          ? state.subjects[0].policy.gradeScale
          : DEFAULT_GRADE_SCALE,
      ),
      rules: [],
    },
    tree: { id, kind: 'subject', name, weight: 0, children: [] },
  }
  normalizeSubject(subject)
  state.subjects.push(subject)
  expanded.add(`subject:${id}`)
  selectedKey.value = `subject:${id}`
}

function addTeacher() {
  activeSubject.value?.teachers.push({ name: 'Nowy prowadzący', email: '' })
}

function removeTeacher(index: number) {
  activeSubject.value?.teachers.splice(index, 1)
}

/** Usuwa węzeł z drzewa po id (dzieci szukamy rekurencyjnie). */
function removeNode(node: GradeNode, id: string): boolean {
  const children = node.children
  if (!children?.length) return false
  const index = children.findIndex((child) => child.id === id)
  if (index >= 0) {
    children.splice(index, 1)
    return true
  }
  for (const child of children) {
    if (removeNode(child, id)) return true
  }
  return false
}

function requestDelete() {
  confirmKey.value = selectedKey.value
}

function cancelDelete() {
  confirmKey.value = null
}

function deleteSelected() {
  const row = selectedRow.value
  if (!row || row.kind === 'semester') return

  if (row.kind === 'subject' && row.subject) {
    const subjectId = row.subject.id
    state.subjects = state.subjects.filter((subject) => subject.id !== subjectId)
    state.terms = state.terms.filter((term) => term.subjectId !== subjectId)
    selectedKey.value = 'semester'
  } else if (row.node && row.subject) {
    const ids = collectNodeIds(row.node)
    removeNode(row.subject.tree, row.node.id)
    state.terms = state.terms.filter((term) => !term.nodeId || !ids.includes(term.nodeId))
    selectedKey.value = `subject:${row.subject.id}`
  }

  confirmKey.value = null
}

const CATEGORY_PRESETS = {
  lab: { name: 'Laboratorium', visual: 'lab' as const },
  colloquium: { name: 'Kolokwia', visual: 'colloquium' as const },
  project: { name: 'Projekt', visual: 'project' as const },
}

/** Dodaje grupę ocen do drzewa przedmiotu (laboratoria / kolokwia / projekt). */
function addCategory(kind: 'lab' | 'colloquium' | 'project') {
  const subject = activeSubject.value
  if (!subject) return

  const preset = CATEGORY_PRESETS[kind]
  const base = `${subject.tree.id}-${kind}`
  let id = base
  let index = 2
  while (findNode(subject.tree, id)) id = `${base}-${index++}`

  const node: GradeNode = {
    id,
    kind: 'category',
    visual: preset.visual,
    name: preset.name,
    short: '',
    weight: 1,
    points: { max: 0, earned: null },
    children: [],
    requirements: [],
    termIds: [],
    info: '',
    description: '',
    assumption: '',
  }

  subject.tree.children = [...(subject.tree.children ?? []), node]
  expanded.add(`subject:${subject.id}`)
  selectedKey.value = `node:${subject.id}:${id}`
}

const itemLabel = computed(() => {
  const node = activeNode.value
  if (!node) return 'Dodaj ocenę'
  if (node.visual === 'lab') return 'Dodaj laboratorium'
  if (node.visual === 'colloquium') return 'Dodaj kolokwium'
  if (node.visual === 'project') return 'Dodaj etap'
  return 'Dodaj ocenę'
})

/** Dodaje pojedynczą ocenę (lab / kolokwium / etap) do wybranej grupy. */
function addItem() {
  const node = activeNode.value
  const subject = activeSubject.value
  if (!node || !subject || node.kind !== 'category') return

  const base = `${node.id}-item`
  let id = base
  let index = 2
  while (findNode(subject.tree, id)) id = `${base}-${index++}`

  const count = (node.children?.length ?? 0) + 1
  const preset =
    node.visual === 'project'
      ? { kind: 'stage' as const, name: `Etap ${count}`, short: `Etap ${count}` }
      : node.visual === 'colloquium'
        ? { kind: 'activity' as const, name: `Kolokwium ${count}`, short: `Kolokwium ${count}` }
        : node.visual === 'lab'
          ? { kind: 'activity' as const, name: `Laboratorium ${count}`, short: `Lab ${count}` }
          : { kind: 'activity' as const, name: `Ocena ${count}`, short: `Ocena ${count}` }

  const item: GradeNode = {
    id,
    kind: preset.kind,
    name: preset.name,
    short: preset.short,
    weight: 1,
    points: { max: 0, earned: null },
    children: [],
    requirements: [],
    termIds: [],
    info: '',
    description: '',
    assumption: '',
  }

  node.children = [...(node.children ?? []), item]
  expanded.add(`node:${subject.id}:${node.id}`)
  selectedKey.value = `node:${subject.id}:${id}`
}

const fileInput = ref<HTMLInputElement | null>(null)
const importError = ref<string | null>(null)
const importedName = ref<string | null>(null)

function isAppData(value: unknown): value is typeof state {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.version === 'number' &&
    !!candidate.semester &&
    Array.isArray(candidate.subjects) &&
    Array.isArray(candidate.terms)
  )
}

function triggerImport() {
  fileInput.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const parsed: unknown = JSON.parse(await file.text())
    if (!isAppData(parsed)) {
      throw new Error('Plik nie ma kształtu danych aplikacji (version, semester, subjects, terms).')
    }
    Object.assign(state, normalizeData(clone(parsed)))
    resetEditor()
    importedName.value = file.name
  } catch (error) {
    importError.value = error instanceof Error ? error.message : 'Nie udało się wczytać pliku.'
  } finally {
    input.value = ''
  }
}

function exportJson() {
  downloadAppData(state)
}

function resetEditor() {
  importError.value = null
  selectedKey.value = 'semester'
  resetExpanded()
}

function resetData() {
  Object.assign(state, cloneData())
  importedName.value = null
  resetEditor()
}
</script>

<template>
  <div class="space-y-5">
    <header class="space-y-2">
      <div class="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div class="flex min-w-0 items-center gap-2.5">
          <span
            class="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary"
          >
            <Database class="size-4" />
          </span>
          <h1 class="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">Dane</h1>
        </div>

        <div class="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" class="tnum">v{{ state.version }}</Badge>
          <Badge variant="secondary">
            {{ state.subjects.length }} {{ pluralSubjects(state.subjects.length) }}
          </Badge>
          <Badge variant="secondary" class="tnum">{{ state.terms.length }} terminów</Badge>
        </div>
      </div>
    </header>

    <Card>
      <CardContent class="flex flex-wrap items-center gap-3 p-4">
        <div class="flex flex-wrap items-center gap-2">
          <Button class="gap-1.5" @click="triggerImport">
            <Upload class="size-3.5" />
            Import JSON
          </Button>
          <Button variant="outline" class="gap-1.5" @click="exportJson">
            <Download class="size-3.5" />
            Eksport JSON
          </Button>
          <Button variant="ghost" class="gap-1.5" @click="resetData">
            <RotateCcw class="size-3.5" />
            Dane demo
          </Button>
        </div>

        <p class="min-w-0 flex-1 text-2xs text-muted-foreground">
          Import zastępuje cały zestaw danych (semestr, przedmioty, terminy). Eksport zapisuje
          aktualny stan do pliku JSON.
          <span v-if="importedName" class="text-foreground">Wczytano: {{ importedName }}.</span>
        </p>

        <p
          v-if="importError"
          class="w-full rounded-md border border-danger/30 bg-danger/10 px-2 py-1.5 text-2xs text-danger"
        >
          {{ importError }}
        </p>

        <input
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          class="hidden"
          @change="onFileChange"
        />
      </CardContent>
    </Card>

    <div class="grid items-start gap-4 lg:grid-cols-2">
      <Card class="flex flex-col">
        <CardHeader class="flex-row items-center justify-between gap-3 pb-3">
          <div class="flex items-center gap-2">
            <Braces class="size-4 text-primary" />
            <h2 class="text-lg font-semibold tracking-tight">JSON</h2>
          </div>
          <span class="tnum text-3xs text-muted-foreground">{{ jsonLines }} linii</span>
        </CardHeader>

        <CardContent class="pt-0">
          <div
            ref="jsonScroll"
            class="relative max-h-[70vh] overflow-auto rounded-lg border border-border/70 bg-secondary/20 py-2"
          >
            <div class="font-mono text-3xs leading-relaxed whitespace-pre">
              <div
                v-for="(line, index) in jsonRows"
                :key="index"
                :data-line="index"
                class="px-3"
                :class="index === activeLine ? 'bg-primary/10' : undefined"
              >{{ line || ' ' }}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card class="flex flex-col">
        <CardHeader class="pb-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-lg font-semibold tracking-tight">Edytor</h2>
            <Badge variant="outline">
              {{ NODE_KIND_LABEL[selectedRow?.kind ?? 'semester'] }}
            </Badge>
          </div>
          <p class="text-2xs text-muted-foreground">
            Drzewo semestru - rozwiń przedmiot, żeby zobaczyć jego elementy. Wybierz element, żeby go edytować.
          </p>
        </CardHeader>

        <CardContent class="space-y-4 pt-0">
          <div class="max-h-64 overflow-auto rounded-lg border border-border/70 bg-secondary/10 p-1.5">
            <ul class="space-y-0.5">
              <li v-for="row in rows" :key="row.key">
                <div
                  class="flex items-center gap-0.5 rounded-md pr-2 transition-colors"
                  :class="
                    selectedKey === row.key
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  "
                  :style="{ paddingLeft: `${row.depth * 14 + 2}px` }"
                >
                  <button
                    v-if="row.children.length"
                    type="button"
                    class="grid size-5 shrink-0 place-items-center rounded text-muted-foreground/70 transition-colors hover:text-foreground"
                    :aria-label="expanded.has(row.key) ? 'Zwiń' : 'Rozwiń'"
                    @click="toggle(row.key)"
                  >
                    <ChevronRight
                      class="size-3.5 transition-transform"
                      :class="expanded.has(row.key) ? 'rotate-90' : ''"
                    />
                  </button>
                  <span v-else class="size-5 shrink-0" />

                  <component :is="rowIcon(row)" class="size-3.5 shrink-0" />

                  <button
                    type="button"
                    class="min-w-0 flex-1 truncate py-1.5 pl-1 text-left text-2xs font-medium"
                    @click="selectedKey = row.key"
                  >
                    {{ row.label }}
                  </button>

                  <span v-if="row.meta" class="tnum shrink-0 text-3xs text-muted-foreground/70">
                    {{ row.meta }}
                  </span>
                </div>
              </li>
            </ul>
          </div>

          <div class="h-px bg-border/60" />

          <div v-if="selectedRow?.kind === 'semester'" class="space-y-3">
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="space-y-1">
                <span :class="LABEL">Nazwa</span>
                <input
                  :class="INPUT"
                  :value="state.semester.name"
                  @input="patch(state.semester, 'name', $event)"
                />
              </label>
              <label class="space-y-1">
                <span :class="LABEL">Kod</span>
                <input
                  :class="INPUT"
                  :value="state.semester.code"
                  @input="patch(state.semester, 'code', $event)"
                />
              </label>
              <label class="space-y-1">
                <span :class="LABEL">Rok akademicki</span>
                <input
                  :class="INPUT"
                  :value="state.semester.academicYear"
                  @input="patch(state.semester, 'academicYear', $event)"
                />
              </label>
              <div class="grid grid-cols-2 gap-2">
                <label class="space-y-1">
                  <span :class="LABEL">Początek</span>
                  <input
                    :class="INPUT"
                    type="date"
                    :value="state.semester.startsAt"
                    @input="patch(state.semester, 'startsAt', $event)"
                  />
                </label>
                <label class="space-y-1">
                  <span :class="LABEL">Koniec</span>
                  <input
                    :class="INPUT"
                    type="date"
                    :value="state.semester.endsAt"
                    @input="patch(state.semester, 'endsAt', $event)"
                  />
                </label>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <span :class="LABEL">Przedmioty</span>
                <Button variant="outline" size="sm" class="gap-1.5" @click="addSubject">
                  <Plus class="size-3.5" />
                  Dodaj przedmiot
                </Button>
              </div>

              <ul class="space-y-1">
                <li v-for="subject in state.subjects" :key="subject.id">
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 rounded-md border border-border/70 px-2 py-1.5 text-left text-2xs transition-colors hover:border-primary/40 hover:text-foreground"
                    @click="selectedKey = `subject:${subject.id}`"
                  >
                    <BookOpen class="size-3.5 shrink-0 text-muted-foreground" />
                    <span class="min-w-0 flex-1 truncate">{{ subject.name }}</span>
                    <span class="tnum shrink-0 text-3xs text-muted-foreground">
                      {{ subject.policy.ects }} ECTS
                    </span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div v-else-if="selectedRow?.kind === 'subject'" class="space-y-3">
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="space-y-1">
                <span :class="LABEL">Nazwa</span>
                <input
                  :class="INPUT"
                  :value="activeSubject?.name ?? ''"
                  @input="patchSubjectName"
                />
              </label>
              <label class="space-y-1">
                <span :class="LABEL">Kod</span>
                <input
                  :class="INPUT"
                  :value="activeSubject?.code ?? ''"
                  @input="patch(activeSubject, 'code', $event)"
                />
              </label>
              <label class="space-y-1">
                <span :class="LABEL">Grupa</span>
                <input
                  :class="INPUT"
                  :value="activeSubject?.group ?? ''"
                  @input="patch(activeSubject, 'group', $event)"
                />
              </label>
              <label class="space-y-1">
                <span :class="LABEL">ECTS</span>
                <input
                  :class="INPUT"
                  type="number"
                  min="0"
                  :value="activeSubject?.policy.ects ?? 0"
                  @input="patchEcts"
                />
              </label>
              <label class="space-y-1">
                <span :class="LABEL">Punkty łącznie</span>
                <input
                  :class="INPUT"
                  type="number"
                  min="0"
                  :value="activeSubject?.policy.totalPoints ?? 0"
                  @input="patchNumber(activeSubject?.policy, 'totalPoints', $event, 0)"
                />
              </label>
              <label class="space-y-1">
                <span :class="LABEL">Próg zaliczenia</span>
                <input
                  :class="INPUT"
                  type="number"
                  min="0"
                  :value="activeSubject?.policy.passingPoints ?? 0"
                  @input="patchNumber(activeSubject?.policy, 'passingPoints', $event, 0)"
                />
              </label>
            </div>

            <label class="block space-y-1">
              <span :class="LABEL">Opis w drzewie</span>
              <textarea
                :class="AREA"
                rows="2"
                :value="activeSubject?.tree.description ?? ''"
                @input="patch(activeSubject?.tree, 'description', $event)"
              />
            </label>

            <div class="space-y-2">
              <span :class="LABEL">Dodaj grupę ocen</span>
              <div class="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" class="gap-1.5" @click="addCategory('lab')">
                  <FlaskConical class="size-3.5" />
                  Laboratorium
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  class="gap-1.5"
                  @click="addCategory('colloquium')"
                >
                  <ClipboardCheck class="size-3.5" />
                  Kolokwia
                </Button>
                <Button variant="outline" size="sm" class="gap-1.5" @click="addCategory('project')">
                  <FolderGit2 class="size-3.5" />
                  Projekt
                </Button>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <span :class="LABEL">Prowadzący</span>
                <Button variant="outline" size="sm" class="gap-1.5" @click="addTeacher">
                  <Plus class="size-3.5" />
                  Dodaj
                </Button>
              </div>

              <div
                v-for="(teacher, index) in activeSubject?.teachers ?? []"
                :key="index"
                class="flex items-center gap-1.5"
              >
                <input
                  :class="INPUT"
                  :value="teacher.name"
                  placeholder="Imię i nazwisko"
                  @input="patch(teacher, 'name', $event)"
                />
                <input
                  :class="INPUT"
                  :value="teacher.email ?? ''"
                  placeholder="E-mail"
                  @input="patch(teacher, 'email', $event)"
                />
                <button
                  type="button"
                  class="grid size-8 shrink-0 place-items-center rounded-md border border-border/70 text-muted-foreground transition-colors hover:border-danger/40 hover:text-danger"
                  aria-label="Usuń prowadzącego"
                  @click="removeTeacher(index)"
                >
                  <Trash2 class="size-3.5" />
                </button>
              </div>
            </div>

            <label class="block space-y-1">
              <span :class="LABEL">Zasady (jedna na linię)</span>
              <textarea
                :class="AREA"
                rows="3"
                :value="activeSubject?.policy.rules.join('\n') ?? ''"
                @input="patchRules"
              />
            </label>

            <p class="text-3xs text-muted-foreground">
              Terminy w modelu: {{ state.terms.filter((term) => term.subjectId === activeSubject?.id).length }}
            </p>
          </div>

          <div v-else-if="activeNode" class="space-y-3">
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="space-y-1">
                <span :class="LABEL">Nazwa</span>
                <input
                  :class="INPUT"
                  :value="activeNode.name"
                  @input="patch(activeNode, 'name', $event)"
                />
              </label>
              <label class="space-y-1">
                <span :class="LABEL">Skrót</span>
                <input
                  :class="INPUT"
                  :value="activeNode.short ?? ''"
                  placeholder="np. Lab 1"
                  @input="patch(activeNode, 'short', $event)"
                />
              </label>
              <label class="space-y-1">
                <span :class="LABEL">Waga</span>
                <input
                  :class="INPUT"
                  type="number"
                  min="0"
                  :value="activeNode.weight"
                  @input="patchNumber(activeNode, 'weight', $event, 0)"
                />
              </label>
              <label class="space-y-1">
                <span :class="LABEL">Wizualizacja</span>
                <select :class="INPUT" :value="activeNode.visual ?? ''" @change="patchVisual">
                  <option value="">brak</option>
                  <option value="lab">Laboratorium</option>
                  <option value="colloquium">Kolokwium</option>
                  <option value="project">Projekt</option>
                </select>
              </label>
              <label class="space-y-1">
                <span :class="LABEL">Punkty maks.</span>
                <input
                  :class="INPUT"
                  type="number"
                  min="0"
                  :value="activeNode.points?.max ?? 0"
                  @input="patchMaxPoints"
                />
              </label>
              <label class="space-y-1">
                <span :class="LABEL">Punkty zdobyte</span>
                <input
                  :class="INPUT"
                  type="number"
                  min="0"
                  :value="activeNode.points?.earned ?? ''"
                  placeholder="brak oceny"
                  @input="patchEarnedPoints"
                />
              </label>
            </div>

            <label class="block space-y-1">
              <span :class="LABEL">Info</span>
              <textarea
                :class="AREA"
                rows="2"
                :value="activeNode.info ?? ''"
                @input="patch(activeNode, 'info', $event)"
              />
            </label>

            <label class="block space-y-1">
              <span :class="LABEL">Opis</span>
              <textarea
                :class="AREA"
                rows="2"
                :value="activeNode.description ?? ''"
                @input="patch(activeNode, 'description', $event)"
              />
            </label>

            <label class="block space-y-1">
              <span :class="LABEL">Założenie</span>
              <textarea
                :class="AREA"
                rows="2"
                :value="activeNode.assumption ?? ''"
                @input="patch(activeNode, 'assumption', $event)"
              />
            </label>

            <div v-if="activeNode.kind === 'category'" class="space-y-2">
              <span :class="LABEL">Dodaj element</span>
              <div>
                <Button variant="outline" size="sm" class="gap-1.5" @click="addItem">
                  <Plus class="size-3.5" />
                  {{ itemLabel }}
                </Button>
              </div>
            </div>

            <p class="text-3xs text-muted-foreground">
              Terminy: {{ activeNode.termIds?.length ?? 0 }} · dzieci:
              {{ activeNode.children?.length ?? 0 }}
            </p>
          </div>

          <div
            v-if="selectedRow && selectedRow.kind !== 'semester'"
            class="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3"
          >
            <template v-if="confirmKey === selectedKey">
              <span class="mr-auto text-2xs text-danger">
                Usunąć „{{ selectedRow.label }}”?
              </span>
              <Button variant="outline" size="sm" @click="cancelDelete">Anuluj</Button>
              <Button variant="destructive" size="sm" @click="deleteSelected">Usuń</Button>
            </template>
            <Button
              v-else
              variant="outline"
              size="sm"
              class="gap-1.5 text-danger hover:text-danger"
              @click="requestDelete"
            >
              <Trash2 class="size-3.5" />
              Usuń {{ selectedRow.kind === 'subject' ? 'przedmiot' : 'element' }}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
