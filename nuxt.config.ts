import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  devtools: { enabled: false },

  css: ['~/assets/css/main.css'],

  // SPA bez serwera: `nuxi generate` daje statyczne pliki w .output/public - tego potrzebuje
  // Tauri (frontendDist). Wszystkie dane i tak żyją po stronie klienta.
  ssr: false,

  // `tauri android dev` ustawia TAURI_DEV_HOST na adres komputera w sieci - telefon
  // musi dosięgnąć serwera deweloperskiego, a nie swojego localhosta.
  devServer: { host: process.env.TAURI_DEV_HOST || 'localhost' },

  vite: {
    plugins: [tailwindcss()],
    clearScreen: false,
    envPrefix: ['VITE_', 'TAURI_'],
    server: {
      strictPort: true,
      watch: { ignored: ['**/src-tauri/**', '**/.tmp/**'] },
    },
    optimizeDeps: {
      include: [
        'class-variance-authority',
        'clsx',
        'lucide-vue-next',
        'reka-ui',
        'tailwind-merge',
      ],
    },
  },

  components: [
    {
      path: '~/components',
      pathPrefix: false,
      extensions: ['vue'],
    },
  ],

  app: {
    head: {
      title: 'USOS Revanced: dziennik studiów',
      htmlAttrs: { lang: 'pl' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        {
          name: 'description',
          content: 'Harmonogram, oceny i kalendarz zajęć w jednym miejscu.',
        },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
    tsConfig: {
      // vue-router 4.6 nie eksportuje już pluginu volar, który dopisuje Nuxt,
      // bez tego `nuxt typecheck` kończy się błędem mimo braku błędów typów.
      vueCompilerOptions: {
        plugins: [],
      },
    },
  },
})
