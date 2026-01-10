<template>
  <div class="toast-container" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast-${toast.type}`"
        role="alert"
      >
        <component :is="getIcon(toast.type)" :size="20" class="toast-icon" />
        <span class="toast-message">{{ toast.message }}</span>
        <button type="button" class="toast-close" @click="removeToast(toast.id)" aria-label="Close">
          <X :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next'
import { useToastStore } from '@/stores'

const toastStore = useToastStore()
const { toasts } = storeToRefs(toastStore)
const { removeToast } = toastStore

function getIcon(type: string) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  }
  return icons[type as keyof typeof icons] || Info
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: calc(var(--navbar-height) + var(--spacing-4) + env(safe-area-inset-top, 0px));
  right: calc(var(--spacing-4) + env(safe-area-inset-right, 0px));
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  max-width: 400px;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--glass-bg-strong);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.toast-icon {
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}

.toast-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-1);
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  transition: all var(--transition-fast);
}

.toast-close:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

/* Toast types */
.toast-success {
  border-left: 3px solid var(--color-success);
}

.toast-success .toast-icon {
  color: var(--color-success);
}

.toast-error {
  border-left: 3px solid var(--color-error);
}

.toast-error .toast-icon {
  color: var(--color-error);
}

.toast-warning {
  border-left: 3px solid var(--color-warning);
}

.toast-warning .toast-icon {
  color: var(--color-warning);
}

.toast-info {
  border-left: 3px solid var(--color-info);
}

.toast-info .toast-icon {
  color: var(--color-info);
}

/* Transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all var(--transition-base);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform var(--transition-base);
}

@media (max-width: 640px) {
  .toast-container {
    left: calc(var(--spacing-4) + env(safe-area-inset-left, 0px));
    right: calc(var(--spacing-4) + env(safe-area-inset-right, 0px));
    max-width: none;
  }
}
</style>
