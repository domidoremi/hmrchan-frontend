<template>
  <div :class="dividerClass" role="separator">
    <span v-if="$slots.default" class="divider-content">
      <slot />
    </span>
  </div>
</template>

<script setup lang="ts">
/**
 * Divider 分割线组件
 *
 * 功能描述：
 * - 提供水平和垂直分割线
 * - 支持多种样式变体（实线、虚线、点线、渐变）
 * - 支持带文字的分割线
 * - 支持自定义对齐方式和间距
 *
 * Props:
 * - orientation: 分割线方向（水平或垂直）
 * - align: 文字对齐方式（左、中、右）
 * - spacing: 分割线间距
 * - variant: 分割线样式变体
 *
 * Slots:
 * - default: 分割线中间的文字内容
 *
 * @example
 * <Divider />
 * <Divider orientation="vertical" />
 * <Divider variant="dashed">或</Divider>
 * <Divider align="left">章节标题</Divider>
 */

import { computed } from 'vue'

defineOptions({
  name: 'UiDivider',
})

interface Props {
  /** 分割线方向 */
  orientation?: 'horizontal' | 'vertical'
  /** 文字对齐方式（当有内容时生效） */
  align?: 'left' | 'center' | 'right'
  /** 分割线间距 */
  spacing?: 'sm' | 'md' | 'lg'
  /** 分割线样式变体 */
  variant?: 'solid' | 'dashed' | 'dotted' | 'gradient'
}

const props = withDefaults(defineProps<Props>(), {
  orientation: 'horizontal',
  align: 'center',
  spacing: 'md',
  variant: 'solid',
})

/** 计算分割线的 CSS 类名 */
const dividerClass = computed(() => {
  return [
    'divider',
    `divider-${props.orientation}`,
    `divider-align-${props.align}`,
    `divider-spacing-${props.spacing}`,
    `divider-${props.variant}`,
  ]
})
</script>

<style scoped>
.divider {
  display: flex;
  align-items: center;
  width: 100%;
  border: 0;
}

/* Orientation */
.divider-horizontal {
  flex-direction: row;
  min-height: 1px;
}

.divider-vertical {
  flex-direction: column;
  min-width: 1px;
  height: auto;
  align-self: stretch;
}

/* Spacing */
.divider-horizontal.divider-spacing-sm {
  margin: var(--spacing-2) 0;
}

.divider-horizontal.divider-spacing-md {
  margin: var(--spacing-4) 0;
}

.divider-horizontal.divider-spacing-lg {
  margin: var(--spacing-6) 0;
}

.divider-vertical.divider-spacing-sm {
  margin: 0 var(--spacing-2);
}

.divider-vertical.divider-spacing-md {
  margin: 0 var(--spacing-4);
}

.divider-vertical.divider-spacing-lg {
  margin: 0 var(--spacing-6);
}

/* Lines */
.divider-horizontal::before,
.divider-horizontal::after {
  content: '';
  flex: 1;
  height: 1px;
}

.divider-vertical::before,
.divider-vertical::after {
  content: '';
  flex: 1;
  width: 1px;
}

/* Variants */
.divider-solid::before,
.divider-solid::after {
  background: var(--color-border);
}

.divider-dashed::before,
.divider-dashed::after {
  background: repeating-linear-gradient(
    90deg,
    var(--color-border),
    var(--color-border) 4px,
    transparent 4px,
    transparent 8px
  );
}

.divider-dotted::before,
.divider-dotted::after {
  background: repeating-linear-gradient(
    90deg,
    var(--color-border),
    var(--color-border) 2px,
    transparent 2px,
    transparent 6px
  );
}

.divider-gradient::before,
.divider-gradient::after {
  background: linear-gradient(90deg, transparent, var(--color-border) 50%, transparent);
}

/* Content */
.divider-content {
  padding: 0 var(--spacing-3);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  white-space: nowrap;
  font-weight: var(--font-medium);
}

/* Alignment */
.divider-align-left::before {
  flex: 0 0 5%;
}

.divider-align-right::after {
  flex: 0 0 5%;
}

.divider-align-center::before,
.divider-align-center::after {
  flex: 1;
}
</style>
