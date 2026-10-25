export type ThemeMode = 'dark' | 'light'

import { readValue, writeValue } from '~/lib/storage'

const THEME_KEY = 'usos-revanced:theme'

/**
 * Motyw w trwałym zapisie aplikacji (Tauri store / localStorage) - aplikacja jest SPA,
 * więc cookie dla SSR nie ma sensu. Domyślnie ciemny - schemat #3.
 */
export function useAppTheme() {
  const theme = useState<ThemeMode>('theme', () => 'dark')
  const restored = useState('theme-restored', () => false)
  if (import.meta.client && !restored.value) {
    restored.value = true
    readValue(THEME_KEY).then((value) => {
      if (value === 'light' || value === 'dark') theme.value = value
    })
  }
  const isDark = computed(() => theme.value === 'dark')

  useHead({
    htmlAttrs: {
      class: computed(() => (isDark.value ? 'dark' : '')),
    },
    meta: [{ name: 'theme-color', content: computed(() => (isDark.value ? '#1a1816' : '#f4efe6')) }],
  })

  watch(theme, (value) => {
    if (import.meta.client) {
      void writeValue(THEME_KEY, value)
      document.documentElement.classList.toggle('dark', value === 'dark')
    }
  })

  function toggle() {
    theme.value = isDark.value ? 'light' : 'dark'
  }

  function set(next: ThemeMode) {
    theme.value = next
  }

  return { theme, isDark, toggle, set }
}
