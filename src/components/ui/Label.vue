<template>
  <label :class="labelClass" v-bind="attrs">
    <slot />
  </label>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false, name: 'UiLabel' })

interface Props {
  disabled?: boolean
  error?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  error: false,
  required: false,
})
defineSlots<{
  default?: () => unknown
}>()

const attrs = useAttrs()

const labelClass = computed(() => [
  'ui-label',
  {
    'ui-label--disabled': props.disabled,
    'ui-label--error': props.error,
    'ui-label--required': props.required,
  },
])
</script>

<style scoped>
.ui-label {
  display: inline-block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-foreground);
  line-height: var(--leading-none);
  cursor: default;
  user-select: none;
}

.ui-label--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ui-label--error {
  color: var(--color-destructive);
}

.ui-label--required::after {
  content: ' *';
  color: var(--color-destructive);
}
</style>
