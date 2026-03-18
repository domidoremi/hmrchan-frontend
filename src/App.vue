<template>
  <div
    id="app"
    :data-theme="resolvedTheme"
    :data-animation-intensity="animationIntensity"
    :data-ui-style="uiStyle"
    :data-locale="currentLocale"
    :data-locale-density="localeDensity"
    :data-locale-animation="localeAnimation"
  >
    <!-- Skip to main content -->
    <a href="#main-content" class="skip-link">
      {{ $t('common.skipToContent') }}
    </a>

    <!-- Navbar -->
    <AppNavbar />

    <!-- Main Content with Error Boundary -->
    <main id="main-content" :class="{ 'main--home': isHomeRoute }">
      <div class="route-view" :class="{ 'route-view--home': isHomeRoute }">
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
                  <PageLoading />
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

    <ClientChallengeDialog />
    <VerificationDialog />

    <!-- Back to Top Button -->
    <BackToTop :show-progress="true" />

    <div
      v-if="showMascotBackground || showParticleBackground"
      class="app-decoration-layer"
      aria-hidden="true"
    >
      <MascotFlightBackground v-if="showMascotBackground" />
      <ParticleBackground v-if="showParticleBackground" />
    </div>

    <!-- Desk Pet -->
    <DeskPet v-if="showDeskPet" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineAsyncComponent, onMounted } from 'vue'
import { useRoute, useRouter, type RouteLocationNormalizedLoaded } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useThemeStore, useSettingsStore } from '@/stores'
import { useLocaleConfig } from '@/composables/useLocaleConfig'
import { usePreferencesSync } from '@/composables/usePreferencesSync'
import { scheduleTask } from '@/utils/modernAPIs'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import PageLoading from '@/components/ui/PageLoading.vue'
import BackToTop from '@/components/ui/BackToTop.vue'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'

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
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
usePreferencesSync()

const { resolvedTheme } = storeToRefs(themeStore)
const { settings } = storeToRefs(settingsStore)

// 地区配置
const { currentLocale, layout: localeLayout, interaction: localeInteraction } = useLocaleConfig()
const localeDensity = computed(() => localeLayout.value.density)
const localeAnimation = computed(() => localeInteraction.value.animationStyle)

// 动效强度
const animationIntensity = computed(() =>
  settings.value.enableAnimations ? settings.value.animationIntensity : 'none'
)

// UI 风格（默认 iOS/SwiftUI）
const uiStyle = computed(() => settings.value.uiStyle)

// 延迟挂载装饰性组件，避免首屏抢占主线程与网络资源
const decorationsReady = ref(false)
const DECORATIONS_DELAY_MS = 2500
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
    decorationsReady.value &&
    settings.value.enableAnimations &&
    settings.value.animationIntensity !== 'none' &&
    settings.value.mascotBackground.enabled
)
const showDeskPet = computed(() => decorationsReady.value && settings.value.deskPet.enabled)

// Footer only appears on key pages (configured via route meta)
const showFooter = computed(() => Boolean(route.meta.showFooter))
const isHomeRoute = computed(() => route.name === 'home' || route.path === '/')

// Page transition name
const transitionName = ref('')
const AUTH_ENTER_TRANSITION_NAME = 'auth-enter'
const AUTH_SWAP_FORWARD_TRANSITION_NAME = 'auth-swap-forward'
const AUTH_SWAP_BACK_TRANSITION_NAME = 'auth-swap-back'
const AUTH_EXIT_TRANSITION_NAME = 'auth-exit'
const AUTH_TRANSITION_NAMES = new Set([
  AUTH_ENTER_TRANSITION_NAME,
  AUTH_SWAP_FORWARD_TRANSITION_NAME,
  AUTH_SWAP_BACK_TRANSITION_NAME,
  AUTH_EXIT_TRANSITION_NAME,
])
const authKeepAliveExclude = ['LoginPage', 'RegisterPage', 'ForgotPasswordPage']
const transitionMode = computed<'out-in' | undefined>(() =>
  AUTH_TRANSITION_NAMES.has(transitionName.value) ? undefined : 'out-in'
)
const authRouteOrder: Record<string, number> = {
  login: 0,
  'forgot-password': 1,
  register: 2,
}

function isAuthRouteName(routeName: string | undefined): boolean {
  return Boolean(routeName && authRouteOrder[routeName] !== undefined)
}

function resolveAuthTransition(
  toName: string | undefined,
  fromName: string | undefined
):
  | typeof AUTH_ENTER_TRANSITION_NAME
  | typeof AUTH_SWAP_FORWARD_TRANSITION_NAME
  | typeof AUTH_SWAP_BACK_TRANSITION_NAME
  | typeof AUTH_EXIT_TRANSITION_NAME
  | null {
  const toIsAuth = isAuthRouteName(toName)
  const fromIsAuth = isAuthRouteName(fromName)

  if (toIsAuth && fromIsAuth) {
    const toOrder = authRouteOrder[toName!]
    const fromOrder = authRouteOrder[fromName!]
    return toOrder >= fromOrder ? AUTH_SWAP_FORWARD_TRANSITION_NAME : AUTH_SWAP_BACK_TRANSITION_NAME
  }

  if (toIsAuth && !fromIsAuth) {
    return AUTH_ENTER_TRANSITION_NAME
  }

  if (!toIsAuth && fromIsAuth) {
    return AUTH_EXIT_TRANSITION_NAME
  }

  return null
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
    return `view:${viewKey}`
  }
  return routeRecord.matched[0]?.path ?? routeRecord.path
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

    const authTransition = resolveAuthTransition(toName, fromName)
    if (authTransition) {
      transitionName.value = authTransition
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

@media (max-width: 768px) {
  main {
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

/* 认证页安全过渡：同帧交叠，避免 out-in 空窗白屏 */
.auth-enter-enter-active,
.auth-enter-leave-active,
.auth-swap-forward-enter-active,
.auth-swap-forward-leave-active,
.auth-swap-back-enter-active,
.auth-swap-back-leave-active,
.auth-exit-enter-active,
.auth-exit-leave-active {
  transition:
    opacity var(--duration-fast) var(--ease-out-smooth),
    transform var(--duration-fast) var(--ease-fluid);
  will-change: transform, opacity;
}

.auth-enter-enter-active,
.auth-swap-forward-enter-active,
.auth-swap-back-enter-active,
.auth-exit-enter-active {
  position: relative;
  z-index: 2;
}

.auth-enter-leave-active,
.auth-swap-forward-leave-active,
.auth-swap-back-leave-active,
.auth-exit-leave-active {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  z-index: 1;
  pointer-events: none;
}

.auth-enter-enter-from {
  opacity: 0;
  transform: translate3d(0.55rem, 0.35rem, 0) scale3d(0.997, 0.997, 1);
}

.auth-enter-leave-to {
  opacity: 0;
  transform: translate3d(-0.2rem, 0, 0) scale3d(0.999, 0.999, 1);
}

.auth-swap-forward-enter-from {
  opacity: 0;
  transform: translate3d(0.75rem, 0, 0) scale3d(0.997, 0.997, 1);
}

.auth-swap-forward-leave-to {
  opacity: 0;
  transform: translate3d(-0.45rem, 0, 0) scale3d(0.998, 0.998, 1);
}

.auth-swap-back-enter-from {
  opacity: 0;
  transform: translate3d(-0.75rem, 0, 0) scale3d(0.997, 0.997, 1);
}

.auth-swap-back-leave-to {
  opacity: 0;
  transform: translate3d(0.45rem, 0, 0) scale3d(0.998, 0.998, 1);
}

.auth-exit-enter-from {
  opacity: 0;
  transform: translate3d(-0.25rem, 0.4rem, 0) scale3d(0.997, 0.997, 1);
}

.auth-exit-leave-to {
  opacity: 0;
  transform: translate3d(0.45rem, 0, 0) scale3d(0.999, 0.999, 1);
}

.app-decoration-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.app-footer-shell {
  position: relative;
  z-index: 1;
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
