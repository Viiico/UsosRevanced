<script setup lang="ts">
import { Table2 } from 'lucide-vue-next'

useHead({ title: 'Harmonogram' })
</script>

<template>
  <div class="space-y-5">
    <header>
      <h1 class="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
        Harmonogram
      </h1>
      <p class="mt-1 max-w-2xl text-sm text-muted-foreground">
        Lista nadchodzących terminów z całego semestru - z filtrowaniem po przedmiocie i po tym, czy
        zadanie da się wykonać przed terminem.
      </p>
    </header>

    <ComingSoon
      :icon="Table2"
      title="Harmonogram w przygotowaniu"
      description="Widok będzie korzystał z tych samych danych co zakładka Oceny - terminy są już opisane w modelu (data, punkty, wymagania, flaga canBeDone)."
      :plans="[
        'Filtrowanie po przedmiocie i typie terminu',
        'Przełącznik „tylko do zrobienia teraz” na podstawie flagi canBeDone',
        'Punkty do zdobycia i wymagania przy każdym terminie',
        'Ikona informacyjna otwierająca szczegóły zadania',
      ]"
      note="Model danych i komponent listy terminów są gotowe w app/data oraz app/components/oceny/ScopedTerms.vue."
    />
  </div>
</template>
