<template>
  <div class="main-layout">
    <!-- 主内容区域 -->
    <div class="main-content" role="main">
      <!-- 离线状态提示横幅 -->
      <div v-if="isOffline" class="network-banner">
        {{ $t('offline.offlineNow') }}
      </div>
      <div v-if="!props.disableContainer" :class="mainContainerClass">
        <slot />
      </div>
      <slot v-else />
    </div>

    <!-- 返回顶部浮动按钮 -->
    <Transition name="fade">
      <BackToTop v-if="props.enableBackToTop && showBackToTop" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
/**
 * 主布局组件
 *
 * 功能描述：
 * - 提供应用的主要布局结构
 * - 包含导航栏、主内容区和页脚
 * - 支持返回顶部功能
 * - 显示离线状态提示
 *
 * Props:
 * - disableContainer: 是否禁用内容容器包装
 * - containerClass: 自定义容器类名
 *
 * 布局结构：
 * - 顶部：AppNavbar（固定定位）
 * - 中间：主内容区（可滚动）
 * - 底部：AppFooter
 * - 浮动：BackToTop 按钮
 *
 * 职责：
 * - 提供统一的页面布局框架
 * - 管理滚动行为
 * - 显示网络状态
 * - 提供无障碍访问支持
 */

import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import BackToTop from '@/components/ui/BackToTop.vue'
import { useNetworkStore } from '@/stores'

const props = withDefaults(
  defineProps<{
    /** 是否禁用内容容器包装 */
    disableContainer?: boolean
    /** 自定义容器类名，支持字符串、数组或对象格式 */
    containerClass?: string | string[] | Record<string, boolean>
    /** 是否启用全局返回顶部按钮 */
    enableBackToTop?: boolean
  }>(),
  {
    disableContainer: false,
    containerClass: '',
    enableBackToTop: true,
  },
)

/**
 * 计算主内容容器的类名
 * 合并基础类名和自定义类名
 */
const mainContainerClass = computed(() => {
  const base: Array<string | Record<string, boolean>> = ['container']
  const extra = props.containerClass

  if (Array.isArray(extra)) {
    base.push(...extra)
  } else if (typeof extra === 'string' && extra.trim()) {
    base.push(extra)
  } else if (extra && typeof extra === 'object') {
    base.push(extra)
  }

  return base
})

/** 是否显示返回顶部按钮 */
const showBackToTop = ref(false)

/**
 * 处理页面滚动事件
 * 当滚动超过 400px 时显示返回顶部按钮
 */
const handleScroll = () => {
  showBackToTop.value = window.scrollY > 400
}

/** 网络状态 Store */
const networkStore = useNetworkStore()

/** 是否离线 */
const isOffline = computed(() => !networkStore.isOnline)

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  networkStore.init()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
/* 主布局容器 */
.main-layout {
  min-height: calc(100vh - var(--navbar-height) - var(--footer-min-height));
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 主内容区域 */
.main-content {
  flex: 1;
  padding-bottom: var(--spacing-12);
}

/* 网络状态横幅 */
.network-banner {
  background: var(--color-warning);
  color: white;
  text-align: center;
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

/* 返回顶部按钮淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-base);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 移动端响应式样式 */
@media (max-width: 768px) {
  .main-content {
    padding-bottom: calc(var(--bottom-nav-height) + var(--spacing-6) + env(safe-area-inset-bottom));
  }
}
</style>
