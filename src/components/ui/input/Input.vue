<template>
  <div class="glass-input-container">
    <!-- Label -->
    <label v-if="label" :for="inputId" class="input-label" :class="{ 'is-required': required }">
      {{ label }}
    </label>

    <!-- Input Wrapper -->
    <div class="glass-input-wrapper" :class="wrapperClass">
      <!-- Prefix Icon -->
      <div v-if="icon" class="input-icon">
        <component :is="icon" :size="20" />
      </div>

      <!-- Prefix Text -->
      <span v-if="prefix" class="input-prefix">{{ prefix }}</span>

      <!-- Input Element -->
      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxLength"
        :class="inputClass"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined"
        v-bind="$attrs"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      />

      <!-- Suffix Text -->
      <span v-if="suffix" class="input-suffix-text">{{ suffix }}</span>

      <!-- Character Count -->
      <span v-if="showCount && maxLength" class="input-count">
        {{ characterCount }}/{{ maxLength }}
      </span>

      <!-- Clear Button -->
      <button
        v-if="clearable && modelValue && !disabled && !readonly"
        type="button"
        class="input-clear"
        @click="handleClear"
        aria-label="Clear input"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6" />
          <path d="m9 9 6 6" />
        </svg>
      </button>

      <!-- Suffix Slot -->
      <div v-if="$slots.suffix" class="input-suffix">
        <slot name="suffix" />
      </div>
    </div>

    <!-- Hint Text -->
    <div v-if="hint && !error" :id="`${inputId}-hint`" class="input-hint">
      {{ hint }}
    </div>

    <!-- Error Message -->
    <div v-if="error" :id="`${inputId}-error`" class="input-error" role="alert">
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

<script setup lang="ts">
/**
 * Input 输入框组件
 *
 * 功能描述：
 * - 提供多种类型的输入框（文本、密码、邮箱、搜索、数字、电话、URL）
 * - 支持标签、占位符、错误提示和帮助文本
 * - 支持前缀/后缀图标和文本
 * - 支持清除按钮和字符计数
 * - 支持禁用和只读状态
 * - 完整的无障碍支持（ARIA 属性）
 *
 * Props:
 * - modelValue: 输入框的值
 * - type: 输入框类型
 * - label: 输入框标签
 * - placeholder: 占位符文本
 * - error: 错误提示信息
 * - hint: 帮助提示信息
 * - required: 是否必填
 * - disabled: 是否禁用
 * - readonly: 是否只读
 * - icon: 前缀图标组件
 * - prefix: 前缀文本
 * - suffix: 后缀文本
 * - clearable: 是否显示清除按钮
 * - maxLength: 最大字符长度
 * - showCount: 是否显示字符计数
 *
 * Emits:
 * - update:modelValue: 值变化事件
 * - focus: 获得焦点事件
 * - blur: 失去焦点事件
 * - clear: 清除内容事件
 *
 * Slots:
 * - suffix: 自定义后缀内容
 *
 * @example
 * <Input v-model="username" label="用户名" placeholder="请输入用户名" />
 * <Input v-model="email" type="email" :icon="IconMail" clearable />
 * <Input v-model="password" type="password" error="密码格式不正确" />
 */

import { computed, ref } from 'vue'
import type { Component } from 'vue'

defineOptions({
  inheritAttrs: false,
})

interface Props {
  /** 输入框的值 */
  modelValue: string | number
  /** 输入框类型 */
  type?: 'text' | 'password' | 'email' | 'search' | 'number' | 'tel' | 'url'
  /** 输入框标签 */
  label?: string
  /** 占位符文本 */
  placeholder?: string
  /** 错误提示信息 */
  error?: string
  /** 帮助提示信息 */
  hint?: string
  /** 是否必填（标签后显示红色星号） */
  required?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 是否只读 */
  readonly?: boolean
  /** 前缀图标组件 */
  icon?: Component
  /** 前缀文本 */
  prefix?: string
  /** 后缀文本 */
  suffix?: string
  /** 是否显示清除按钮 */
  clearable?: boolean
  /** 最大字符长度 */
  maxLength?: number
  /** 是否显示字符计数 */
  showCount?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  disabled: false,
  readonly: false,
  required: false,
  clearable: false,
  showCount: false,
})

const emit = defineEmits<{
  /** 值变化事件 */
  'update:modelValue': [value: string | number]
  /** 获得焦点事件 */
  focus: []
  /** 失去焦点事件 */
  blur: []
  /** 清除内容事件 */
  clear: []
}>()

/** 输入框是否获得焦点 */
const isFocused = ref(false)

/** 生成唯一的输入框 ID，用于无障碍支持 */
const inputId = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`)

/** 计算当前字符数 */
const characterCount = computed(() => {
  return String(props.modelValue).length
})

/** 计算输入框容器的 CSS 类名 */
const wrapperClass = computed(() => {
  return {
    'is-focused': isFocused.value,
    'is-disabled': props.disabled,
    'is-readonly': props.readonly,
    'has-error': props.error,
  }
})

/** 计算输入框元素的 CSS 类名 */
const inputClass = computed(() => {
  return [
    'glass-input',
    {
      'has-icon': props.icon,
      'has-prefix': props.prefix,
      'has-suffix': props.suffix || props.showCount,
      'has-clearable': props.clearable && props.modelValue,
    },
  ]
})

/**
 * 处理输入事件
 * @param event - 输入事件对象
 */
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value: string | number = target.value

  // 处理数字类型的输入
  if (props.type === 'number' && value !== '') {
    value = Number(value)
  }

  emit('update:modelValue', value)
}

/**
 * 处理获得焦点事件
 */
const handleFocus = () => {
  isFocused.value = true
  emit('focus')
}

/**
 * 处理失去焦点事件
 */
const handleBlur = () => {
  isFocused.value = false
  emit('blur')
}

/**
 * 处理清除按钮点击事件
 */
const handleClear = () => {
  emit('update:modelValue', props.type === 'number' ? 0 : '')
  emit('clear')
}
</script>

<style scoped>
.glass-input-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  width: 100%;
}

/* Label */
.input-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-1);
}

.input-label.is-required::after {
  content: ' *';
  color: var(--color-error);
}

/* Input Wrapper */
.glass-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  transition: all var(--transition-base);
}

.glass-input-wrapper.is-focused {
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.glass-input-wrapper.has-error {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.glass-input-wrapper.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.glass-input-wrapper.is-readonly {
  opacity: 0.8;
}

/* Input Element */
.glass-input {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4);
  font-size: var(--text-base);
  font-family: var(--font-sans);
  color: var(--color-text-primary);
  background: var(--glass-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  backdrop-filter: var(--glass-blur);
  transition: all var(--transition-base);
  outline: none;
}

.glass-input::placeholder {
  color: var(--color-text-tertiary);
}

.glass-input:hover:not(:disabled):not(:read-only) {
  border-color: var(--color-primary-light);
}

.glass-input:focus {
  border-color: var(--color-primary);
  background: var(--glass-bg-strong);
}

.glass-input:disabled {
  cursor: not-allowed;
}

.glass-input:read-only {
  cursor: default;
}

.glass-input-wrapper.has-error .glass-input {
  border-color: var(--color-error);
}

.glass-input-wrapper.has-error .glass-input:focus {
  border-color: var(--color-error);
}

/* Icon */
.input-icon {
  position: absolute;
  left: var(--spacing-4);
  display: flex;
  align-items: center;
  color: var(--color-text-tertiary);
  pointer-events: none;
  z-index: 1;
}

.glass-input.has-icon {
  padding-left: calc(var(--spacing-4) * 2 + 20px);
}

/* Prefix Text */
.input-prefix {
  position: absolute;
  left: var(--spacing-4);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  pointer-events: none;
  z-index: 1;
}

.glass-input.has-prefix {
  padding-left: calc(var(--spacing-4) * 2 + 20px);
}

/* Suffix Text */
.input-suffix-text {
  position: absolute;
  right: var(--spacing-4);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  pointer-events: none;
  z-index: 1;
}

.glass-input.has-suffix {
  padding-right: calc(var(--spacing-4) * 2 + 20px);
}

/* Character Count */
.input-count {
  position: absolute;
  right: var(--spacing-4);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  pointer-events: none;
  z-index: 1;
}

.glass-input.has-suffix.has-clearable {
  padding-right: calc(var(--spacing-4) * 3 + 40px);
}

/* Clear Button */
.input-clear {
  position: absolute;
  right: var(--spacing-4);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-full);
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  z-index: 2;
}

.input-clear:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-variant);
}

.input-clear:active {
  transform: scale(0.95);
}

.glass-input.has-clearable {
  padding-right: calc(var(--spacing-4) * 2 + 24px);
}

/* Suffix Slot */
.input-suffix {
  position: absolute;
  right: var(--spacing-4);
  display: flex;
  align-items: center;
  z-index: 1;
}

/* Hint Text */
.input-hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  line-height: var(--line-normal);
}

/* Error Message */
.input-error {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
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

/* Responsive adjustments */
@media (max-width: 640px) {
  .glass-input {
    font-size: var(--text-sm);
    padding: var(--spacing-2) var(--spacing-3);
  }

  .input-icon {
    left: var(--spacing-3);
  }

  .glass-input.has-icon {
    padding-left: calc(var(--spacing-3) * 2 + 20px);
  }

  .input-prefix {
    left: var(--spacing-3);
  }

  .glass-input.has-prefix {
    padding-left: calc(var(--spacing-3) * 2 + 20px);
  }

  .input-suffix-text,
  .input-count,
  .input-clear,
  .input-suffix {
    right: var(--spacing-3);
  }

  .glass-input.has-clearable {
    padding-right: calc(var(--spacing-3) * 2 + 24px);
  }
}
</style>
