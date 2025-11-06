<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import Toast from '@/components/ui/Toast.vue'
// 导入无障碍功能
import { useKeyboardNavigation } from '@/composables/useAccessibility'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
const { isDark } = storeToRefs(themeStore)

const router = useRouter()
const transitionName = ref('fade')

// 需要缓存的组件列表（提升页面切换性能）
const cachedComponents = ['HomePage', 'ExplorePage', 'AuthorsPage']

// 根据路由变化设置过渡动画
watch(
  () => router.currentRoute.value,
  (to) => {
    // 默认使用fade动画
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

// 启用无障碍功能
useKeyboardNavigation()

// 初始化应用
onMounted(async () => {
  // 初始化主题（立即执行，不阻塞）
  themeStore.initTheme()

  // 初始化本地设置（立即执行，不阻塞）
  settingsStore.initSettings()

  // 恢复认证状态（同步操作）
  authStore.restoreAuth()

  // 并行加载用户数据和设置（不阻塞页面渲染）
  if (authStore.isAuthenticated) {
    Promise.all([
      authStore.fetchCurrentUser().catch(() => {
        // 失败时不影响应用启动
        console.warn('Failed to fetch current user, using cached data')
      }),
      settingsStore.loadFromServer().catch(() => {
        // 失败时不影响应用启动
        console.warn('Failed to load server settings, using local settings')
      }),
    ]).catch(() => {
      // 防止未捕获的Promise rejection
    })
  }
})

// 监听登录状态变化
watch(
  () => authStore.isAuthenticated,
  async (isAuthenticated) => {
    if (isAuthenticated) {
      // 用户登录后，从服务器加载设置
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

/* 页面过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
