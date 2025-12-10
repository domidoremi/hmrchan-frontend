<template>
  <component :is="clickable ? 'button' : 'div'" :class="cardClass" @click="handleClick">
    <!-- Header slot -->
    <div v-if="$slots.header" class="card-header">
      <slot name="header" />
    </div>

    <!-- Media slot (for images/videos) -->
    <div v-if="$slots.media" class="card-media">
      <slot name="media" />
    </div>

    <!-- Content -->
    <div class="card-body">
      <slot />
    </div>

    <!-- Footer slot -->
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </component>
</template>

<script setup lang="ts">
/**
 * Card 卡片组件
 *
 * 功能描述：
 * - 提供多种样式变体的卡片容器（elevated/outlined/filled/glass）
 * - 支持可点击卡片和悬停效果
 * - 支持自定义内边距
 * - 提供头部、媒体、内容和页脚插槽
 *
 * Props:
 * - variant: 卡片样式变体
 * - clickable: 是否可点击（渲染为 button 元素）
 * - hover: 是否启用悬停效果
 * - padding: 内边距大小
 *
 * Emits:
 * - click: 卡片点击事件（仅在 clickable 为 true 时触发）
 *
 * Slots:
 * - header: 卡片头部内容
 * - media: 媒体内容（图片或视频）
 * - default: 卡片主体内容
 * - footer: 卡片页脚内容
 *
 * @example
 * <Card variant="glass" hover>
 *   <template #header>标题</template>
 *   <p>卡片内容</p>
 *   <template #footer>操作按钮</template>
 * </Card>
 */

import { computed } from 'vue'

defineOptions({
  name: 'UiCard',
})

interface Props {
  /** 卡片样式变体 */
  variant?: 'elevated' | 'outlined' | 'filled' | 'glass'
  /** 是否可点击（渲染为 button 元素） */
  clickable?: boolean
  /** 是否启用悬停效果 */
  hover?: boolean
  /** 内边距大小 */
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'glass',
  clickable: false,
  hover: true,
  padding: 'md',
})

const emit = defineEmits<{
  /** 卡片点击事件 */
  click: [event: MouseEvent]
}>()

/** 计算卡片的 CSS 类名 */
const cardClass = computed(() => {
  return [
    'card',
    `card-${props.variant}`,
    `card-padding-${props.padding}`,
    {
      'card-clickable': props.clickable,
      'card-hover': props.hover && !props.clickable,
    },
  ]
})

/**
 * 处理卡片点击事件
 * @param event - 鼠标点击事件
 */
const handleClick = (event: MouseEvent) => {
  if (props.clickable) {
    emit('click', event)
  }
}
</script>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-xl);
  transition: all var(--transition-base);
  overflow: hidden;
  width: 100%;
}

/* Variants */
.card-elevated {
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.card-outlined {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
}

.card-filled {
  background: var(--color-surface-variant);
}

.card-glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-top: 1px solid var(--glass-border-top);
  box-shadow: var(--glass-shadow);
}

/* Padding */
.card-padding-none {
  padding: 0;
}

.card-padding-sm .card-body {
  padding: var(--spacing-3);
}

.card-padding-md .card-body {
  padding: var(--spacing-4);
}

.card-padding-lg .card-body {
  padding: var(--spacing-6);
}

/* Header & Footer */
.card-header,
.card-footer {
  padding: var(--spacing-4);
}

.card-header {
  border-bottom: 1px solid var(--glass-border);
}

.card-footer {
  border-top: 1px solid var(--glass-border);
  margin-top: auto;
}

/* Media */
.card-media {
  width: 100%;
  overflow: hidden;
  position: relative;
}

.card-media :deep(img),
.card-media :deep(video) {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
}

/* Hover effect */
.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: var(--glass-shadow), var(--glass-glow);
}

.card-glass.card-hover:hover {
  border-color: rgba(139, 92, 246, 0.4);
  background: rgba(255, 255, 255, 0.75);
}

[data-theme='dark'] .card-glass.card-hover:hover {
  background: rgba(30, 41, 59, 0.85);
}

/* Clickable */
.card-clickable {
  cursor: pointer;
  background: transparent;
  border: none;
  text-align: left;
}

.card-clickable:hover {
  transform: translateY(-4px) scale(1.01);
}

.card-clickable:active {
  transform: translateY(-2px) scale(0.99);
  transition-duration: var(--duration-fast);
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .card-hover:hover,
  .card-clickable:hover {
    transform: none;
  }
}
</style>
