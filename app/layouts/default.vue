<template>
  <div class="flex min-h-dvh flex-col">
    <AppHeader />

    <main class="mx-auto w-full max-w-[100rem] flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <slot />
    </main>

    <footer class="mt-4 border-t border-border/60 py-4">
      <div
        class="mx-auto flex w-full max-w-[100rem] flex-wrap items-center justify-between gap-2 px-4 text-[11px] text-muted-foreground sm:px-6"
      >
        <span>USOS Revanced · dane trzymane lokalnie (JSON → SQLite)</span>
        <span class="flex items-center gap-1.5">
          <span class="size-1.5 rounded-full bg-primary/70" />
          Prototyp · zakładka Oceny
        </span>
      </div>
    </footer>
  </div>
</template>
