<template>
  <component :is="as" :class="cardClass">
    <div v-if="$slots['header']" class="ui-card__header">
      <slot name="header" />
    </div>
    <div v-if="$slots['default']" class="ui-card__content">
      <slot />
    </div>
    <div v-if="$slots['footer']" class="ui-card__footer">
      <slot name="footer" />
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'UiCard' })

interface Props {
  as?: string
  variant?: 'default' | 'outline' | 'subtle'
  interactive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
  variant: 'default',
  interactive: false,
})

const cardClass = computed(() => [
  'ui-card',
  `ui-card--${props.variant}`,
  { 'ui-card--interactive': props.interactive },
])
</script>

<style scoped>
.ui-card {
  position: relative;
  border-radius: var(--radius-xl);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
  overflow: hidden;
  transition:
    box-shadow 150ms var(--ease-out),
    transform 150ms var(--ease-out),
    border-color 150ms var(--ease-out);
}

.ui-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.45) 50%,
    transparent 100%
  );
  opacity: 0.6;
  pointer-events: none;
}

.ui-card--outline {
  background: transparent;
  box-shadow: none;
}

.ui-card--subtle {
  background: var(--glass-bg-light);
  box-shadow: var(--shadow-sm);
}

.ui-card--interactive {
  cursor: pointer;
}

.ui-card--interactive:hover {
  transform: translateY(-2px);
  border-color: var(--glass-border-strong);
  box-shadow:
    var(--glass-shadow-lg),
    0 12px 28px -8px rgba(var(--color-primary-rgb), 0.12);
}

.ui-card__header,
.ui-card__content,
.ui-card__footer {
  position: relative;
  z-index: 1;
}

.ui-card__header {
  padding: var(--spacing-4) var(--spacing-5) 0;
}

.ui-card__content {
  padding: var(--spacing-5);
}

.ui-card__footer {
  padding: 0 var(--spacing-5) var(--spacing-5);
}
</style>
