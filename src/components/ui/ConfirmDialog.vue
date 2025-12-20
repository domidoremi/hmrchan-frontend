<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="confirm-overlay" @click.self="handleCancel">
        <div class="confirm-dialog glass-card" role="alertdialog" aria-modal="true">
          <div class="dialog-header">
            <component :is="iconComponent" v-if="iconComponent" :size="24" class="dialog-icon" :class="variant" />
            <h3 class="dialog-title">{{ title }}</h3>
          </div>

          <p class="dialog-message">{{ message }}</p>

          <div class="dialog-actions">
            <Button variant="ghost" size="sm" @click="handleCancel">
              {{ cancelText }}
            </Button>
            <Button :variant="confirmVariant" size="sm" @click="handleConfirm">
              {{ confirmText }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, Trash2, Info, HelpCircle } from 'lucide-vue-next'
import Button from './Button.vue'

export interface ConfirmDialogProps {
  isOpen: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info' | 'default'
}

const props = withDefaults(defineProps<ConfirmDialogProps>(), {
  variant: 'default',
})

const emit = defineEmits<{
  confirm: []
  cancel: []
  'update:isOpen': [value: boolean]
}>()

const { t } = useI18n()

const iconComponent = computed<Component | null>(() => {
  switch (props.variant) {
    case 'danger': return Trash2
    case 'warning': return AlertTriangle
    case 'info': return Info
    default: return HelpCircle
  }
})

const confirmVariant = computed(() => {
  return props.variant === 'danger' ? 'danger' : 'primary'
})

const confirmText = computed(() => props.confirmText || t('common.confirm'))
const cancelText = computed(() => props.cancelText || t('common.cancel'))

function handleConfirm() {
  emit('confirm')
  emit('update:isOpen', false)
}

function handleCancel() {
  emit('cancel')
  emit('update:isOpen', false)
}
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  padding: var(--spacing-4);
}

.confirm-dialog {
  max-width: 400px;
  width: 100%;
  padding: var(--spacing-5);
  border-radius: var(--radius-lg);
  animation: dialog-enter 0.2s var(--ease-out-cubic);
}

@keyframes dialog-enter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-3);
}

.dialog-icon {
  flex-shrink: 0;
}

.dialog-icon.danger {
  color: var(--color-error);
}

.dialog-icon.warning {
  color: var(--color-warning);
}

.dialog-icon.info {
  color: var(--color-info);
}

.dialog-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin: 0;
  color: var(--color-text);
}

.dialog-message {
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-5) 0;
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-2);
}

/* Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .confirm-dialog,
.modal-leave-active .confirm-dialog {
  transition: transform 0.2s var(--ease-out-cubic);
}

.modal-enter-from .confirm-dialog {
  transform: scale(0.95);
}

.modal-leave-to .confirm-dialog {
  transform: scale(0.95);
}
</style>
