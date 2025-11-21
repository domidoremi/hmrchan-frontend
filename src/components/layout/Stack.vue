<template>
  <div :class="stackClass">
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * 堆叠布局组件
 *
 * 功能描述：
 * - 提供 Flexbox 堆叠布局容器
 * - 支持垂直和水平方向
 * - 可配置间距和对齐方式
 * - 支持响应式方向切换
 *
 * Props:
 * - direction: 堆叠方向（垂直/水平）
 * - spacing: 子元素间距
 * - align: 交叉轴对齐方式
 * - justify: 主轴对齐方式
 * - wrap: 是否允许换行
 * - responsive: 是否启用响应式（小屏幕自动切换为垂直）
 *
 * 使用场景：
 * - 表单字段垂直排列
 * - 按钮组水平排列
 * - 卡片列表展示
 */

import { computed } from 'vue'

defineOptions({
  name: 'LayoutStack',
})

interface Props {
  /** 堆叠方向 */
  direction?: 'vertical' | 'horizontal'
  /** 子元素间距大小 */
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** 交叉轴对齐方式 */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** 主轴对齐方式 */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  /** 是否允许换行 */
  wrap?: boolean
  /** 是否启用响应式方向切换 */
  responsive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  direction: 'vertical',
  spacing: 'md',
  align: 'stretch',
  justify: 'start',
  wrap: false,
  responsive: false,
})

/**
 * 计算堆叠容器的 CSS 类名
 * 根据 props 生成对应的样式类
 */
const stackClass = computed(() => {
  const classes = ['stack']

  classes.push(`stack-${props.direction}`)

  if (props.spacing !== 'none') {
    classes.push(`stack-spacing-${props.spacing}`)
  }

  if (props.align !== 'stretch') {
    classes.push(`stack-align-${props.align}`)
  }

  if (props.justify !== 'start') {
    classes.push(`stack-justify-${props.justify}`)
  }

  if (props.wrap) {
    classes.push('stack-wrap')
  }

  if (props.responsive) {
    classes.push('stack-responsive')
  }

  return classes
})
</script>

<style scoped>
/* 堆叠容器基础样式 */
.stack {
  display: flex;
  width: 100%;
}

/* 堆叠方向配置 */
.stack-vertical {
  flex-direction: column;
}

.stack-horizontal {
  flex-direction: row;
}

/* 垂直方向间距配置 */
.stack-vertical.stack-spacing-xs > * + * {
  margin-top: var(--spacing-1);
}

.stack-vertical.stack-spacing-sm > * + * {
  margin-top: var(--spacing-2);
}

.stack-vertical.stack-spacing-md > * + * {
  margin-top: var(--spacing-4);
}

.stack-vertical.stack-spacing-lg > * + * {
  margin-top: var(--spacing-6);
}

.stack-vertical.stack-spacing-xl > * + * {
  margin-top: var(--spacing-8);
}

/* 水平方向间距配置 */
.stack-horizontal.stack-spacing-xs > * + * {
  margin-left: var(--spacing-1);
}

.stack-horizontal.stack-spacing-sm > * + * {
  margin-left: var(--spacing-2);
}

.stack-horizontal.stack-spacing-md > * + * {
  margin-left: var(--spacing-4);
}

.stack-horizontal.stack-spacing-lg > * + * {
  margin-left: var(--spacing-6);
}

.stack-horizontal.stack-spacing-xl > * + * {
  margin-left: var(--spacing-8);
}

/* 交叉轴对齐方式 */
.stack-align-start {
  align-items: flex-start;
}

.stack-align-center {
  align-items: center;
}

.stack-align-end {
  align-items: flex-end;
}

.stack-align-stretch {
  align-items: stretch;
}

/* 主轴对齐方式 */
.stack-justify-start {
  justify-content: flex-start;
}

.stack-justify-center {
  justify-content: center;
}

.stack-justify-end {
  justify-content: flex-end;
}

.stack-justify-between {
  justify-content: space-between;
}

.stack-justify-around {
  justify-content: space-around;
}

.stack-justify-evenly {
  justify-content: space-evenly;
}

/* 允许换行 */
.stack-wrap {
  flex-wrap: wrap;
}

/* 响应式方向切换 - 小屏幕自动变为垂直堆叠 */
@media (max-width: 768px) {
  .stack-responsive.stack-horizontal {
    flex-direction: column;
  }

  .stack-responsive.stack-horizontal.stack-spacing-xs > * + * {
    margin-left: 0;
    margin-top: var(--spacing-1);
  }

  .stack-responsive.stack-horizontal.stack-spacing-sm > * + * {
    margin-left: 0;
    margin-top: var(--spacing-2);
  }

  .stack-responsive.stack-horizontal.stack-spacing-md > * + * {
    margin-left: 0;
    margin-top: var(--spacing-4);
  }

  .stack-responsive.stack-horizontal.stack-spacing-lg > * + * {
    margin-left: 0;
    margin-top: var(--spacing-6);
  }

  .stack-responsive.stack-horizontal.stack-spacing-xl > * + * {
    margin-left: 0;
    margin-top: var(--spacing-8);
  }
}
</style>
