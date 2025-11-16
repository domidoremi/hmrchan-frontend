<template>
  <div class="form-radio-group">
    <!-- Label -->
    <label v-if="label" class="radio-group-label" :class="{ 'is-required': required }">
      {{ label }}
    </label>

    <!-- Radio Options -->
    <div class="radio-group-options" :class="{ [`direction-${direction}`]: true }">
      <Radio
        v-for="option in options"
        :key="getOptionValue(option)"
        :model-value="modelValue"
        :value="getOptionValue(option)"
        :label="getOptionLabel(option)"
        :name="name"
        :disabled="disabled || isOptionDisabled(option)"
        :size="size"
        :variant="variant"
        @update:model-value="handleChange"
      >
        <slot name="option" :option="option">
          {{ getOptionLabel(option) }}
        </slot>
      </Radio>
    </div>

    <!-- Hint Text -->
    <div v-if="hint && !error" class="radio-group-hint">
      {{ hint }}
    </div>

    <!-- Error Message -->
    <div v-if="error" class="radio-group-error">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import Radio from './Radio.vue'

type OptionValue = string | number
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Option =
  | OptionValue
  | { label: string; value: OptionValue; disabled?: boolean; [key: string]: any }

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modelValue?: any
  options: Option[]
  name?: string
  label?: string
  error?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  direction?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
  valueKey?: string
  labelKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false,
  direction: 'vertical',
  size: 'md',
  variant: 'primary',
  valueKey: 'value',
  labelKey: 'label',
})

const emit = defineEmits<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  'update:modelValue': [value: any]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  change: [value: any]
}>()

function getOptionValue(option: Option): OptionValue {
  if (typeof option === 'object' && option !== null) {
    return option[props.valueKey]
  }
  return option
}

function getOptionLabel(option: Option): string {
  if (typeof option === 'object' && option !== null) {
    return String(option[props.labelKey])
  }
  return String(option)
}

function isOptionDisabled(option: Option): boolean {
  if (typeof option === 'object' && option !== null) {
    return option.disabled === true
  }
  return false
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleChange(value: any) {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
.form-radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

/* Label */
.radio-group-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}

.radio-group-label.is-required::after {
  content: ' *';
  color: var(--color-error);
}

/* Options Container */
.radio-group-options {
  display: flex;
  gap: var(--spacing-4);
}

.radio-group-options.direction-vertical {
  flex-direction: column;
}

.radio-group-options.direction-horizontal {
  flex-direction: row;
  flex-wrap: wrap;
}

/* Hint Text */
.radio-group-hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  line-height: var(--line-normal);
}

/* Error Message */
.radio-group-error {
  font-size: var(--text-xs);
  color: var(--color-error);
  line-height: var(--line-normal);
  font-weight: var(--font-medium);
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .radio-group-options.direction-horizontal {
    flex-direction: column;
  }
}
</style>
