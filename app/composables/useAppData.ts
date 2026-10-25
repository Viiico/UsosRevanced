import { isReactive, reactive } from 'vue'
import type { AppData } from '~/types'
import { data as baseData } from '~/data'
import { isTauri } from '~/lib/storage'

/**
 * Wspólne, reaktywne dane aplikacji. Czytają je Oceny, Harmonogram, Kalendarz
 * i edytor w zakładce „Dane" - wszystkie widzą ten sam model.
 *
 * Stan startowy to `app/data/base.json` (przez `~/data`); w aplikacji zastępuje go
 * zawartość bazy SQLite zaraz po starcie (plugins/app-data.client).
 */
export function cloneData(): AppData {
  return JSON.parse(JSON.stringify(baseData)) as AppData
}

const EXPORT_NAME = 'usos-revanced.json'

/**
 * Eksport bieżących danych jako JSON - w „Dane” i ze stopki. W aplikacji przez systemowe
 * okno zapisu (webview Androida nie obsługuje `<a download>`), w podglądzie - pobranie pliku.
 */
export async function downloadAppData(data: AppData) {
  const content = JSON.stringify(data, null, 2)
  if (isTauri()) {
    const [{ save }, { writeTextFile }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-fs'),
    ])
    const path = await save({
      defaultPath: EXPORT_NAME,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (path) await writeTextFile(path, content)
    return
  }
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = EXPORT_NAME
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Stan zapisu dla stopki: kiedy ostatnio udał się zapis w bazie (ISO), czy ostatni się
 * wywalił i czy to podgląd w przeglądarce (bez bazy, bez zapisu).
 */
export function useAppDataSaveState() {
  return {
    savedAt: useState<string | null>('app-data-saved-at', () => null),
    failed: useState<boolean>('app-data-save-failed', () => false),
    preview: useState<boolean>('app-data-preview', () => false),
  }
}

export function useAppData(): AppData {
  const state = useState<AppData>('app-data', cloneData)
  // Gwarancja głębokiej reaktywności na kliencie: wszystkie widoki czytają
  // ten sam proxy, więc edycja punktów od razu przelicza postęp i ocenę.
  if (import.meta.client && state.value && !isReactive(state.value)) {
    state.value = reactive(state.value)
  }
  return state.value
}
