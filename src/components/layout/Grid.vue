<template>
  <div :class="gridClass" :style="gridStyle">
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * 网格布局组件
 *
 * 功能描述：
 * - 提供灵活的 CSS Grid 布局容器
 * - 支持响应式列数配置
 * - 支持自动填充模式
 * - 可配置间距和对齐方式
 *
 * Props:
 * - cols: 列数配置，支持数字或响应式对象
 * - gap: 网格间距大小
 * - autoFit: 是否启用自动填充模式
 * - minColWidth: 自动填充模式下的最小列宽
 * - align: 项目对齐方式
 * - alignContent: 内容对齐方式
 *
 * 使用场景：
 * - 卡片网格展示
 * - 响应式布局
 * - 自适应列数布局
 */

import { computed } from 'vue'

defineOptions({
  name: 'LayoutGrid',
})

interface Props {
  /** 列数配置，支持固定数字或响应式断点对象 */
  cols?: number | { xs?: number; sm?: number; md?: number; lg?: number; xl?: number }
  /** 网格间距大小 */
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  /** 是否启用自动填充模式 */
  autoFit?: boolean
  /** 自动填充模式下的最小列宽 */
  minColWidth?: string
  /** 项目对齐方式 */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** 内容垂直对齐方式 */
  alignContent?: 'start' | 'center' | 'end' | 'stretch' | 'between'
}

const props = withDefaults(defineProps<Props>(), {
  cols: 1,
  gap: 'md',
  autoFit: false,
  minColWidth: '280px',
  align: 'start',
  alignContent: 'start',
})

/**
 * 计算网格容器的 CSS 类名
 * 根据 props 生成对应的样式类
 */
const gridClass = computed(() => {
  const classes = ['grid', `grid-gap-${props.gap}`]

  if (props.align !== 'stretch') {
    classes.push(`grid-align-${props.align}`)
  }

  if (props.alignContent !== 'start') {
    classes.push(`grid-align-content-${props.alignContent}`)
  }

  if (typeof props.cols === 'number') {
    classes.push(`grid-cols-${props.cols}`)
  }

  return classes
})

/**
 * 计算网格容器的内联样式
 * 处理自动填充和响应式列配置
 */
const gridStyle = computed(() => {
  const style: Record<string, string> = {}

  if (props.autoFit) {
    style.gridTemplateColumns = `repeat(auto-fit, minmax(${props.minColWidth}, 1fr))`
  }
  else if (typeof props.cols === 'object') {
    const defaultCols = props.cols.xs || props.cols.sm || 1
    style.gridTemplateColumns = `repeat(${defaultCols}, 1fr)`
  }

  return style
})
</script>

<style scoped>
/* 网格容器基础样式 */
.grid {
  display: grid;
  width: 100%;
  grid-auto-rows: minmax(min-content, max-content);
}

/* 列数配置 */
.grid-cols-1 {
  grid-template-columns: repeat(1, 1fr);
}
.grid-cols-2 {
  grid-template-columns: repeat(2, 1fr);
}
.grid-cols-3 {
  grid-template-columns: repeat(3, 1fr);
}
.grid-cols-4 {
  grid-template-columns: repeat(4, 1fr);
}
.grid-cols-5 {
  grid-template-columns: repeat(5, 1fr);
}
.grid-cols-6 {
  grid-template-columns: repeat(6, 1fr);
}

/* 网格间距配置 */
.grid-gap-sm {
  gap: var(--spacing-2);
}
.grid-gap-md {
  gap: var(--spacing-4);
}
.grid-gap-lg {
  gap: var(--spacing-6);
}
.grid-gap-xl {
  gap: var(--spacing-8);
}

/* 项目对齐方式 */
.grid-align-start {
  align-items: start;
}
.grid-align-center {
  align-items: center;
}
.grid-align-end {
  align-items: end;
}
.grid-align-stretch {
  align-items: stretch;
}

.grid-align-content-start {
  align-content: start;
}
.grid-align-content-center {
  align-content: center;
}
.grid-align-content-end {
  align-content: end;
}
.grid-align-content-stretch {
  align-content: stretch;
}
.grid-align-content-between {
  align-content: space-between;
}

/* 响应式断点 */
@media (min-width: 640px) {
  .grid-sm-1 {
    grid-template-columns: repeat(1, 1fr);
  }
  .grid-sm-2 {
    grid-template-columns: repeat(2, 1fr);
  }
  .grid-sm-3 {
    grid-template-columns: repeat(3, 1fr);
  }
  .grid-sm-4 {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 768px) {
  .grid-md-1 {
    grid-template-columns: repeat(1, 1fr);
  }
  .grid-md-2 {
    grid-template-columns: repeat(2, 1fr);
  }
  .grid-md-3 {
    grid-template-columns: repeat(3, 1fr);
  }
  .grid-md-4 {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid-lg-1 {
    grid-template-columns: repeat(1, 1fr);
  }
  .grid-lg-2 {
    grid-template-columns: repeat(2, 1fr);
  }
  .grid-lg-3 {
    grid-template-columns: repeat(3, 1fr);
  }
  .grid-lg-4 {
    grid-template-columns: repeat(4, 1fr);
  }
  .grid-lg-5 {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (min-width: 1280px) {
  .grid-xl-1 {
    grid-template-columns: repeat(1, 1fr);
  }
  .grid-xl-2 {
    grid-template-columns: repeat(2, 1fr);
  }
  .grid-xl-3 {
    grid-template-columns: repeat(3, 1fr);
  }
  .grid-xl-4 {
    grid-template-columns: repeat(4, 1fr);
  }
  .grid-xl-5 {
    grid-template-columns: repeat(5, 1fr);
  }
  .grid-xl-6 {
    grid-template-columns: repeat(6, 1fr);
  }
}
</style>
