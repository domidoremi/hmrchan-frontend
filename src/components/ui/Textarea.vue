<template>
  <textarea
    ref="textareaRef"
    :class="textareaClass"
    :value="modelValue"
    :disabled="disabled"
    :readonly="readonly"
    :aria-invalid="error || ariaInvalid ? 'true' : undefined"
    v-bind="attrs"
    @input="handleInput"
  />
</template>

<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false, name: 'UiTextarea' })

interface Props {
  modelValue?: string
  size?: 'sm' | 'default' | 'lg'
  disabled?: boolean
  readonly?: boolean
  error?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default',
  disabled: false,
  readonly: false,
  error: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

const attrs = useAttrs()

const ariaInvalid = computed(() => attrs['aria-invalid'] === 'true')

const textareaClass = computed(() => [
  'ui-textarea',
  `ui-textarea--${props.size}`,
  {
    'ui-textarea--error': props.error || ariaInvalid.value,
    'ui-textarea--disabled': props.disabled,
    'ui-textarea--readonly': props.readonly,
  },
])

function handleInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}

defineExpose({ el: textareaRef })
</script>

<style scoped>
.ui-textarea {
  width: 100%;
  border-radius: var(--radius);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg-light);
  color: var(--color-foreground);
  font-size: var(--text-sm);
  line-height: 1.6;
  padding: 0.75rem 1rem;
  min-height: 7.5rem;
  resize: vertical;
  transition-property: border-color, box-shadow, background-color;
  transition-duration: 150ms;
  transition-timing-function: var(--ease-out);
}

.ui-textarea::placeholder {
  color: var(--color-muted-foreground);
}

.ui-textarea:hover:not(:disabled):not(.ui-textarea--readonly) {
  border-color: var(--glass-border-strong);
  background: var(--glass-bg);
}

.ui-textarea:focus {
  outline: none;
  border-color: var(--color-ring);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.12);
  background: var(--glass-bg);
}

.ui-textarea--sm {
  min-height: 5rem;
  padding: 0.5rem 0.75rem;
  font-size: var(--text-xs);
}

.ui-textarea--lg {
  min-height: 10rem;
  padding: 1rem 1.25rem;
  font-size: var(--text-base);
}

.ui-textarea--error,
.ui-textarea[aria-invalid='true'] {
  border-color: var(--color-error);
}

.ui-textarea--error:focus,
.ui-textarea[aria-invalid='true']:focus {
  box-shadow: 0 0 0 3px rgba(var(--color-error-rgb), 0.14);
}

.ui-textarea--disabled,
.ui-textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--glass-bg-subtle);
}

.ui-textarea--readonly {
  opacity: 0.75;
  cursor: default;
  background: var(--glass-bg-subtle);
}

@media (max-width: 768px) {
  .ui-textarea {
    font-size: 1rem;
  }
}
</style>
