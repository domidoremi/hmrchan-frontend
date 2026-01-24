<template>
  <button
    type="button"
    role="checkbox"
    :aria-checked="indeterminate ? 'mixed' : modelValue"
    :aria-label="label"
    :disabled="disabled"
    :class="checkboxClass"
    @click="toggle"
  >
    <svg
      v-if="modelValue && !indeterminate"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="ui-checkbox__check"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
    <svg
      v-else-if="indeterminate"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      class="ui-checkbox__check"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'UiCheckbox' })

interface Props {
  modelValue?: boolean
  disabled?: boolean
  indeterminate?: boolean
  label?: string
  size?: 'sm' | 'default' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  indeterminate: false,
  size: 'default',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const checkboxClass = computed(() => [
  'ui-checkbox',
  `ui-checkbox--${props.size}`,
  {
    'ui-checkbox--checked': props.modelValue || props.indeterminate,
    'ui-checkbox--disabled': props.disabled,
  },
])

function toggle() {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<style scoped>
.ui-checkbox {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: var(--radius-sm);
  background: transparent;
  border: 1px solid var(--glass-border-strong);
  transition-property: background-color, border-color, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: var(--ease-out);
}

.ui-checkbox:hover:not(.ui-checkbox--disabled) {
  border-color: var(--color-primary);
}

.ui-checkbox:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
}

/* Sizes */
.ui-checkbox--sm {
  width: 1rem;
  height: 1rem;
}

.ui-checkbox--default {
  width: 1.125rem;
  height: 1.125rem;
}

.ui-checkbox--lg {
  width: 1.25rem;
  height: 1.25rem;
}

/* Check icon */
.ui-checkbox__check {
  width: 75%;
  height: 75%;
  color: var(--color-white);
}

/* Checked state */
.ui-checkbox--checked {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.ui-checkbox--checked:hover:not(.ui-checkbox--disabled) {
  background: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}

/* Disabled state */
.ui-checkbox--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
