<template>
  <button :class="buttonClass" :disabled="disabled || loading" @click="handleClick">
    <span v-if="loading" class="spinner-small"></span>
    <slot v-else />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClass = computed(() => {
  return [
    'glass-button',
    `btn-${props.variant}`,
    `btn-${props.size}`,
    {
      'btn-disabled': props.disabled,
      'btn-loading': props.loading,
    },
  ]
})

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
.glass-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  font-weight: var(--font-medium);
  transition: all var(--transition-base);
  cursor: pointer;
  white-space: nowrap;
}

/* 尺寸 */
.btn-sm {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-sm);
  border-radius: var(--radius-md);
  min-height: 32px;
  height: auto;
}

.btn-md {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-base);
  border-radius: var(--radius-lg);
  min-height: 40px;
  height: auto;
}

.btn-lg {
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: var(--text-lg);
  border-radius: var(--radius-xl);
  min-height: 48px;
  height: auto;
}

/* 变体 */
.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-primary:hover:not(.btn-disabled) {
  transform: translateY(-2px);
  box-shadow: var(--glass-glow);
}

.btn-secondary {
  background: var(--glass-bg);
  color: var(--color-text-primary);
  border: 1px solid var(--glass-border);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-primary);
  border: 1px solid transparent;
}

.btn-ghost:hover:not(.btn-disabled) {
  background: var(--glass-bg-light);
  border-color: var(--glass-border);
}

/* 状态 */
.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-loading {
  cursor: wait;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
