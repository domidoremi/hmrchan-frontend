<template>
  <MainLayout
    :disable-container="disableContainer"
    :container-class="containerClass ?? ''"
    :enable-back-to-top="enableBackToTop"
  >
    <!-- Page Header -->
    <PageHeader
      v-if="showHeader"
      :title="title"
      :subtitle="subtitle"
      :show-back="showBack"
      :breadcrumbs="breadcrumbs"
      @back="handleBack"
    >
      <template v-if="$slots['headerPrefix']" #prefix>
        <slot name="headerPrefix" />
      </template>
      <template v-if="$slots['actions']" #actions>
        <slot name="actions" />
      </template>
      <template v-if="$slots['headerSuffix']" #suffix>
        <slot name="headerSuffix" />
      </template>
    </PageHeader>

    <!-- Page States -->
    <div class="page-shell" :class="shellClass">
      <!-- Loading State -->
      <Transition name="fade" mode="out-in">
        <div v-if="loading" class="page-state page-loading" role="status" :aria-label="$t('common.loading')">
          <slot name="loading">
            <div class="loading-container">
              <LoadingSpinner :size="loadingSize" />
              <p v-if="loadingText" class="loading-text">{{ loadingText }}</p>
            </div>
          </slot>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="page-state page-error" role="alert">
          <slot name="error" :error="error" :retry="handleRetry">
            <EmptyState
              :icon="AlertCircle"
              :title="errorTitle || $t('error.title')"
              :description="errorDescription || error"
              :action-text="retryable ? $t('common.retry') : undefined"
              @action="handleRetry"
            />
          </slot>
        </div>

        <!-- Empty State -->
        <div v-else-if="empty" class="page-state page-empty">
          <slot name="empty">
            <EmptyState
              :icon="emptyIcon"
              :title="emptyTitle || $t('common.noData')"
              :description="emptyDescription"
              :action-text="emptyActionText"
              @action="$emit('empty-action')"
            />
          </slot>
        </div>

        <!-- Content -->
        <div v-else class="page-content" :class="contentClass">
          <slot />
        </div>
      </Transition>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
/**
 * PageShell - 统一页面骨架组件
 *
 * 提供标准化的页面结构：
 * - 统一的页面头部（标题、返回、面包屑、操作区）
 * - 统一的状态管理（加载、错误、空状态）
 * - 统一的内容容器
 * - 高性能动画过渡
 *
 * @example
 * ```vue
 * <PageShell
 *   title="设置"
 *   :loading="isLoading"
 *   :error="errorMessage"
 *   show-back
 * >
 *   <template #actions>
 *     <Button>保存</Button>
 *   </template>
 *   <!-- 页面内容 -->
 * </PageShell>
 * ```
 */

import { computed, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { AlertCircle, FileQuestion } from 'lucide-vue-next'
import MainLayout from './MainLayout.vue'
import PageHeader from './PageHeader.vue'
import { LoadingSpinner, EmptyState } from '@/components/ui'

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
    /** 是否显示页面头部 */
    showHeader?: boolean
    /** 是否显示返回按钮 */
    showBack?: boolean
    /** 面包屑导航 */
    breadcrumbs?: Breadcrumb[]
    /** 加载状态 */
    loading?: boolean
    /** 加载提示文本 */
    loadingText?: string
    /** 加载动画尺寸 */
    loadingSize?: 'sm' | 'md' | 'lg'
    /** 错误信息 */
    error?: string | null
    /** 错误标题 */
    errorTitle?: string
    /** 错误描述 */
    errorDescription?: string
    /** 是否可重试 */
    retryable?: boolean
    /** 空状态 */
    empty?: boolean
    /** 空状态图标 */
    emptyIcon?: Component
    /** 空状态标题 */
    emptyTitle?: string
    /** 空状态描述 */
    emptyDescription?: string
    /** 空状态操作按钮文本 */
    emptyActionText?: string
    /** 禁用内容容器 */
    disableContainer?: boolean
    /** 容器类名 */
    containerClass?: string | string[] | Record<string, boolean>
    /** 内容区类名 */
    contentClass?: string | string[] | Record<string, boolean>
    /** 是否启用返回顶部 */
    enableBackToTop?: boolean
  }>(),
  {
    showHeader: true,
    showBack: false,
    loading: false,
    loadingSize: 'md',
    retryable: true,
    empty: false,
    emptyIcon: () => FileQuestion,
    disableContainer: false,
    enableBackToTop: true,
  },
)

const emit = defineEmits<{
  back: []
  retry: []
  'empty-action': []
}>()

const router = useRouter()

const shellClass = computed(() => ({
  'page-shell--loading': props.loading,
  'page-shell--error': !!props.error,
  'page-shell--empty': props.empty,
}))

function handleBack() {
  emit('back')
  router.back()
}

function handleRetry() {
  emit('retry')
}
</script>

<style scoped>
.page-shell {
  min-height: 200px;
  position: relative;
}

/* 页面状态容器 */
.page-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: var(--spacing-8);
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
}

.loading-text {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  margin: 0;
}

/* 内容区 */
.page-content {
  animation: pageContentEnter var(--duration-base) var(--ease-decelerate);
}

@keyframes pageContentEnter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity var(--duration-base) var(--ease-standard),
    transform var(--duration-base) var(--ease-standard);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 性能优化 */
.page-state,
.page-content {
  will-change: opacity, transform;
  transform: translateZ(0);
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .page-content {
    animation: none;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.1s;
  }

  .fade-enter-from,
  .fade-leave-to {
    transform: none;
  }
}
</style>
