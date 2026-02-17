<template>
  <Teleport to="body">
    <div class="toast-viewport" :class="`toast-viewport--${position}`">
      <TransitionGroup
        name="toast-stack"
        tag="div"
        class="toast-stack"
        :style="{ '--toasts-count': visibleToasts.length }"
      >
        <div
          v-for="(toast, index) in visibleToasts"
          :key="toast.id"
          class="toast-card"
          :class="[`toast-card--${toast.type}`, { 'toast-card--with-action': toast.action }]"
          :style="{
            '--index': index,
            '--offset': `${index * 12}px`,
            '--scale': `${1 - index * 0.05}`,
            '--opacity': `${1 - index * 0.15}`,
            zIndex: visibleToasts.length - index,
          }"
          role="alert"
          @mouseenter="handlePause(toast.id)"
          @mouseleave="handleResume(toast.id)"
        >
          <!-- Progress Bar Background (Subtle) -->
          <div
            v-if="toast.duration && toast.duration > 0 && index === 0"
            class="toast-progress-bg"
            :class="{ 'toast-progress-bg--paused': isPaused(toast.id) }"
            :style="{ animationDuration: `${toast.duration}ms` }"
          />

          <div class="toast-content-wrapper">
            <div class="toast-icon-box" :class="`toast-icon-box--${toast.type}`">
              <AnimatedIcon
                :name="getAnimation(toast.type)"
                :fallback-icon="getIcon(toast.type)"
                size="md"
              />
            </div>

            <div class="toast-text">
              <h4 v-if="toast.title" class="toast-title">{{ toast.title }}</h4>
              <p class="toast-msg">{{ toast.message }}</p>
            </div>

            <div v-if="toast.action" class="toast-actions">
              <button
                type="button"
                class="toast-btn toast-btn--action"
                @click="handleAction(toast)"
              >
                {{ toast.action.label }}
              </button>
            </div>

            <button
              type="button"
              class="toast-btn toast-btn--close"
              :aria-label="$t('common.close')"
              @click="removeToast(toast.id)"
            >
              <AnimatedIcon name="sparkle" :fallback-icon="X" size="sm" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { CheckCircle, XCircle, AlertTriangle, Info, X, Bell } from 'lucide-vue-next'
import { useToastStore, type Toast } from '@/stores'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

defineOptions({ name: 'UiToastContainer' })

interface Props {
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center'
}

const { position = 'top-right' } = defineProps<Props>()

const toastStore = useToastStore()
const { toasts } = storeToRefs(toastStore)
const { removeToast } = toastStore

/** 记录哪些 toast 的进度条处于暂停状态 */
const pausedIds = ref(new Set<string>())

function handlePause(id: string) {
  pausedIds.value = new Set([...pausedIds.value, id])
  toastStore.pauseTimer(id)
}

function handleResume(id: string) {
  const next = new Set(pausedIds.value)
  next.delete(id)
  pausedIds.value = next
  toastStore.resumeTimer(id)
}

function isPaused(id: string): boolean {
  return pausedIds.value.has(id)
}

// Only show top 5 toasts to prevent DOM clutter, but stack visuals handle top 3 best
const visibleToasts = computed(() => {
  return toasts.value.slice(0, 5)
})

function getIcon(type: string) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
    default: Bell,
  }
  return icons[type as keyof typeof icons] || Info
}

function getAnimation(type: string) {
  const animations = {
    success: 'sparkle',
    error: 'heart',
    warning: 'sparkle',
    info: 'explore',
    default: 'sparkle',
  }
  return animations[type as keyof typeof animations] || 'sparkle'
}

function handleAction(toast: Toast) {
  if (toast.action?.onClick) {
    toast.action.onClick()
  }
  removeToast(toast.id)
}
</script>

<style scoped>
.toast-viewport {
  position: fixed;
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  pointer-events: none;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
    env(safe-area-inset-left);
}

/* Position Variants */
.toast-viewport--top-right {
  top: var(--spacing-4);
  right: var(--spacing-4);
}
.toast-viewport--top-left {
  top: var(--spacing-4);
  left: var(--spacing-4);
}
.toast-viewport--bottom-right {
  bottom: var(--spacing-4);
  right: var(--spacing-4);
}
.toast-viewport--bottom-left {
  bottom: var(--spacing-4);
  left: var(--spacing-4);
}
.toast-viewport--top-center {
  top: var(--spacing-4);
  left: 50%;
  transform: translateX(-50%);
}
.toast-viewport--bottom-center {
  bottom: var(--spacing-4);
  left: 50%;
  transform: translateX(-50%);
}

.toast-stack {
  position: relative;
  width: 360px;
  max-width: 90vw;
}

.toast-card {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  pointer-events: auto;

  /* Glassmorphism */
  background: var(--glass-bg-strong);
  backdrop-filter: var(--glass-blur-strong);
  -webkit-backdrop-filter: var(--glass-blur-strong);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow:
    0 4px 24px -4px rgba(0, 0, 0, 0.12),
    0 1px 4px rgba(0, 0, 0, 0.06);

  /* Left accent border */
  border-left: 3px solid var(--glass-border);

  /* Stacking */
  transform-origin: center top;
  transition: all 350ms cubic-bezier(0.32, 0.72, 0, 1);
  transform: translateY(var(--offset)) scale(var(--scale));
  opacity: var(--opacity);
  overflow: hidden;
}

/* Type-specific accent borders */
.toast-card--success {
  border-left-color: var(--color-success);
}
.toast-card--error {
  border-left-color: var(--color-error);
}
.toast-card--warning {
  border-left-color: var(--color-warning);
}
.toast-card--info {
  border-left-color: var(--color-info);
}

.toast-content-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  z-index: 2;
}

/* Icon */
.toast-icon-box {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
}

.toast-icon-box--success {
  color: var(--color-success);
}
.toast-icon-box--error {
  color: var(--color-error);
}
.toast-icon-box--warning {
  color: var(--color-warning);
}
.toast-icon-box--info {
  color: var(--color-info);
}

/* Text */
.toast-text {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0 0 1px;
  line-height: 1.3;
}

.toast-msg {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Buttons */
.toast-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: all 0.15s ease;
  cursor: pointer;
}

.toast-btn--close {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  color: var(--color-text-tertiary);
  opacity: 0.6;
  transition: opacity 0.15s ease;
}

.toast-card:hover .toast-btn--close {
  opacity: 1;
}

.toast-btn--close:hover {
  color: var(--color-text-primary);
}

.toast-btn--action {
  padding: 0.25rem 0.625rem;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.08);
  margin-left: var(--spacing-1);
  white-space: nowrap;
  border-radius: var(--radius-sm);
}

.toast-btn--action:hover {
  background: rgba(var(--color-primary-rgb), 0.15);
}

/* Progress Bar */
.toast-progress-bg {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 100%;
  opacity: 0.35;
  transform-origin: left;
  animation: toast-timer linear forwards;
}

.toast-progress-bg--paused {
  animation-play-state: paused;
}

.toast-card--success .toast-progress-bg {
  background: var(--color-success);
}
.toast-card--error .toast-progress-bg {
  background: var(--color-error);
}
.toast-card--warning .toast-progress-bg {
  background: var(--color-warning);
}
.toast-card--info .toast-progress-bg {
  background: var(--color-info);
}

@keyframes toast-timer {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

/* Animations */
.toast-stack-enter-active,
.toast-stack-leave-active,
.toast-stack-move {
  transition: all 350ms cubic-bezier(0.32, 0.72, 0, 1);
}

.toast-stack-leave-active {
  pointer-events: none;
}

.toast-stack-enter-from {
  --opacity: 0;
  --offset: 0px;
  --scale: 0.96;
  translate: 24px 0;
}

.toast-stack-leave-to {
  --opacity: 0;
  --offset: 0px;
  --scale: 0.96;
  translate: 24px 0;
}

/* Mobile */
@media (max-width: 640px) {
  .toast-viewport {
    left: var(--spacing-3);
    right: var(--spacing-3);
    top: var(--spacing-3);
    bottom: auto;
    align-items: center;
    transform: none;
  }

  .toast-stack {
    width: 100%;
  }

  .toast-card {
    border-radius: var(--radius-md);
    box-shadow: 0 2px 12px -2px rgba(0, 0, 0, 0.1);
  }

  .toast-content-wrapper {
    padding: var(--spacing-2) var(--spacing-3);
  }

  .toast-icon-box {
    width: 1.75rem;
    height: 1.75rem;
  }

  .toast-msg {
    font-size: var(--text-xs);
  }

  /* Mobile enter: slide in from top */
  .toast-stack-enter-from {
    translate: 0 -16px;
  }

  .toast-stack-leave-to {
    translate: 0 -16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast-card {
    transition: none;
  }

  .toast-stack-enter-active,
  .toast-stack-leave-active,
  .toast-stack-move {
    transition: none;
  }

  .toast-stack-enter-from,
  .toast-stack-leave-to {
    opacity: 0;
    transform: none;
  }

  .toast-progress-bg {
    animation-duration: 0ms;
  }
}
</style>
