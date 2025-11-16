<template>
  <Teleport to="body">
    <Transition name="modal" @after-enter="onAfterEnter" @after-leave="onAfterLeave">
      <div v-if="modelValue" class="glass-modal-backdrop" @click="handleBackdropClick" @keydown.esc="close">
        <div ref="modalRef" class="glass-modal" :class="sizeClass" role="dialog" aria-modal="true"
          :aria-labelledby="titleId" :aria-describedby="bodyId" @click.stop>
          <div v-if="!hideHeader" class="modal-header">
            <h3 :id="titleId" class="modal-title">{{ title }}</h3>
            <button class="modal-close" @click="close" aria-label="Close dialog">
              <X :size="20" aria-hidden="true" />
            </button>
          </div>

          <div :id="bodyId" class="modal-body">
            <slot />
          </div>

          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, ref, nextTick, onMounted } from 'vue'
import { X } from 'lucide-vue-next'
import { useFocusManagement } from '@/composables'

interface Props {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  hideHeader?: boolean
  closeOnBackdrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  size: 'md',
  hideHeader: false,
  closeOnBackdrop: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const modalRef = ref<HTMLElement>()
const previousFocusedElement = ref<HTMLElement | null>(null)
let cleanupFocusTrap: (() => void) | undefined

const { trapFocus, saveFocus, restoreFocus } = useFocusManagement()

// Generate unique IDs for ARIA
const titleId = computed(() => `modal-title-${Math.random().toString(36).substr(2, 9)}`)
const bodyId = computed(() => `modal-body-${Math.random().toString(36).substr(2, 9)}`)

const sizeClass = computed(() => `modal-${props.size}`)

const close = () => {
  emit('update:modelValue', false)
}

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    close()
  }
}

// 模态框打开后设置焦点陷阱
const onAfterEnter = async () => {
  await nextTick()
  if (modalRef.value) {
    // 保存之前的焦点
    previousFocusedElement.value = saveFocus()

    // 设置焦点陷阱
    cleanupFocusTrap = trapFocus(modalRef.value)

    // 将焦点移到模态框的第一个可聚焦元素
    const firstFocusable = modalRef.value.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    if (firstFocusable) {
      firstFocusable.focus()
    } else {
      // 如果没有可聚焦元素，聚焦到模态框本身
      modalRef.value.setAttribute('tabindex', '-1')
      modalRef.value.focus()
    }
  }
}

// 模态框关闭后恢复焦点
const onAfterLeave = () => {
  // 清理焦点陷阱
  if (cleanupFocusTrap) {
    cleanupFocusTrap()
    cleanupFocusTrap = undefined
  }

  // 恢复之前的焦点
  restoreFocus(previousFocusedElement.value)
  previousFocusedElement.value = null
}

// 防止背景滚动
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  },
)

// 组件卸载时清理
onMounted(() => {
  return () => {
    if (cleanupFocusTrap) {
      cleanupFocusTrap()
    }
    // 确保恢复 body 滚动
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--glass-border);
}

.modal-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.modal-body {
  padding: var(--spacing-lg);
  overflow-y: auto;
  max-height: calc(90vh - 200px);
}

.modal-footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-md);
}

.glass-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  /* 垂直居中 */
  justify-content: center;
  /* 水平居中 */
  padding: var(--spacing-lg);
  overflow-y: auto;
}

/* 尺寸 */
.modal-sm {
  max-width: 400px;
}

.modal-md {
  max-width: 600px;
}

.modal-lg {
  max-width: 800px;
}

.modal-xl {
  max-width: 1200px;
}

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition-base);
}

.modal-enter-active .glass-modal,
.modal-leave-active .glass-modal {
  transition: transform var(--transition-base);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .glass-modal,
.modal-leave-to .glass-modal {
  transform: scale(0.95) translateY(-20px);
}
</style>
