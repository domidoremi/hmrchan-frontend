<template>
  <div class="ui-tabs">
    <div class="ui-tabs__list" role="tablist">
      <button
        v-for="(tab, index) in tabs"
        :key="tab.value"
        type="button"
        role="tab"
        :aria-selected="modelValue === tab.value"
        :aria-controls="`panel-${tab.value}`"
        :tabindex="modelValue === tab.value ? 0 : -1"
        :class="['ui-tabs__trigger', { 'ui-tabs__trigger--active': modelValue === tab.value }]"
        :disabled="tab.disabled"
        @click="selectTab(tab.value)"
        @keydown="handleKeydown($event, index)"
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

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function selectTab(value: string) {
  emit('update:modelValue', value)
}

function handleKeydown(event: KeyboardEvent, currentIndex: number) {
  const enabledTabs = props.tabs.filter((tab) => !tab.disabled)
  if (enabledTabs.length === 0) return

  const activeEnabledIndex = enabledTabs.findIndex((tab) => tab.value === props.modelValue)
  const currentEnabledIndex = enabledTabs.findIndex(
    (tab) => tab.value === props.tabs[currentIndex]?.value
  )
  const baseIndex = currentEnabledIndex >= 0 ? currentEnabledIndex : Math.max(activeEnabledIndex, 0)

  let nextIndex = -1
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      nextIndex = (baseIndex + 1) % enabledTabs.length
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      nextIndex = (baseIndex - 1 + enabledTabs.length) % enabledTabs.length
      break
    case 'Home':
      nextIndex = 0
      break
    case 'End':
      nextIndex = enabledTabs.length - 1
      break
    default:
      return
  }

  event.preventDefault()
  const target = enabledTabs[nextIndex]
  if (target) {
    selectTab(target.value)
  }
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
  border-radius: var(--ui-radius-tabs, var(--radius-lg));
  border: 1px solid var(--glass-border);
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.ui-tabs__list::-webkit-scrollbar {
  display: none;
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
  border-radius: var(--ui-radius-button, var(--radius));
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

@media (max-width: 768px) {
  .ui-tabs__list {
    display: flex;
    width: 100%;
  }

  .ui-tabs__trigger {
    padding: var(--spacing-2) var(--spacing-3);
    font-size: var(--text-xs);
    gap: var(--spacing-1);
    flex-shrink: 0;
  }
}
</style>
