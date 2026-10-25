import type Database from '@tauri-apps/plugin-sql'

/**
 * Baza SQLite aplikacji (tauri-plugin-sql). Schemat i migracje są w
 * `src-tauri/migrations`; nazwa bazy musi się zgadzać z `DB_URL` w `src-tauri/src/lib.rs`.
 * Poza Tauri (podgląd w przeglądarce) bazy nie ma - zapis jest wyłączony.
 */
const DB_URL = 'sqlite:usos-revanced.db'

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

let dbPromise: Promise<Database> | null = null

export function database(): Promise<Database> {
  if (!isTauri()) return Promise.reject(new Error('SQLite jest dostępny tylko w aplikacji Tauri'))
  // Import dynamiczny - w przeglądarce paczka Tauri nie jest ładowana wcale.
  dbPromise ??= import('@tauri-apps/plugin-sql').then(({ default: Db }) => Db.load(DB_URL))
  return dbPromise
}

/** Ustawienie z tabeli `settings` (np. motyw); w przeglądarce zawsze null. */
export async function readValue(key: string): Promise<string | null> {
  if (!isTauri()) return null
  const rows = await (await database()).select<{ value: string }[]>(
    'SELECT value FROM settings WHERE key = $1',
    [key],
  )
  return rows[0]?.value ?? null
}

export async function writeValue(key: string, value: string): Promise<void> {
  if (!isTauri()) return
  await (await database()).execute(
    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    [key, value],
  )
}
