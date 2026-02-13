<template>
  <div
    id="app"
    :data-theme="resolvedTheme"
    :data-animation-intensity="animationIntensity"
    :data-ui-style="uiStyle"
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
            <Transition :name="transitionName" mode="out-in">
              <Suspense>
                <template #default>
                  <KeepAlive :include="cachedPages" :max="10">
                    <component
                      :is="Component"
                      :key="route.matched[0]?.name ?? route.name ?? route.path"
                    />
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

    <!-- Global Particle Background -->
    <ParticleBackground />
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

const ParticleBackground = defineAsyncComponent(
  () => import('@/components/ui/ParticleBackground.vue')
)

const ToastContainer = defineAsyncComponent(() => import('@/components/ui/ToastContainer.vue'))

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()

const { resolvedTheme } = storeToRefs(themeStore)
const { settings } = storeToRefs(settingsStore)

// 动效强度
const animationIntensity = computed(() =>
  settings.value.enableAnimations ? settings.value.animationIntensity : 'none'
)

// UI 风格（默认 iOS/SwiftUI）
const uiStyle = computed(() => settings.value.uiStyle)

// 智能缓存策略：根据页面访问频率动态调整
const cachedPages = ref<string[]>(['HomePage', 'ExplorePage'])
const pageVisitCount = new Map<string, number>()
const MAX_CACHED_PAGES = 10
/** 限制 pageVisitCount 不超过路由数量（避免无限增长） */
const MAX_VISIT_ENTRIES = 50

// 记录页面访问
watch(
  () => route.name,
  (newName) => {
    if (!newName) return

    const pageName = String(newName)
    const count = pageVisitCount.get(pageName) || 0

    // 删除再插入，确保 Map 迭代顺序反映最近访问时间
    pageVisitCount.delete(pageName)
    pageVisitCount.set(pageName, count + 1)

    // 淘汰最久未访问的记录（Map 迭代顺序 = 插入顺序 = LRU 顺序）
    if (pageVisitCount.size > MAX_VISIT_ENTRIES) {
      const oldest = pageVisitCount.keys().next().value
      if (oldest !== undefined) pageVisitCount.delete(oldest)
    }

    // 访问超过 2 次的页面加入缓存
    if (count >= 1 && !cachedPages.value.includes(pageName)) {
      if (cachedPages.value.length >= MAX_CACHED_PAGES) {
        // 移除访问次数最少的页面
        const leastVisited = Array.from(pageVisitCount.entries())
          .filter(([name]) => cachedPages.value.includes(name))
          .sort((a, b) => a[1] - b[1])[0]

        if (leastVisited) {
          const index = cachedPages.value.indexOf(leastVisited[0])
          if (index > -1) {
            cachedPages.value.splice(index, 1)
          }
        }
      }
      cachedPages.value.push(pageName)
    }
  },
  { immediate: true }
)

// Footer only appears on key pages (configured via route meta)
const showFooter = computed(() => Boolean(route.meta.showFooter))

// Page transition name
const transitionName = ref('page-fade')

// Update transition based on route depth and navigation type
const routeDepth = (path: string) => path.split('/').filter(Boolean).length

watch(
  () => [route.name as string | undefined, route.path] as const,
  ([toName, toPath], [fromName, fromPath]) => {
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

.route-view {
  position: relative;
  min-height: calc(100svh - var(--navbar-height));
  min-height: calc(100dvh - var(--navbar-height));
  overflow-x: hidden;
  overflow-y: visible;
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
