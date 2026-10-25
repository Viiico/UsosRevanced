import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  devtools: { enabled: false },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { redirect: '/oceny' },
  },

  vite: {
    plugins: [tailwindcss()],
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
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
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
