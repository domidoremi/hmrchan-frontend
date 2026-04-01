<template>
  <div
    id="app"
    :data-preset="activePreset"
    :data-color-mode="resolvedColorMode"
    :data-density="settings.densityMode"
    :data-animation-intensity="animationIntensity"
    :data-motion="motionMode"
    :data-contrast="settings.contrastMode"
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
    <AppNavbar :chromeless="isAuthRoute" />
    <AppSideNav :chromeless="isAuthRoute" />

    <!-- Main Content with Error Boundary -->
    <main
      id="main-content"
      :data-scene-role="routeSceneRole"
      :class="{
        'main--home': isHomeRoute,
        'main--auth': isAuthRoute,
        'main--decorated': showBackgroundDecorations,
      }"
    >
      <div
        class="route-view"
        :data-scene-role="routeSceneRole"
        :class="{
          'route-view--home': isHomeRoute,
          'route-view--auth': isAuthRoute,
          'route-view--decorated': showBackgroundDecorations,
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
      <ToastContainer />
    </Teleport>

    <ClientChallengeDialog v-if="shouldMountClientChallengeDialog" />
    <VerificationDialog v-if="shouldMountVerificationDialog" />

    <!-- Back to Top Button -->
    <BackToTop v-if="!isHomeRoute" :show-progress="true" />

    <div
      v-if="showParticleBackground"
      class="app-decoration-layer app-decoration-layer--particle"
      aria-hidden="true"
    >
      <ParticleBackground />
    </div>

    <div
      v-if="showMascotBackground"
      class="app-decoration-layer app-decoration-layer--mascot"
      aria-hidden="true"
    >
      <MascotFlightBackground />
    </div>

    <!-- Desk Pet -->
    <DeskPet v-if="showDeskPet" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineAsyncComponent, onMounted } from 'vue'
import { useRoute, useRouter, type RouteLocationNormalizedLoaded } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores'
import { useAppearanceRuntime } from '@/composables/useAppearanceRuntime'
import { useLocaleConfig } from '@/composables/useLocaleConfig'
import { usePreferencesSync } from '@/composables/usePreferencesSync'
import { scheduleTask } from '@/utils/modernAPIs'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppSideNav from '@/components/layout/AppSideNav.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import PageLoading from '@/components/ui/PageLoading.vue'
import BackToTop from '@/components/ui/BackToTop.vue'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import { clientChallengeState } from '@/api/clientChallengeBridge'
import { verificationDialogState } from '@/api/verificationBridge'
import { useSmoothScroll } from '@/composables/useSmoothScroll'

const ParticleBackground = defineAsyncComponent(
  () => import('@/components/ui/ParticleBackground.vue')
)
const MascotFlightBackground = defineAsyncComponent(
  () => import('@/components/ui/MascotFlightBackground.vue')
)

const ToastContainer = defineAsyncComponent(() => import('@/components/ui/ToastContainer.vue'))
const ClientChallengeDialog = defineAsyncComponent(
  () => import('@/components/ui/ClientChallengeDialog.vue')
)
const VerificationDialog = defineAsyncComponent(
  () => import('@/components/ui/VerificationDialog.vue')
)

const DeskPet = defineAsyncComponent(() => import('@/components/ui/DeskPet.vue'))

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

// 延迟挂载装饰性组件，避免首屏抢占主线程与网络资源
const decorationsReady = ref(false)
const DECORATIONS_DELAY_MS = 0
onMounted(() => {
  scheduleTask(
    () => {
      decorationsReady.value = true
    },
    { priority: 'background', delay: DECORATIONS_DELAY_MS }
  )
})

const showParticleBackground = computed(
  () =>
    decorationsReady.value &&
    settings.value.enableAnimations &&
    settings.value.animationIntensity !== 'none' &&
    settings.value.backgroundEffect.type !== 'none'
)
const showMascotBackground = computed(
  () =>
    settings.value.enableAnimations &&
    settings.value.animationIntensity !== 'none' &&
    settings.value.mascotBackground.enabled
)
const showDeskPet = computed(() => settings.value.deskPet.enabled)
const showBackgroundDecorations = computed(
  () => showMascotBackground.value || showParticleBackground.value
)

// Footer only appears on key pages (configured via route meta)
const showFooter = computed(() => Boolean(route.meta.showFooter) && !isHomeRoute.value)
const isHomeRoute = computed(() => route.name === 'home' || route.path === '/')
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

// Page transition name
const transitionName = ref('')
const AUTH_ROUTE_NAMES = new Set([
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'verify-email',
  'auth-callback',
])
const authKeepAliveExclude = ['AuthCallbackPage']
const transitionMode = computed<'out-in' | undefined>(() =>
  transitionName.value ? 'out-in' : undefined
)

function isAuthRouteName(routeName: string | undefined): boolean {
  return Boolean(routeName && AUTH_ROUTE_NAMES.has(routeName))
}

function toRouteName(routeName: unknown): string | undefined {
  return typeof routeName === 'string' ? routeName : undefined
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

    if (toViewKey && toViewKey === fromViewKey) {
      transitionName.value = ''
      return
    }

    if (!settings.value.enableAnimations) {
      transitionName.value = ''
      return
    }

    // 页面切换时触发粒子干扰效果（仅在启用时）
    const shouldBurst =
      settings.value.enableAnimations &&
      settings.value.animationIntensity !== 'none' &&
      settings.value.backgroundEffect.type !== 'none'

    if (shouldBurst) {
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('particle-burst', {
              detail: {
                x: window.innerWidth * 0.5,
                y: window.innerHeight * 0.35,
                strength: 220,
                radius: 380,
              },
            })
          )
        }
      } catch {
        // ignore
      }
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
  /* 创建层叠上下文，使粒子背景 canvas (z-index:-1) 可见于背景之上、内容之下 */
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

@media (max-width: 768px) {
  main.main--home {
    padding-bottom: 0;
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

.route-view.route-view--decorated {
  background: transparent;
}

@media (max-width: 768px) {
  .route-view.route-view--home {
    min-height: var(--app-safe-block-size-with-mobile-nav);
  }
}

.app-decoration-layer {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  opacity: 1;
  transition: opacity var(--duration-normal) var(--ease-out);
}

.app-decoration-layer--particle {
  z-index: 0;
  opacity: var(--app-particle-layer-opacity, 0.9);
  filter: saturate(1.04);
}

.app-decoration-layer--mascot {
  z-index: 0;
  opacity: var(--app-mascot-layer-opacity, 0.9);
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

#app[data-color-mode='light'] {
  --app-particle-layer-opacity: 0.94;
  --app-mascot-layer-opacity: 0.72;
}

#app[data-color-mode='dark'] {
  --app-particle-layer-opacity: 1;
  --app-mascot-layer-opacity: 0.68;
}

#app[data-preset='gradient-narrative'][data-color-mode='light'] {
  --app-particle-layer-opacity: 0.96;
  --app-mascot-layer-opacity: 0.74;
}

#app[data-preset='material-calm'],
#app[data-preset='sketch-doodle'] {
  --app-particle-layer-opacity: 0.88;
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
