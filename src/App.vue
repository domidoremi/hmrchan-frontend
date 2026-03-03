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
    <main id="main-content">
      <div class="route-view">
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
    <AppFooter v-if="showFooter" />

    <!-- Toast Container -->
    <Teleport to="body">
      <ToastContainer />
    </Teleport>

    <!-- Back to Top Button -->
    <BackToTop :show-progress="true" />

    <!-- Global Mascot Flight Background -->
    <MascotFlightBackground />

    <!-- Global Particle Background -->
    <ParticleBackground />

    <!-- Desk Pet -->
    <DeskPet />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineAsyncComponent } from 'vue'
import { useRoute, useRouter, type RouteLocationNormalizedLoaded } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useThemeStore, useSettingsStore } from '@/stores'
import { useLocaleConfig } from '@/composables/useLocaleConfig'
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

const DeskPet = defineAsyncComponent(() => import('@/components/ui/DeskPet.vue'))

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()

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

// Footer only appears on key pages (configured via route meta)
const showFooter = computed(() => Boolean(route.meta.showFooter))

// Page transition name
const transitionName = ref('')
const AUTH_TRANSITION_NAME = 'auth-safe'
const authKeepAliveExclude = ['LoginPage', 'RegisterPage', 'ForgotPasswordPage']
const transitionMode = computed<'out-in' | undefined>(() =>
  transitionName.value === AUTH_TRANSITION_NAME ? undefined : 'out-in'
)
const authRouteOrder: Record<string, number> = {
  login: 0,
  'forgot-password': 1,
  register: 2,
}

function resolveAuthTransition(
  toName: string | undefined,
  fromName: string | undefined
): typeof AUTH_TRANSITION_NAME | null {
  if (!toName || !fromName) return null
  const toOrder = authRouteOrder[toName]
  const fromOrder = authRouteOrder[fromName]
  if (toOrder === undefined || fromOrder === undefined) return null
  return AUTH_TRANSITION_NAME
}

function toRouteName(routeName: unknown): string | undefined {
  return typeof routeName === 'string' ? routeName : undefined
}

function resolveRouteKey(routeRecord: RouteLocationNormalizedLoaded): string {
  return routeRecord.matched[0]?.path ?? routeRecord.path
}

// Update transition based on route depth and navigation type
const routeDepth = (path: string) => path.split('/').filter(Boolean).length

watch(
  () => [route.name, route.path] as const,
  ([toRouteNameValue, toPath], [fromRouteNameValue, fromPath]) => {
    const toName = toRouteName(toRouteNameValue)
    const fromName = toRouteName(fromRouteNameValue)

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
  flex: 1;
  padding-top: var(--navbar-height);
}

@media (max-width: 768px) {
  main {
    padding-bottom: var(--mobile-nav-height);
  }
}

.route-view {
  position: relative;
  min-height: calc(100svh - var(--navbar-height));
  min-height: calc(100dvh - var(--navbar-height));
  background: var(--color-background);
  overflow-x: hidden;
  overflow-y: visible;
}

/* 认证页安全过渡：同帧交叠，避免 out-in 空窗白屏 */
.auth-safe-enter-active,
.auth-safe-leave-active {
  transition: transform var(--duration-fast) var(--ease-out);
  will-change: transform;
}

.auth-safe-enter-active {
  position: relative;
  z-index: 2;
}

.auth-safe-leave-active {
  position: absolute;
  inset: 0;
  width: 100%;
  z-index: 1;
  pointer-events: none;
}

.auth-safe-enter-from {
  transform: translate3d(1.2rem, 0, 0);
}

.auth-safe-leave-to {
  transform: translate3d(-0.9rem, 0, 0);
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
