import type { GradeNode, GradeNodeKind, TermKind } from '~/types'
import {
  Beaker,
  BookOpen,
  CalendarRange,
  ClipboardCheck,
  FileCheck2,
  Flag,
  FlaskConical,
  FolderGit2,
  GitBranch,
} from 'lucide-vue-next'

export const TERM_KIND_LABEL: Record<TermKind, string> = {  lecture: 'Wykład',
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

export const NODE_KIND_LABEL: Record<GradeNodeKind, string> = {
  year: 'Rok',
  semester: 'Semestr',
  subject: 'Przedmiot',
  category: 'Grupa ocen',
  activity: 'Ocena cząstkowa',
  stage: 'Etap',
  milestone: 'Kamień milowy',
}

export function nodeIcon(node: GradeNode) {
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
  if (node.id.includes('lab')) return node.kind === 'category' ? FlaskConical : Beaker
  if (node.id.includes('kol')) return node.kind === 'category' ? ClipboardCheck : FileCheck2
  if (node.id.includes('proj')) return FolderGit2
  return BookOpen
}

/** „5 zajęć”, „2 sprawdziany”, „3 etapy” - krótki opis zawartości gałęzi. */
export function childSummary(node: GradeNode): string | null {
  const count = node.children?.length ?? 0
  if (!count) return null
  const noun = node.id.includes('lab')
    ? ['zajęcie', 'zajęcia', 'zajęć']
    : node.id.includes('kol')
      ? ['sprawdzian', 'sprawdziany', 'sprawdzianów']
      : node.id.includes('proj')
        ? ['etap', 'etapy', 'etapów']
        : ['element', 'elementy', 'elementów']
  return `${count} ${plural(count, noun[0]!, noun[1]!, noun[2]!)}`
}

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function nodeAriaLabel(node: GradeNode): string {
  return `${node.name}, ${node.points ? `${node.points.earned ?? 0} z ${node.points.max} punktów` : 'bez punktów'}`
}
