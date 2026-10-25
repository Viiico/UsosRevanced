<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GradeNode } from '~/types'
import { collectNodeIds, computeProgress, effectiveWeight } from '~/lib/tree'
import { formatPercent } from '~/lib/format'
import { segmentColor } from '~/lib/segments'

/**
 * Koło postępu bieżącego węzła (maksymalnie semestr). Poziomy, które mają jeszcze dzieci,
 * dzielą koło kątowo według wagi (przedmioty → grupy), a ostatni poziom - promieniście,
 * od środka do krawędzi (lab 1/2/3, etapy projektu). Wypełnienie pasma = zdobyte punkty.
 * Na zewnątrz pierścienie z podpisami poziomów kątowych - zamiast legendy.
 */
const props = defineProps<{ root: GradeNode }>()
const emit = defineEmits<{ select: [id: string] }>()

const data = useAppData()

const SIZE = 200
const CENTER = SIZE / 2
const EDGE = 98
const HOLE = 22
const RING = 12
const FULL = Math.PI * 2

interface Shape {
  id: string
  path: string
  color: string
  opacity: number
  kind: 'tint' | 'band' | 'ring' | 'outline'
  trail: string[]
  node: GradeNode
}

interface Label {
  key: string
  x: number
  y: number
  rotate: number
  text: string
  size: number
}

/** Kolor gałęzi = kolor przedmiotu z Postępu (indeks w semestrze). */
const subjectColorIndex = computed(() => {
  const map = new Map<string, number>()
  data.subjects.forEach((subject, index) => {
    for (const id of collectNodeIds(subject.tree)) map.set(id, index)
  })
  return map
})

function colorOf(node: GradeNode) {
  return segmentColor(subjectColorIndex.value.get(node.id) ?? 0)
}

function subjectCodeOf(node: GradeNode) {
  return data.subjects.find((subject) => subject.tree.id === node.id)?.code ?? null
}

function xy(angle: number, radius: number) {
  return { x: CENTER + radius * Math.sin(angle), y: CENTER - radius * Math.cos(angle) }
}

function point(angle: number, radius: number) {
  const { x, y } = xy(angle, radius)
  return `${x.toFixed(3)} ${y.toFixed(3)}`
}

/** Wycinek pierścienia od kąta a0 do a1 (0 = góra, zgodnie z zegarem). */
function sector(a0: number, a1: number, r0: number, r1: number) {
  const end = a1 - a0 >= FULL - 1e-6 ? a0 + FULL - 1e-4 : a1
  const large = end - a0 > Math.PI ? 1 : 0
  return [
    `M ${point(a0, r1)}`,
    `A ${r1} ${r1} 0 ${large} 1 ${point(end, r1)}`,
    `L ${point(end, r0)}`,
    `A ${r0} ${r0} 0 ${large} 0 ${point(a0, r0)}`,
    'Z',
  ].join(' ')
}

/** Podpis styczny do łuku, zawsze czytelny (na dole koła obrócony o 180°); pomijany, gdy się nie mieści. */
function arcLabel(
  key: string,
  text: string,
  a0: number,
  a1: number,
  radius: number,
  size: number,
): Label | null {
  if ((a1 - a0) * radius < text.length * size * 0.62 + 2) return null
  const mid = (a0 + a1) / 2
  const { x, y } = xy(mid, radius)
  const degrees = (mid * 180) / Math.PI
  const flip = degrees > 90 && degrees < 270
  return { key, x, y, rotate: flip ? degrees + 180 : degrees, text, size }
}

const GROUP_LABEL: Record<string, string> = { lab: 'lab', colloquium: 'kol', project: 'proj' }

/** Podpis pierścienia: przedmiot - kod, grupa - lab/kol/proj, reszta - skrót nazwy. */
function ringText(node: GradeNode) {
  return (
    subjectCodeOf(node) ??
    (node.visual ? GROUP_LABEL[node.visual] : undefined) ??
    (node.short || node.name).slice(0, 6)
  )
}

/** Skrót oceny w paśmie: „Lab 1” → L1, „Kolokwium 2” → K2, „Etap 3” → E3. */
function bandText(node: GradeNode) {
  const source = (node.short || node.name).trim()
  const digits = source.match(/\d+/)?.[0] ?? ''
  return `${source[0]?.toUpperCase() ?? ''}${digits}`
}

/** Nasycenie pasma: bez punktów - ledwo widoczne, bez oceny - odcień, z oceną - wg wyniku. */
function bandOpacity(node: GradeNode) {
  const points = node.points
  if (!points || !points.max) return 0.06
  if (points.earned == null) return 0.14
  return 0.3 + 0.6 * Math.min(1, points.earned / points.max)
}

function weightsOf(children: GradeNode[]) {
  const weights = children.map((child) => effectiveWeight(child, children))
  return weights.some((weight) => weight > 0) ? weights : children.map(() => 1)
}

/** Ile poziomów dzieli koło kątowo (semestr: przedmioty + grupy = 2, przedmiot: 1). */
function angularLevels(node: GradeNode): number {
  const children = node.children ?? []
  if (!children.some((child) => child.children?.length)) return 0
  return 1 + Math.max(...children.map(angularLevels))
}

const levels = computed(() => angularLevels(props.root))
const pieRadius = computed(() => EDGE - levels.value * (RING + 1))

const drawing = computed(() => {
  const tints: Shape[] = []
  const bands: Shape[] = []
  const rings: Shape[] = []
  const outlines: Shape[] = []
  const labels: Label[] = []
  const pie = pieRadius.value

  function layout(
    node: GradeNode,
    a0: number,
    a1: number,
    r0: number,
    r1: number,
    trail: string[],
    depth: number,
  ) {
    const children = node.children ?? []

    if (!children.length) {
      bands.push({
        id: node.id,
        path: sector(a0, a1, r0, r1),
        color: colorOf(node),
        opacity: bandOpacity(node),
        kind: 'band',
        trail,
        node,
      })
      const text = arcLabel(`b-${node.id}`, bandText(node), a0, a1, (r0 + r1) / 2, 5)
      if (text && r1 - r0 >= 6) labels.push(text)
      return
    }

    // Ostatni poziom (same liście) dzielimy od środka do krawędzi, wyższe - kątowo wg wagi.
    if (!children.some((child) => child.children?.length)) {
      const step = (r1 - r0) / children.length
      children.forEach((child, index) =>
        layout(
          child,
          a0,
          a1,
          r0 + step * index,
          r0 + step * (index + 1),
          [...trail, child.short || child.name],
          depth + 1,
        ),
      )
      return
    }

    const weights = weightsOf(children)
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    // Pierścień tego poziomu: najbliżej koła najgłębszy, na zewnątrz najwyższy (przedmioty).
    const ringIn = pie + 1 + (levels.value - depth - 1) * (RING + 1)
    let angle = a0
    children.forEach((child, index) => {
      const span = ((a1 - a0) * weights[index]!) / total
      if (span <= 0) return
      const childTrail = [...trail, child.short || child.name]
      if (node === props.root) {
        // Wycinek najwyższego poziomu: lekkie podświetlenie kolorem przedmiotu i wyraźna granica.
        const path = sector(angle, angle + span, r0, r1)
        const shared = { id: child.id, path, color: colorOf(child), trail: childTrail, node: child }
        tints.push({ ...shared, opacity: 0.08, kind: 'tint' })
        outlines.push({ ...shared, opacity: 1, kind: 'outline' })
      }
      rings.push({
        id: child.id,
        path: sector(angle, angle + span, ringIn, ringIn + RING),
        color: colorOf(child),
        opacity: depth === 0 ? 0.35 : 0.2,
        kind: 'ring',
        trail: childTrail,
        node: child,
      })
      const text = arcLabel(
        `r-${child.id}`,
        ringText(child),
        angle,
        angle + span,
        ringIn + RING / 2,
        6,
      )
      if (text) labels.push(text)
      layout(child, angle, angle + span, r0, r1, childTrail, depth + 1)
      angle += span
    })
  }

  layout(props.root, 0, FULL, HOLE, pie, [], 0)
  return { shapes: [...tints, ...bands, ...rings, ...outlines], labels }
})

const hovered = ref<Shape | null>(null)
const total = computed(() => computeProgress(props.root))

const hoverInfo = computed(() => {
  const shape = hovered.value
  if (!shape) return null
  const progress = computeProgress(shape.node)
  return {
    trail: shape.trail.join(' › '),
    points: progress.max ? `${progress.earned}/${progress.max} pkt` : 'bez punktów',
    percent: progress.max ? formatPercent(progress.ratio) : null,
  }
})
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <svg
      :viewBox="`0 0 ${SIZE} ${SIZE}`"
      class="aspect-square w-full max-w-[26rem]"
      role="img"
      :aria-label="`Postęp ${formatPercent(total.ratio)}`"
      @mouseleave="hovered = null"
    >
      <template v-for="shape in drawing.shapes" :key="`${shape.kind}-${shape.id}`">
        <path
          v-if="shape.kind === 'outline'"
          :d="shape.path"
          fill="none"
          stroke="var(--card)"
          stroke-width="1.6"
          class="pointer-events-none"
        />
        <path
          v-else
          :d="shape.path"
          :fill="shape.color"
          :fill-opacity="shape.opacity"
          :stroke="shape.kind === 'tint' ? 'none' : 'var(--card)'"
          stroke-width="0.6"
          :class="
            shape.kind === 'tint' ? 'pointer-events-none' : 'cursor-pointer transition-[fill-opacity]'
          "
          :style="
            hovered?.id === shape.id && shape.kind !== 'tint'
              ? { fillOpacity: Math.min(1, shape.opacity + 0.25) }
              : undefined
          "
          @mouseenter="shape.kind !== 'tint' && (hovered = shape)"
          @click="shape.kind !== 'tint' && emit('select', shape.id)"
        >
          <title>{{ shape.trail.join(' › ') }}</title>
        </path>
      </template>

      <text
        v-for="label in drawing.labels"
        :key="label.key"
        :x="label.x"
        :y="label.y"
        :transform="`rotate(${label.rotate} ${label.x} ${label.y})`"
        text-anchor="middle"
        dominant-baseline="central"
        class="pointer-events-none fill-foreground font-medium"
        :style="{ fontSize: `${label.size}px` }"
      >
        {{ label.text }}
      </text>

      <text
        :x="CENTER"
        :y="CENTER"
        text-anchor="middle"
        dominant-baseline="central"
        class="tnum fill-foreground text-[13px] font-semibold"
      >
        {{ formatPercent(total.ratio) }}
      </text>
    </svg>

    <p class="min-h-5 text-center text-2xs text-muted-foreground">
      <template v-if="hoverInfo">
        <span class="text-foreground">{{ hoverInfo.trail }}</span>
        · {{ hoverInfo.points }}<template v-if="hoverInfo.percent"> · {{ hoverInfo.percent }}</template>
      </template>
      <template v-else>Najedź na fragment koła, żeby zobaczyć szczegóły; kliknij, żeby przejść.</template>
    </p>
  </div>
</template>
