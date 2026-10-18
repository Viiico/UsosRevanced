export type ThemeMode = 'dark' | 'light'

/**
 * Motyw trzymany w cookie, żeby SSR od razu renderował właściwą paletę
 * (bez mignięcia jasnego tła). Domyślnie ciemny - schemat #3.
 */
export function useAppTheme() {
  const cookie = useCookie<ThemeMode>('theme', {
    default: () => 'dark',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  const theme = useState<ThemeMode>('theme', () => cookie.value ?? 'dark')
  const isDark = computed(() => theme.value === 'dark')

  useHead({
    htmlAttrs: {
      class: computed(() => (isDark.value ? 'dark' : '')),
    },
    meta: [{ name: 'theme-color', content: computed(() => (isDark.value ? '#1a1816' : '#f4efe6')) }],
  })

  watch(theme, (value) => {
    cookie.value = value
    if (import.meta.client) {
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
