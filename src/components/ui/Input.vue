<template>
  <input
    :id="inputId"
    :class="inputClass"
    :type="type"
    :value="model"
    :disabled="disabled"
    :readonly="readonly"
    :aria-invalid="error || ariaInvalid ? 'true' : undefined"
    v-bind="attrs"
    @input="handleInput"
  />
</template>

<script setup lang="ts">
import { computed, useAttrs, useId } from 'vue'

defineOptions({ inheritAttrs: false, name: 'UiInput' })

interface Props {
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

const model = defineModel<string | number>()

const attrs = useAttrs()
const generatedId = useId()
const inputId = computed(() => (attrs.id as string | undefined) ?? generatedId)

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
  model.value = (event.target as HTMLInputElement).value
}
</script>

<style scoped>
.ui-input {
  width: 100%;
  border-radius: var(--ui-radius-input, var(--radius));
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
  height: var(--ui-control-height-sm);
  padding: 0 var(--ui-control-padding-x-sm);
  font-size: var(--text-xs);
}

.ui-input--default {
  height: var(--ui-control-height-md);
  padding: 0 var(--ui-control-padding-x-md);
}

.ui-input--lg {
  height: var(--ui-control-height-lg);
  padding: 0 var(--ui-control-padding-x-lg);
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
    font-size: 1rem;
  }
}
</style>
