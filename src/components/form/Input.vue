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
      <input :id="inputId" :type="type" :value="modelValue" :placeholder="placeholder" :disabled="disabled"
        :readonly="readonly" :maxlength="maxLength" :class="inputClass" v-bind="$attrs" @input="handleInput"
        @focus="handleFocus" @blur="handleBlur" />

      <!-- Suffix Text -->
      <span v-if="suffix" class="input-suffix-text">{{ suffix }}</span>

      <!-- Character Count -->
      <span v-if="showCount && maxLength" class="input-count">
        {{ characterCount }}/{{ maxLength }}
      </span>

      <!-- Clear Button -->
      <button v-if="clearable && modelValue && !disabled && !readonly" type="button" class="input-clear"
        @click="handleClear" aria-label="Clear input">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
    <div v-if="hint && !error" class="input-hint">
      {{ hint }}
    </div>

    <!-- Error Message -->
    <div v-if="error" class="input-error">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Component } from 'vue'

// 禁用属性继承，手动控制attrs传递给input
defineOptions({
  inheritAttrs: false,
})

interface Props {
  modelValue: string | number
  type?: 'text' | 'password' | 'email' | 'search' | 'number' | 'tel' | 'url'
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  icon?: Component
  prefix?: string
  suffix?: string
  clearable?: boolean
  maxLength?: number
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
  'update:modelValue': [value: string | number]
  focus: []
  blur: []
  clear: []
}>()

const isFocused = ref(false)

// Generate unique ID for accessibility
const inputId = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`)

const characterCount = computed(() => {
  return String(props.modelValue).length
})

const wrapperClass = computed(() => {
  return {
    'is-focused': isFocused.value,
    'is-disabled': props.disabled,
    'is-readonly': props.readonly,
    'has-error': props.error,
  }
})

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

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value: string | number = target.value

  // Handle number type
  if (props.type === 'number' && value !== '') {
    value = Number(value)
  }

  emit('update:modelValue', value)
}

const handleFocus = () => {
  isFocused.value = true
  emit('focus')
}

const handleBlur = () => {
  isFocused.value = false
  emit('blur')
}

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
  font-size: var(--text-xs);
  color: var(--color-error);
  line-height: var(--line-normal);
  font-weight: var(--font-medium);
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
