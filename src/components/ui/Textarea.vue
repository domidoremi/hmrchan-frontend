<template>
  <textarea
    ref="textareaRef"
    :id="textareaId"
    :class="textareaClass"
    :value="model"
    :disabled="disabled"
    :readonly="readonly"
    :aria-invalid="error || ariaInvalid ? 'true' : undefined"
    v-bind="attrs"
    @input="handleInput"
  />
</template>

<script setup lang="ts">
import { computed, useAttrs, useId, useTemplateRef } from 'vue'

defineOptions({ inheritAttrs: false, name: 'UiTextarea' })

interface Props {
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

const model = defineModel<string>()

const textareaRef = useTemplateRef<HTMLTextAreaElement>('textareaRef')

const attrs = useAttrs()
const generatedId = useId()
const textareaId = computed(() => (attrs.id as string | undefined) ?? generatedId)

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
  model.value = (event.target as HTMLTextAreaElement).value
}

defineExpose({ el: textareaRef })
</script>

<style scoped>
.ui-textarea {
  width: 100%;
  border-radius: var(--ui-radius-input, var(--radius));
  border: 1px solid var(--glass-border);
  background: var(--glass-bg-light);
  color: var(--color-foreground);
  font-size: var(--text-sm);
  line-height: 1.6;
  padding: 0.75rem var(--ui-control-padding-x-md);
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
  padding: 0.5rem var(--ui-control-padding-x-sm);
  font-size: var(--text-xs);
}

.ui-textarea--lg {
  min-height: 10rem;
  padding: 1rem var(--ui-control-padding-x-lg);
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
