<template>
  <div
    class="ui-tooltip-trigger"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
    @focus="showTooltip"
    @blur="hideTooltip"
  >
    <slot />
    <Teleport to="body">
      <Transition name="tooltip">
        <div
          v-if="isVisible"
          ref="tooltipRef"
          class="ui-tooltip"
          :class="`ui-tooltip--${side}`"
          :style="tooltipStyle"
          role="tooltip"
        >
          <slot name="content">{{ content }}</slot>
          <span class="ui-tooltip__arrow" />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

defineOptions({ name: 'UiTooltip' })

interface Props {
  content?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  delay?: number
}

const props = withDefaults(defineProps<Props>(), {
  side: 'top',
  delay: 200,
})

const isVisible = ref(false)
const tooltipRef = ref<HTMLElement | null>(null)
const triggerRect = ref<DOMRect | null>(null)
let showTimeout: ReturnType<typeof setTimeout> | null = null

const tooltipStyle = computed(() => {
  if (!triggerRect.value) return {}

  const rect = triggerRect.value
  const offset = 8

  switch (props.side) {
    case 'top':
      return {
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.top - offset}px`,
        transform: 'translateX(-50%) translateY(-100%)',
      }
    case 'bottom':
      return {
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.bottom + offset}px`,
        transform: 'translateX(-50%)',
      }
    case 'left':
      return {
        left: `${rect.left - offset}px`,
        top: `${rect.top + rect.height / 2}px`,
        transform: 'translateX(-100%) translateY(-50%)',
      }
    case 'right':
      return {
        left: `${rect.right + offset}px`,
        top: `${rect.top + rect.height / 2}px`,
        transform: 'translateY(-50%)',
      }
    default:
      return {}
  }
})

function showTooltip(event: Event) {
  const target = event.currentTarget as HTMLElement
  triggerRect.value = target.getBoundingClientRect()

  if (showTimeout) clearTimeout(showTimeout)
  showTimeout = setTimeout(() => {
    isVisible.value = true
  }, props.delay)
}

function hideTooltip() {
  if (showTimeout) {
    clearTimeout(showTimeout)
    showTimeout = null
  }
  isVisible.value = false
}

onUnmounted(() => {
  if (showTimeout) clearTimeout(showTimeout)
})
</script>

<style scoped>
.ui-tooltip-trigger {
  display: inline-flex;
}

.ui-tooltip {
  position: fixed;
  z-index: var(--z-tooltip);
  max-width: 20rem;
  padding: 0.375rem 0.75rem;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-white);
  background: var(--color-gray-900);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  pointer-events: none;
}

[data-theme='dark'] .ui-tooltip {
  background: var(--color-gray-100);
  color: var(--color-gray-900);
}

.ui-tooltip__arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: inherit;
  transform: rotate(45deg);
}

.ui-tooltip--top .ui-tooltip__arrow {
  bottom: -4px;
  left: 50%;
  margin-left: -4px;
}

.ui-tooltip--bottom .ui-tooltip__arrow {
  top: -4px;
  left: 50%;
  margin-left: -4px;
}

.ui-tooltip--left .ui-tooltip__arrow {
  right: -4px;
  top: 50%;
  margin-top: -4px;
}

.ui-tooltip--right .ui-tooltip__arrow {
  left: -4px;
  top: 50%;
  margin-top: -4px;
}

/* Transition */
.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 150ms var(--ease-out), transform 150ms var(--ease-out);
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
}

.ui-tooltip--top.tooltip-enter-from,
.ui-tooltip--top.tooltip-leave-to {
  transform: translateX(-50%) translateY(calc(-100% + 4px));
}

.ui-tooltip--bottom.tooltip-enter-from,
.ui-tooltip--bottom.tooltip-leave-to {
  transform: translateX(-50%) translateY(-4px);
}

.ui-tooltip--left.tooltip-enter-from,
.ui-tooltip--left.tooltip-leave-to {
  transform: translateX(calc(-100% + 4px)) translateY(-50%);
}

.ui-tooltip--right.tooltip-enter-from,
.ui-tooltip--right.tooltip-leave-to {
  transform: translateX(-4px) translateY(-50%);
}
</style>
