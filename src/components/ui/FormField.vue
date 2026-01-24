<template>
  <div :class="fieldClass">
    <Label
      v-if="label"
      :for="id"
      :disabled="disabled"
      :error="!!error"
      :required="required"
      class="ui-form-field__label"
    >
      {{ label }}
    </Label>

    <div class="ui-form-field__control">
      <slot />
    </div>

    <p v-if="description && !error" class="ui-form-field__description">
      {{ description }}
    </p>

    <p v-if="error" class="ui-form-field__error">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Label from './Label.vue'

defineOptions({ name: 'UiFormField' })

interface Props {
  id?: string
  label?: string
  description?: string
  error?: string
  required?: boolean
  disabled?: boolean
  orientation?: 'vertical' | 'horizontal'
}

const props = withDefaults(defineProps<Props>(), {
  orientation: 'vertical',
  required: false,
  disabled: false,
})

const fieldClass = computed(() => [
  'ui-form-field',
  `ui-form-field--${props.orientation}`,
  {
    'ui-form-field--error': !!props.error,
    'ui-form-field--disabled': props.disabled,
  },
])
</script>

<style scoped>
.ui-form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.ui-form-field--horizontal {
  flex-direction: row;
  align-items: center;
  gap: var(--spacing-4);
}

.ui-form-field--horizontal .ui-form-field__label {
  min-width: 8rem;
  flex-shrink: 0;
}

.ui-form-field--horizontal .ui-form-field__control {
  flex: 1;
}

.ui-form-field__label {
  display: block;
}

.ui-form-field__control {
  position: relative;
}

.ui-form-field__description {
  font-size: var(--text-xs);
  color: var(--color-muted-foreground);
  margin: 0;
}

.ui-form-field__error {
  font-size: var(--text-xs);
  color: var(--color-destructive);
  margin: 0;
}

.ui-form-field--disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
