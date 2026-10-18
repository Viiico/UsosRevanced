<script setup lang="ts">
import { CalendarDays } from 'lucide-vue-next'

useHead({ title: 'Kalendarz' })
</script>

<template>
  <div class="space-y-5">
    <header>
      <h1 class="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
        Kalendarz
      </h1>
      <p class="mt-1 max-w-2xl text-sm text-muted-foreground">
        Tydzień od poniedziałku do piątku z zajęciami i terminami, plus widok skompaktowany, który
        pokazuje wyłącznie przedmioty.
      </p>
    </header>

    <ComingSoon
      :icon="CalendarDays"
      title="Kalendarz w przygotowaniu"
      description="Widok tygodniowy będzie siatką 5 kolumn (pon-pt) z wykładami, laboratoriami i terminami; widok kompaktowany pokaże tylko przedmioty - także te odbywające się co kilka tygodni."
      :plans="[
        'Siatka tygodniowa pon-pt z blokami zajęć',
        'Wydarzenia: wykład, laboratorium, kolokwium, etap projektu',
        'Widok kompaktowany - same przedmioty, bez powtórzeń',
        'Przełączanie tygodni i podświetlenie bieżącego dnia',
      ]"
      note="Daty zajęć (wykłady W1-W15, laboratoria grupy 104, kolokwia, etapy projektu) są już w app/data/subjects.ts."
    />
  </div>
</template>
