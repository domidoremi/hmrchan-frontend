<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="isOpen"
        class="ui-dialog-overlay"
        :style="overlayStyle"
        @click.self="handleOverlayClick"
      >
        <div
          :class="dialogClass"
          :style="dialogDragStyle"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="descriptionId"
          @touchstart.passive="onTouchStart"
          @touchmove.passive="onTouchMove"
          @touchend="onTouchEnd"
        >
          <div v-if="showHeader" class="ui-dialog__header">
            <div class="ui-dialog__header-content">
              <h2 v-if="title || $slots['title']" :id="titleId" class="ui-dialog__title">
                <slot name="title">{{ title }}</slot>
              </h2>
              <p
                v-if="description || $slots['description']"
                :id="descriptionId"
                class="ui-dialog__description"
              >
                <slot name="description">{{ description }}</slot>
              </p>
            </div>
            <button
              v-if="showClose"
              type="button"
              class="ui-dialog__close"
              :aria-label="closeLabel"
              @click="close"
            >
              <AnimatedIcon
                name="sparkle"
                :fallback-icon="X"
                size="sm"
                class="ui-dialog__close-icon"
              />
            </button>
          </div>

          <div class="ui-dialog__content">
            <slot />
          </div>

          <div v-if="$slots['footer']" class="ui-dialog__footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import { lockBodyScroll, unlockBodyScroll } from '@/utils/bodyScrollLock'

defineOptions({ name: 'UiDialog' })

interface Props {
  isOpen?: boolean
  title?: string
  description?: string
  size?: 'sm' | 'default' | 'lg' | 'xl' | 'full'
  showClose?: boolean
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  size: 'default',
  showClose: true,
  closeOnOverlay: true,
  closeOnEscape: true,
})
defineSlots<{
  title?: () => unknown
  description?: () => unknown
  default?: () => unknown
  footer?: () => unknown
}>()

const emit = defineEmits<{
  close: []
  'update:isOpen': [value: boolean]
}>()

const { t } = useI18n()
const baseId = useId()
const titleId = `${baseId}-title`
const descriptionId = `${baseId}-description`

const closeLabel = computed(() => t('common.close'))

const showHeader = computed(() => {
  return props.title || props.showClose
})

const dialogClass = computed(() => ['ui-dialog', `ui-dialog--${props.size}`])

/* ── touch drag-to-dismiss ── */
const dragY = ref(0)
const isDragging = ref(false)
let touchStartY = 0
let touchStartX = 0
let directionLocked = false
let isVertical = false
const DISMISS_THRESHOLD = 120

function onTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  touchStartY = touch.clientY
  touchStartX = touch.clientX
  dragY.value = 0
  isDragging.value = false
  directionLocked = false
  isVertical = false
}

function onTouchMove(e: TouchEvent) {
  const touch = e.touches[0]
  const dy = touch.clientY - touchStartY
  const dx = touch.clientX - touchStartX

  if (!directionLocked) {
    if (Math.abs(dy) > 8 || Math.abs(dx) > 8) {
      directionLocked = true
      isVertical = Math.abs(dy) > Math.abs(dx)
    }
    return
  }

  if (!isVertical) return

  // Only allow dragging downward
  isDragging.value = true
  dragY.value = Math.max(0, dy)
}

function onTouchEnd() {
  if (!isDragging.value) return
  if (dragY.value > DISMISS_THRESHOLD) {
    close()
  }
  dragY.value = 0
  isDragging.value = false
}

const dialogDragStyle = computed(() => {
  if (!isDragging.value || dragY.value === 0) return undefined
  return {
    transform: `translateY(${dragY.value}px)`,
    transition: 'none',
  }
})

const overlayStyle = computed(() => {
  if (!isDragging.value || dragY.value === 0) return undefined
  const progress = Math.min(dragY.value / DISMISS_THRESHOLD, 1)
  const opacity = 1 - progress * 0.6
  return {
    backgroundColor: `rgba(0, 0, 0, ${0.5 * opacity})`,
    transition: 'none',
  }
})

function close() {
  emit('close')
  emit('update:isOpen', false)
}

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    close()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.isOpen && props.closeOnEscape) {
    close()
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
.ui-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-4);
  background: var(--ui-backdrop-dim);
  backdrop-filter: var(--ui-backdrop-blur);
  -webkit-backdrop-filter: var(--ui-backdrop-blur);
  overflow-y: auto;
}

.ui-dialog {
  position: relative;
  z-index: var(--z-modal);
  width: 100%;
  max-height: calc(100svh - var(--spacing-8));
  max-height: calc(100dvh - var(--spacing-8));
  display: flex;
  flex-direction: column;
  border-radius: var(--ui-radius-dialog);
  background: var(--ui-surface-bg, var(--glass-bg-strong));
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--ui-surface-border, var(--glass-border));
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  color: var(--color-text-primary);
}

.ui-dialog::before {
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

/* Sizes */
.ui-dialog--sm {
  max-width: 24rem;
}

.ui-dialog--default {
  max-width: 32rem;
}

.ui-dialog--lg {
  max-width: 48rem;
}

.ui-dialog--xl {
  max-width: 64rem;
}

.ui-dialog--full {
  max-width: calc(100vw - var(--spacing-8));
  max-height: calc(100svh - var(--spacing-8));
  max-height: calc(100dvh - var(--spacing-8));
}

/* Header */
.ui-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-4);
  padding: var(--spacing-5);
  flex-shrink: 0;
}

.ui-dialog__header-content {
  flex: 1;
  min-width: 0;
}

.ui-dialog__title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-foreground);
  margin: 0;
}

.ui-dialog__description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: var(--spacing-1) 0 0;
  line-height: var(--leading-relaxed);
}

.ui-dialog__close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--ui-dialog-close-size);
  height: var(--ui-dialog-close-size);
  border-radius: var(--ui-radius-button, var(--radius));
  color: var(--color-text-secondary);
  transition:
    background-color 150ms var(--ease-out),
    color 150ms var(--ease-out);
}

.ui-dialog__close:hover {
  background: var(--glass-bg-light);
  color: var(--color-foreground);
}

.ui-dialog__close:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
}

.ui-dialog__close-icon {
  width: 1rem;
  height: 1rem;
}

/* Content */
.ui-dialog__content {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--spacing-5) var(--spacing-5);
}

/* Footer */
.ui-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-2);
  padding: var(--spacing-4) var(--spacing-5);
  border-top: 1px solid var(--glass-border);
  flex-shrink: 0;
}

/* Transition */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 200ms var(--ease-out);
}

.dialog-enter-active .ui-dialog,
.dialog-leave-active .ui-dialog {
  transition:
    transform 200ms var(--ease-out),
    opacity 200ms var(--ease-out);
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .ui-dialog,
.dialog-leave-to .ui-dialog {
  opacity: 0;
  transform: translateY(2rem);
}

@media (max-width: 640px) {
  .ui-dialog {
    max-width: calc(100vw - var(--spacing-8));
  }
}
</style>
