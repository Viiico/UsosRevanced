import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { validateBaseDocument } from '../app/lib/base-validate.ts'

/**
 * Walidacja `app/data/base.json` (v2).
 *
 *   bun run validate
 *   bun scripts/validate-data.ts [ścieżka]
 */

const path = resolve(process.argv[2] ?? 'app/data/base.json')
const raw = JSON.parse(await readFile(path, 'utf8')) as unknown
const errors = validateBaseDocument(raw)

if (errors.length) {
  console.error(`✗ ${path}: ${errors.length} błędów`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

const doc = raw as {
  schemaVersion: number
  subjects: { tree: unknown }[]
  terms: unknown[]
  teachers: unknown[]
  gradeScales: Record<string, unknown>
  progress: Record<string, unknown>
}

function countNodes(node: { children?: unknown[] }): number {
  return 1 + ((node.children ?? []) as { children?: unknown[] }[]).reduce(
    (sum, child) => sum + countNodes(child),
    0,
  )
}

const nodes = doc.subjects.reduce((sum, subject) => sum + countNodes(subject.tree as any), 0)
console.log(`✓ ${path}`)
console.log(
  `  schema=${doc.schemaVersion} przedmioty=${doc.subjects.length} węzły=${nodes} terminy=${doc.terms.length} prowadzący=${doc.teachers.length} skale=${Object.keys(doc.gradeScales).length} postęp=${Object.keys(doc.progress).length}`,
)
