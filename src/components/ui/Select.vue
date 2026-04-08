<template>
  <select
    :id="selectId"
    :class="selectClass"
    :value="model"
    :disabled="disabled"
    :aria-invalid="error || ariaInvalid ? 'true' : undefined"
    v-bind="attrs"
    @change="handleChange"
  >
    <slot />
  </select>
</template>

<script setup lang="ts">
import { computed, useAttrs, useId } from 'vue'

defineOptions({ inheritAttrs: false, name: 'UiSelect' })

interface Props {
  size?: 'sm' | 'default' | 'lg'
  disabled?: boolean
  error?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default',
  disabled: false,
  error: false,
})

const model = defineModel<string | number>()
defineSlots<{
  default?: () => unknown
}>()

const attrs = useAttrs()
const generatedId = useId()
const selectId = computed(() => (attrs.id as string | undefined) ?? generatedId)

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
  model.value = (event.target as HTMLSelectElement).value
}
</script>

<style scoped>
.ui-select {
  width: 100%;
  box-sizing: border-box;
  min-block-size: var(--ui-control-height-md);
  border-radius: var(--ui-radius-input, var(--radius));
  border: 1px solid var(--glass-border);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.72)),
    var(--glass-bg-light);
  color: var(--color-foreground);
  font-size: var(--text-sm);
  line-height: var(--appearance-ui-line-height);
  appearance: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
  transition-property: border-color, box-shadow, background-color;
  transition-duration: 150ms;
  transition-timing-function: var(--ease-out);
  background-image:
    linear-gradient(45deg, transparent 50%, var(--color-muted-foreground) 50%),
    linear-gradient(135deg, var(--color-muted-foreground) 50%, transparent 50%);
  background-position:
    calc(100% - 1.125rem) 50%,
    calc(100% - 0.8125rem) 50%;
  background-size: 0.375rem 0.375rem;
  background-repeat: no-repeat;
}

.ui-select option {
  background-color: var(--color-background, #fff);
  color: var(--color-foreground, #000);
  padding: 0.5rem;
}

[data-color-mode='dark'] .ui-select option {
  background-color: var(--color-background, #1a1a2e);
  color: var(--color-foreground, #e0e0e0);
}

.ui-select:focus {
  outline: none;
  border-color: var(--color-ring);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.12);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.78)), var(--glass-bg);
}

.ui-select--sm {
  min-block-size: var(--ui-control-height-sm);
  padding-block: max(0.375rem, calc(var(--ui-control-padding-y-sm) - 0.125rem));
  padding-inline: var(--ui-control-padding-x-sm) calc(var(--ui-control-padding-x-sm) + 1.5rem);
  font-size: var(--text-xs);
}

.ui-select--default {
  min-block-size: var(--ui-control-height-md);
  padding-block: max(0.5rem, calc(var(--ui-control-padding-y-md) - 0.125rem));
  padding-inline: var(--ui-control-padding-x-md) calc(var(--ui-control-padding-x-md) + 1.5rem);
}

.ui-select--lg {
  min-block-size: var(--ui-control-height-lg);
  padding-block: max(0.625rem, calc(var(--ui-control-padding-y-lg) - 0.125rem));
  padding-inline: var(--ui-control-padding-x-lg) calc(var(--ui-control-padding-x-lg) + 1.5rem);
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
    font-size: 1rem;
  }
}

@media (hover: hover) and (pointer: fine) {
  .ui-select:hover:not(:disabled) {
    border-color: var(--glass-border-strong);
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.74)), var(--glass-bg);
  }
}
</style>
