import type { AppData } from '~/types'
import { cloneData, useAppDataSaveState } from '~/composables/useAppData'
import { createSync, loadAppData } from '~/lib/db'
import { isTauri } from '~/lib/storage'

/**
 * Trwały zapis w SQLite (aplikacja Tauri). Przy pierwszym uruchomieniu baza jest pusta,
 * więc wypełnia ją dokument bazowy (`app/data/base.json`); potem źródłem prawdy jest baza.
 * Każda zmiana stanu - punkty, „zrobione”, edycja w „Dane”, import - trafia do bazy
 * od razu, jako różnica wierszy (lib/db). W przeglądarce to tylko podgląd bez zapisu.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const state = useState<AppData>('app-data', cloneData)
  const loaded = useState<boolean>('app-data-loaded', () => false)
  const { savedAt, failed, preview } = useAppDataSaveState()

  nuxtApp.hook('app:mounted', async () => {
    if (!isTauri()) {
      preview.value = true
      loaded.value = true
      return
    }

    let sync: ReturnType<typeof createSync>
    try {
      const stored = await loadAppData()
      if (stored) Object.assign(state.value, stored)
      sync = createSync(stored)
    } catch (error) {
      console.error('Nie udało się wczytać bazy', error)
      failed.value = true
      loaded.value = true
      return
    }
    loaded.value = true

    // Zapisy idą po kolei; zmiany zgłoszone w trakcie zapisu dochodzą w następnym przebiegu.
    let running = false
    let pending = false
    async function save() {
      if (running) {
        pending = true
        return
      }
      running = true
      try {
        do {
          pending = false
          if (await sync.flush(state.value)) savedAt.value = new Date().toISOString()
          failed.value = false
        } while (pending)
      } catch (error) {
        console.error('Nie udało się zapisać w bazie', error)
        failed.value = true
      } finally {
        running = false
      }
    }

    // Pierwsze uruchomienie: zapis dokumentu bazowego.
    await save()
    // Mikrozadanie zbiera kilka mutacji z jednej akcji w jeden przebieg zapisu.
    watch(state, () => queueMicrotask(save), { deep: true })
  })
})
