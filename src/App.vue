<template>
  <div
    id="app"
    :data-preset="activePreset"
    :data-color-mode="resolvedColorMode"
    :data-animation-intensity="animationIntensity"
    :data-motion="motionMode"
    :data-locale="currentLocale"
    :data-locale-density="localeDensity"
    :data-locale-animation="localeAnimation"
    :data-scene-role="routeSceneRole"
  >
    <!-- Skip to main content -->
    <a href="#main-content" class="skip-link">
      {{ $t('common.skipToContent') }}
    </a>

    <!-- Navbar -->
    <AppNavbar chromeless />
    <AppSideNav chromeless />

    <!-- Main Content with Error Boundary -->
    <main
      id="main-content"
      :data-scene-role="routeSceneRole"
      :class="{
        'main--home': isHomeRoute,
        'main--auth': isAuthRoute,
        'main--under-navbar': extendsContentUnderNavbar,
      }"
    >
      <div
        class="route-view"
        :data-scene-role="routeSceneRole"
        :class="{
          'route-view--home': isHomeRoute,
          'route-view--auth': isAuthRoute,
          'route-view--under-navbar': extendsContentUnderNavbar,
        }"
      >
        <ErrorBoundary @retry="handleRetry">
          <RouterView v-slot="{ Component, route }">
            <Transition :name="transitionName" :mode="transitionMode">
              <Suspense>
                <template #default>
                  <KeepAlive :max="10" :exclude="authKeepAliveExclude">
                    <component :is="Component" :key="resolveRouteKey(route)" />
                  </KeepAlive>
                </template>
                <template #fallback>
                  <PageLoading v-if="!isAuthRouteName(toRouteName(route.name))" />
                </template>
              </Suspense>
            </Transition>
          </RouterView>
        </ErrorBoundary>
      </div>
    </main>

    <!-- Footer - only show on key routes -->
    <div v-if="showFooter" class="app-footer-shell">
      <AppFooter />
    </div>

    <!-- Toast Container -->
    <Teleport to="body">
      <ToastContainer position="bottom-center" />
    </Teleport>

    <ClientChallengeDialog v-if="shouldMountClientChallengeDialog" />
    <VerificationDialog v-if="shouldMountVerificationDialog" />

    <!-- Back to Top Button -->
    <BackToTop v-if="!isHomeRoute" :show-progress="true" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineAsyncComponent } from 'vue'
import { useRoute, useRouter, type RouteLocationNormalizedLoaded } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores'
import { useAppearanceRuntime } from '@/composables/useAppearanceRuntime'
import { useLocaleConfig } from '@/composables/useLocaleConfig'
import { usePreferencesSync } from '@/composables/usePreferencesSync'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppSideNav from '@/components/layout/AppSideNav.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import PageLoading from '@/components/ui/PageLoading.vue'
import BackToTop from '@/components/ui/BackToTop.vue'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import { clientChallengeState } from '@/api/clientChallengeBridge'
import { verificationDialogState } from '@/api/verificationState'
import { useSmoothScroll } from '@/composables/useSmoothScroll'

const ToastContainer = defineAsyncComponent(() => import('@/components/ui/ToastContainer.vue'))
const ClientChallengeDialog = defineAsyncComponent(
  () => import('@/components/ui/ClientChallengeDialog.vue')
)
const VerificationDialog = defineAsyncComponent(
  () => import('@/components/ui/VerificationDialog.vue')
)

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()
usePreferencesSync()

const { settings } = storeToRefs(settingsStore)
const { activePreset, routeSceneRole, resolvedColorMode, motionMode } = useAppearanceRuntime(route)
useSmoothScroll(
  computed(() => settings.value.enableAnimations),
  computed(() => settings.value.animationIntensity)
)

// 地区配置
const { currentLocale, layout: localeLayout, interaction: localeInteraction } = useLocaleConfig()
const localeDensity = computed(() => localeLayout.value.density)
const localeAnimation = computed(() => localeInteraction.value.animationStyle)

// 动效强度
const animationIntensity = computed(() =>
  settings.value.enableAnimations ? settings.value.animationIntensity : 'none'
)

// Footer only appears on key pages (configured via route meta)
const showFooter = computed(() => Boolean(route.meta.showFooter) && !isHomeRoute.value)
const isHomeRoute = computed(() => route.name === 'home' || route.path === '/')
const extendsContentUnderNavbar = computed(() => Boolean(route.meta.extendContentUnderNavbar))
const isAuthRoute = computed(() => {
  const routeName = typeof route.name === 'string' ? route.name : ''
  return (
    routeName === 'login' ||
    routeName === 'register' ||
    routeName === 'forgot-password' ||
    routeName === 'reset-password' ||
    routeName === 'verify-email' ||
    routeName === 'auth-callback'
  )
})
const shouldMountClientChallengeDialog = computed(() => clientChallengeState.isOpen.value)
const shouldMountVerificationDialog = computed(
  () =>
    verificationDialogState.isOpen.value || Boolean(verificationDialogState.currentRequest.value)
)
const AUTH_ROUTE_NAMES = new Set([
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'verify-email',
  'auth-callback',
])

// Page transition name
const transitionName = ref('')
const authKeepAliveExclude = ['AuthCallbackPage']
const transitionMode = computed<'out-in' | undefined>(() =>
  transitionName.value ? 'out-in' : undefined
)
let initialRouteTransitionResolved = false

function toRouteName(routeName: unknown): string | undefined {
  return typeof routeName === 'string' ? routeName : undefined
}

function isAuthRouteName(routeName: string | undefined): boolean {
  return Boolean(routeName && AUTH_ROUTE_NAMES.has(routeName))
}

function toRouteViewKey(viewKey: unknown): string | null {
  if (typeof viewKey !== 'string') return null
  const trimmed = viewKey.trim()
  return trimmed.length > 0 ? trimmed : null
}

function resolveRouteKey(routeRecord: RouteLocationNormalizedLoaded): string {
  const viewKey = toRouteViewKey(routeRecord.meta.viewKey)
  if (viewKey) {
    return `view:${viewKey}:${currentLocale.value}`
  }
  return `${routeRecord.matched[0]?.path ?? routeRecord.path}:${currentLocale.value}`
}

// Update transition based on route depth and navigation type
const routeDepth = (path: string) => path.split('/').filter(Boolean).length

watch(
  () => [route.name, route.path, route.meta.viewKey] as const,
  (
    [toRouteNameValue, toPath, toViewKeyValue],
    [fromRouteNameValue, fromPath, fromViewKeyValue]
  ) => {
    const toName = toRouteName(toRouteNameValue)
    const fromName = toRouteName(fromRouteNameValue)
    const toViewKey = toRouteViewKey(toViewKeyValue)
    const fromViewKey = toRouteViewKey(fromViewKeyValue)

    if (!initialRouteTransitionResolved) {
      initialRouteTransitionResolved = true
      transitionName.value = ''
      return
    }

    if (toViewKey && toViewKey === fromViewKey) {
      transitionName.value = ''
      return
    }

    if (!settings.value.enableAnimations) {
      transitionName.value = ''
      return
    }

    if (isAuthRouteName(toName) || isAuthRouteName(fromName)) {
      transitionName.value = ''
      return
    }

    // Post -> Post: use horizontal slide transition
    if (toName === 'post-detail' && fromName === 'post-detail') {
      let dir: string | null = null
      try {
        dir = sessionStorage.getItem('post-detail-transition')
        sessionStorage.removeItem('post-detail-transition')
      } catch {
        // ignore
      }

      transitionName.value =
        dir === 'right' ? 'page-slide-right' : dir === 'left' ? 'page-slide-left' : 'page-fade'
      return
    }

    const toDepth = routeDepth(toPath)
    const fromDepth = routeDepth(fromPath || '/')

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
  --app-side-nav-offset: 0rem;
  --app-side-nav-inline-start: 0rem;
  --app-side-nav-width: 0rem;
  --app-side-nav-gap: 0rem;
  min-height: 100svh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  transition: background-color 0.3s ease;
  isolation: isolate;
}

main {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  min-height: 0;
  padding-top: var(--navbar-visible-height);
}

main.main--home {
  padding-top: 0;
}

main.main--auth {
  padding-top: 0;
  background: transparent;
}

main.main--under-navbar {
  padding-top: 0;
  background: transparent;
}

@media (max-width: 960px) {
  main {
    padding-bottom: var(--mobile-nav-height);
  }

  main.main--home {
    padding-bottom: var(--mobile-nav-height);
  }
}

.route-view {
  position: relative;
  min-height: var(--app-safe-block-size);
  background: var(--color-background);
  overflow-x: hidden;
  overflow-y: visible;
}

.route-view.route-view--home {
  min-height: var(--app-safe-block-size);
  overflow: visible;
}

.route-view.route-view--auth {
  min-height: 100dvh;
  background: transparent;
  overflow: visible;
}

.route-view.route-view--under-navbar {
  background: transparent;
}

@media (max-width: 960px) {
  .route-view.route-view--home {
    min-height: var(--app-safe-block-size-with-mobile-nav);
  }
}

.app-footer-shell {
  position: relative;
  z-index: calc(var(--z-sticky) - 1);
}

@media (min-width: 961px) {
  #app {
    --app-side-nav-width: clamp(2.875rem, 4vw, 3.25rem);
    --app-side-nav-inline-start: clamp(0.5rem, 1.1vw, 1rem);
    --app-side-nav-gap: clamp(0.75rem, 1.6vw, 1.125rem);
    --app-side-nav-offset: 0rem;
  }
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
