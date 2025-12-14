<template>
  <header class="page-header" :class="headerClass">
    <!-- 返回按钮 + 面包屑区域 -->
    <div class="page-header__nav">
      <!-- 返回按钮 -->
      <button
        v-if="showBack"
        class="page-header__back glass-button"
        :aria-label="$t('common.back')"
        @click="$emit('back')"
      >
        <ArrowLeft :size="20" />
      </button>

      <!-- 面包屑 -->
      <nav v-if="breadcrumbs?.length" class="page-header__breadcrumbs" aria-label="Breadcrumb">
        <ol class="breadcrumb-list">
          <li v-for="(crumb, index) in breadcrumbs" :key="index" class="breadcrumb-item">
            <component
              :is="crumb.to ? 'router-link' : 'span'"
              :to="crumb.to"
              class="breadcrumb-link"
              :class="{ 'breadcrumb-link--current': index === breadcrumbs.length - 1 }"
            >
              <component v-if="crumb.icon" :is="crumb.icon" :size="14" class="breadcrumb-icon" />
              {{ crumb.label }}
            </component>
            <ChevronRight v-if="index < breadcrumbs.length - 1" :size="14" class="breadcrumb-separator" />
          </li>
        </ol>
      </nav>
    </div>

    <!-- 主内容区：标题 + 操作 -->
    <div class="page-header__main">
      <!-- 左侧：前缀插槽 + 标题 -->
      <div class="page-header__left">
        <slot name="prefix" />
        <div v-if="title || subtitle" class="page-header__titles">
          <h1 v-if="title" class="page-header__title">{{ title }}</h1>
          <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
        </div>
      </div>

      <!-- 右侧：操作按钮 -->
      <div v-if="$slots['actions']" class="page-header__actions">
        <slot name="actions" />
      </div>
    </div>

    <!-- 底部插槽：标签页、筛选等 -->
    <div v-if="$slots['suffix']" class="page-header__suffix">
      <slot name="suffix" />
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * PageHeader - 统一页面头部组件
 *
 * 功能：
 * - 返回按钮（可选）
 * - 面包屑导航（可选）
 * - 页面标题和副标题
 * - 操作按钮区域
 * - 底部扩展区（标签页、筛选器等）
 *
 * 设计原则：
 * - 使用 CSS Grid 实现灵活布局
 * - 高性能动画（仅使用 transform/opacity）
 * - 完整的无障碍支持
 * - 响应式设计
 */

import { computed, type Component } from 'vue'
import { ArrowLeft, ChevronRight } from 'lucide-vue-next'

export interface Breadcrumb {
  label: string
  to?: string
  icon?: Component
}

const props = withDefaults(
  defineProps<{
    /** 页面标题 */
    title?: string
    /** 页面副标题 */
    subtitle?: string
    /** 是否显示返回按钮 */
    showBack?: boolean
    /** 面包屑导航 */
    breadcrumbs?: Breadcrumb[]
    /** 是否紧凑模式 */
    compact?: boolean
    /** 是否粘性定位 */
    sticky?: boolean
  }>(),
  {
    showBack: false,
    compact: false,
    sticky: false,
  },
)

defineEmits<{
  back: []
}>()

const headerClass = computed(() => ({
  'page-header--compact': props.compact,
  'page-header--sticky': props.sticky,
  'page-header--with-back': props.showBack,
  'page-header--with-breadcrumbs': props.breadcrumbs?.length,
}))
</script>

<style scoped>
.page-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  padding: var(--spacing-6) 0;
  margin-bottom: var(--spacing-4);
}

/* 粘性定位 */
.page-header--sticky {
  position: sticky;
  top: var(--navbar-height);
  z-index: var(--z-sticky);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  margin: 0 calc(var(--spacing-4) * -1);
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--glass-border);
}

/* 紧凑模式 */
.page-header--compact {
  padding: var(--spacing-4) 0;
  gap: var(--spacing-2);
}

.page-header--compact .page-header__title {
  font-size: var(--text-xl);
}

/* 导航区（返回 + 面包屑） */
.page-header__nav {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  min-height: 32px;
}

/* 返回按钮 */
.page-header__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  transition:
    color var(--duration-fast) var(--ease-standard),
    background-color var(--duration-fast) var(--ease-standard),
    transform var(--duration-fast) var(--ease-standard);
}

.page-header__back:hover {
  color: var(--color-text-primary);
  background: var(--glass-bg-light);
}

.page-header__back:active {
  transform: scale(0.95);
}

/* 面包屑 */
.page-header__breadcrumbs {
  flex: 1;
  min-width: 0;
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-sm);
  overflow: hidden;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  min-width: 0;
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  color: var(--color-text-tertiary);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--duration-fast) var(--ease-standard);
}

.breadcrumb-link:hover:not(.breadcrumb-link--current) {
  color: var(--color-primary);
}

.breadcrumb-link--current {
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}

.breadcrumb-separator {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  opacity: 0.5;
}

.breadcrumb-icon {
  flex-shrink: 0;
}

/* 主内容区 */
.page-header__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-4);
  flex-wrap: wrap;
}

.page-header__left {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex: 1;
  min-width: 0;
}

.page-header__titles {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  min-width: 0;
}

.page-header__title {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
}

.page-header__subtitle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.4;
}

/* 操作区 */
.page-header__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-shrink: 0;
}

/* 底部扩展区 */
.page-header__suffix {
  margin-top: var(--spacing-2);
}

/* 入场动画 */
.page-header {
  animation: pageHeaderEnter var(--duration-base) var(--ease-decelerate);
}

@keyframes pageHeaderEnter {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 性能优化 */
.page-header {
  will-change: opacity, transform;
  transform: translateZ(0);
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    padding: var(--spacing-4) 0;
  }

  .page-header__title {
    font-size: var(--text-xl);
  }

  .page-header__main {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-3);
  }

  .page-header__actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  /* 面包屑在移动端隐藏部分 */
  .breadcrumb-item:not(:last-child):not(:first-child) {
    display: none;
  }
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .page-header {
    animation: none;
  }

  .page-header__back:active {
    transform: none;
  }
}
</style>
