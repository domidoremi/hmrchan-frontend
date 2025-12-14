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
      <RouterView v-slot="{ Component, route }">
        <Transition :name="transitionName" mode="out-in">
          <Suspense>
            <component :is="Component" :key="route.path" />
            <template #fallback>
              <PageLoading />
            </template>
          </Suspense>
        </Transition>
      </RouterView>
    </main>

    <!-- Footer -->
    <AppFooter />

    <!-- Toast Container -->
    <Teleport to="body">
      <ToastContainer />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useThemeStore, useSettingsStore } from '@/stores'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import PageLoading from '@/components/ui/PageLoading.vue'

const route = useRoute()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()

const { resolvedTheme } = storeToRefs(themeStore)
const { settings } = storeToRefs(settingsStore)

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
  },
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
