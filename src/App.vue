<script setup lang="ts">
/**
 * 应用根组件
 *
 * 功能描述：
 * 作为整个应用的根组件，负责管理全局状态、路由视图、主题切换和页面过渡动画。
 * 提供错误边界保护和全局通知系统，确保应用的稳定性和用户体验。
 *
 * 主要功能：
 * - 路由视图渲染和页面过渡动画
 * - 主题模式切换（亮色/暗色）
 * - 页面组件缓存优化
 * - 全局错误边界处理
 * - Toast 通知系统
 * - 键盘导航支持（无障碍功能）
 * - 用户认证状态管理
 * - 应用设置初始化和同步
 */

import { ref, onMounted, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore, useThemeStore, useSettingsStore } from '@/stores'
import { storeToRefs } from 'pinia'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import Toast from '@/components/ui/Toast.vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { useKeyboardNavigation, initAppState } from '@/composables'

/** 认证状态管理 Store */
const authStore = useAuthStore()

/** 主题管理 Store */
const themeStore = useThemeStore()

/** 设置管理 Store */
const settingsStore = useSettingsStore()

/** 当前主题是否为暗色模式 */
const { isDark } = storeToRefs(themeStore)

/** 应用设置对象 */
const { settings } = storeToRefs(settingsStore)

/** Vue Router 实例 */
const router = useRouter()

/** 当前页面过渡动画名称 */
const transitionName = ref('fade')

/**
 * 需要缓存的页面组件列表
 * 通过 KeepAlive 缓存这些常访问的页面，避免重复渲染，提升切换性能和用户体验
 */
const cachedComponents = ['HomePage', 'ExplorePage', 'PostsView', 'AuthorsPage']

/**
 * 监听路由变化，动态设置页面过渡动画
 *
 * 根据用户设置和路由元信息，选择合适的过渡动画效果：
 * - 用户禁用动画时，不使用任何过渡效果
 * - 根据路由 meta.transition 字段设置动画类型（slide-left、slide-right、fade）
 */
watch(
  () => router.currentRoute.value,
  (to) => {
    if (!settings.value.enableAnimations) {
      transitionName.value = ''
      return
    }

    const transition = to?.meta?.transition
    if (transition === 'slide-left') {
      transitionName.value = 'slide-left'
    } else if (transition === 'slide-right') {
      transitionName.value = 'slide-right'
    } else {
      transitionName.value = 'fade'
    }
  },
  { immediate: false },
)

/**
 * 启用键盘导航功能
 * 提供无障碍访问支持，允许用户通过键盘快捷键导航应用
 */
useKeyboardNavigation()

/**
 * 组件挂载时的初始化逻辑
 *
 * 执行顺序：
 * 1. 通过 initAppState 立即初始化主题和本地设置（同步操作）
 * 2. 恢复用户认证状态（从本地存储）
 * 3. 如果用户已登录，并行加载用户信息和服务器设置（异步操作）
 *
 * 错误处理：
 * - 网络请求失败时使用本地缓存数据
 * - 不阻塞应用启动流程
 */
onMounted(async () => {
  initAppState(themeStore, settingsStore)
  authStore.restoreAuth()

  if (authStore.isAuthenticated) {
    Promise.all([
      authStore.fetchCurrentUser().catch(() => {
        console.warn('获取用户信息失败，使用缓存数据')
      }),
      settingsStore.loadFromServer().catch(() => {
        console.warn('加载服务器设置失败，使用本地设置')
      }),
    ]).catch(() => {
      // 防止未捕获的 Promise rejection
    })
  }
})

/**
 * 监听动画设置变化
 *
 * 当用户切换动画开关时，更新 HTML 根元素的 data-animations 属性，
 * 允许 CSS 根据该属性全局控制动画效果
 */
watch(
  () => settings.value.enableAnimations,
  (enabled) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-animations', enabled ? 'on' : 'off')
    }
  },
  { immediate: true },
)

/**
 * 监听用户登录状态变化
 *
 * 当用户登录成功后，自动从服务器加载用户的个性化设置，
 * 实现跨设备的设置同步
 */
watch(
  () => authStore.isAuthenticated,
  async (isAuthenticated) => {
    if (isAuthenticated) {
      await settingsStore.loadFromServer()
    }
  },
)
</script>

<template>
  <!-- 应用根容器，根据主题模式动态设置 data-theme 属性 -->
  <div id="app" :data-theme="isDark ? 'dark' : 'light'">
    <!-- 无障碍：跳转到主内容链接 -->
    <a href="#main-content" class="skip-to-main">
      {{ $t('aria.skipToMain', 'Skip to main content') }}
    </a>

    <!-- 全局错误边界，捕获并处理组件渲染错误 -->
    <ErrorBoundary>
      <!-- 顶部导航栏 - 固定在过渡动画外层，避免闪烁 -->
      <AppNavbar />

      <!-- 主内容区域，支持无障碍访问的跳过链接功能 -->
      <main id="main-content" class="app-main" tabindex="-1">
        <!-- 路由视图插槽，渲染当前路由对应的页面组件 -->
        <RouterView v-slot="{ Component, route }">
          <Suspense>
            <template #default>
              <!-- 页面过渡动画容器，mode="out-in" 确保旧页面完全离开后再进入新页面 -->
              <transition :name="transitionName" mode="out-in">
                <!--
                  KeepAlive 组件缓存
                  - include: 指定需要缓存的组件名称列表
                  - max: 最多缓存 5 个组件实例，超出后移除最久未使用的
                  - key: 使用路由路径作为 key，确保相同路由的不同参数也能正确缓存
                -->
                <KeepAlive :include="cachedComponents" :max="5">
                  <component :is="Component" :key="route.path" />
                </KeepAlive>
              </transition>
            </template>
            <template #fallback>
              <div class="route-loading">
                <div class="route-loading-spinner spinner"></div>
              </div>
            </template>
          </Suspense>
        </RouterView>
      </main>

      <!-- 页脚 - 固定在过渡动画外层 -->
      <AppFooter />
    </ErrorBoundary>

    <!-- 全局 Toast 通知组件，显示操作反馈和系统消息 -->
    <Toast />
  </div>
</template>

<style>
/* ==================== 应用根容器样式 ==================== */
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 主内容区域 */
.app-main {
  flex: 1;
  padding-top: calc(var(--navbar-height) + var(--spacing-4));
  scroll-margin-top: var(--navbar-height);
}

@media (max-width: 768px) {
  .app-main {
    padding-top: calc(var(--navbar-height-mobile) + var(--spacing-3));
    scroll-margin-top: var(--navbar-height-mobile);
  }
}

/* 无障碍：跳转到主内容链接 */
.skip-to-main {
  position: fixed;
  left: 50%;
  top: -100px;
  transform: translateX(-50%);
  z-index: 10000;
  padding: var(--spacing-3) var(--spacing-6);
  background: var(--color-primary);
  color: white;
  text-decoration: none;
  border-radius: var(--radius-lg);
  font-weight: var(--font-semibold);
  font-size: var(--text-base);
  box-shadow:
    0 8px 24px rgba(139, 92, 246, 0.4),
    0 4px 12px rgba(0, 0, 0, 0.2);
  transition: top var(--transition-bounce);
  white-space: nowrap;
}

.skip-to-main:focus {
  top: var(--spacing-4);
  outline: 3px solid white;
  outline-offset: 3px;
}

/* 全局路由 Suspense 加载状态 */
.route-loading {
  min-height: 50vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ==================== 页面过渡动画 ==================== */

/* 淡入淡出动画 - 默认过渡效果 */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity var(--duration-base) var(--ease-standard),
    transform var(--duration-base) var(--ease-decelerate);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 向左滑动动画 - 用于前进导航 */
.slide-left-enter-active,
.slide-left-leave-active {
  transition:
    opacity var(--duration-base) var(--ease-standard),
    transform var(--duration-base) var(--ease-decelerate);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 向右滑动动画 - 用于后退导航 */
.slide-right-enter-active,
.slide-right-leave-active {
  transition:
    opacity var(--duration-base) var(--ease-standard),
    transform var(--duration-base) var(--ease-decelerate);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
