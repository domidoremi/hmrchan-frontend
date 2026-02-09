<template>
  <div class="animated-icon" :class="[`animated-icon--${size}`]">
    <slot>
      <component :is="fallbackIcon" :size="iconSize" class="animated-icon__fallback" />
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'

interface Props {
  /** Icon name (kept for API compat, unused) */
  name?: string
  /** Unused — kept for API compat */
  animationData?: object
  /** Unused — kept for API compat */
  active?: boolean
  /** Unused — kept for API compat */
  playOnHover?: boolean
  /** Unused — kept for API compat */
  loop?: boolean
  /** Size */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Static icon component */
  fallbackIcon?: Component
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  playOnHover: false,
  loop: false,
  size: 'md',
})

const iconSizeMap: Record<string, number> = { sm: 16, md: 20, lg: 24, xl: 32 }
const iconSize = computed(() => iconSizeMap[props.size])

defineExpose({ play: () => {}, pause: () => {}, stop: () => {} })
</script>

<style scoped>
.animated-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  color: currentColor;
}

.animated-icon--sm {
  width: 16px;
  height: 16px;
}

.animated-icon--md {
  width: 20px;
  height: 20px;
}

.animated-icon--lg {
  width: 24px;
  height: 24px;
}

.animated-icon--xl {
  width: 32px;
  height: 32px;
}

.animated-icon__fallback {
  pointer-events: none;
}
</style>
