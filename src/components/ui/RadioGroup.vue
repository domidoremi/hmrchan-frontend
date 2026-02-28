<template>
  <div
    class="ui-radio-group"
    role="radiogroup"
    :aria-label="label"
    :aria-orientation="orientation"
    :data-orientation="orientation"
  >
    <label
      v-for="option in options"
      :key="option.value"
      :class="[
        'ui-radio-item',
        {
          'ui-radio-item--checked': modelValue === option.value,
          'ui-radio-item--disabled': option.disabled || disabled,
        },
      ]"
    >
      <button
        type="button"
        role="radio"
        :aria-label="option.label"
        :aria-checked="modelValue === option.value"
        :disabled="option.disabled || disabled"
        class="ui-radio-button"
        @click="selectOption(option.value)"
      >
        <span class="ui-radio-indicator">
          <span v-if="modelValue === option.value" class="ui-radio-dot" />
        </span>
      </button>
      <span class="ui-radio-label">{{ option.label }}</span>
    </label>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'UiRadioGroup' })

interface Option {
  value: string | number
  label: string
  disabled?: boolean
}

interface Props {
  modelValue?: string | number
  options: Option[]
  label?: string
  disabled?: boolean
  orientation?: 'horizontal' | 'vertical'
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  orientation: 'vertical',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

function selectOption(value: string | number) {
  if (!props.disabled) {
    emit('update:modelValue', value)
  }
}
</script>

<style scoped>
.ui-radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.ui-radio-group[data-orientation='horizontal'] {
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--spacing-4);
}

.ui-radio-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  cursor: pointer;
}

.ui-radio-item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ui-radio-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
  cursor: inherit;
}

.ui-radio-button:focus-visible {
  outline: none;
}

.ui-radio-button:focus-visible .ui-radio-indicator {
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
}

.ui-radio-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: var(--radius-full);
  border: 1px solid var(--glass-border-strong);
  background: transparent;
  transition-property: border-color, background-color;
  transition-duration: 150ms;
  transition-timing-function: var(--ease-out);
}

.ui-radio-item:hover:not(.ui-radio-item--disabled) .ui-radio-indicator {
  border-color: var(--color-primary);
}

.ui-radio-item--checked .ui-radio-indicator {
  border-color: var(--color-primary);
}

.ui-radio-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  animation: radio-dot-in 150ms var(--ease-spring);
}

@keyframes radio-dot-in {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.ui-radio-label {
  font-size: var(--text-sm);
  color: var(--color-foreground);
}

.ui-radio-item--disabled .ui-radio-label {
  color: var(--color-muted-foreground);
}
</style>
