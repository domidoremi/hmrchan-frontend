<template>
  <div id="app" :data-theme="resolvedTheme">
    <!-- Skip to main content -->
    <a href="#main-content" class="skip-link">
      {{ $t('common.skipToContent') }}
    </a>

    <!-- Navbar -->
    <AppNavbar />

    <!-- Main Content -->
    <main id="main-content">
      <div class="route-view">
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
import { ref, watch, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useThemeStore, useSettingsStore } from '@/stores'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import PageLoading from '@/components/ui/PageLoading.vue'
import BackToTop from '@/components/ui/BackToTop.vue'

// Toast 容器懒加载，只在首次显示 toast 时加载
const ToastContainer = defineAsyncComponent(() => import('@/components/ui/ToastContainer.vue'))

const route = useRoute()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()

const { resolvedTheme } = storeToRefs(themeStore)
const { settings } = storeToRefs(settingsStore)

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
</style>
