<template>
  <button :class="buttonClass" :disabled="disabled || loading" @click="handleClick" ref="buttonRef">
    <component
      v-if="icon && iconPosition === 'left' && !loading"
      :is="icon"
      :size="iconSize"
      class="btn-icon btn-icon-left"
    />
    <span v-if="loading" class="spinner-small"></span>
    <span v-if="$slots.default" class="btn-content">
      <slot />
    </span>
    <component
      v-if="icon && iconPosition === 'right' && !loading"
      :is="icon"
      :size="iconSize"
      class="btn-icon btn-icon-right"
    />
    <span class="ripple-container" ref="rippleContainer"></span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref, useSlots, type Component } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  loading?: boolean
  icon?: Component
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  rounded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  iconPosition: 'left',
  fullWidth: false,
  rounded: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const slots = useSlots()
const buttonRef = ref<HTMLButtonElement>()
const rippleContainer = ref<HTMLSpanElement>()

const buttonClass = computed(() => {
  return [
    'glass-button',
    `btn-${props.variant}`,
    `btn-${props.size}`,
    {
      'btn-disabled': props.disabled,
      'btn-loading': props.loading,
      'btn-full-width': props.fullWidth,
      'btn-rounded': props.rounded,
      'btn-icon-only': props.icon && !slots.default,
    },
  ]
})

const iconSize = computed(() => {
  const sizeMap = {
    xs: 14,
    sm: 16,
    md: 18,
    lg: 20,
    xl: 22,
  }
  return sizeMap[props.size]
})

const createRipple = (event: MouseEvent) => {
  if (!rippleContainer.value || !buttonRef.value) return

  const button = buttonRef.value
  const rect = button.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = event.clientX - rect.left - size / 2
  const y = event.clientY - rect.top - size / 2

  const ripple = document.createElement('span')
  ripple.className = 'ripple'
  ripple.style.width = ripple.style.height = `${size}px`
  ripple.style.left = `${x}px`
  ripple.style.top = `${y}px`

  rippleContainer.value.appendChild(ripple)

  setTimeout(() => {
    ripple.remove()
  }, 600)
}

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    createRipple(event)
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
  gap: var(--spacing-2);
  font-weight: var(--font-medium);
  transition: all var(--transition-base);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  border: none;
  outline: none;
}

/* 尺寸 */
.btn-xs {
  padding: var(--spacing-1) var(--spacing-3);
  font-size: var(--text-xs);
  border-radius: var(--radius-sm);
  min-height: 28px;
  height: auto;
}

.btn-sm {
  padding: var(--spacing-1) var(--spacing-4);
  font-size: var(--text-sm);
  border-radius: var(--radius-md);
  min-height: 32px;
  height: auto;
}

.btn-md {
  padding: var(--spacing-2) var(--spacing-6);
  font-size: var(--text-base);
  border-radius: var(--radius-lg);
  min-height: 40px;
  height: auto;
}

.btn-lg {
  padding: var(--spacing-4) var(--spacing-8);
  font-size: var(--text-lg);
  border-radius: var(--radius-xl);
  min-height: 48px;
  height: auto;
}

.btn-xl {
  padding: var(--spacing-5) var(--spacing-10);
  font-size: var(--text-xl);
  border-radius: var(--radius-2xl);
  min-height: 56px;
  height: auto;
}

/* 图标按钮（仅图标无文字） */
.btn-icon-only {
  padding: var(--spacing-2);
  aspect-ratio: 1;
}

.btn-icon-only.btn-xs {
  padding: var(--spacing-1);
  min-width: 28px;
}

.btn-icon-only.btn-sm {
  padding: var(--spacing-1);
  min-width: 32px;
}

.btn-icon-only.btn-md {
  padding: var(--spacing-2);
  min-width: 40px;
}

.btn-icon-only.btn-lg {
  padding: var(--spacing-3);
  min-width: 48px;
}

.btn-icon-only.btn-xl {
  padding: var(--spacing-4);
  min-width: 56px;
}

/* 变体 */
.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-primary:hover:not(.btn-disabled):not(.btn-loading) {
  transform: translateY(-2px);
  box-shadow: var(--glass-glow);
}

.btn-primary:active:not(.btn-disabled):not(.btn-loading) {
  transform: translateY(0);
}

.btn-secondary {
  background: var(--glass-bg);
  color: var(--color-text-primary);
  border: 1px solid var(--glass-border);
  backdrop-filter: var(--glass-blur-light);
}

.btn-secondary:hover:not(.btn-disabled):not(.btn-loading) {
  background: var(--glass-bg-strong);
  border-color: var(--color-primary-light);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-primary);
  border: 1px solid transparent;
}

.btn-ghost:hover:not(.btn-disabled):not(.btn-loading) {
  background: var(--glass-bg-light);
  border-color: var(--glass-border);
}

.btn-danger {
  background: linear-gradient(135deg, var(--color-error) 0%, #dc2626 100%);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-danger:hover:not(.btn-disabled):not(.btn-loading) {
  transform: translateY(-2px);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
}

.btn-danger:active:not(.btn-disabled):not(.btn-loading) {
  transform: translateY(0);
}

.btn-success {
  background: linear-gradient(135deg, var(--color-success) 0%, #059669 100%);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-success:hover:not(.btn-disabled):not(.btn-loading) {
  transform: translateY(-2px);
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
}

.btn-success:active:not(.btn-disabled):not(.btn-loading) {
  transform: translateY(0);
}

/* 修饰符 */
.btn-full-width {
  width: 100%;
}

.btn-rounded {
  border-radius: var(--radius-full);
}

/* 状态 */
.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.btn-loading {
  cursor: wait;
}

/* 图标 */
.btn-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-icon-left {
  margin-right: calc(var(--spacing-1) * -1);
}

.btn-icon-right {
  margin-left: calc(var(--spacing-1) * -1);
}

.btn-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 加载动画 */
.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 涟漪效果 */
.ripple-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  border-radius: inherit;
}

.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: scale(0);
  animation: ripple-animation 0.6s ease-out;
  pointer-events: none;
}

@keyframes ripple-animation {
  to {
    transform: scale(2);
    opacity: 0;
  }
}

/* 深色主题下的涟漪效果 */
[data-theme='dark'] .btn-secondary .ripple,
[data-theme='dark'] .btn-ghost .ripple {
  background: rgba(255, 255, 255, 0.2);
}

/* 焦点样式（无障碍） */
.glass-button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* 响应式调整 */
@media (max-width: 640px) {
  .btn-xl {
    padding: var(--spacing-4) var(--spacing-8);
    font-size: var(--text-lg);
    min-height: 48px;
  }

  .btn-lg {
    padding: var(--spacing-3) var(--spacing-6);
    font-size: var(--text-base);
    min-height: 44px;
  }
}
</style>
