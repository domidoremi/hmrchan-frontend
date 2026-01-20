<template>
  <div id="app" :data-theme="resolvedTheme" :data-animation-intensity="animationIntensity">
    <!-- Contextual 3D Background -->
    <ContextualBackground />
    <BackgroundTransition />

    <!-- Skip to main content -->
    <a href="#main-content" class="skip-link">
      {{ $t('common.skipToContent') }}
    </a>

    <!-- Navbar -->
    <AppNavbar />

    <!-- Main Content with Error Boundary -->
    <main id="main-content">
      <div class="route-view">
        <ErrorBoundary @retry="handleRetry">
          <RouterView v-slot="{ Component, route }">
            <Transition :name="transitionName" mode="out-in">
              <Suspense>
                <template #default>
                  <KeepAlive :include="cachedPages" :max="10">
                    <component :is="Component" :key="route.name ?? route.path" />
                  </KeepAlive>
                </template>
                <template #fallback>
                  <PageLoading />
                </template>
              </Suspense>
            </Transition>
          </RouterView>
        </ErrorBoundary>
      </div>
    </main>

    <!-- Footer - 在特定页面隐藏 -->
    <AppFooter v-if="!hideFooter" />

    <!-- Toast Container -->
    <Teleport to="body">
      <ToastContainer />
    </Teleport>

    <!-- Back to Top Button -->
    <BackToTop :show-progress="true" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useThemeStore, useSettingsStore } from '@/stores'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import PageLoading from '@/components/ui/PageLoading.vue'
import BackToTop from '@/components/ui/BackToTop.vue'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'

// Lazy-load non-critical components
const ContextualBackground = defineAsyncComponent(
  () => import('@/components/layout/ContextualBackground.vue')
)
const ToastContainer = defineAsyncComponent(() => import('@/components/ui/ToastContainer.vue'))

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()

const { resolvedTheme } = storeToRefs(themeStore)
const { settings } = storeToRefs(settingsStore)

// 动效强度
const animationIntensity = computed(() => settings.value.animationIntensity)

const cachedPages = ['HomePage', 'ExplorePage', 'AuthorsPage', 'CommunityPage', 'FavoritesPage']

// 隐藏 Footer 的页面
const hideFooterPages = ['HomePage', 'LoginPage', 'RegisterPage', 'ExplorePage']
const hideFooter = computed(() => {
  const routeName = route.name as string | undefined
  return routeName ? hideFooterPages.includes(routeName) : false
})

// Page transition name
const transitionName = ref('page-fade')

// Update transition based on route depth and navigation type
const routeDepth = (path: string) => path.split('/').filter(Boolean).length

watch(
  () => route.path,
  (to, from) => {
    if (!settings.value.enableAnimations) {
      transitionName.value = ''
      return
    }

    const toDepth = routeDepth(to)
    const fromDepth = routeDepth(from || '/')

    // 根据导航深度选择不同的过渡效果
    if (toDepth > fromDepth) {
      // 进入更深层级 - 向上滑入 + 缩放
      transitionName.value = 'page-slide-up'
    } else if (toDepth < fromDepth) {
      // 返回上层 - 向下滑出 + 缩放
      transitionName.value = 'page-slide-down'
    } else {
      // 同级切换 - 淡入淡出 + 轻微缩放
      transitionName.value = 'page-fade'
    }
  }
)

// Error Boundary retry handler
function handleRetry() {
  router.go(0)
}
</script>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
  padding-top: var(--navbar-height);
}

.route-view {
  position: relative;
  min-height: calc(100vh - var(--navbar-height));
  overflow: hidden;
}

/* 动效强度控制 */
#app[data-animation-intensity='none'] {
  --duration-instant: 0ms;
  --duration-fast: 0ms;
  --duration-normal: 0ms;
  --duration-slow: 0ms;
  --duration-slower: 0ms;
}

#app[data-animation-intensity='reduced'] {
  --duration-instant: 40ms;
  --duration-fast: 100ms;
  --duration-normal: 175ms;
  --duration-slow: 250ms;
  --duration-slower: 350ms;
}

#app[data-animation-intensity='full'] {
  --duration-instant: 100ms;
  --duration-fast: 250ms;
  --duration-normal: 420ms;
  --duration-slow: 600ms;
  --duration-slower: 840ms;
}
</style>
