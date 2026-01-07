<template>
  <button :class="buttonClass" :disabled="disabled || loading" :type="type" @click="handleClick">
    <span class="btn-ripple" />
    <span v-if="loading" class="spinner spinner-sm" />
    <component v-else-if="icon && iconPosition === 'left'" :is="icon" :size="iconSize" />
    <span v-if="$slots['default']" class="btn-content">
      <slot />
    </span>
    <component v-if="icon && iconPosition === 'right' && !loading" :is="icon" :size="iconSize" />
  </button>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: Component
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  iconPosition: 'left',
  fullWidth: false,
  type: 'button',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClass = computed(() => [
  'btn',
  `btn-${props.variant}`,
  `btn-${props.size}`,
  {
    'btn-loading': props.loading,
    'btn-full-width': props.fullWidth,
    'btn-icon-only': props.icon && !props.loading,
  },
])

const iconSize = computed(() => {
  const sizes = { sm: 16, md: 18, lg: 20 }
  return sizes[props.size]
})

function handleClick(event: MouseEvent) {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
.btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  font-weight: var(--font-medium);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
  outline: none;
  white-space: nowrap;
  overflow: hidden;
  isolation: isolate;
}

.btn-ripple {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: -1;
}

/* Sizes */
.btn-sm {
  padding: var(--spacing-1) var(--spacing-3);
  font-size: var(--text-sm);
  min-height: 32px;
}

.btn-md {
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--text-base);
  min-height: 40px;
}

.btn-lg {
  padding: var(--spacing-3) var(--spacing-6);
  font-size: var(--text-lg);
  min-height: 48px;
}

/* Variants */
.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: var(--color-white);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow:
    0 0 0 1px rgba(var(--color-primary-rgb), 0.2),
    0 8px 24px -4px rgba(var(--color-primary-rgb), 0.4),
    0 4px 8px -2px rgba(var(--color-primary-rgb), 0.2);
}

.btn-primary:hover:not(:disabled) .btn-ripple {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0) scale(0.97);
  transition: transform 0.1s ease;
}

.btn-secondary {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  color: var(--color-text-primary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--glass-bg-strong);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary-100);
}

.btn-secondary:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-primary);
  border: 1px solid transparent;
}

.btn-ghost:hover:not(:disabled) {
  background: var(--glass-bg-light);
  border-color: var(--glass-border);
}

.btn-ghost:active:not(:disabled) {
  transform: scale(0.97);
  background: var(--glass-bg);
}

.btn-danger {
  background: linear-gradient(135deg, var(--color-error) 0%, #dc2626 100%);
  color: var(--color-white);
}

.btn-danger:hover:not(:disabled) {
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
}

.btn-success {
  background: linear-gradient(135deg, var(--color-success) 0%, #059669 100%);
  color: var(--color-white);
}

/* States */
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.btn-loading {
  cursor: wait;
}

.btn-full-width {
  width: 100%;
}

/* Focus */
.btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.btn-content {
  display: inline-flex;
  align-items: center;
}
</style>
