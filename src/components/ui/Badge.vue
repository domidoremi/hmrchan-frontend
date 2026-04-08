<template>
  <span :class="badgeClass">
    <slot />
  </span>
</template>

<script setup lang="ts" vapor>
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
defineSlots<{
  default?: () => unknown
}>()

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
  min-inline-size: 0;
  font-weight: var(--font-medium);
  border-radius: var(--ui-radius-badge, var(--radius-full));
  white-space: nowrap;
  line-height: var(--appearance-ui-line-height);
  text-align: center;
  transition-property: color, background-color, border-color;
  transition-duration: 150ms;
  transition-timing-function: var(--ease-out);
}

/* Sizes */
.ui-badge--sm {
  min-block-size: calc(var(--appearance-chip-min-block-size) - 0.5625rem);
  padding-block: max(0.1875rem, calc(var(--ui-control-padding-y-sm) - 0.1875rem));
  padding-inline: max(0.625rem, calc(var(--appearance-chip-padding-inline) * 0.66));
  font-size: 0.625rem;
}

.ui-badge--default {
  min-block-size: var(--appearance-chip-min-block-size);
  padding-block: max(0.25rem, calc(var(--ui-control-padding-y-sm) - 0.125rem));
  padding-inline: max(0.8125rem, calc(var(--appearance-chip-padding-inline) * 0.82));
  font-size: var(--text-xs);
}

.ui-badge--lg {
  min-block-size: calc(var(--appearance-chip-min-block-size) + 0.25rem);
  padding-block: max(0.3125rem, var(--ui-control-padding-y-sm));
  padding-inline: max(0.9375rem, calc(var(--appearance-chip-padding-inline) * 0.96));
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
