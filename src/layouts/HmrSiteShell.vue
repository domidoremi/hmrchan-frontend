<template>
  <div
    class="hmr-site"
    :style="scrollProgressStyle"
    :data-hmr-scene-role="sceneRole"
    :data-hmr-preset-scene-fit="presetSceneFit"
  >
    <a class="hmr-skip-link" href="#hmr-main">{{ t('shell.skipToContent') }}</a>
    <HmrSignalField
      :scene-role="sceneRole"
      :scroll-progress="progress"
      :motion-enabled="!staticMode"
    />

    <header class="hmr-site-header" :class="{ 'is-menu-open': menuOpen }">
      <div class="hmr-header-inner">
        <RouterLink
          class="hmr-brand-link"
          to="/"
          aria-label="MomiChan home"
          @click="closeMenu"
          @focus="waveBrandPet"
          @pointerdown="jumpBrandPet"
          @pointerenter="waveBrandPet"
        >
          <span
            ref="desktopBrandPetRef"
            class="hmr-brand-bg hmr-brand-3d hmr-brand-mark-shell"
            aria-hidden="true"
          >
            <span class="hmr-brand-mark-core">
              <HmrBrandSprite
                :state="brandState"
                :atlas-enabled="atlasEnabled"
                :static-mode="staticMode"
              />
            </span>
          </span>
        </RouterLink>

        <nav class="hmr-primary-nav" aria-label="Primary navigation">
          <RouterLink
            v-for="item in primaryNav"
            :key="item.key"
            :to="item.to"
            custom
            v-slot="{ href, navigate }"
          >
            <a
              class="hmr-primary-nav-link"
              :class="{ 'is-active': activeNavKey === item.key }"
              :href="href"
              :aria-label="item.label"
              :aria-current="activeNavKey === item.key ? 'page' : undefined"
              @click="handleNavClick($event, navigate)"
            >
              <span class="hmr-nav-inner">
                <span class="hmr-nav-icon" :data-hmr-icon="item.icon" aria-hidden="true"></span>
                <span class="hmr-nav-label" :data-label="item.label" aria-hidden="true"></span>
                <span class="hmr-nav-dot" aria-hidden="true"></span>
              </span>
            </a>
          </RouterLink>
        </nav>

        <RouterLink to="/settings" custom v-slot="{ href, navigate }">
          <a
            class="hmr-primary-nav-link hmr-primary-nav-link--settings"
            :class="{ 'is-active': activeNavKey === 'settings' }"
            :href="href"
            :aria-label="t('shell.settings')"
            :aria-current="activeNavKey === 'settings' ? 'page' : undefined"
            @click="handleNavClick($event, navigate)"
          >
            <span class="hmr-nav-inner">
              <span class="hmr-nav-icon" data-hmr-icon="settings" aria-hidden="true"></span>
              <span
                class="hmr-nav-label"
                :data-label="t('shell.settings')"
                aria-hidden="true"
              ></span>
              <span class="hmr-nav-dot" aria-hidden="true"></span>
            </span>
          </a>
        </RouterLink>

        <div class="hmr-mobile-header">
          <RouterLink
            class="hmr-mobile-brand"
            to="/"
            aria-label="MomiChan home"
            @click="closeMenu"
            @focus="waveBrandPet"
            @pointerdown="jumpBrandPet"
            @pointerenter="waveBrandPet"
          >
            <span
              ref="mobileBrandPetRef"
              class="hmr-mobile-brand-frame hmr-brand-3d hmr-brand-mark-shell"
              aria-hidden="true"
            >
              <span class="hmr-brand-mark-core">
                <HmrBrandSprite
                  :state="brandState"
                  :atlas-enabled="atlasEnabled"
                  :static-mode="staticMode"
                />
              </span>
            </span>
            <span class="hmr-sr-only">MomiChan</span>
          </RouterLink>
          <span class="hmr-mobile-locale">{{ localeBadge }}</span>
          <button
            class="hmr-menu-button"
            type="button"
            :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
            :aria-expanded="menuOpen"
            @click="toggleMenu"
          >
            <span></span>
            <span></span>
          </button>
        </div>

        <div class="hmr-auth-actions" role="group" aria-label="Authentication">
          <template v-if="authDisplay.isAuthenticated">
            <RouterLink class="hmr-user-chip" to="/profile">
              <span class="hmr-user-avatar" aria-hidden="true">
                <img v-if="authDisplay.avatarUrl" :src="authDisplay.avatarUrl" alt="" />
                <span v-else>{{ authDisplay.displayName.slice(0, 1).toUpperCase() }}</span>
              </span>
              <span class="hmr-user-meta">
                <strong>{{ authDisplay.displayName }}</strong>
                <span>{{ authDisplay.identity }}</span>
              </span>
            </RouterLink>
          </template>
          <template v-else>
            <RouterLink class="hmr-auth-link" :to="loginTarget">{{ t('nav.login') }}</RouterLink>
            <RouterLink class="hmr-auth-link hmr-auth-link--solid" :to="registerTarget">
              {{ t('nav.register') }}
            </RouterLink>
          </template>
        </div>

        <div class="hmr-current-time" role="timer" aria-label="Current time">
          <span>{{ timeZoneLabel }}</span>
          <time :datetime="currentTime">{{ currentTime }}</time>
        </div>

        <div class="hmr-scroll-progress" :style="scrollProgressStyle" aria-hidden="true">
          <span class="hmr-scroll-progress-line"></span>
          <span class="hmr-scroll-progress-cursor">
            <span></span>
          </span>
          <span class="hmr-scroll-progress-line"></span>
        </div>
      </div>

      <div class="hmr-experience-rail" aria-hidden="true">
        <span class="hmr-experience-rail__signal">
          <i></i>
          Signal live
        </span>
        <span class="hmr-experience-rail__route">
          <strong>{{ routeLabel }}</strong>
          <small>{{ routePathLabel }}</small>
        </span>
        <span class="hmr-experience-rail__metrics">
          <b>{{ pageOrdinal }}</b>
          <b>{{ sceneLabel }}</b>
          <b>{{ progressPercent }}%</b>
          <b>GPU · AUTO</b>
        </span>
      </div>

      <button
        class="hmr-nav-overlay"
        type="button"
        aria-label="Close menu"
        tabindex="-1"
        @click="closeMenu"
      ></button>
    </header>

    <main id="hmr-main" class="hmr-main">
      <RouterView v-slot="{ Component, route: viewRoute }">
        <Transition name="hmr-page" mode="out-in">
          <KeepAlive :include="keepAliveNames">
            <component
              :is="Component"
              :key="pageTransitionKey"
              :data-hmr-keepalive="shouldKeepAlive(viewRoute.meta.pageKey) ? 'true' : undefined"
            />
          </KeepAlive>
        </Transition>
      </RouterView>
    </main>

    <footer class="hmr-footer" data-hmr-reveal>
      <div class="hmr-container hmr-footer-container">
        <div class="hmr-footer-content">
          <h2 data-hmr-text-reveal>MomiChan</h2>
          <RouterLink class="hmr-text-link hmr-text-link--light" to="/contact">
            {{ t('shell.footerContact') }}
          </RouterLink>
        </div>
        <div class="hmr-footer-index">
          <section v-for="group in applicationMap" :key="group.label">
            <p>{{ group.label }}</p>
            <nav :aria-label="group.label">
              <RouterLink v-for="link in group.links" :key="link.code" :to="link.to">
                <span>{{ link.label }}</span>
                <small>{{ link.code }}</small>
              </RouterLink>
            </nav>
          </section>
        </div>
        <div class="hmr-footer-bottom">
          <HmrBrandSprite class="hmr-footer-logo" state="idle" static-mode aria-hidden="true" />
          <nav class="hmr-footer-nav" aria-label="Footer navigation">
            <RouterLink to="/explore">{{ t('nav.explore') }}</RouterLink>
            <RouterLink to="/community">{{ t('nav.community') }}</RouterLink>
            <RouterLink to="/about">{{ t('nav.about') }}</RouterLink>
            <RouterLink to="/contact">{{ t('nav.contact') }}</RouterLink>
          </nav>
          <p>©{{ currentYear }} MomiChan</p>
        </div>
      </div>
      <div class="hmr-footer-keys" aria-hidden="true">
        <HmrBrandSprite v-for="index in 7" :key="index" state="idle" static-mode />
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, RouterView, useRoute } from 'vue-router'

import HmrBrandSprite from '@/hmr/components/HmrBrandSprite.vue'
import HmrSignalField from '@/hmr/components/HmrSignalField.vue'
import { useHmrAuthDisplay } from '@/hmr/composables/useHmrAuthDisplay'
import { useHmrBrandPet } from '@/hmr/composables/useHmrBrandPet'
import { useHmrCurrentTime } from '@/hmr/composables/useHmrCurrentTime'
import { useHmrInViewReveal } from '@/hmr/composables/useHmrInViewReveal'
import { resolveHmrPresetSceneFit, useHmrSceneRole } from '@/hmr/composables/useHmrSceneRole'
import { useHmrScrollProgress } from '@/hmr/composables/useHmrScrollProgress'
import { useHmrShellNavigation } from '@/hmr/composables/useHmrShellNavigation'
import { useHmrTextReveal } from '@/hmr/composables/useHmrTextReveal'
import { warmHmrPriorityRoutes } from '@/hmr/runtime/hmrRouteWarmup'
import type { HmrPublicPageKey } from '@/hmr/types'
import { useThemeStore } from '@/stores/theme'
import { cancelIdleTask, runWhenIdle, type IdleTaskHandle } from '@/utils/performance'

const ROUTE_WARMUP_STABILIZATION_DELAY_MS = 9000
const ROUTE_WARMUP_IDLE_TIMEOUT_MS = 8000
const ROUTE_WARMUP_IDLE_FALLBACK_DELAY_MS = 3000
const APP_PAGE_ORDER = [
  'home',
  'explore',
  'community',
  'schedule',
  'about',
  'contact',
  'join',
  'profile',
  'settings',
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'auth-callback',
  'passkey-recovery',
  'thanks',
  'post',
  'not-found',
] as const satisfies readonly HmrPublicPageKey[]

const route = useRoute()
const theme = useThemeStore()
const { t } = useI18n({ useScope: 'global' })
const {
  activeNavKey,
  closeMenu,
  handleNavClick,
  keepAliveNames,
  localeBadge,
  loginTarget,
  menuOpen,
  primaryNav,
  registerTarget,
  shouldKeepAlive,
  toggleMenu,
} = useHmrShellNavigation()
let routeWarmupHandle: IdleTaskHandle | undefined
let routeWarmupDelayTimer: number | undefined
const pageTransitionKey = computed(() => route.fullPath)
const { auth, authDisplay } = useHmrAuthDisplay()
const { currentTime, timeZoneLabel } = useHmrCurrentTime()
const sceneRole = useHmrSceneRole(route)
const presetSceneFit = computed(() =>
  resolveHmrPresetSceneFit(sceneRole.value, theme.appearancePresetMeta.sceneRoles)
)
const { progress } = useHmrScrollProgress()
const { atlasEnabled, brandState, jumpBrandPet, staticMode, waveBrandPet } = useHmrBrandPet()
const scrollProgressStyle = computed(() => ({
  '--hmr-scroll-progress': progress.value.toString(),
}))
const routeLabel = computed(() =>
  String(route.meta.pageKey ?? 'home')
    .replaceAll('-', ' / ')
    .toUpperCase()
)
const routePathLabel = computed(() => route.path.toUpperCase())
const sceneLabel = computed(() => sceneRole.value.toUpperCase())
const progressPercent = computed(() =>
  Math.round(progress.value * 100)
    .toString()
    .padStart(2, '0')
)
const pageOrdinal = computed(() => {
  const pageKey = route.meta.pageKey ?? 'home'
  const index = APP_PAGE_ORDER.indexOf(pageKey)
  return `${String(index < 0 ? 1 : index + 1).padStart(2, '0')} / ${APP_PAGE_ORDER.length}`
})
const applicationMap = computed(() => [
  {
    label: 'Discover',
    links: [
      { label: t('nav.home'), to: '/', code: '01' },
      { label: t('nav.explore'), to: '/explore', code: '02' },
      { label: t('nav.community'), to: '/community', code: '03' },
      { label: t('nav.schedule'), to: '/schedule', code: '04' },
    ],
  },
  {
    label: 'MomiChan',
    links: [
      { label: t('nav.about'), to: '/about', code: '05' },
      { label: t('nav.contact'), to: '/contact', code: '06' },
      { label: 'Join us', to: '/join-us', code: '07' },
    ],
  },
  {
    label: 'Account',
    links: [
      { label: t('nav.profile'), to: '/profile', code: '08' },
      { label: t('nav.settings'), to: '/settings', code: '09' },
    ],
  },
  {
    label: 'Access',
    links: [
      { label: t('nav.login'), to: loginTarget.value, code: '10' },
      { label: t('nav.register'), to: registerTarget.value, code: '11' },
    ],
  },
])
const currentYear = new Date().getFullYear()

useHmrInViewReveal()
useHmrTextReveal()

function schedulePriorityRouteWarmup(path = route.fullPath): void {
  cancelIdleTask(routeWarmupHandle)
  clearRouteWarmupDelayTimer()
  routeWarmupDelayTimer = window.setTimeout(() => {
    routeWarmupDelayTimer = undefined
    routeWarmupHandle = runWhenIdle(
      () => {
        routeWarmupHandle = undefined
        void warmHmrPriorityRoutes(path)
      },
      {
        timeout: ROUTE_WARMUP_IDLE_TIMEOUT_MS,
        fallbackDelay: ROUTE_WARMUP_IDLE_FALLBACK_DELAY_MS,
      }
    )
  }, ROUTE_WARMUP_STABILIZATION_DELAY_MS)
}

function clearRouteWarmupDelayTimer(): void {
  if (routeWarmupDelayTimer === undefined) return
  window.clearTimeout(routeWarmupDelayTimer)
  routeWarmupDelayTimer = undefined
}

watch(
  () => route.fullPath,
  () => {
    closeMenu()
    schedulePriorityRouteWarmup(route.fullPath)
  }
)

onMounted(() => {
  theme.initializeTheme()
  void auth.resolveSession()
  schedulePriorityRouteWarmup()
})

onBeforeUnmount(() => {
  cancelIdleTask(routeWarmupHandle)
  clearRouteWarmupDelayTimer()
})
</script>
