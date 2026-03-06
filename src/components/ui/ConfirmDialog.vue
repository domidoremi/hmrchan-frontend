<template>
  <Teleport to="body">
    <Transition name="confirm-dialog">
      <div v-if="isOpen" class="confirm-dialog-overlay" @click.self="handleBackdropClick">
        <div
          ref="contentRef"
          class="confirm-dialog"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="descriptionId"
        >
          <div
            class="confirm-dialog__icon-wrapper"
            :class="`confirm-dialog__icon-wrapper--${variant}`"
          >
            <AnimatedIcon
              :name="iconAnimation"
              :fallback-icon="iconComponent"
              size="xl"
              class="confirm-dialog__icon"
            />
          </div>

          <div class="confirm-dialog__content">
            <h3 :id="titleId" class="confirm-dialog__title">
              {{ title || defaultTitle }}
            </h3>
            <p :id="descriptionId" class="confirm-dialog__message">
              {{ message }}
            </p>
          </div>

          <div class="confirm-dialog__actions">
            <Button variant="outline" size="sm" class="confirm-dialog__btn" @click="handleCancel">
              {{ cancelText }}
            </Button>
            <Button
              :variant="confirmVariant"
              size="sm"
              :loading="loading"
              class="confirm-dialog__btn"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted, type Component, useId, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, Trash2, Info, HelpCircle, CheckCircle } from 'lucide-vue-next'
import Button from './Button.vue'
import { useFocusTrap } from '@/composables/useFocusTrap'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import { lockBodyScroll, unlockBodyScroll } from '@/utils/bodyScrollLock'

defineOptions({ name: 'UiConfirmDialog' })

export interface ConfirmDialogProps {
  isOpen: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info' | 'success' | 'default'
  loading?: boolean
  closeOnBackdrop?: boolean
}

const props = withDefaults(defineProps<ConfirmDialogProps>(), {
  variant: 'default',
  loading: false,
  closeOnBackdrop: true,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
  'update:isOpen': [value: boolean]
}>()

const { t } = useI18n()
const contentRef = useTemplateRef<HTMLElement>('contentRef')
const baseId = useId()
const titleId = `${baseId}-title`
const descriptionId = `${baseId}-description`

const isDialogOpen = computed(() => props.isOpen)

useFocusTrap(contentRef, isDialogOpen, {
  autoFocus: true,
  restoreFocus: true,
  escapeDeactivates: true,
  onEscape: handleCancel,
})

const iconComponent = computed<Component>(() => {
  switch (props.variant) {
    case 'danger':
      return Trash2
    case 'warning':
      return AlertTriangle
    case 'info':
      return Info
    case 'success':
      return CheckCircle
    default:
      return HelpCircle
  }
})

const iconAnimation = computed(() => {
  switch (props.variant) {
    case 'danger':
      return 'heart'
    case 'warning':
      return 'sparkle'
    case 'info':
      return 'explore'
    case 'success':
      return 'sparkle'
    default:
      return 'search'
  }
})

const defaultTitle = computed(() => {
  switch (props.variant) {
    case 'danger':
      return t('common.confirmDelete')
    case 'warning':
      return t('common.warning')
    case 'success':
      return t('common.success')
    default:
      return t('common.confirm')
  }
})

const confirmVariant = computed(() => {
  switch (props.variant) {
    case 'danger':
      return 'destructive'
    case 'success':
      return 'default'
    default:
      return 'default'
  }
})

const confirmText = computed(() => props.confirmText || t('common.confirm'))
const cancelText = computed(() => props.cancelText || t('common.cancel'))

function handleConfirm() {
  if (props.loading) return
  emit('confirm')
  emit('update:isOpen', false)
}

function handleCancel() {
  if (props.loading) return
  emit('cancel')
  emit('update:isOpen', false)
}

function handleBackdropClick() {
  if (props.closeOnBackdrop && !props.loading) {
    handleCancel()
  }
}

watch(
  () => props.isOpen,
  (isOpen, wasOpen) => {
    if (isOpen && !wasOpen) lockBodyScroll()
    if (!isOpen && wasOpen) unlockBodyScroll()
  },
  { immediate: true }
)

onUnmounted(() => {
  if (props.isOpen) unlockBodyScroll()
})
</script>

<style scoped>
.confirm-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-4);
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.confirm-dialog {
  position: relative;
  z-index: var(--z-modal);
  width: 100%;
  max-width: 24rem;
  padding: var(--spacing-6);
  border-radius: var(--radius-xl);
  background: var(--glass-bg-strong);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-2xl);
  text-align: center;
  color: var(--color-text-primary);
}

.confirm-dialog::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 0.0625rem;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  opacity: 0.6;
  pointer-events: none;
}

.confirm-dialog__icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  margin-bottom: var(--spacing-4);
  border-radius: var(--radius-full);
  background: var(--glass-bg-light);
}

.confirm-dialog__icon-wrapper--danger {
  background: var(--color-error-alpha);
}

.confirm-dialog__icon-wrapper--danger .confirm-dialog__icon {
  color: var(--color-error);
}

.confirm-dialog__icon-wrapper--warning {
  background: var(--color-warning-alpha);
}

.confirm-dialog__icon-wrapper--warning .confirm-dialog__icon {
  color: var(--color-warning);
}

.confirm-dialog__icon-wrapper--info {
  background: var(--color-info-alpha);
}

.confirm-dialog__icon-wrapper--info .confirm-dialog__icon {
  color: var(--color-info);
}

.confirm-dialog__icon-wrapper--success {
  background: var(--color-success-alpha);
}

.confirm-dialog__icon-wrapper--success .confirm-dialog__icon {
  color: var(--color-success);
}

.confirm-dialog__icon-wrapper--default {
  background: var(--color-primary-alpha);
}

.confirm-dialog__icon-wrapper--default .confirm-dialog__icon {
  color: var(--color-primary);
}

.confirm-dialog__content {
  margin-bottom: var(--spacing-5);
}

.confirm-dialog__title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-foreground);
  margin: 0 0 var(--spacing-2);
}

.confirm-dialog__message {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
  line-height: var(--leading-relaxed);
}

.confirm-dialog__actions {
  display: flex;
  gap: var(--spacing-3);
}

.confirm-dialog__btn {
  flex: 1;
}

/* Transition */
.confirm-dialog-enter-active,
.confirm-dialog-leave-active {
  transition: opacity 200ms var(--ease-out);
}

.confirm-dialog-enter-active .confirm-dialog,
.confirm-dialog-leave-active .confirm-dialog {
  transition:
    transform 200ms var(--ease-out),
    opacity 200ms var(--ease-out);
}

.confirm-dialog-enter-from,
.confirm-dialog-leave-to {
  opacity: 0;
}

.confirm-dialog-enter-from .confirm-dialog,
.confirm-dialog-leave-to .confirm-dialog {
  opacity: 0;
  transform: scale(0.9) translateY(10px);
}

@media (max-width: 640px) {
  .confirm-dialog {
    max-width: calc(100vw - var(--spacing-8));
    padding: var(--spacing-5);
  }

  .confirm-dialog__actions {
    flex-direction: column-reverse;
  }
}
</style>
