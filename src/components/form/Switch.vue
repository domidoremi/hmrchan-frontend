<template>
  <div class="form-switch-container">
    <label class="switch-wrapper" :class="wrapperClass">
      <input
        :id="switchId"
        type="checkbox"
        class="switch-input"
        :checked="isChecked"
        :disabled="disabled || loading"
        :required="required"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${switchId}-error` : hint ? `${switchId}-hint` : undefined"
        v-bind="$attrs"
        @change="handleChange"
      />

      <span class="switch-track" :class="trackClass">
        <span class="switch-thumb" :class="thumbClass">
          <!-- Loading Spinner -->
          <svg
            v-if="loading"
            class="switch-loading"
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </span>
      </span>

      <span v-if="label || $slots.default" class="switch-label">
        <slot>{{ label }}</slot>
      </span>
    </label>

    <!-- Hint Text -->
    <div v-if="hint && !error" :id="`${switchId}-hint`" class="switch-hint">
      {{ hint }}
    </div>

    <!-- Error Message -->
    <div v-if="error" :id="`${switchId}-error`" class="switch-error" role="alert">
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
  name: 'FormSwitch',
})

interface Props {
  modelValue?: boolean
  label?: string
  error?: string
  hint?: string
  disabled?: boolean
  loading?: boolean
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  loading: false,
  required: false,
  size: 'md',
  variant: 'primary',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  change: [checked: boolean]
}>()

const switchId = computed(() => `switch-${Math.random().toString(36).substr(2, 9)}`)

const isChecked = computed(() => props.modelValue === true)

const wrapperClass = computed(() => ({
  'is-checked': isChecked.value,
  'is-disabled': props.disabled,
  'is-loading': props.loading,
  [`size-${props.size}`]: true,
}))

const trackClass = computed(() => ({
  'is-checked': isChecked.value,
  [`variant-${props.variant}`]: true,
}))

const thumbClass = computed(() => ({
  'is-checked': isChecked.value,
  'is-loading': props.loading,
}))

function handleChange(event: Event) {
  if (props.loading) return

  const target = event.target as HTMLInputElement
  const checked = target.checked

  emit('update:modelValue', checked)
  emit('change', checked)
}
</script>

<style scoped>
.form-switch-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

/* Switch Wrapper */
.switch-wrapper {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-3);
  cursor: pointer;
  user-select: none;
  transition: opacity var(--transition-fast);
}

.switch-wrapper.is-disabled,
.switch-wrapper.is-loading {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Hidden Input */
.switch-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

/* Switch Track */
.switch-track {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--color-border);
  transition: all var(--transition-base);
}

.switch-wrapper.size-sm .switch-track {
  width: 32px;
  height: 18px;
}

.switch-wrapper.size-md .switch-track {
  width: 40px;
  height: 22px;
}

.switch-wrapper.size-lg .switch-track {
  width: 48px;
  height: 26px;
}

.switch-wrapper:hover:not(.is-disabled):not(.is-loading) .switch-track {
  background: var(--color-text-tertiary);
}

.switch-input:focus-visible + .switch-track {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Checked State */
.switch-track.is-checked {
  background: var(--color-primary);
}

.switch-track.variant-primary.is-checked {
  background: var(--color-primary);
}

.switch-track.variant-success.is-checked {
  background: var(--color-success);
}

.switch-track.variant-warning.is-checked {
  background: var(--color-warning);
}

.switch-track.variant-error.is-checked {
  background: var(--color-error);
}

.switch-wrapper:hover:not(.is-disabled):not(.is-loading) .switch-track.is-checked {
  opacity: 0.9;
}

/* Switch Thumb */
.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: white;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.switch-wrapper.size-sm .switch-thumb {
  width: 14px;
  height: 14px;
}

.switch-wrapper.size-md .switch-thumb {
  width: 18px;
  height: 18px;
}

.switch-wrapper.size-lg .switch-thumb {
  width: 22px;
  height: 22px;
}

.switch-thumb.is-checked {
  transform: translateX(calc(100% + 2px));
}

.switch-wrapper.size-sm .switch-thumb.is-checked {
  transform: translateX(14px);
}

.switch-wrapper.size-md .switch-thumb.is-checked {
  transform: translateX(18px);
}

.switch-wrapper.size-lg .switch-thumb.is-checked {
  transform: translateX(22px);
}

/* Loading Spinner */
.switch-loading {
  animation: spin 1s linear infinite;
  color: var(--color-text-tertiary);
}

.switch-thumb.is-checked .switch-loading {
  color: var(--color-primary);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* Label */
.switch-label {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  line-height: var(--line-normal);
}

.switch-wrapper.size-sm .switch-label {
  font-size: var(--text-xs);
}

.switch-wrapper.size-lg .switch-label {
  font-size: var(--text-base);
}

/* Hint Text */
.switch-hint {
  margin-left: calc(var(--spacing-3) + 40px);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  line-height: var(--line-normal);
}

.switch-wrapper.size-sm ~ .switch-hint {
  margin-left: calc(var(--spacing-3) + 32px);
}

.switch-wrapper.size-lg ~ .switch-hint {
  margin-left: calc(var(--spacing-3) + 48px);
}

/* Error Message */
.switch-error {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  margin-left: calc(var(--spacing-3) + 40px);
  font-size: var(--text-xs);
  color: var(--color-error);
  line-height: var(--line-normal);
  font-weight: var(--font-medium);
}

.switch-wrapper.size-sm ~ .switch-error {
  margin-left: calc(var(--spacing-3) + 32px);
}

.switch-wrapper.size-lg ~ .switch-error {
  margin-left: calc(var(--spacing-3) + 48px);
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
