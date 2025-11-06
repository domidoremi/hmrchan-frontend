<template>
  <section :class="sectionClass" :style="sectionStyle">
    <div v-if="hasContainer" :class="containerClass">
      <slot />
    </div>
    <slot v-else />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({
  name: 'LayoutSection',
})

interface Props {
  /** 是否包含容器 */
  container?: boolean
  /** 容器最大宽度 */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** 垂直内边距 */
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  /** 背景样式 */
  background?: 'transparent' | 'surface' | 'glass' | 'gradient'
  /** 是否全宽 */
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

const hasContainer = computed(() => props.container)

const sectionClass = computed(() => {
  const classes = ['section', props.className]

  // 间距
  if (props.spacing !== 'none') {
    classes.push(`section-spacing-${props.spacing}`)
  }

  // 背景
  if (props.background !== 'transparent') {
    classes.push(`section-bg-${props.background}`)
  }

  // 全宽
  if (props.fullWidth) {
    classes.push('section-full-width')
  }

  return classes.filter(Boolean)
})

const containerClass = computed(() => {
  return ['container', `container-${props.maxWidth}`]
})

const sectionStyle = computed(() => {
  return {}
})
</script>

<style scoped>
.section {
  position: relative;
  width: 100%;
}

/* 间距 */
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

/* 背景 */
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

/* 全宽 */
.section-full-width {
  padding-left: 0;
  padding-right: 0;
}

/* 容器尺寸 */
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

/* 响应式调整 */
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
