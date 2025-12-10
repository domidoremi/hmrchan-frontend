<template>
  <div class="view-mode-toggle" role="radiogroup" :aria-label="$t('common.viewMode', 'View mode')">
    <button
      v-for="mode in modes"
      :key="mode.value"
      type="button"
      class="toggle-button"
      :class="{ active: modelValue === mode.value }"
      role="radio"
      :aria-checked="modelValue === mode.value"
      :aria-label="mode.label"
      :title="mode.label"
      @click="handleSelect(mode.value)"
    >
      <component :is="mode.icon" :size="18" />
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * ViewModeToggle - 视图模式切换组件
 *
 * 功能特点：
 * - 网格/紧凑视图切换
 * - 本地存储偏好设置
 * - 键盘导航支持
 * - 动画过渡效果
 */

import { computed, onMounted, type Component } from 'vue'
import { LayoutGrid, List, Columns } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

export type ViewMode = 'grid' | 'compact' | 'masonry'

interface Props {
  /** 当前模式 (v-model) */
  modelValue: ViewMode
  /** 可用模式 */
  availableModes?: ViewMode[]
  /** 存储键名 */
  storageKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  availableModes: () => ['grid', 'compact'],
  storageKey: 'hmrchan:view-mode',
})

const emit = defineEmits<{
  'update:modelValue': [value: ViewMode]
}>()

const { t } = useI18n()

// 模式配置
interface ModeConfig {
  value: ViewMode
  icon: Component
  label: string
}

const allModes: ModeConfig[] = [
  { value: 'grid', icon: LayoutGrid, label: t('viewMode.grid', '网格视图') },
  { value: 'compact', icon: List, label: t('viewMode.compact', '紧凑视图') },
  { value: 'masonry', icon: Columns, label: t('viewMode.masonry', '瀑布流视图') },
]

const modes = computed(() => allModes.filter((mode) => props.availableModes.includes(mode.value)))

const handleSelect = (mode: ViewMode) => {
  emit('update:modelValue', mode)
  // 持久化存储
  try {
    localStorage.setItem(props.storageKey, mode)
  } catch {
    // 忽略存储错误
  }
}

// 从本地存储恢复
onMounted(() => {
  try {
    const stored = localStorage.getItem(props.storageKey) as ViewMode | null
    if (stored && props.availableModes.includes(stored)) {
      emit('update:modelValue', stored)
    }
  } catch {
    // 忽略存储错误
  }
})
</script>

<style scoped>
.view-mode-toggle {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
}

.toggle-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-button:hover:not(.active) {
  color: var(--color-text-secondary);
  background: var(--glass-bg);
}

.toggle-button.active {
  color: white;
  background: var(--color-primary);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

.toggle-button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* 响应式 */
@media (max-width: 480px) {
  .toggle-button {
    width: 32px;
    height: 32px;
  }

  .toggle-button svg {
    width: 16px;
    height: 16px;
  }
}
</style>
