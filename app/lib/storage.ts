/**
 * Trwały zapis klucz-wartość niezależny od platformy. W aplikacji Tauri (desktop/mobile)
 * używa pluginu store (plik JSON w katalogu danych aplikacji - system go nie czyści),
 * w przeglądarce - localStorage. Wartości to stringi; serializacja zostaje u wołającego.
 */
const STORE_FILE = 'usos-revanced.json'

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

type StoreLike = {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
}

let storePromise: Promise<StoreLike> | null = null

function tauriStore(): Promise<StoreLike> {
  // Import dynamiczny - w przeglądarce paczka Tauri nie jest ładowana wcale.
  storePromise ??= import('@tauri-apps/plugin-store').then(({ load }) =>
    load(STORE_FILE, { autoSave: 200, defaults: {} }),
  )
  return storePromise
}

export async function readValue(key: string): Promise<string | null> {
  if (isTauri()) return (await (await tauriStore()).get<string>(key)) ?? null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export async function writeValue(key: string, value: string): Promise<void> {
  if (isTauri()) {
    await (await tauriStore()).set(key, value)
    return
  }
  localStorage.setItem(key, value)
}
