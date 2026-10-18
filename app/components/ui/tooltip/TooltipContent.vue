<script setup lang="ts">
import { TooltipContent, TooltipPortal } from 'reka-ui'
import { cn } from '~/lib/utils'

const props = withDefaults(
  defineProps<{
    class?: string
    side?: 'top' | 'right' | 'bottom' | 'left'
    align?: 'start' | 'center' | 'end'
    sideOffset?: number
  }>(),
  { side: 'top', align: 'center', sideOffset: 6 },
)
</script>

<template>
  <TooltipPortal>
    <TooltipContent
      :side="props.side"
      :align="props.align"
      :side-offset="props.sideOffset"
      :class="
        cn(
          'z-50 max-w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-border bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-lg',
          'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          props.class,
        )
      "
    >
      <slot />
    </TooltipContent>
  </TooltipPortal>
</template>
