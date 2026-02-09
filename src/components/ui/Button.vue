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
import { computed, useSlots, type Component, ref, onMounted } from 'vue'

// 懒加载 GSAP
let gsap: typeof import('gsap').default | null = null
const loadGsap = async () => {
  if (!gsap) {
    const module = await import('gsap')
    gsap = module.default
  }
  return gsap
}

// 检测是否偏好减少动画
const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

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

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const slots = useSlots()

const buttonRef = ref<HTMLButtonElement | null>(null)
const rippleContainer = ref<HTMLSpanElement | null>(null)
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

// 创建 Ripple 效果
async function createRipple(event: MouseEvent) {
  if (
    !shouldUseRipple.value ||
    prefersReducedMotion() ||
    !rippleContainer.value ||
    !buttonRef.value
  )
    return

  const gsapLib = await loadGsap()
  if (!gsapLib) return

  const button = buttonRef.value
  const rect = button.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const ripple = document.createElement('span')
  ripple.className = 'btn-ripple'
  ripple.style.left = `${x}px`
  ripple.style.top = `${y}px`

  rippleContainer.value.appendChild(ripple)

  const size = Math.max(rect.width, rect.height) * 2.5

  gsapLib.fromTo(
    ripple,
    { width: 0, height: 0, opacity: 0.5 },
    {
      width: size,
      height: size,
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out',
      onComplete: () => {
        ripple.remove()
      },
    }
  )
}

// 按压动画
async function animatePress() {
  if (!props.springAnimation || prefersReducedMotion() || !buttonRef.value) return

  const gsapLib = await loadGsap()
  if (!gsapLib) return

  gsapLib.to(buttonRef.value, {
    scale: 0.96,
    duration: 0.1,
    ease: 'power2.out',
  })
}

// 释放动画
async function animateRelease() {
  if (!props.springAnimation || prefersReducedMotion() || !buttonRef.value) return

  const gsapLib = await loadGsap()
  if (!gsapLib) return

  gsapLib.to(buttonRef.value, {
    scale: 1,
    duration: 0.4,
    ease: 'elastic.out(1, 0.5)',
  })
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
    animatePress()
  }
}

function handleMouseUp() {
  if (isPressed.value) {
    isPressed.value = false
    animateRelease()
  }
}

function handleMouseLeave() {
  if (isPressed.value) {
    isPressed.value = false
    animateRelease()
  }
}

// 预加载 GSAP
onMounted(() => {
  if (props.springAnimation || props.ripple) {
    loadGsap()
  }
})
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
  opacity: 0.3;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* Loader Animation */
.btn-loader {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-loader-dot {
  width: 6px;
  height: 6px;
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
  box-shadow:
    var(--shadow-md),
    0 0 20px rgba(var(--color-primary-rgb), 0.3);
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
  box-shadow:
    var(--shadow-md),
    0 0 20px rgba(var(--color-error-rgb), 0.3);
}

.btn-success {
  background: var(--color-success);
  color: var(--color-white);
  box-shadow: var(--shadow-sm);
}

.btn-success:hover:not(:disabled) {
  background: var(--color-success-hover);
  box-shadow:
    var(--shadow-md),
    0 0 20px rgba(var(--color-success-rgb), 0.3);
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

/* Dark mode: primary color inverts to near-white, need dark text for contrast */
:global([data-theme='dark']) .btn-default {
  color: #09090b;
}

:global([data-theme='dark']) .btn-default:hover:not(:disabled) {
  color: #09090b;
}

:global([data-theme='dark']) .btn-success {
  color: #09090b;
}

:global([data-theme='dark']) .btn-success:hover:not(:disabled) {
  color: #09090b;
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
