<template>
  <section :class="sectionClass" :style="sectionStyle">
    <div v-if="hasContainer" :class="containerClass">
      <slot />
    </div>
    <slot v-else />
  </section>
</template>

<script setup lang="ts">
/**
 * 区块布局组件
 *
 * 功能描述：
 * - 提供页面区块的容器组件
 * - 支持可配置的内边距和背景样式
 * - 可选择是否包含内容容器
 * - 支持不同的最大宽度配置
 *
 * Props:
 * - container: 是否包含内容容器
 * - maxWidth: 容器最大宽度
 * - spacing: 垂直内边距大小
 * - background: 背景样式类型
 * - fullWidth: 是否全宽显示
 * - className: 自定义类名
 *
 * 使用场景：
 * - 页面区块分隔
 * - 内容分组展示
 * - 不同背景样式的区域
 */

import { computed } from 'vue'

defineOptions({
  name: 'LayoutSection',
})

interface Props {
  /** 是否包含内容容器 */
  container?: boolean
  /** 容器最大宽度 */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** 垂直内边距大小 */
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  /** 背景样式类型 */
  background?: 'transparent' | 'surface' | 'glass' | 'gradient'
  /** 是否全宽显示 */
  fullWidth?: boolean
  /** 自定义类名 */
  className?: string
}

const props = withDefaults(defineProps<Props>(), {
  container: true,
  maxWidth: 'xl',
  spacing: 'lg',
  background: 'transparent',
  fullWidth: false,
})

/** 是否需要容器包装 */
const hasContainer = computed(() => props.container)

/**
 * 计算区块的 CSS 类名
 * 根据 props 生成对应的样式类
 */
const sectionClass = computed(() => {
  const classes = ['section', props.className]

  if (props.spacing !== 'none') {
    classes.push(`section-spacing-${props.spacing}`)
  }

  if (props.background !== 'transparent') {
    classes.push(`section-bg-${props.background}`)
  }

  if (props.fullWidth) {
    classes.push('section-full-width')
  }

  return classes.filter(Boolean)
})

/**
 * 计算容器的 CSS 类名
 */
const containerClass = computed(() => {
  return ['container', `container-${props.maxWidth}`]
})

/**
 * 计算区块的内联样式
 */
const sectionStyle = computed(() => {
  return {}
})
</script>

<style scoped>
/* 区块容器基础样式 */
.section {
  position: relative;
  width: 100%;
}

/* 垂直内边距配置 */
.section-spacing-sm {
  padding: var(--spacing-4) 0;
}

.section-spacing-md {
  padding: var(--spacing-8) 0;
}

.section-spacing-lg {
  padding: var(--spacing-12) 0;
}

.section-spacing-xl {
  padding: var(--spacing-16) 0;
}

/* 背景样式配置 */
.section-bg-surface {
  background: var(--color-surface);
}

.section-bg-glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

.section-bg-gradient {
  background: var(--gradient-mesh);
  position: relative;
}

.section-bg-gradient::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--color-background);
  opacity: 0.9;
  z-index: -1;
}

/* 全宽模式 */
.section-full-width {
  padding-left: 0;
  padding-right: 0;
}

/* 容器最大宽度配置 */
.container-sm {
  max-width: 640px;
}

.container-md {
  max-width: 768px;
}

.container-lg {
  max-width: 1024px;
}

.container-xl {
  max-width: 1280px;
}

.container-full {
  max-width: 100%;
}

/* 移动端响应式调整 */
@media (max-width: 768px) {
  .section-spacing-sm {
    padding: var(--spacing-3) 0;
  }

  .section-spacing-md {
    padding: var(--spacing-6) 0;
  }

  .section-spacing-lg {
    padding: var(--spacing-8) 0;
  }

  .section-spacing-xl {
    padding: var(--spacing-12) 0;
  }
}
</style>
