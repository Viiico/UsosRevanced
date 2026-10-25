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

export function useAppData(): AppData {
  const state = useState<AppData>('app-data', cloneData)
  // Gwarancja głębokiej reaktywności na kliencie: wszystkie widoki czytają
  // ten sam proxy, więc edycja punktów od razu przelicza postęp i ocenę.
  if (import.meta.client && state.value && !isReactive(state.value)) {
    state.value = reactive(state.value)
  }
  return state.value
}
