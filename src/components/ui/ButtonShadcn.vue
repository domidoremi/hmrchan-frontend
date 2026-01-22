<template>
  <button :class="buttonClass" :disabled="props.disabled || props.loading" :type="props.type" @click="handleClick">
    <span v-if="loading" class="btn-spinner">
      <svg
        class="animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </span>
    <component v-if="showLeftIcon" :is="icon" :size="iconSize" />
    <span v-if="hasDefaultSlot" class="btn-content">
      <slot />
    </span>
    <component v-if="showRightIcon" :is="icon" :size="iconSize" />
  </button>
</template>

<script setup lang="ts">
import { computed, useSlots, type Component } from 'vue'

interface Props {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  disabled?: boolean
  loading?: boolean
  icon?: Component
  iconPosition?: 'left' | 'right'
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'default',
  disabled: false,
  loading: false,
  iconPosition: 'left',
  type: 'button',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const slots = useSlots()

// Icon size mapping
const ICON_SIZES = {
  sm: 16,
  default: 18,
  lg: 20,
  icon: 18,
} as const

// Computed properties
const buttonClass = computed(() => [
  'btn-shadcn',
  `btn-shadcn--${props.variant}`,
  `btn-shadcn--size-${props.size}`,
  {
    'btn-shadcn--loading': props.loading,
    'btn-shadcn--disabled': props.disabled,
  },
])

const iconSize = computed(() => ICON_SIZES[props.size])

const hasDefaultSlot = computed(() => !!slots['default'])

const showLeftIcon = computed(() => !!props.icon && props.iconPosition === 'left' && !props.loading)

const showRightIcon = computed(() => !!props.icon && props.iconPosition === 'right' && !props.loading)

function handleClick(event: MouseEvent) {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
/* Base Button Styles */
.btn-shadcn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  white-space: nowrap;
  border-radius: var(--radius);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  transition-property: color, background-color, border-color, box-shadow, transform;
  transition-timing-function: var(--ease-out);
  transition-duration: 150ms;
  cursor: pointer;
  outline: none;
  border: 1px solid transparent;
  user-select: none;
}

.btn-shadcn:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}

.btn-shadcn:active:not(:disabled):not(.btn-shadcn--disabled) {
  transform: scale(0.98);
}

/* Sizes */
.btn-shadcn--size-default {
  height: 2.5rem; /* 40px */
  padding: 0 1rem;
}

.btn-shadcn--size-sm {
  height: 2.25rem; /* 36px */
  padding: 0 0.75rem;
  font-size: var(--text-xs);
}

.btn-shadcn--size-lg {
  height: 2.75rem; /* 44px */
  padding: 0 2rem;
  font-size: var(--text-base);
}

.btn-shadcn--size-icon {
  height: 2.5rem;
  width: 2.5rem;
  padding: 0;
}

/* Variants */

/* Default */
.btn-shadcn--default {
  background-color: var(--color-primary);
  color: var(--color-white);
  box-shadow: var(--shadow-sm);
}

.btn-shadcn--default:hover:not(:disabled):not(.btn-shadcn--disabled) {
  background-color: var(--color-primary-dark);
  box-shadow: var(--shadow-md);
}

/* Destructive */
.btn-shadcn--destructive {
  background-color: var(--color-destructive);
  color: var(--color-destructive-foreground);
  box-shadow: var(--shadow-sm);
}

.btn-shadcn--destructive:hover:not(:disabled):not(.btn-shadcn--disabled) {
  background-color: var(--color-error-hover);
  box-shadow: var(--shadow-md);
}

/* Outline */
.btn-shadcn--outline {
  border-color: var(--color-input);
  background-color: transparent;
  color: var(--color-foreground);
}

.btn-shadcn--outline:hover:not(:disabled):not(.btn-shadcn--disabled) {
  background-color: var(--color-muted);
  border-color: var(--color-primary);
}

/* Secondary */
.btn-shadcn--secondary {
  background-color: var(--color-muted);
  color: var(--color-foreground);
}

.btn-shadcn--secondary:hover:not(:disabled):not(.btn-shadcn--disabled) {
  background-color: var(--color-gray-200);
}

[data-theme='dark'] .btn-shadcn--secondary:hover:not(:disabled):not(.btn-shadcn--disabled) {
  background-color: var(--color-gray-300);
}

/* Ghost */
.btn-shadcn--ghost {
  background-color: transparent;
  color: var(--color-foreground);
}

.btn-shadcn--ghost:hover:not(:disabled):not(.btn-shadcn--disabled) {
  background-color: var(--color-muted);
}

/* Link */
.btn-shadcn--link {
  background-color: transparent;
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 4px;
}

.btn-shadcn--link:hover:not(:disabled):not(.btn-shadcn--disabled) {
  text-decoration: none;
}

/* States */
.btn-shadcn:disabled,
.btn-shadcn--disabled {
  pointer-events: none;
  opacity: 0.5;
}

.btn-shadcn--loading {
  cursor: wait;
}

/* Spinner */
.btn-spinner {
  display: inline-flex;
  width: 1rem;
  height: 1rem;
}

.btn-spinner svg {
  width: 100%;
  height: 100%;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.btn-content {
  display: inline-flex;
  align-items: center;
}
</style>
