<script setup lang="ts">
import { TooltipProvider, TooltipRoot } from 'reka-ui'

const props = withDefaults(
  defineProps<{
    delayDuration?: number
    defaultOpen?: boolean
  }>(),
  { delayDuration: 150, defaultOpen: false },
)
</script>

<template>
  <TooltipProvider :delay-duration="props.delayDuration" :skip-delay-duration="400">
    <TooltipRoot :default-open="props.defaultOpen">
      <slot />
    </TooltipRoot>
  </TooltipProvider>
</template>
