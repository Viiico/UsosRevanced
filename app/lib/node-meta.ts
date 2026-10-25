import type {
  GradeNode,
  GradeNodeKind,
  RequirementStatus,
  TermKind,
  TermStatus,
} from '~/types'
import {
  Beaker,
  BookOpen,
  CalendarRange,
  Check,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  Flag,
  FlaskConical,
  FolderGit2,
  GitBranch,
  Hourglass,
  Info,
  TriangleAlert,
  X,
} from 'lucide-vue-next'

/** Rodzaj zajęć deklarowany w danych węzła; steruje ikoną i odmianą podsumowania. */
export type NodeVisual = 'lab' | 'colloquium' | 'project'

export const NODE_KIND_LABEL: Record<GradeNodeKind, string> = {
  year: 'Rok',
  semester: 'Semestr',
  subject: 'Przedmiot',
  category: 'Grupa ocen',
  activity: 'Ocena cząstkowa',
  stage: 'Etap',
  milestone: 'Kamień milowy',
}

export const TERM_KIND_LABEL: Record<TermKind, string> = {
  lecture: 'Wykład',
  lab: 'Laboratorium',
  colloquium: 'Kolokwium',
  'project-stage': 'Etap projektu',
  'project-deadline': 'Termin projektu',
}

export const TERM_KIND_SHORT: Record<TermKind, string> = {
  lecture: 'WYK',
  lab: 'LAB',
  colloquium: 'KOL',
  'project-stage': 'PROJ',
  'project-deadline': 'DEADLINE',
}

/** Grupa filtrowania terminów - kilka rodzajów może należeć do jednej grupy. */
export const TERM_GROUP: Record<TermKind, string> = {
  lecture: 'lecture',
  lab: 'lab',
  colloquium: 'colloquium',
  'project-stage': 'project',
  'project-deadline': 'project',
}

export const TERM_GROUP_LABEL: Record<string, string> = {
  lecture: 'Wykłady',
  lab: 'Laboratoria',
  colloquium: 'Kolokwia',
  project: 'Projekt',
}

export const TERM_STATUS = {
  done: { label: 'zrobione', icon: Check, variant: 'success' as const, class: 'text-success' },
  inProgress: {
    label: 'w trakcie',
    icon: Hourglass,
    variant: 'default' as const,
    class: 'text-primary',
  },
  overdue: {
    label: 'po terminie',
    icon: TriangleAlert,
    variant: 'destructive' as const,
    class: 'text-danger',
  },
  upcoming: {
    label: 'nadchodzące',
    icon: Clock3,
    variant: 'outline' as const,
    class: 'text-muted-foreground',
  },
} satisfies Record<TermStatus, unknown>

export const REQUIREMENT_STATUS: Record<
  RequirementStatus,
  { icon: unknown; class: string }
> = {
  met: { icon: Check, class: 'text-success' },
  failed: { icon: X, class: 'text-danger' },
  pending: { icon: Clock3, class: 'text-muted-foreground' },
  info: { icon: Info, class: 'text-muted-foreground/70' },
}

const CATEGORY_ICON = {
  lab: FlaskConical,
  colloquium: ClipboardCheck,
  project: FolderGit2,
}

const ITEM_ICON = {
  lab: Beaker,
  colloquium: FileCheck2,
  project: FolderGit2,
}

const SUMMARY_NOUN: Record<NodeVisual | 'default', [string, string, string]> = {
  lab: ['zajęcie', 'zajęcia', 'zajęć'],
  colloquium: ['sprawdzian', 'sprawdziany', 'sprawdzianów'],
  project: ['etap', 'etapy', 'etapów'],
  default: ['element', 'elementy', 'elementów'],
}

export function nodeIcon(node: GradeNode, inherited?: NodeVisual) {
  switch (node.kind) {
    case 'semester':
      return CalendarRange
    case 'subject':
      return BookOpen
    case 'stage':
      return GitBranch
    case 'milestone':
      return Flag
    default:
      break
  }
  const visual = node.visual ?? inherited
  if (!visual) return BookOpen
  return node.kind === 'category' ? CATEGORY_ICON[visual] : ITEM_ICON[visual]
}

/** „5 zajęć”, „2 sprawdziany”, „3 etapy” - na podstawie rodzaju zajęć z danych. */
export function childSummary(node: GradeNode): string | null {
  const count = node.children?.length ?? 0
  if (!count) return null
  const [one, few, many] = SUMMARY_NOUN[node.visual ?? 'default']
  return `${count} ${plural(count, one!, few!, many!)}`
}

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
