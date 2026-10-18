<script setup lang="ts">
import { cn } from '~/lib/utils'
import { badgeVariants, type BadgeProps } from '.'

const props = withDefaults(defineProps<BadgeProps>(), { variant: 'default' })
</script>

<template>
  <span :class="cn(badgeVariants({ variant: props.variant }), props.class)">
    <slot />
  </span>
</template>
