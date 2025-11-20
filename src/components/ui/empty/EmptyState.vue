<template>
  <div :class="emptyStateClass">
    <div v-if="$slots.icon || icon" class="empty-state-icon">
      <slot name="icon">
        <component :is="iconComponent" :size="iconSize" />
      </slot>
    </div>

    <h3 v-if="title" class="empty-state-title">{{ title }}</h3>

    <p v-if="description" class="empty-state-description">{{ description }}</p>

    <div v-if="$slots.action || action" class="empty-state-action">
      <slot name="action">
        <GlassButton v-if="action" @click="handleAction">
          {{ action }}
        </GlassButton>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * EmptyState 空状态组件
 *
 * 功能描述：
 * - 用于显示空数据状态的占位组件
 * - 支持多种预设图标类型（图片、搜索、文件、警告）
 * - 支持自定义图标、标题、描述和操作按钮
 * - 支持多种尺寸
 *
 * Props:
 * - icon: 图标类型
 * - iconSize: 图标大小
 * - title: 标题文本
 * - description: 描述文本
 * - action: 操作按钮文本
 * - size: 组件尺寸
 *
 * Emits:
 * - action: 操作按钮点击事件
 *
 * Slots:
 * - icon: 自定义图标内容
 * - action: 自定义操作按钮
 *
 * @example
 * <EmptyState
 *   icon="search"
 *   title="未找到结果"
 *   description="尝试使用其他关键词搜索"
 *   action="重新搜索"
 *   @action="handleSearch"
 * />
 */

import { computed } from 'vue'
import { ImageIcon, SearchX, FileX, AlertCircle } from 'lucide-vue-next'
import GlassButton from '../button/Button.vue'

defineOptions({
  name: 'UiEmptyState',
})

interface Props {
  /** 图标类型（预设图标） */
  icon?: 'image' | 'search' | 'file' | 'alert' | 'custom'
  /** 图标大小（像素） */
  iconSize?: number
  /** 标题文本 */
  title?: string
  /** 描述文本 */
  description?: string
  /** 操作按钮文本 */
  action?: string
  /** 组件尺寸 */
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'image',
  iconSize: 64,
  size: 'md',
})

const emit = defineEmits<{
  /** 操作按钮点击事件 */
  action: []
}>()

/** 计算空状态组件的 CSS 类名 */
const emptyStateClass = computed(() => {
  return ['empty-state', `empty-state-${props.size}`]
})

/** 根据图标类型返回对应的图标组件 */
const iconComponent = computed(() => {
  const iconMap = {
    image: ImageIcon,
    search: SearchX,
    file: FileX,
    alert: AlertCircle,
  }
  return iconMap[props.icon as keyof typeof iconMap] || ImageIcon
})

/**
 * 处理操作按钮点击事件
 */
const handleAction = () => {
  emit('action')
}
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-8);
}

/* Sizes */
.empty-state-sm {
  padding: var(--spacing-4);
}

.empty-state-md {
  padding: var(--spacing-8);
}

.empty-state-lg {
  padding: var(--spacing-16);
}

/* Icon */
.empty-state-icon {
  margin-bottom: var(--spacing-4);
  color: var(--color-text-tertiary);
  opacity: 0.5;
}

/* Title */
.empty-state-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-2) 0;
}

/* Description */
.empty-state-description {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  max-width: 400px;
  margin: 0 0 var(--spacing-6) 0;
  line-height: var(--line-relaxed);
}

/* Action */
.empty-state-action {
  margin-top: var(--spacing-4);
}

/* Responsive */
@media (max-width: 768px) {
  .empty-state {
    padding: var(--spacing-6);
  }

  .empty-state-title {
    font-size: var(--text-lg);
  }

  .empty-state-description {
    font-size: var(--text-sm);
  }
}
</style>
