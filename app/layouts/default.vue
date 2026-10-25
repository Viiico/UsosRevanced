<template>
  <div class="flex min-h-dvh flex-col">
    <AppHeader />

    <main class="mx-auto w-full max-w-[100rem] flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <slot />
    </main>

    <AppFooter />
  </div>
</template>
