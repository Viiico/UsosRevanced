import type { AppData, GradeNode, Subject, Term } from '~/types'
import { normalizeData } from '~/lib/normalize'
import { database } from '~/lib/storage'

/**
 * Model aplikacji ↔ wiersze SQLite (schemat: `src-tauri/migrations/0001_init.sql`).
 *
 * Widoki nadal mutują jeden reaktywny `AppData`. Zamiast przepisywać każde miejsce
 * edycji na osobne zapytanie, zapis porównuje wiersze wyliczone ze stanu z tymi,
 * które już są w bazie, i wysyła tylko różnice. Ocena jednego labu to jeden
 * `INSERT` w `progress`, odhaczenie terminu - jeden wiersz w `term_state`.
 */

type Table = 'semester' | 'subject' | 'node' | 'term' | 'progress' | 'term_state'

type Values = Record<string, string | number | null>

interface Row {
  table: Table
  pk: string
  values: Values
}

const PK: Record<Table, string> = {
  semester: 'id',
  subject: 'id',
  node: 'id',
  term: 'id',
  progress: 'node_id',
  term_state: 'term_id',
}

/** Tabele stanu użytkownika dostają `updated_at` przy zapisie - poza porównaniem. */
const STAMPED = new Set<Table>(['progress', 'term_state'])

/** Kolejność zapisu nie ma znaczenia dla bazy (brak kluczy obcych), ale ułatwia czytanie logów. */
const TABLES: Table[] = ['semester', 'subject', 'node', 'term', 'progress', 'term_state']

const json = (value: unknown) => JSON.stringify(value ?? [])
const orNull = <T>(value: T | undefined | null) => (value === undefined || value === '' ? null : value)

function toRows(data: AppData): Map<string, Row> {
  const rows = new Map<string, Row>()
  const put = (table: Table, values: Values) => {
    const pk = String(values[PK[table]])
    rows.set(`${table}|${pk}`, { table, pk, values })
  }

  const { semester } = data
  put('semester', {
    id: semester.id,
    code: semester.code,
    name: semester.name,
    academic_year: semester.academicYear,
    starts_at: semester.startsAt,
    ends_at: semester.endsAt,
  })

  const walk = (node: GradeNode, subjectId: string, parentId: string | null, position: number) => {
    put('node', {
      id: node.id,
      subject_id: subjectId,
      parent_id: parentId,
      position,
      kind: node.kind,
      name: node.name,
      short: node.short ?? '',
      visual: node.visual ?? null,
      weight: node.weight,
      points_max: node.points ? node.points.max : null,
      info: node.info ?? '',
      assumption: node.assumption ?? '',
      description: node.description ?? '',
      requirements_json: json(node.requirements),
      term_ids_json: json(node.termIds),
    })
    if (node.points?.earned != null) put('progress', { node_id: node.id, earned: node.points.earned })
    node.children?.forEach((child, index) => walk(child, subjectId, node.id, index))
  }

  data.subjects.forEach((subject, position) => {
    put('subject', {
      id: subject.id,
      position,
      semester_id: subject.semesterId,
      code: subject.code,
      name: subject.name,
      group_label: subject.group ?? '',
      demo: subject.demoData ? 1 : 0,
      ects: subject.policy.ects,
      total_points: subject.policy.totalPoints,
      passing_points: subject.policy.passingPoints,
      grade_scale_json: json(subject.policy.gradeScale),
      rules_json: json(subject.policy.rules),
      teachers_json: json(subject.teachers),
    })
    walk(subject.tree, subject.id, null, 0)
  })

  data.terms.forEach((term, position) => {
    put('term', {
      id: term.id,
      position,
      subject_id: term.subjectId,
      node_id: orNull(term.nodeId),
      kind: term.kind,
      title: term.title,
      date: term.date,
      start_time: orNull(term.start),
      end_time: orNull(term.end),
      location: orNull(term.location),
      group_label: orNull(term.group),
      points_max: term.pointsMax ?? null,
      can_be_done_before: term.canBeDoneBefore ? 1 : 0,
      requirement: orNull(term.requirement),
      notes: orNull(term.notes),
      week_no: term.weekNo ?? null,
    })
    if (term.submitted) put('term_state', { term_id: term.id, submitted: 1 })
  })

  return rows
}

function signatures(rows: Map<string, Row>): Map<string, string> {
  return new Map([...rows].map(([key, row]) => [key, JSON.stringify(row.values)]))
}

/* ------------------------------------------------------------------ */
/* Odczyt                                                              */
/* ------------------------------------------------------------------ */

type DbRow = Record<string, string | number | null>

const str = (value: unknown) => (value == null ? undefined : String(value))
const parse = <T>(value: unknown): T => JSON.parse(String(value ?? '[]')) as T

/** Dane z bazy albo null, gdy baza jest pusta (pierwsze uruchomienie). */
export async function loadAppData(): Promise<AppData | null> {
  const db = await database()
  const select = (sql: string) => db.select<DbRow[]>(sql)

  const [semesterRow] = await select('SELECT * FROM semester LIMIT 1')
  if (!semesterRow) return null

  const subjectRows = await select('SELECT * FROM subject ORDER BY position')
  const nodeRows = await select('SELECT * FROM node ORDER BY position')
  const termRows = await select('SELECT * FROM term ORDER BY position')
  const earned = new Map(
    (await select('SELECT node_id, earned FROM progress')).map((row) => [row.node_id, Number(row.earned)]),
  )
  const submitted = new Set(
    (await select('SELECT term_id FROM term_state WHERE submitted = 1')).map((row) => row.term_id),
  )

  const childrenOf = new Map<string | null, DbRow[]>()
  for (const row of nodeRows) {
    const key = (row.parent_id as string | null) ?? `root:${row.subject_id}`
    const list = childrenOf.get(key) ?? []
    list.push(row)
    childrenOf.set(key, list)
  }

  const buildNode = (row: DbRow): GradeNode => {
    const id = String(row.id)
    const hasPoints = row.points_max != null || earned.has(id)
    return {
      id,
      kind: row.kind as GradeNode['kind'],
      name: String(row.name),
      short: String(row.short ?? ''),
      ...(row.visual ? { visual: row.visual as GradeNode['visual'] } : {}),
      weight: Number(row.weight),
      ...(hasPoints ? { points: { max: Number(row.points_max ?? 0), earned: earned.get(id) ?? null } } : {}),
      requirements: parse(row.requirements_json),
      children: (childrenOf.get(id) ?? []).map(buildNode),
      termIds: parse(row.term_ids_json),
      info: String(row.info ?? ''),
      assumption: String(row.assumption ?? ''),
      description: String(row.description ?? ''),
    }
  }

  const subjects: Subject[] = subjectRows.map((row) => {
    const root = childrenOf.get(`root:${row.id}`)?.[0]
    if (!root) throw new Error(`Brak drzewa przedmiotu ${row.id}`)
    return {
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
      semesterId: String(row.semester_id),
      group: String(row.group_label ?? ''),
      teachers: parse(row.teachers_json),
      policy: {
        ects: Number(row.ects),
        totalPoints: Number(row.total_points),
        passingPoints: Number(row.passing_points),
        gradeScale: parse(row.grade_scale_json),
        rules: parse(row.rules_json),
      },
      tree: buildNode(root),
      ...(row.demo ? { demoData: true } : {}),
    }
  })

  const terms: Term[] = termRows.map((row) => {
    const term: Term = {
      id: String(row.id),
      subjectId: String(row.subject_id),
      kind: row.kind as Term['kind'],
      title: String(row.title),
      date: String(row.date),
      canBeDoneBefore: Boolean(row.can_be_done_before),
    }
    if (row.node_id != null) term.nodeId = String(row.node_id)
    if (row.start_time != null) term.start = str(row.start_time)
    if (row.end_time != null) term.end = str(row.end_time)
    if (row.location != null) term.location = str(row.location)
    if (row.group_label != null) term.group = str(row.group_label)
    if (row.points_max != null) term.pointsMax = Number(row.points_max)
    if (row.requirement != null) term.requirement = str(row.requirement)
    if (row.notes != null) term.notes = str(row.notes)
    if (row.week_no != null) term.weekNo = Number(row.week_no)
    if (submitted.has(term.id)) term.submitted = true
    return term
  })

  return normalizeData({
    version: 2,
    semester: {
      id: String(semesterRow.id),
      code: String(semesterRow.code),
      name: String(semesterRow.name),
      academicYear: String(semesterRow.academic_year),
      startsAt: String(semesterRow.starts_at),
      endsAt: String(semesterRow.ends_at),
    },
    subjects,
    terms,
  })
}

/* ------------------------------------------------------------------ */
/* Zapis                                                               */
/* ------------------------------------------------------------------ */

/**
 * Synchronizacja stanu z bazą. `written` to obraz tego, co jest w bazie; `flush`
 * wysyła różnicę między nim a bieżącym stanem. Zapytania idą po kolei (pula
 * połączeń wtyczki nie gwarantuje transakcji między wywołaniami), a obraz jest
 * aktualizowany po każdym udanym wierszu - po błędzie kolejny `flush` dokończy resztę.
 */
export function createSync(persisted: AppData | null) {
  const written = persisted ? signatures(toRows(persisted)) : new Map<string, string>()

  async function flush(data: AppData): Promise<number> {
    const db = await database()
    const rows = toRows(data)
    const now = new Date().toISOString()
    let changes = 0

    for (const table of TABLES) {
      for (const [key, row] of rows) {
        if (row.table !== table) continue
        const signature = JSON.stringify(row.values)
        if (written.get(key) === signature) continue
        const values = STAMPED.has(table) ? { ...row.values, updated_at: now } : row.values
        const columns = Object.keys(values)
        await db.execute(
          `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})`,
          Object.values(values),
        )
        written.set(key, signature)
        changes++
      }
    }

    for (const key of [...written.keys()]) {
      if (rows.has(key)) continue
      const separator = key.indexOf('|')
      const table = key.slice(0, separator) as Table
      const pk = key.slice(separator + 1)
      await db.execute(`DELETE FROM ${table} WHERE ${PK[table]} = $1`, [pk])
      written.delete(key)
      changes++
    }

    return changes
  }

  return { flush }
}
