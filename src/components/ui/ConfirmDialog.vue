<template>
  <Teleport to="body">
    <dialog
      ref="dialogRef"
      class="confirm-dialog glass-card"
      @click="handleBackdropClick"
      @cancel.prevent="handleCancel"
    >
      <div class="dialog-content">
        <div class="dialog-header">
          <component
            :is="iconComponent"
            v-if="iconComponent"
            :size="24"
            class="dialog-icon"
            :class="variant"
          />
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
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, type Component } from 'vue'
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
const dialogRef = ref<HTMLDialogElement | null>(null)

const iconComponent = computed<Component | null>(() => {
  switch (props.variant) {
    case 'danger':
      return Trash2
    case 'warning':
      return AlertTriangle
    case 'info':
      return Info
    default:
      return HelpCircle
  }
})

const confirmVariant = computed(() => {
  return props.variant === 'danger' ? 'danger' : 'primary'
})

const confirmText = computed(() => props.confirmText || t('common.confirm'))
const cancelText = computed(() => props.cancelText || t('common.cancel'))

// 使用原生 dialog API
watch(
  () => props.isOpen,
  (newValue) => {
    if (!dialogRef.value) return

    if (newValue) {
      dialogRef.value.showModal()
    } else {
      dialogRef.value.close()
    }
  }
)

function handleConfirm() {
  emit('confirm')
  emit('update:isOpen', false)
}

function handleCancel() {
  emit('cancel')
  emit('update:isOpen', false)
}

// 点击背景关闭（可选，根据 UX 需求）
function handleBackdropClick(event: MouseEvent) {
  if (event.target === dialogRef.value) {
    handleCancel()
  }
}
</script>

<style scoped>
/* 原生 dialog 元素样式 */
.confirm-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 400px;
  width: 100%;
  padding: 0;
  border: none;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  margin: 0;
}

/* dialog 背景遮罩（::backdrop 伪元素） */
.confirm-dialog::backdrop {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  animation: backdrop-fade-in 0.2s ease;
}

@keyframes backdrop-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 对话框打开动画 */
.confirm-dialog[open] {
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

.dialog-content {
  padding: var(--spacing-5);
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
  color: var(--color-text-primary);
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

/* 移动端适配 */
@media (max-width: 768px) {
  .confirm-dialog {
    max-width: calc(100vw - var(--spacing-8));
  }
}
</style>
