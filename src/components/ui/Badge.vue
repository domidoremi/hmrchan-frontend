<template>
  <span :class="badgeClass">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'UiBadge' })

interface Props {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
  size?: 'sm' | 'default' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'default',
})

const badgeClass = computed(() => [
  'ui-badge',
  `ui-badge--${props.variant}`,
  `ui-badge--${props.size}`,
])
</script>

<style scoped>
.ui-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-1);
  font-weight: var(--font-medium);
  border-radius: var(--radius-full);
  white-space: nowrap;
  transition-property: color, background-color, border-color;
  transition-duration: 150ms;
  transition-timing-function: var(--ease-out);
}

/* Sizes */
.ui-badge--sm {
  height: 1.25rem;
  padding: 0 0.375rem;
  font-size: 0.625rem;
}

.ui-badge--default {
  height: 1.375rem;
  padding: 0 0.625rem;
  font-size: var(--text-xs);
}

.ui-badge--lg {
  height: 1.625rem;
  padding: 0 0.75rem;
  font-size: var(--text-sm);
}

/* Variants */
.ui-badge--default {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.ui-badge--secondary {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur-light);
  border: 1px solid var(--glass-border);
  color: var(--color-foreground);
}

.ui-badge--destructive {
  background: var(--color-destructive);
  color: var(--color-destructive-foreground);
}

.ui-badge--outline {
  background: transparent;
  border: 1px solid var(--color-input);
  color: var(--color-foreground);
}

.ui-badge--success {
  background: var(--color-success-alpha);
  color: var(--color-success);
  border: 1px solid rgba(var(--color-success-rgb), 0.2);
}

.ui-badge--warning {
  background: var(--color-warning-alpha);
  color: var(--color-warning);
  border: 1px solid rgba(var(--color-warning-rgb), 0.2);
}
</style>
