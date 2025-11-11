<template>
  <div class="glass-input-wrapper">
    <div v-if="icon" class="input-icon">
      <component :is="icon" :size="20" />
    </div>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="inputClass"
      v-bind="$attrs"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
    />
    <div v-if="$slots.suffix" class="input-suffix">
      <slot name="suffix" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Component } from 'vue'

// 禁用属性继承，手动控制attrs传递给input
defineOptions({
  inheritAttrs: false,
})

interface Props {
  modelValue: string
  type?: 'text' | 'password' | 'email' | 'search'
  placeholder?: string
  disabled?: boolean
  icon?: Component
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: []
  blur: []
}>()

const isFocused = ref(false)

const inputClass = computed(() => {
  return [
    'glass-input',
    {
      'has-icon': props.icon,
      'is-focused': isFocused.value,
      'is-disabled': props.disabled,
    },
  ]
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const handleFocus = () => {
  isFocused.value = true
  emit('focus')
}

const handleBlur = () => {
  isFocused.value = false
  emit('blur')
}
</script>

<style scoped>
.glass-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.input-icon {
  position: absolute;
  left: var(--spacing-md);
  display: flex;
  align-items: center;
  color: var(--color-text-tertiary);
  pointer-events: none;
  z-index: 1;
}

.input-suffix {
  position: absolute;
  right: var(--spacing-md);
  display: flex;
  align-items: center;
  z-index: 1;
}

.glass-input.has-icon {
  padding-left: calc(var(--spacing-md) * 2 + 20px);
}

.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.is-focused {
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}
</style>
