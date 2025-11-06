<template>
  <div :class="stackClass">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({
  name: 'LayoutStack',
})

interface Props {
  /** 方向 */
  direction?: 'vertical' | 'horizontal'
  /** 间距 */
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** 对齐方式 */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** 主轴对齐 */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  /** 是否换行 */
  wrap?: boolean
  /** 响应式方向切换 */
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

const stackClass = computed(() => {
  const classes = ['stack']

  // 方向
  classes.push(`stack-${props.direction}`)

  // 间距
  if (props.spacing !== 'none') {
    classes.push(`stack-spacing-${props.spacing}`)
  }

  // 对齐
  if (props.align !== 'stretch') {
    classes.push(`stack-align-${props.align}`)
  }

  // 主轴对齐
  if (props.justify !== 'start') {
    classes.push(`stack-justify-${props.justify}`)
  }

  // 换行
  if (props.wrap) {
    classes.push('stack-wrap')
  }

  // 响应式
  if (props.responsive) {
    classes.push('stack-responsive')
  }

  return classes
})
</script>

<style scoped>
.stack {
  display: flex;
  width: 100%;
}

/* 方向 */
.stack-vertical {
  flex-direction: column;
}

.stack-horizontal {
  flex-direction: row;
}

/* 间距 */
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

/* 对齐 */
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

/* 主轴对齐 */
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

/* 换行 */
.stack-wrap {
  flex-wrap: wrap;
}

/* 响应式 - 小屏幕变为垂直 */
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
