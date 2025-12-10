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

<script setup lang="ts" generic="T extends PropertyKey | undefined = string">
import Radio from './Radio.vue'

/**
 * 选项类型
 * 支持简单值或对象形式
 */
type Option<T> =
  | T
  | {
      label: string
      value: T
      disabled?: boolean
      description?: string
      icon?: unknown
    }

/**
 * RadioGroup Props
 * @template T - 选项值的类型
 */
interface Props {
  /** 当前选中的值 */
  modelValue?: T
  /** 选项列表 */
  options: Option<T>[]
  /** name属性（用于原生表单） */
  name?: string
  /** 标签文本 */
  label?: string
  /** 错误信息 */
  error?: string
  /** 提示信息 */
  hint?: string
  /** 是否必填 */
  required?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 布局方向 */
  direction?: 'horizontal' | 'vertical'
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 变体 */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
  /** 对象选项的值字段名 */
  valueKey?: string
  /** 对象选项的标签字段名 */
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
  'update:modelValue': [value: T]
  change: [value: T]
}>()

function getOptionValue(option: Option<T>): T {
  if (typeof option === 'object' && option !== null) {
    return (option as unknown as Record<string, T>)[props.valueKey] as T
  }
  return option as T
}

function getOptionLabel(option: Option<T>): string {
  if (typeof option === 'object' && option !== null) {
    return String((option as Record<string, unknown>)[props.labelKey])
  }
  return String(option)
}

function isOptionDisabled(option: Option<T>): boolean {
  if (typeof option === 'object' && option !== null && 'disabled' in option) {
    return (option as { disabled?: boolean }).disabled === true
  }
  return false
}

function handleChange(value: T) {
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
