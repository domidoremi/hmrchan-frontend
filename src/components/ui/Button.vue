<template>
  <button
    ref="buttonRef"
    :class="buttonClass"
    :disabled="disabled || loading"
    :type="type"
    @click="handleClick"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
  >
    <!-- Ripple 容器 -->
    <span ref="rippleContainer" class="btn-ripple-container" />

    <!-- 加载状态 -->
    <span v-if="loading" class="btn-loader">
      <span class="btn-loader-dot" />
      <span class="btn-loader-dot" />
      <span class="btn-loader-dot" />
    </span>

    <!-- 图标和内容 -->
    <template v-else>
      <component v-if="showLeftIcon" :is="icon" :size="iconSize" class="btn-icon-el" />
      <span v-if="hasDefaultSlot" class="btn-content">
        <slot />
      </span>
      <component v-if="showRightIcon" :is="icon" :size="iconSize" class="btn-icon-el" />
    </template>
  </button>
</template>

<script setup lang="ts">
import { computed, useSlots, type Component, ref, useTemplateRef } from 'vue'

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
  /** 是否启用 ripple 效果 */
  ripple?: boolean
  /** 是否启用弹簧动画 */
  springAnimation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'default',
  disabled: false,
  loading: false,
  iconPosition: 'left',
  fullWidth: false,
  type: 'button',
  ripple: true,
  springAnimation: true,
})
defineSlots<{
  default?: () => unknown
}>()

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const slots = useSlots()

const buttonRef = useTemplateRef<HTMLButtonElement>('buttonRef')
const rippleContainer = useTemplateRef<HTMLSpanElement>('rippleContainer')
const isPressed = ref(false)

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
const shouldUseRipple = computed(
  () => props.ripple && !(normalizedVariant.value === 'ghost' && normalizedSize.value === 'sm')
)

const buttonClass = computed(() => [
  'btn',
  `btn-${normalizedVariant.value}`,
  `btn-${normalizedSize.value}`,
  {
    'btn-loading': props.loading,
    'btn-full-width': props.fullWidth,
    'btn-icon-only': isIconOnly.value,
    'btn-pressed': isPressed.value,
    'btn-with-ripple': shouldUseRipple.value,
  },
])

const iconSize = computed(() => {
  const sizes: Record<string, number> = { sm: 16, md: 18, lg: 20, icon: 18 }
  return sizes[normalizedSize.value] ?? 18
})

const showLeftIcon = computed(() => !!props.icon && props.iconPosition === 'left' && !props.loading)
const showRightIcon = computed(
  () => !!props.icon && props.iconPosition === 'right' && !props.loading
)

// CSS-based ripple effect (no GSAP)
function createRipple(event: MouseEvent) {
  if (!shouldUseRipple.value || !rippleContainer.value || !buttonRef.value) return

  const button = buttonRef.value
  const rect = button.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const ripple = document.createElement('span')
  ripple.className = 'btn-ripple'
  ripple.style.left = `${x}px`
  ripple.style.top = `${y}px`

  const size = Math.max(rect.width, rect.height) * 2.5
  ripple.style.setProperty('--ripple-size', `${size}px`)

  rippleContainer.value.appendChild(ripple)

  ripple.addEventListener('animationend', () => ripple.remove(), { once: true })
}

function handleClick(event: MouseEvent) {
  if (!props.disabled && !props.loading) {
    createRipple(event)
    emit('click', event)
  }
}

function handleMouseDown() {
  if (!props.disabled && !props.loading) {
    isPressed.value = true
  }
}

function handleMouseUp() {
  if (isPressed.value) {
    isPressed.value = false
  }
}

function handleMouseLeave() {
  if (isPressed.value) {
    isPressed.value = false
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
  border-radius: var(--ui-radius-button, var(--radius));
  cursor: pointer;
  transition-property: color, background-color, border-color, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: var(--ease-out);
  border: 1px solid transparent;
  outline: none;
  white-space: nowrap;
  user-select: none;
  overflow: hidden;
  transform-origin: center;
  will-change: transform;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

/* Ripple 容器 */
.btn-ripple-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}

.btn-ripple-container :deep(.btn-ripple) {
  position: absolute;
  border-radius: 50%;
  background: currentColor;
  opacity: 0;
  transform: translate(-50%, -50%);
  pointer-events: none;
  width: var(--ripple-size, 0);
  height: var(--ripple-size, 0);
  animation: btn-ripple-expand 0.6s ease-out forwards;
}

@keyframes btn-ripple-expand {
  0% {
    width: 0;
    height: 0;
    opacity: 0.35;
  }
  100% {
    width: var(--ripple-size, 12.5rem);
    height: var(--ripple-size, 12.5rem);
    opacity: 0;
  }
}

.btn-pressed {
  transform: scale(0.96);
}

.btn:not(:disabled) {
  transition-property: color, background-color, border-color, box-shadow, transform;
}

/* Loader Animation */
.btn-loader {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-loader-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.6;
  animation: btn-loader-bounce 1.4s ease-in-out infinite both;
}

.btn-loader-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.btn-loader-dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes btn-loader-bounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
  }
  40% {
    transform: scale(1);
  }
}

/* Icon element */
.btn-icon-el {
  flex-shrink: 0;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn:hover:not(:disabled) .btn-icon-el {
  transform: scale(1.1);
}

/* Sizes */
.btn-sm {
  height: var(--ui-control-height-sm);
  padding: 0 var(--ui-control-padding-x-sm);
  font-size: var(--text-xs);
}

.btn-md {
  height: var(--ui-control-height-md);
  padding: 0 var(--ui-control-padding-x-md);
  font-size: var(--text-sm);
}

.btn-lg {
  height: var(--ui-control-height-lg);
  padding: 0 var(--ui-control-padding-x-lg);
  font-size: var(--text-base);
}

.btn-icon {
  height: var(--ui-control-height-md);
  width: var(--ui-control-height-md);
  padding: 0;
}

.btn-icon-only.btn-sm {
  height: var(--ui-control-height-sm);
  width: var(--ui-control-height-sm);
}

.btn-icon-only.btn-lg {
  height: var(--ui-control-height-lg);
  width: var(--ui-control-height-lg);
}

/* Variants */
.btn-default {
  background: linear-gradient(145deg, var(--color-primary), var(--color-primary-light));
  color: var(--color-on-primary);
  box-shadow: var(--shadow-sm);
}

.btn-default:hover:not(:disabled) {
  background: linear-gradient(145deg, var(--color-primary-dark), var(--color-primary));
  box-shadow:
    var(--shadow-md),
    0 0 20px rgba(var(--color-primary-rgb), 0.3);
}

.btn-secondary {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.7)), var(--glass-bg);
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
  background: rgba(255, 255, 255, 0.45);
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
  text-underline-offset: 0.25rem;
  box-shadow: none;
}

.btn-link:hover:not(:disabled) {
  text-decoration: none;
}

.btn-destructive {
  background: linear-gradient(145deg, var(--color-destructive), var(--color-error-hover));
  color: var(--color-destructive-foreground);
  box-shadow: var(--shadow-sm);
}

.btn-destructive:hover:not(:disabled) {
  background: var(--color-error-hover);
  box-shadow:
    var(--shadow-md),
    0 0 20px rgba(var(--color-error-rgb), 0.3);
}

.btn-success {
  background: linear-gradient(145deg, var(--color-success), var(--color-success-hover));
  color: var(--color-white);
  box-shadow: var(--shadow-sm);
}

.btn-success:hover:not(:disabled) {
  background: var(--color-success-hover);
  box-shadow:
    var(--shadow-md),
    0 0 20px rgba(var(--color-success-rgb), 0.3);
}

:global(#app[data-theme='dark'] .btn),
:global([data-theme='dark'] .btn) {
  box-shadow: inset 0 0.0625rem 0 rgba(255, 255, 255, 0.08);
}

:global(#app[data-theme='dark'] .btn-secondary),
:global([data-theme='dark'] .btn-secondary) {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)),
    rgba(12, 16, 23, 0.88);
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--color-text-primary);
}

:global(#app[data-theme='dark'] .btn-secondary:hover:not(:disabled)),
:global([data-theme='dark'] .btn-secondary:hover:not(:disabled)) {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04)),
    rgba(18, 24, 36, 0.94);
  border-color: rgba(var(--color-primary-rgb), 0.28);
  box-shadow: 0 0 0 1px rgba(var(--color-primary-rgb), 0.14);
}

:global(#app[data-theme='dark'] .btn-outline),
:global([data-theme='dark'] .btn-outline) {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.12);
  color: var(--color-text-primary);
}

:global(#app[data-theme='dark'] .btn-outline:hover:not(:disabled)),
:global([data-theme='dark'] .btn-outline:hover:not(:disabled)) {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(var(--color-primary-rgb), 0.28);
}

:global(#app[data-theme='dark'] .btn-ghost:hover:not(:disabled)),
:global([data-theme='dark'] .btn-ghost:hover:not(:disabled)) {
  background: rgba(255, 255, 255, 0.05);
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

/* Reduced motion - 禁用弹簧动画，保留基本反馈 */
@media (prefers-reduced-motion: reduce) {
  .btn {
    transition: none;
  }

  .btn-icon-el {
    transition: none;
  }

  .btn-loader-dot {
    animation: none;
  }
}
</style>
