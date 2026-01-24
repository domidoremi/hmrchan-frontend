<template>
  <input
    :class="inputClass"
    :type="type"
    :value="modelValue"
    :disabled="disabled"
    :readonly="readonly"
    :aria-invalid="error || ariaInvalid ? 'true' : undefined"
    v-bind="attrs"
    @input="handleInput"
  />
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false, name: 'UiInput' })

interface Props {
  modelValue?: string | number
  type?: string
  size?: 'sm' | 'default' | 'lg'
  disabled?: boolean
  readonly?: boolean
  error?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'default',
  disabled: false,
  readonly: false,
  error: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const attrs = useAttrs()

const ariaInvalid = computed(() => attrs['aria-invalid'] === 'true')

const inputClass = computed(() => [
  'ui-input',
  `ui-input--${props.size}`,
  {
    'ui-input--error': props.error || ariaInvalid.value,
    'ui-input--disabled': props.disabled,
    'ui-input--readonly': props.readonly,
  },
])

function handleInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<style scoped>
.ui-input {
  width: 100%;
  border-radius: var(--radius);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg-light);
  color: var(--color-foreground);
  font-size: var(--text-sm);
  transition-property: border-color, box-shadow, background-color;
  transition-duration: 150ms;
  transition-timing-function: var(--ease-out);
}

.ui-input::placeholder {
  color: var(--color-muted-foreground);
}

.ui-input:hover:not(:disabled):not(.ui-input--readonly) {
  border-color: var(--glass-border-strong);
  background: var(--glass-bg);
}

.ui-input:focus {
  outline: none;
  border-color: var(--color-ring);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.12);
  background: var(--glass-bg);
}

.ui-input--sm {
  height: 2.25rem;
  padding: 0 0.75rem;
  font-size: var(--text-xs);
}

.ui-input--default {
  height: 2.5rem;
  padding: 0 1rem;
}

.ui-input--lg {
  height: 2.75rem;
  padding: 0 1.25rem;
  font-size: var(--text-base);
}

.ui-input--error,
.ui-input[aria-invalid='true'] {
  border-color: var(--color-error);
}

.ui-input--error:focus,
.ui-input[aria-invalid='true']:focus {
  box-shadow: 0 0 0 3px rgba(var(--color-error-rgb), 0.14);
}

.ui-input--disabled,
.ui-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--glass-bg-subtle);
}

.ui-input--readonly {
  opacity: 0.75;
  cursor: default;
  background: var(--glass-bg-subtle);
}

@media (max-width: 768px) {
  .ui-input {
    font-size: 16px;
  }
}
</style>
