<template>
  <div class="form-radio-container">
    <label class="radio-wrapper" :class="wrapperClass">
      <input
        :id="radioId"
        type="radio"
        class="radio-input"
        :checked="isChecked"
        :value="value"
        :name="name"
        :disabled="disabled"
        :required="required"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${radioId}-error` : hint ? `${radioId}-hint` : undefined"
        v-bind="$attrs"
        @change="handleChange"
      />

      <span class="radio-box" :class="boxClass">
        <span v-if="isChecked" class="radio-dot" />
      </span>

      <span v-if="label || $slots.default" class="radio-label">
        <slot>{{ label }}</slot>
      </span>
    </label>

    <!-- Hint Text -->
    <div v-if="hint && !error" :id="`${radioId}-hint`" class="radio-hint">
      {{ hint }}
    </div>

    <!-- Error Message -->
    <div v-if="error" :id="`${radioId}-error`" class="radio-error" role="alert">
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
import { computed } from 'vue'

defineOptions({
  inheritAttrs: false,
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'Radio',
})

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modelValue?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any
  name?: string
  label?: string
  error?: string
  hint?: string
  disabled?: boolean
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false,
  size: 'md',
  variant: 'primary',
})

const emit = defineEmits<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  'update:modelValue': [value: any]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  change: [value: any]
}>()

const radioId = computed(() => `radio-${Math.random().toString(36).substr(2, 9)}`)

const isChecked = computed(() => props.modelValue === props.value)

const wrapperClass = computed(() => ({
  'is-checked': isChecked.value,
  'is-disabled': props.disabled,
  [`size-${props.size}`]: true,
}))

const boxClass = computed(() => ({
  'is-checked': isChecked.value,
  [`variant-${props.variant}`]: true,
}))

function handleChange() {
  emit('update:modelValue', props.value)
  emit('change', props.value)
}
</script>

<style scoped>
.form-radio-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

/* Radio Wrapper */
.radio-wrapper {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-3);
  cursor: pointer;
  user-select: none;
  transition: opacity var(--transition-fast);
}

.radio-wrapper.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Hidden Input */
.radio-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

/* Radio Box */
.radio-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  transition: all var(--transition-fast);
}

.radio-wrapper.size-sm .radio-box {
  width: 16px;
  height: 16px;
}

.radio-wrapper.size-md .radio-box {
  width: 20px;
  height: 20px;
}

.radio-wrapper.size-lg .radio-box {
  width: 24px;
  height: 24px;
}

.radio-wrapper:hover:not(.is-disabled) .radio-box {
  border-color: var(--color-primary-light);
}

.radio-input:focus-visible + .radio-box {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Checked State */
.radio-box.is-checked {
  border-color: var(--color-primary);
}

.radio-box.variant-primary.is-checked {
  border-color: var(--color-primary);
}

.radio-box.variant-success.is-checked {
  border-color: var(--color-success);
}

.radio-box.variant-warning.is-checked {
  border-color: var(--color-warning);
}

.radio-box.variant-error.is-checked {
  border-color: var(--color-error);
}

/* Radio Dot */
.radio-dot {
  border-radius: var(--radius-full);
  background: var(--color-primary);
  animation: radioDot var(--duration-fast) var(--ease-bounce);
}

.radio-wrapper.size-sm .radio-dot {
  width: 8px;
  height: 8px;
}

.radio-wrapper.size-md .radio-dot {
  width: 10px;
  height: 10px;
}

.radio-wrapper.size-lg .radio-dot {
  width: 12px;
  height: 12px;
}

.radio-box.variant-primary .radio-dot {
  background: var(--color-primary);
}

.radio-box.variant-success .radio-dot {
  background: var(--color-success);
}

.radio-box.variant-warning .radio-dot {
  background: var(--color-warning);
}

.radio-box.variant-error .radio-dot {
  background: var(--color-error);
}

@keyframes radioDot {
  0% {
    transform: scale(0);
  }

  50% {
    transform: scale(1.3);
  }

  100% {
    transform: scale(1);
  }
}

/* Label */
.radio-label {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  line-height: var(--line-normal);
}

.radio-wrapper.size-sm .radio-label {
  font-size: var(--text-xs);
}

.radio-wrapper.size-lg .radio-label {
  font-size: var(--text-base);
}

/* Hint Text */
.radio-hint {
  margin-left: calc(var(--spacing-3) + 20px);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  line-height: var(--line-normal);
}

/* Error Message */
.radio-error {
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
