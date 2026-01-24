<template>
  <button :class="buttonClass" :disabled="disabled || loading" :type="type" @click="handleClick">
    <span v-if="loading" class="spinner spinner-sm" />
    <component v-else-if="showLeftIcon" :is="icon" :size="iconSize" />
    <span v-if="hasDefaultSlot" class="btn-content">
      <slot />
    </span>
    <component v-if="showRightIcon" :is="icon" :size="iconSize" />
  </button>
</template>

<script setup lang="ts">
import { computed, useSlots, type Component } from 'vue'

interface Props {
  variant?:
    | 'primary'
    | 'secondary'
    | 'ghost'
    | 'danger'
    | 'success'
    | 'default'
    | 'destructive'
    | 'outline'
    | 'link'
  size?: 'sm' | 'md' | 'lg' | 'default' | 'icon'
  disabled?: boolean
  loading?: boolean
  icon?: Component
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'default',
  disabled: false,
  loading: false,
  iconPosition: 'left',
  fullWidth: false,
  type: 'button',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const slots = useSlots()

const VARIANT_MAP: Record<string, string> = {
  primary: 'default',
  default: 'default',
  destructive: 'destructive',
  danger: 'destructive',
  secondary: 'secondary',
  ghost: 'ghost',
  outline: 'outline',
  link: 'link',
  success: 'success',
}

const SIZE_MAP: Record<string, string> = {
  sm: 'sm',
  md: 'md',
  default: 'md',
  lg: 'lg',
  icon: 'icon',
}

const normalizedVariant = computed(() => VARIANT_MAP[props.variant] ?? 'default')
const normalizedSize = computed(() => SIZE_MAP[props.size] ?? 'md')
const hasDefaultSlot = computed(() => !!slots['default'])
const isIconOnly = computed(() => !!props.icon && !props.loading && !hasDefaultSlot.value)

const buttonClass = computed(() => [
  'btn',
  `btn-${normalizedVariant.value}`,
  `btn-${normalizedSize.value}`,
  {
    'btn-loading': props.loading,
    'btn-full-width': props.fullWidth,
    'btn-icon-only': isIconOnly.value,
  },
])

const iconSize = computed(() => {
  const sizes = { sm: 16, md: 18, lg: 20, icon: 18 }
  return sizes[normalizedSize.value] ?? 18
})

const showLeftIcon = computed(
  () => !!props.icon && props.iconPosition === 'left' && !props.loading
)
const showRightIcon = computed(
  () => !!props.icon && props.iconPosition === 'right' && !props.loading
)

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
  border-radius: var(--radius);
  cursor: pointer;
  transition-property: color, background-color, border-color, box-shadow, transform;
  transition-duration: 150ms;
  transition-timing-function: var(--ease-out);
  border: 1px solid transparent;
  outline: none;
  white-space: nowrap;
  user-select: none;
}

/* Sizes */
.btn-sm {
  height: 2.25rem;
  padding: 0 0.75rem;
  font-size: var(--text-xs);
}

.btn-md {
  height: 2.5rem;
  padding: 0 1rem;
  font-size: var(--text-sm);
}

.btn-lg {
  height: 2.75rem;
  padding: 0 2rem;
  font-size: var(--text-base);
}

.btn-icon {
  height: 2.5rem;
  width: 2.5rem;
  padding: 0;
}

.btn-icon-only.btn-sm {
  height: 2.25rem;
  width: 2.25rem;
}

.btn-icon-only.btn-lg {
  height: 2.75rem;
  width: 2.75rem;
}

/* Variants */
.btn-default {
  background: var(--color-primary);
  color: var(--color-white);
  box-shadow: var(--shadow-sm);
}

.btn-default:hover:not(:disabled) {
  background: var(--color-primary-dark);
  box-shadow: var(--shadow-md);
}

.btn-default:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-secondary {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border-color: var(--glass-border);
  color: var(--color-foreground);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--glass-bg-strong);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px rgba(var(--color-primary-rgb), 0.16);
}

.btn-outline {
  background: transparent;
  border-color: var(--color-input);
  color: var(--color-foreground);
}

.btn-outline:hover:not(:disabled) {
  background: var(--color-muted);
  border-color: var(--color-primary);
}

.btn-ghost {
  background: transparent;
  color: var(--color-foreground);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--glass-bg-light);
}

.btn-link {
  background: transparent;
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 4px;
  box-shadow: none;
}

.btn-link:hover:not(:disabled) {
  text-decoration: none;
}

.btn-destructive {
  background: var(--color-destructive);
  color: var(--color-destructive-foreground);
  box-shadow: var(--shadow-sm);
}

.btn-destructive:hover:not(:disabled) {
  background: var(--color-error-hover);
  box-shadow: var(--shadow-md);
}

.btn-success {
  background: var(--color-success);
  color: var(--color-white);
  box-shadow: var(--shadow-sm);
}

.btn-success:hover:not(:disabled) {
  background: var(--color-success-hover);
  box-shadow: var(--shadow-md);
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
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}

.btn-content {
  display: inline-flex;
  align-items: center;
}
</style>
