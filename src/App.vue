<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import CookieBanner from '@/components/CookieBanner.vue'

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

// 初始化应用
onMounted(async () => {
  // 初始化主题
  themeStore.initTheme()

  // 初始化本地设置
  settingsStore.initSettings()

  // 恢复认证状态
  authStore.restoreAuth()
  if (authStore.isAuthenticated) {
    await authStore.fetchCurrentUser()
    // 登录后从服务器加载设置
    await settingsStore.loadFromServer()
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
      <RouterView v-slot="{ Component, route }">
        <transition :name="transitionName" mode="out-in">
          <!-- KeepAlive 缓存页面组件，提升性能和用户体验 -->
          <KeepAlive :include="cachedComponents" :max="5">
            <component :is="Component" :key="route.path" />
          </KeepAlive>
        </transition>
      </RouterView>
    </ErrorBoundary>

    <!-- Cookie 同意横幅 -->
    <CookieBanner />
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
