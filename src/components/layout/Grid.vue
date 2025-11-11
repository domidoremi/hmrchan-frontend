<template>
  <div :class="gridClass" :style="gridStyle">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({
  name: 'LayoutGrid',
})

interface Props {
  /** 列数配置 */
  cols?: number | { xs?: number; sm?: number; md?: number; lg?: number; xl?: number }
  /** 间距 */
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  /** 自动填充 */
  autoFit?: boolean
  /** 最小列宽（用于autoFit） */
  minColWidth?: string
  /** 对齐方式 */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** 垂直对齐 */
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

const gridClass = computed(() => {
  const classes = ['grid', `grid-gap-${props.gap}`]

  if (props.align !== 'stretch') {
    classes.push(`grid-align-${props.align}`)
  }

  if (props.alignContent !== 'start') {
    classes.push(`grid-align-content-${props.alignContent}`)
  }

  // 如果是数字，添加对应的类
  if (typeof props.cols === 'number') {
    classes.push(`grid-cols-${props.cols}`)
  }

  return classes
})

const gridStyle = computed(() => {
  const style: Record<string, string> = {}

  // Auto-fit grid
  if (props.autoFit) {
    style.gridTemplateColumns = `repeat(auto-fit, minmax(${props.minColWidth}, 1fr))`
  }
  // 响应式列配置
  else if (typeof props.cols === 'object') {
    // 默认使用最小值
    const defaultCols = props.cols.xs || props.cols.sm || 1
    style.gridTemplateColumns = `repeat(${defaultCols}, 1fr)`
  }

  return style
})
</script>

<style scoped>
.grid {
  display: grid;
  width: 100%;
  grid-auto-rows: minmax(min-content, max-content);
}

/* 列数 */
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

/* 间距 */
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

/* 对齐 */
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
