<script setup lang="ts">
import { Info } from 'lucide-vue-next'
import { cn } from '~/lib/utils'

const props = withDefaults(
  defineProps<{
    text?: string
    class?: string
    side?: 'top' | 'right' | 'bottom' | 'left'
  }>(),
  { side: 'top' },
)
</script>

<template>
  <Tooltip>
    <TooltipTrigger>
      <button
        type="button"
        aria-label="Więcej informacji"
        @click.stop
        :class="
          cn(
            'inline-flex size-5 items-center justify-center rounded-full text-muted-foreground/70 transition-colors',
            'hover:bg-secondary/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none',
            props.class,
          )
        "
      >
        <Info class="size-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent :side="props.side">
      <slot>{{ props.text }}</slot>
    </TooltipContent>
  </Tooltip>
</template>
