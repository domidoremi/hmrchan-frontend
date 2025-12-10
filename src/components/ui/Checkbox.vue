<template>
  <div class="form-checkbox-container">
    <label class="checkbox-wrapper" :class="wrapperClass">
      <input
        :id="checkboxId"
        type="checkbox"
        class="checkbox-input"
        :checked="isChecked"
        :value="value"
        :disabled="disabled"
        :required="required"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${checkboxId}-error` : hint ? `${checkboxId}-hint` : undefined"
        v-bind="$attrs"
        @change="handleChange"
      />

      <span class="checkbox-box" :class="boxClass">
        <svg
          v-if="isChecked"
          class="checkbox-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <svg
          v-else-if="indeterminate"
          class="checkbox-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </span>

      <span v-if="label || $slots.default" class="checkbox-label">
        <slot>{{ label }}</slot>
      </span>
    </label>

    <!-- Hint Text -->
    <div v-if="hint && !error" :id="`${checkboxId}-hint`" class="checkbox-hint">
      {{ hint }}
    </div>

    <!-- Error Message -->
    <div v-if="error" :id="`${checkboxId}-error`" class="checkbox-error" role="alert">
      <svg
        class="error-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T = string">
/**
 * Checkbox 复选框组件
 *
 * 功能描述：
 * - 支持单选模式（boolean）和多选模式（数组）
 * - 支持不确定状态（半选状态）
 * - 支持多种尺寸和颜色变体
 * - 支持错误提示和帮助文本
 * - 完整的无障碍支持（ARIA 属性）
 *
 * Props:
 * - modelValue: 绑定值（单选为 boolean，多选为数组）
 * - value: 多选模式下该复选框的值
 * - label: 标签文本
 * - error: 错误提示信息
 * - hint: 帮助提示信息
 * - disabled: 是否禁用
 * - required: 是否必填
 * - indeterminate: 是否为不确定状态（半选）
 * - size: 复选框尺寸
 * - variant: 颜色变体
 *
 * Emits:
 * - update:modelValue: 值变化事件
 * - change: 选中状态变化事件
 *
 * Slots:
 * - default: 自定义标签内容
 *
 * @example
 * // 单选模式
 * <Checkbox v-model="agreed" label="我同意服务条款" />
 *
 * // 多选模式
 * <Checkbox v-model="selectedItems" value="item1" label="选项1" />
 * <Checkbox v-model="selectedItems" value="item2" label="选项2" />
 */

import { computed } from 'vue'

defineOptions({
  inheritAttrs: false,
  name: 'Checkbox',
})

/**
 * @template T - 多选模式下的值类型
 */
interface Props {
  /**
   * 绑定值
   * - 单选模式：boolean
   * - 多选模式：T[]（需配合 value 使用）
   */
  modelValue?: boolean | T[]
  /** 多选模式下该复选框的值 */
  value?: T
  /** 标签文本 */
  label?: string
  /** 错误提示信息 */
  error?: string
  /** 帮助提示信息 */
  hint?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 是否必填 */
  required?: boolean
  /** 是否为不确定状态（半选状态，用于全选场景） */
  indeterminate?: boolean
  /** 复选框尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 颜色变体 */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false,
  indeterminate: false,
  size: 'md',
  variant: 'primary',
})

const emit = defineEmits<{
  /** 值变化事件 */
  'update:modelValue': [value: boolean | T[]]
  /** 选中状态变化事件 */
  change: [checked: boolean]
}>()

/** 生成唯一的复选框 ID，用于无障碍支持 */
const checkboxId = computed(() => `checkbox-${Math.random().toString(36).substr(2, 9)}`)

/** 计算复选框是否被选中 */
const isChecked = computed(() => {
  if (Array.isArray(props.modelValue)) {
    return props.value !== undefined && props.modelValue.includes(props.value as T)
  }
  return props.modelValue === true
})

/** 计算容器的 CSS 类名 */
const wrapperClass = computed(() => ({
  'is-checked': isChecked.value,
  'is-disabled': props.disabled,
  'is-indeterminate': props.indeterminate,
  [`size-${props.size}`]: true,
}))

/** 计算复选框的 CSS 类名 */
const boxClass = computed(() => ({
  'is-checked': isChecked.value,
  'is-indeterminate': props.indeterminate,
  [`variant-${props.variant}`]: true,
}))

/**
 * 处理复选框状态变化
 * @param event - 变化事件对象
 */
function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  const checked = target.checked

  if (Array.isArray(props.modelValue)) {
    // 多选模式：需要确保 value 已定义
    if (props.value === undefined) {
      console.warn('Checkbox: value prop is required when using array modelValue')
      return
    }

    const newValue = [...props.modelValue]
    const typedValue = props.value as T

    if (checked) {
      // 添加到数组
      newValue.push(typedValue)
    } else {
      // 从数组中移除
      const index = newValue.indexOf(typedValue)
      if (index > -1) {
        newValue.splice(index, 1)
      }
    }
    emit('update:modelValue', newValue)
  } else {
    // 单选模式：直接更新 boolean 值
    emit('update:modelValue', checked)
  }

  emit('change', checked)
}
</script>

<style scoped>
.form-checkbox-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

/* Checkbox Wrapper */
.checkbox-wrapper {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-3);
  cursor: pointer;
  user-select: none;
  transition: opacity var(--transition-fast);
}

.checkbox-wrapper.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Hidden Input */
.checkbox-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

/* Checkbox Box */
.checkbox-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--glass-bg);
  transition: all var(--transition-fast);
}

.checkbox-wrapper.size-sm .checkbox-box {
  width: 16px;
  height: 16px;
}

.checkbox-wrapper.size-md .checkbox-box {
  width: 20px;
  height: 20px;
}

.checkbox-wrapper.size-lg .checkbox-box {
  width: 24px;
  height: 24px;
}

.checkbox-wrapper:hover:not(.is-disabled) .checkbox-box {
  border-color: var(--color-primary-light);
}

.checkbox-input:focus-visible + .checkbox-box {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Checked State */
.checkbox-box.is-checked,
.checkbox-box.is-indeterminate {
  border-color: var(--color-primary);
  background: var(--color-primary);
}

.checkbox-box.variant-primary.is-checked,
.checkbox-box.variant-primary.is-indeterminate {
  border-color: var(--color-primary);
  background: var(--color-primary);
}

.checkbox-box.variant-success.is-checked,
.checkbox-box.variant-success.is-indeterminate {
  border-color: var(--color-success);
  background: var(--color-success);
}

.checkbox-box.variant-warning.is-checked,
.checkbox-box.variant-warning.is-indeterminate {
  border-color: var(--color-warning);
  background: var(--color-warning);
}

.checkbox-box.variant-error.is-checked,
.checkbox-box.variant-error.is-indeterminate {
  border-color: var(--color-error);
  background: var(--color-error);
}

/* Checkbox Icon */
.checkbox-icon {
  color: white;
  transition: transform var(--transition-fast);
  animation: checkmark var(--duration-fast) var(--ease-bounce);
}

@keyframes checkmark {
  0% {
    transform: scale(0);
  }

  50% {
    transform: scale(1.2);
  }

  100% {
    transform: scale(1);
  }
}

/* Label */
.checkbox-label {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  line-height: var(--line-normal);
}

.checkbox-wrapper.size-sm .checkbox-label {
  font-size: var(--text-xs);
}

.checkbox-wrapper.size-lg .checkbox-label {
  font-size: var(--text-base);
}

/* Hint Text */
.checkbox-hint {
  margin-left: calc(var(--spacing-3) + 20px);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  line-height: var(--line-normal);
}

/* Error Message */
.checkbox-error {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  margin-left: calc(var(--spacing-3) + 20px);
  font-size: var(--text-xs);
  color: var(--color-error);
  line-height: var(--line-normal);
  font-weight: var(--font-medium);
}

.error-icon {
  flex-shrink: 0;
  animation: errorShake 0.4s ease-in-out;
}

@keyframes errorShake {
  0%,
  100% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(-4px);
  }

  75% {
    transform: translateX(4px);
  }
}
</style>
