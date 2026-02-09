<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    :disabled="disabled"
    :class="switchClass"
    @click="toggle"
  >
    <span class="ui-switch__thumb" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'UiSwitch' })

interface Props {
  modelValue?: boolean
  disabled?: boolean
  label?: string
  size?: 'sm' | 'default' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  size: 'default',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const switchClass = computed(() => [
  'ui-switch',
  `ui-switch--${props.size}`,
  {
    'ui-switch--checked': props.modelValue,
    'ui-switch--disabled': props.disabled,
  },
])

function toggle() {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<style scoped>
.ui-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  transition-property: background-color, border-color, box-shadow;
  transition-duration: 200ms;
  transition-timing-function: var(--ease-out);
}

.ui-switch:hover:not(.ui-switch--disabled) {
  border-color: var(--glass-border-strong);
}

.ui-switch:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-ring);
}

/* Sizes */
.ui-switch--sm {
  width: 2rem;
  height: 1.125rem;
}

.ui-switch--default {
  width: 2.75rem;
  height: 1.5rem;
}

.ui-switch--lg {
  width: 3.25rem;
  height: 1.75rem;
}

/* Thumb */
.ui-switch__thumb {
  position: absolute;
  display: block;
  border-radius: var(--radius-full);
  background: var(--color-white);
  box-shadow: var(--shadow-sm);
  transition: transform 200ms var(--ease-spring);
  pointer-events: none;
}

.ui-switch--sm .ui-switch__thumb {
  width: 0.875rem;
  height: 0.875rem;
  left: 2px;
}

.ui-switch--default .ui-switch__thumb {
  width: 1.25rem;
  height: 1.25rem;
  left: 2px;
}

.ui-switch--lg .ui-switch__thumb {
  width: 1.5rem;
  height: 1.5rem;
  left: 2px;
}

/* Checked state */
.ui-switch--checked {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.ui-switch--checked .ui-switch__thumb {
  background: var(--color-on-primary);
}

.ui-switch--checked:hover:not(.ui-switch--disabled) {
  background: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}

.ui-switch--checked.ui-switch--sm .ui-switch__thumb {
  transform: translateX(calc(2rem - 0.875rem - 6px));
}

.ui-switch--checked.ui-switch--default .ui-switch__thumb {
  transform: translateX(calc(2.75rem - 1.25rem - 6px));
}

.ui-switch--checked.ui-switch--lg .ui-switch__thumb {
  transform: translateX(calc(3.25rem - 1.5rem - 6px));
}

/* Disabled state */
.ui-switch--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
