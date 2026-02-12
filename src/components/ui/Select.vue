<template>
  <select
    :class="selectClass"
    :value="modelValue"
    :disabled="disabled"
    :aria-invalid="error || ariaInvalid ? 'true' : undefined"
    v-bind="attrs"
    @change="handleChange"
  >
    <slot />
  </select>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false, name: 'UiSelect' })

interface Props {
  modelValue?: string | number
  size?: 'sm' | 'default' | 'lg'
  disabled?: boolean
  error?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default',
  disabled: false,
  error: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const attrs = useAttrs()

const ariaInvalid = computed(() => attrs['aria-invalid'] === 'true')

const selectClass = computed(() => [
  'ui-select',
  `ui-select--${props.size}`,
  {
    'ui-select--error': props.error || ariaInvalid.value,
    'ui-select--disabled': props.disabled,
  },
])

function handleChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<style scoped>
.ui-select {
  width: 100%;
  border-radius: var(--ui-radius-input, var(--radius));
  border: 1px solid var(--glass-border);
  background-color: var(--glass-bg-light);
  color: var(--color-foreground);
  font-size: var(--text-sm);
  appearance: none;
  transition-property: border-color, box-shadow, background-color;
  transition-duration: 150ms;
  transition-timing-function: var(--ease-out);
  background-image:
    linear-gradient(45deg, transparent 50%, var(--color-muted-foreground) 50%),
    linear-gradient(135deg, var(--color-muted-foreground) 50%, transparent 50%);
  background-position:
    calc(100% - 18px) 50%,
    calc(100% - 13px) 50%;
  background-size: 6px 6px;
  background-repeat: no-repeat;
}

.ui-select option {
  background-color: var(--color-background, #fff);
  color: var(--color-foreground, #000);
  padding: 0.5rem;
}

[data-theme='dark'] .ui-select option {
  background-color: var(--color-background, #1a1a2e);
  color: var(--color-foreground, #e0e0e0);
}

.ui-select:hover:not(:disabled) {
  border-color: var(--glass-border-strong);
  background: var(--glass-bg);
}

.ui-select:focus {
  outline: none;
  border-color: var(--color-ring);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.12);
  background: var(--glass-bg);
}

.ui-select--sm {
  height: var(--ui-control-height-sm);
  padding: 0 calc(var(--ui-control-padding-x-sm) + 1.25rem) 0 var(--ui-control-padding-x-sm);
  font-size: var(--text-xs);
}

.ui-select--default {
  height: var(--ui-control-height-md);
  padding: 0 calc(var(--ui-control-padding-x-md) + 1.25rem) 0 var(--ui-control-padding-x-md);
}

.ui-select--lg {
  height: var(--ui-control-height-lg);
  padding: 0 calc(var(--ui-control-padding-x-lg) + 1.25rem) 0 var(--ui-control-padding-x-lg);
  font-size: var(--text-base);
}

.ui-select--error,
.ui-select[aria-invalid='true'] {
  border-color: var(--color-error);
}

.ui-select--error:focus,
.ui-select[aria-invalid='true']:focus {
  box-shadow: 0 0 0 3px rgba(var(--color-error-rgb), 0.14);
}

.ui-select--disabled,
.ui-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--glass-bg-subtle);
}

@media (max-width: 768px) {
  .ui-select {
    font-size: 16px;
  }
}
</style>
