<template>
  <Teleport to="body">
    <div class="toast-container" role="region" aria-live="polite" aria-label="Notifications">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast', `toast-${toast.type}`]"
          role="alert"
          :aria-live="toast.type === 'error' ? 'assertive' : 'polite'"
        >
          <div class="toast-icon">
            <CheckCircle v-if="toast.type === 'success'" :size="20" />
            <AlertCircle v-else-if="toast.type === 'error'" :size="20" />
            <Info v-else-if="toast.type === 'info'" :size="20" />
            <AlertTriangle v-else-if="toast.type === 'warning'" :size="20" />
          </div>

          <div class="toast-content">
            <div v-if="toast.title" class="toast-title">{{ toast.title }}</div>
            <div class="toast-message">{{ toast.message }}</div>
          </div>

          <button
            class="toast-close"
            @click="removeToast(toast.id)"
            :aria-label="$t('common.close', 'Close')"
          >
            <X :size="16" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-vue-next'
import { useToastStore } from '@/stores'
import { storeToRefs } from 'pinia'

defineOptions({
  name: 'ToastNotification',
})

const toastStore = useToastStore()
const { toasts } = storeToRefs(toastStore)

const removeToast = (id: string) => {
  toastStore.removeToast(id)
}
</script>

<style scoped>
/* Toast Container */
.toast-container {
  position: fixed;
  top: var(--spacing-6);
  right: var(--spacing-6);
  z-index: 10001;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  max-width: 420px;
  pointer-events: none;
}

/* Toast Item */
.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px) saturate(180%);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.1),
    0 4px 12px rgba(0, 0, 0, 0.05);
  pointer-events: all;
  min-width: 320px;
  transition: all var(--transition-base);
}

[data-theme='dark'] .toast {
  background: rgba(30, 41, 59, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.3),
    0 4px 12px rgba(0, 0, 0, 0.2);
}

.toast:hover {
  transform: translateY(-2px);
  box-shadow:
    0 12px 48px rgba(0, 0, 0, 0.15),
    0 6px 16px rgba(0, 0, 0, 0.08);
}

/* Toast Types */
.toast-success {
  border-left: 4px solid var(--color-success);
}

.toast-error {
  border-left: 4px solid var(--color-error);
}

.toast-warning {
  border-left: 4px solid var(--color-warning);
}

.toast-info {
  border-left: 4px solid var(--color-primary);
}

/* Toast Icon */
.toast-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.05);
}

[data-theme='dark'] .toast-icon {
  background: rgba(255, 255, 255, 0.05);
}

.toast-success .toast-icon {
  color: var(--color-success);
  background: rgba(16, 185, 129, 0.1);
}

.toast-error .toast-icon {
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
}

.toast-warning .toast-icon {
  color: var(--color-warning);
  background: rgba(245, 158, 11, 0.1);
}

.toast-info .toast-icon {
  color: var(--color-primary);
  background: rgba(139, 92, 246, 0.1);
}

/* Toast Content */
.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-1);
}

.toast-message {
  font-size: var(--text-sm);
  line-height: var(--line-relaxed);
  color: var(--color-text-secondary);
  word-wrap: break-word;
}

/* Toast Close Button */
.toast-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-tertiary);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.toast-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: var(--color-text-primary);
}

[data-theme='dark'] .toast-close:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Toast Transitions */
.toast-enter-active {
  animation: toastSlideIn 0.3s var(--ease-decelerate);
}

.toast-leave-active {
  animation: toastSlideOut 0.3s var(--ease-accelerate);
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toastSlideOut {
  from {
    opacity: 1;
    transform: translateX(0) scale(1);
  }

  to {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .toast-container {
    top: var(--spacing-4);
    right: var(--spacing-4);
    left: var(--spacing-4);
    max-width: none;
  }

  .toast {
    min-width: 0;
  }
}

/* Performance */
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    animation: none;
    transition: opacity 0.1s;
  }

  .toast:hover {
    transform: none;
  }
}
</style>
