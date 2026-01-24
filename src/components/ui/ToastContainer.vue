<template>
  <Teleport to="body">
    <div class="toast-container" :class="`toast-container--${position}`" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="[`toast--${toast.type}`, { 'toast--with-action': toast.action }]"
          role="alert"
          @mouseenter="pauseTimer(toast.id)"
          @mouseleave="resumeTimer(toast.id)"
        >
          <div class="toast__icon-wrapper" :class="`toast__icon-wrapper--${toast.type}`">
            <component :is="getIcon(toast.type)" :size="18" class="toast__icon" />
          </div>

          <div class="toast__content">
            <p v-if="toast.title" class="toast__title">{{ toast.title }}</p>
            <p class="toast__message">{{ toast.message }}</p>
          </div>

          <button
            v-if="toast.action"
            type="button"
            class="toast__action"
            @click="handleAction(toast)"
          >
            {{ toast.action.label }}
          </button>

          <button
            type="button"
            class="toast__close"
            :aria-label="$t('common.close')"
            @click="removeToast(toast.id)"
          >
            <X :size="14" />
          </button>

          <div
            v-if="toast.duration && toast.duration > 0"
            class="toast__progress"
            :style="{ animationDuration: `${toast.duration}ms` }"
          />
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { CheckCircle, XCircle, AlertTriangle, Info, X, Bell } from 'lucide-vue-next'
import { useToastStore, type Toast } from '@/stores'

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

withDefaults(defineProps<Props>(), {
  position: 'top-right',
})

const toastStore = useToastStore()
const { toasts } = storeToRefs(toastStore)
const { removeToast, pauseTimer, resumeTimer } = toastStore

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

function handleAction(toast: Toast) {
  if (toast.action?.onClick) {
    toast.action.onClick()
  }
  removeToast(toast.id)
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  max-width: 420px;
  pointer-events: none;
}

.toast-container--top-right {
  top: calc(var(--navbar-height) + var(--spacing-4) + env(safe-area-inset-top, 0px));
  right: calc(var(--spacing-4) + env(safe-area-inset-right, 0px));
}

.toast-container--top-left {
  top: calc(var(--navbar-height) + var(--spacing-4) + env(safe-area-inset-top, 0px));
  left: calc(var(--spacing-4) + env(safe-area-inset-left, 0px));
}

.toast-container--bottom-right {
  bottom: calc(var(--spacing-4) + env(safe-area-inset-bottom, 0px));
  right: calc(var(--spacing-4) + env(safe-area-inset-right, 0px));
}

.toast-container--bottom-left {
  bottom: calc(var(--spacing-4) + env(safe-area-inset-bottom, 0px));
  left: calc(var(--spacing-4) + env(safe-area-inset-left, 0px));
}

.toast-container--top-center {
  top: calc(var(--navbar-height) + var(--spacing-4) + env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translateX(-50%);
}

.toast-container--bottom-center {
  bottom: calc(var(--spacing-4) + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
}

.toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--glass-bg-strong);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
  overflow: hidden;
}

.toast::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  opacity: 0.5;
}

.toast__icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-full);
}

.toast__icon-wrapper--success {
  background: var(--color-success-alpha);
  color: var(--color-success);
}

.toast__icon-wrapper--error {
  background: var(--color-error-alpha);
  color: var(--color-error);
}

.toast__icon-wrapper--warning {
  background: var(--color-warning-alpha);
  color: var(--color-warning);
}

.toast__icon-wrapper--info {
  background: var(--color-info-alpha);
  color: var(--color-info);
}

.toast__icon-wrapper--default {
  background: var(--color-primary-alpha);
  color: var(--color-primary);
}

.toast__content {
  flex: 1;
  min-width: 0;
  padding-top: var(--spacing-1);
}

.toast__title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-foreground);
  margin: 0 0 var(--spacing-1);
}

.toast__message {
  font-size: var(--text-sm);
  color: var(--color-muted-foreground);
  margin: 0;
  line-height: var(--leading-snug);
}

.toast__action {
  flex-shrink: 0;
  padding: var(--spacing-1) var(--spacing-2);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-primary);
  border-radius: var(--radius-sm);
  transition: background-color 150ms var(--ease-out);
}

.toast__action:hover {
  background: var(--color-primary-alpha);
}

.toast__close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--radius-sm);
  color: var(--color-muted-foreground);
  transition:
    background-color 150ms var(--ease-out),
    color 150ms var(--ease-out);
}

.toast__close:hover {
  background: var(--glass-bg-light);
  color: var(--color-foreground);
}

.toast__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: var(--color-primary);
  animation: toast-progress linear forwards;
  animation-play-state: running;
}

.toast:hover .toast__progress {
  animation-play-state: paused;
}

@keyframes toast-progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

/* Type-specific progress colors */
.toast--success .toast__progress {
  background: var(--color-success);
}

.toast--error .toast__progress {
  background: var(--color-error);
}

.toast--warning .toast__progress {
  background: var(--color-warning);
}

.toast--info .toast__progress {
  background: var(--color-info);
}

/* Transitions */
.toast-enter-active {
  transition: all 300ms var(--ease-spring);
}

.toast-leave-active {
  transition: all 200ms var(--ease-out);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}

.toast-move {
  transition: transform 300ms var(--ease-spring);
}

/* Left-side positions */
.toast-container--top-left .toast-enter-from,
.toast-container--bottom-left .toast-enter-from {
  transform: translateX(-100%) scale(0.9);
}

.toast-container--top-left .toast-leave-to,
.toast-container--bottom-left .toast-leave-to {
  transform: translateX(-100%) scale(0.95);
}

/* Center positions */
.toast-container--top-center .toast-enter-from,
.toast-container--bottom-center .toast-enter-from {
  transform: translateY(-20px) scale(0.9);
}

.toast-container--top-center .toast-leave-to,
.toast-container--bottom-center .toast-leave-to {
  transform: translateY(-10px) scale(0.95);
}

@media (max-width: 640px) {
  .toast-container {
    left: calc(var(--spacing-3) + env(safe-area-inset-left, 0px));
    right: calc(var(--spacing-3) + env(safe-area-inset-right, 0px));
    max-width: none;
    transform: none;
  }

  .toast-container--top-center,
  .toast-container--bottom-center {
    left: calc(var(--spacing-3) + env(safe-area-inset-left, 0px));
  }

  .toast-enter-from,
  .toast-leave-to {
    transform: translateY(-20px) scale(0.95);
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast__progress {
    animation: none;
  }
}
</style>
