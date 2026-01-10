<template>
  <div id="app" :data-theme="resolvedTheme" :data-animation-intensity="animationIntensity">
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

    <!-- Footer -->
    <AppFooter />

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

// Toast 容器懒加载，只在首次显示 toast 时加载
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

// Page transition name
const transitionName = ref('fade')

// Update transition based on route depth
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

    if (toDepth > fromDepth) {
      transitionName.value = 'slide-up'
    } else if (toDepth < fromDepth) {
      transitionName.value = 'slide-down'
    } else {
      transitionName.value = 'fade'
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
