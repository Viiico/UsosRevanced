import type { AppData } from '~/types'
import { cloneData, useAppDataSaveState } from '~/composables/useAppData'
import { normalizeData } from '~/lib/normalize'
import { readValue, writeValue } from '~/lib/storage'

const STORAGE_KEY = 'usos-revanced:data'

/**
 * Trwała kopia robocza danych (lib/storage: Tauri store albo localStorage) - edycje
 * z zakładki „Dane" i punkty przeżywają restart. Po wczytaniu ma pierwszeństwo nad
 * bazowym JSON-em (`app/data/base.json`); zastępuje ją tylko import w zakładce „Dane”.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const state = useState<AppData>('app-data', cloneData)
  const loaded = useState<boolean>('app-data-loaded', () => false)
  const { savedAt, failed } = useAppDataSaveState()

  nuxtApp.hook('app:mounted', async () => {
    // Zapis przez lib/storage: w Tauri plugin store, w przeglądarce localStorage.
    try {
      const raw = await readValue(STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (parsed && typeof parsed === 'object' && 'subjects' in parsed && 'semester' in parsed) {
          Object.assign(state.value, normalizeData(parsed as AppData))
        }
      }
    } catch {
      // uszkodzony zapis - zostają dane demo
    }
    loaded.value = true

    let timer: ReturnType<typeof setTimeout> | undefined
    watch(
      state,
      () => {
        if (!loaded.value) return
        clearTimeout(timer)
        timer = setTimeout(async () => {
          try {
            await writeValue(STORAGE_KEY, JSON.stringify(state.value))
            savedAt.value = new Date().toISOString()
            failed.value = false
          } catch {
            // brak miejsca / tryb prywatny - dane zostają w pamięci
            failed.value = true
          }
        }, 300)
      },
      { deep: true },
    )

    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      try {
        Object.assign(state.value, normalizeData(JSON.parse(event.newValue) as AppData))
      } catch {
        // ignorujemy uszkodzony wpis z innej karty
      }
    })
  })
})
