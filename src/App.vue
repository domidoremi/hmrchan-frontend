<script setup lang="ts">
/**
 * 应用根组件
 *
 * 功能：
 * - 路由视图和过渡动画
 * - 主题切换
 * - 页面缓存
 * - 全局错误边界
 * - Toast 通知系统
 */

import { ref, onMounted, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore, useThemeStore, useSettingsStore } from '@/stores'
import { storeToRefs } from 'pinia'
import ErrorBoundary from '@/components/ui/error/ErrorBoundary.vue'
import Toast from '@/components/ui/toast/Toast.vue'
import { useKeyboardNavigation } from '@/composables'

// 状态管理
const authStore = useAuthStore()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
const { isDark } = storeToRefs(themeStore)
const { settings } = storeToRefs(settingsStore)

// 路由
const router = useRouter()
const transitionName = ref('fade')

/**
 * 需要缓存的组件列表
 * 缓存常访问的页面，提升切换性能
 */
const cachedComponents = ['HomePage', 'ExplorePage', 'AuthorsPage']

/**
 * 根据路由变化设置过渡动画
 */
watch(
  () => router.currentRoute.value,
  (to) => {
    // 用户关闭动画时，禁用路由过渡
    if (!settings.value.enableAnimations) {
      transitionName.value = ''
      return
    }

    // 根据路由元信息设置动画类型
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
 * 启用键盘导航（无障碍功能）
 */
useKeyboardNavigation()

/**
 * 应用初始化
 */
onMounted(async () => {
  // 初始化主题（立即执行）
  themeStore.initTheme()

  // 初始化本地设置（立即执行）
  settingsStore.initSettings()

  // 恢复认证状态（同步操作）
  authStore.restoreAuth()

  // 已登录用户：并行加载用户数据和设置
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
 * 更新全局动画开关
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
 * 监听登录状态变化
 * 用户登录后从服务器加载设置
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
  <div id="app" :data-theme="isDark ? 'dark' : 'light'">
    <ErrorBoundary>
      <!-- 主内容区域，用于跳过链接 -->
      <main id="main-content" tabindex="-1">
        <RouterView v-slot="{ Component, route }">
          <transition :name="transitionName" mode="out-in">
            <!-- KeepAlive 缓存页面组件，提升性能和用户体验 -->
            <KeepAlive :include="cachedComponents" :max="5">
              <component :is="Component" :key="route.path" />
            </KeepAlive>
          </transition>
        </RouterView>
      </main>
    </ErrorBoundary>

    <!-- Toast 通知系统 -->
    <Toast />
  </div>
</template>

<style>
#app {
  min-height: 100vh;
  transition: background-color var(--transition-base);
}

/* 页面过渡动画 - 使用设计系统变量 */
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
