<script setup lang="ts">
import { cn } from '~/lib/utils'
import type { CardProps } from '.'

const props = defineProps<CardProps>()
</script>

<template>
  <div
    :class="
      cn(
        'flex flex-col rounded-xl border border-border/80 bg-card text-card-foreground shadow-[0_1px_0_0_rgba(0,0,0,0.04)]',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
