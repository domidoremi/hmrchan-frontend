<template>
  <Teleport to="body">
    <Transition name="modal" @after-enter="onAfterEnter" @after-leave="onAfterLeave">
      <div
        v-if="modelValue"
        class="glass-modal-backdrop"
        @click="handleBackdropClick"
        @keydown.esc="close"
      >
        <div
          ref="modalRef"
          class="glass-modal"
          :class="sizeClass"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="bodyId"
          @click.stop
        >
          <div v-if="!hideHeader" class="modal-header">
            <h3 :id="titleId" class="modal-title">{{ title }}</h3>
            <button class="modal-close" @click="close" aria-label="Close dialog">
              <X :size="20" aria-hidden="true" />
            </button>
          </div>

          <div :id="bodyId" class="modal-body">
            <slot />
          </div>

          <div v-if="$slots['footer']" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Modal 模态框组件
 *
 * 功能描述：
 * - 提供模态对话框功能，用于显示重要信息或需要用户交互的内容
 * - 支持多种尺寸（sm/md/lg/xl）
 * - 支持自定义标题和页脚
 * - 完整的焦点管理和键盘导航支持
 * - 支持点击背景关闭
 * - 防止背景滚动
 * - 完整的无障碍支持（ARIA 属性、焦点陷阱）
 *
 * Props:
 * - modelValue: 模态框是否显示
 * - title: 模态框标题
 * - size: 模态框尺寸
 * - hideHeader: 是否隐藏头部
 * - closeOnBackdrop: 是否允许点击背景关闭
 *
 * Emits:
 * - update:modelValue: 显示状态变化事件
 *
 * Slots:
 * - default: 模态框主体内容
 * - footer: 模态框页脚内容（通常放置操作按钮）
 *
 * @example
 * <Modal v-model="showModal" title="确认删除" size="sm">
 *   <p>确定要删除这条记录吗？</p>
 *   <template #footer>
 *     <Button @click="handleDelete">确认</Button>
 *     <Button variant="secondary" @click="showModal = false">取消</Button>
 *   </template>
 * </Modal>
 */

import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { X } from 'lucide-vue-next'
import { useFocusManagement, useBodyScrollLock } from '@/composables'

interface Props {
  /** 模态框是否显示 */
  modelValue: boolean
  /** 模态框标题 */
  title?: string
  /** 模态框尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** 是否隐藏头部 */
  hideHeader?: boolean
  /** 是否允许点击背景关闭模态框 */
  closeOnBackdrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  size: 'md',
  hideHeader: false,
  closeOnBackdrop: true,
})

const emit = defineEmits<{
  /** 显示状态变化事件 */
  'update:modelValue': [value: boolean]
}>()

const modalRef = ref<HTMLElement>()
const previousFocusedElement = ref<HTMLElement | null>(null)
let cleanupFocusTrap: (() => void) | undefined

const { trapFocus, saveFocus, restoreFocus } = useFocusManagement()
const { isLocked: isScrollLocked } = useBodyScrollLock()

/** 生成唯一的标题 ID，用于无障碍支持 */
const titleId = computed(() => `modal-title-${Math.random().toString(36).substr(2, 9)}`)

/** 生成唯一的内容 ID，用于无障碍支持 */
const bodyId = computed(() => `modal-body-${Math.random().toString(36).substr(2, 9)}`)

/** 计算模态框尺寸的 CSS 类名 */
const sizeClass = computed(() => `modal-${props.size}`)

/**
 * 关闭模态框
 */
const close = () => {
  emit('update:modelValue', false)
}

/**
 * 处理背景点击事件
 */
const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    close()
  }
}

/**
 * 模态框打开后的回调
 * 设置焦点陷阱，确保焦点在模态框内循环
 */
const onAfterEnter = async () => {
  await nextTick()
  if (modalRef.value) {
    // 保存之前的焦点元素
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

/**
 * 模态框关闭后的回调
 * 清理焦点陷阱并恢复之前的焦点
 */
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

/**
 * 监听模态框显示状态，控制背景滚动
 */
watch(
  () => props.modelValue,
  (isOpen) => {
    isScrollLocked.value = isOpen
  },
)

/**
 * 组件挂载时设置全局 ESC 键监听
 */
const handleGlobalEsc = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.modelValue) {
    close()
  }
}

// 监听 modalValue 变化
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', handleGlobalEsc)
    } else {
      document.removeEventListener('keydown', handleGlobalEsc)
    }
  },
  { immediate: true },
)

// 组件挂载和卸载时的清理
onMounted(() => {
  if (props.modelValue) {
    document.addEventListener('keydown', handleGlobalEsc)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalEsc)
  if (cleanupFocusTrap) {
    cleanupFocusTrap()
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
