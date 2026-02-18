<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="isOpen" class="ui-alert-dialog-overlay" @click.self="handleOverlayClick">
        <div
          ref="dialogRef"
          class="ui-alert-dialog"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="descriptionId"
        >
          <div class="ui-alert-dialog__header">
            <h2 :id="titleId" class="ui-alert-dialog__title">
              <slot name="title">{{ title }}</slot>
            </h2>
            <p
              v-if="description || $slots['description']"
              :id="descriptionId"
              class="ui-alert-dialog__description"
            >
              <slot name="description">{{ description }}</slot>
            </p>
          </div>

          <div v-if="$slots['default']" class="ui-alert-dialog__content">
            <slot />
          </div>

          <div class="ui-alert-dialog__footer">
            <slot name="footer">
              <Button variant="outline" size="sm" @click="handleCancel">
                {{ cancelText }}
              </Button>
              <Button :variant="confirmVariant" size="sm" @click="handleConfirm">
                {{ confirmText }}
              </Button>
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from './Button.vue'
import { lockBodyScroll, unlockBodyScroll } from '@/utils/bodyScrollLock'

defineOptions({ name: 'UiAlertDialog' })

interface Props {
  isOpen?: boolean
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  closeOnOverlay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  variant: 'default',
  closeOnOverlay: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
  'update:isOpen': [value: boolean]
}>()

const { t } = useI18n()

const dialogRef = ref<HTMLElement | null>(null)
const titleId = `alert-dialog-title-${Math.random().toString(36).slice(2, 9)}`
const descriptionId = `alert-dialog-desc-${Math.random().toString(36).slice(2, 9)}`

const confirmText = computed(() => props.confirmText || t('common.confirm'))
const cancelText = computed(() => props.cancelText || t('common.cancel'))
const confirmVariant = computed(() => (props.variant === 'destructive' ? 'destructive' : 'default'))

function handleConfirm() {
  emit('confirm')
  emit('update:isOpen', false)
}

function handleCancel() {
  emit('cancel')
  emit('update:isOpen', false)
}

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    handleCancel()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.isOpen) {
    handleCancel()
  }
}

watch(
  () => props.isOpen,
  (isOpen, wasOpen) => {
    if (isOpen && !wasOpen) lockBodyScroll()
    if (!isOpen && wasOpen) unlockBodyScroll()
  }
)

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  if (props.isOpen) lockBodyScroll()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (props.isOpen) unlockBodyScroll()
})
</script>

<style scoped>
.ui-alert-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-4);
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.ui-alert-dialog {
  position: relative;
  z-index: var(--z-modal);
  width: 100%;
  max-width: 28rem;
  border-radius: var(--radius-lg);
  background: var(--glass-bg-strong);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  color: var(--color-text-primary);
}

.ui-alert-dialog::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 0.0625rem;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.35) 50%,
    transparent 100%
  );
  opacity: 0.5;
  pointer-events: none;
}

.ui-alert-dialog__header {
  padding: var(--spacing-5) var(--spacing-5) 0;
}

.ui-alert-dialog__title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-foreground);
  margin: 0;
}

.ui-alert-dialog__description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: var(--spacing-2) 0 0;
  line-height: var(--leading-relaxed);
}

.ui-alert-dialog__content {
  padding: var(--spacing-4) var(--spacing-5);
}

.ui-alert-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-2);
  padding: var(--spacing-4) var(--spacing-5) var(--spacing-5);
}

/* Transition */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 200ms var(--ease-out);
}

.dialog-enter-active .ui-alert-dialog,
.dialog-leave-active .ui-alert-dialog {
  transition:
    transform 200ms var(--ease-out),
    opacity 200ms var(--ease-out);
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .ui-alert-dialog,
.dialog-leave-to .ui-alert-dialog {
  opacity: 0;
  transform: scale(0.95);
}

@media (max-width: 640px) {
  .ui-alert-dialog {
    max-width: calc(100vw - var(--spacing-8));
  }
}
</style>
