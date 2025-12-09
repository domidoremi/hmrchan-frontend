<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="modelValue"
        class="confirm-dialog-overlay"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.self="handleOverlayClick"
        @keydown.escape="handleCancel"
      >
        <div class="confirm-dialog" ref="dialogRef" tabindex="-1">
          <!-- 图标 -->
          <div class="dialog-icon" :class="iconClass">
            <component :is="iconComponent" :size="32" />
          </div>

          <!-- 标题 -->
          <h2 :id="titleId" class="dialog-title">{{ title }}</h2>

          <!-- 描述 -->
          <p v-if="description" class="dialog-description">{{ description }}</p>

          <!-- 密码确认（敏感操作） -->
          <div v-if="requirePassword" class="password-input-wrapper">
            <label for="confirm-password" class="password-label">
              {{ $t('auth.enterPassword', '请输入密码确认') }}
            </label>
            <input
              id="confirm-password"
              ref="passwordInput"
              v-model="password"
              type="password"
              class="password-input"
              :placeholder="$t('auth.password', '密码')"
              autocomplete="current-password"
              @keydown.enter="handleConfirm"
            />
            <p v-if="passwordError" class="password-error">{{ passwordError }}</p>
          </div>

          <!-- 操作按钮 -->
          <div class="dialog-actions">
            <button type="button" class="dialog-btn dialog-btn--cancel" @click="handleCancel">
              {{ cancelText || $t('common.cancel', '取消') }}
            </button>
            <button
              type="button"
              class="dialog-btn dialog-btn--confirm"
              :class="confirmButtonClass"
              :disabled="loading || (requirePassword && !password)"
              @click="handleConfirm"
            >
              <Loader2 v-if="loading" :size="16" class="spin" />
              <span>{{ confirmText || $t('common.confirm', '确认') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 敏感操作确认对话框
 *
 * 功能特点：
 * - 支持普通确认和密码验证两种模式
 * - 三种类型：info、warning、danger
 * - 支持键盘导航（Escape 关闭）
 * - 加载状态显示
 * - 无障碍支持
 */

import { ref, computed, watch, nextTick, useId } from 'vue'
import { AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-vue-next'

export interface ConfirmDialogProps {
  modelValue: boolean
  title: string
  description?: string
  type?: 'info' | 'warning' | 'danger'
  confirmText?: string
  cancelText?: string
  requirePassword?: boolean
  loading?: boolean
  closeOnOverlay?: boolean
}

const props = withDefaults(defineProps<ConfirmDialogProps>(), {
  type: 'info',
  requirePassword: false,
  loading: false,
  closeOnOverlay: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', password?: string): void
  (e: 'cancel'): void
}>()

const titleId = useId()
const dialogRef = ref<HTMLElement | null>(null)
const passwordInput = ref<HTMLInputElement | null>(null)
const password = ref('')
const passwordError = ref('')

// 图标组件
const iconComponent = computed(() => {
  switch (props.type) {
    case 'danger':
      return AlertCircle
    case 'warning':
      return AlertTriangle
    default:
      return Info
  }
})

// 图标样式类
const iconClass = computed(() => `dialog-icon--${props.type}`)

// 确认按钮样式类
const confirmButtonClass = computed(() => `dialog-btn--${props.type}`)

// 打开对话框时聚焦
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      password.value = ''
      passwordError.value = ''
      await nextTick()
      if (props.requirePassword && passwordInput.value) {
        passwordInput.value.focus()
      } else if (dialogRef.value) {
        dialogRef.value.focus()
      }
    }
  },
)

function handleOverlayClick() {
  if (props.closeOnOverlay && !props.loading) {
    handleCancel()
  }
}

function handleCancel() {
  if (props.loading) return
  emit('update:modelValue', false)
  emit('cancel')
}

function handleConfirm() {
  if (props.loading) return

  if (props.requirePassword && !password.value) {
    passwordError.value = '请输入密码'
    return
  }

  emit('confirm', props.requirePassword ? password.value : undefined)
}
</script>

<style scoped>
.confirm-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.confirm-dialog {
  width: 100%;
  max-width: 400px;
  padding: var(--spacing-xl);
  background: var(--color-bg-primary);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  text-align: center;
  outline: none;
}

.dialog-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin: 0 auto var(--spacing-md);
  border-radius: var(--radius-full);
}

.dialog-icon--info {
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-info);
}

.dialog-icon--warning {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-warning);
}

.dialog-icon--danger {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
}

.dialog-title {
  margin: 0 0 var(--spacing-sm);
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.dialog-description {
  margin: 0 0 var(--spacing-lg);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.password-input-wrapper {
  margin-bottom: var(--spacing-lg);
  text-align: left;
}

.password-label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.password-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
  font-size: var(--text-base);
  transition: all 0.2s ease;
}

.password-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
}

.password-error {
  margin: var(--spacing-xs) 0 0;
  font-size: var(--text-xs);
  color: var(--color-error);
}

.dialog-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.dialog-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.dialog-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dialog-btn--cancel {
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
  border: 1px solid var(--glass-border);
}

.dialog-btn--cancel:hover:not(:disabled) {
  background: var(--glass-bg);
}

.dialog-btn--confirm {
  background: var(--color-primary);
  color: white;
}

.dialog-btn--confirm:hover:not(:disabled) {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}

.dialog-btn--info {
  background: var(--color-info);
}

.dialog-btn--warning {
  background: var(--color-warning);
}

.dialog-btn--danger {
  background: var(--color-error);
}

.dialog-btn--danger:hover:not(:disabled) {
  background: #dc2626;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 过渡动画 */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-fade-enter-active .confirm-dialog,
.dialog-fade-leave-active .confirm-dialog {
  transition: transform 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .confirm-dialog,
.dialog-fade-leave-to .confirm-dialog {
  transform: scale(0.95);
}
</style>
