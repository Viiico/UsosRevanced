import { isReactive, reactive } from 'vue'
import type { AppData } from '~/types'
import { data as baseData } from '~/data'

/**
 * Wspólne, reaktywne dane aplikacji. Czytają je Oceny, Harmonogram, Kalendarz
 * i edytor w zakładce „Dane" - wszystkie widzą ten sam model.
 *
 * Bazą jest `app/data/base.json` (przez `~/data`), a nie dane zapisane w kodzie:
 * podmiana JSON-a albo podłączenie innego źródła nie wymaga zmian w widokach.
 */
export function cloneData(): AppData {
  return JSON.parse(JSON.stringify(baseData)) as AppData
}

/** Pobranie bieżących danych jako JSON - eksport w „Dane” i kopia ze stopki. */
export function downloadAppData(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'usos-revanced.json'
  link.click()
  URL.revokeObjectURL(url)
}

/** Kiedy ostatnio udał się zapis do localStorage (ISO) i czy ostatni się wywalił - dla stopki. */
export function useAppDataSaveState() {
  return {
    savedAt: useState<string | null>('app-data-saved-at', () => null),
    failed: useState<boolean>('app-data-save-failed', () => false),
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
