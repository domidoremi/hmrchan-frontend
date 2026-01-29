<template>
  <div class="ui-tabs">
    <div class="ui-tabs__list" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        role="tab"
        :aria-selected="modelValue === tab.value"
        :aria-controls="`panel-${tab.value}`"
        :class="['ui-tabs__trigger', { 'ui-tabs__trigger--active': modelValue === tab.value }]"
        :disabled="tab.disabled"
        @click="selectTab(tab.value)"
      >
        <AnimatedIcon
          v-if="tab.icon"
          name="explore"
          :fallback-icon="tab.icon"
          size="sm"
          class="ui-tabs__icon"
        />
        {{ tab.label }}
      </button>
    </div>
    <div class="ui-tabs__content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

defineOptions({ name: 'UiTabs' })

interface Tab {
  value: string
  label: string
  icon?: Component
  disabled?: boolean
}

interface Props {
  modelValue: string
  tabs: Tab[]
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function selectTab(value: string) {
  emit('update:modelValue', value)
}
</script>

<style scoped>
.ui-tabs {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.ui-tabs__list {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-1);
  background: var(--glass-bg-light);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
}

.ui-tabs__trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-muted-foreground);
  border-radius: var(--radius);
  cursor: pointer;
  transition-property: color, background-color;
  transition-duration: 150ms;
  transition-timing-function: var(--ease-out);
  white-space: nowrap;
}

.ui-tabs__trigger:hover:not(:disabled):not(.ui-tabs__trigger--active) {
  color: var(--color-foreground);
  background: var(--glass-bg-subtle);
}

.ui-tabs__trigger--active {
  color: var(--color-foreground);
  background: var(--glass-bg-strong);
  box-shadow: var(--shadow-sm);
}

.ui-tabs__trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ui-tabs__trigger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
}

.ui-tabs__icon {
  flex-shrink: 0;
}

.ui-tabs__content {
  position: relative;
}
</style>
