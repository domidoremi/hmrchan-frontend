<template>
  <div class="hmr-site" :style="scrollProgressStyle">
    <div
      v-if="preloaderVisible"
      ref="preloaderBackdropRef"
      class="hmr-preloader-backdrop"
      aria-hidden="true"
    >
      <div class="hmr-preloader-backdrop-row">
        <span v-for="item in preloaderTopMarks" :key="`top-${item}`"></span>
      </div>
      <div class="hmr-preloader-backdrop-row hmr-preloader-backdrop-row--bottom">
        <span v-for="item in preloaderBottomMarks" :key="`bottom-${item}`"></span>
      </div>
    </div>

    <div
      v-if="preloaderVisible"
      ref="preloaderRef"
      class="hmr-preloader"
      :class="{ 'is-ready': preloaderReady }"
      aria-label="MomiChan loading"
    >
      <button
        ref="preloaderButtonRef"
        class="hmr-preloader-button"
        type="button"
        :disabled="!preloaderReady"
        aria-label="Enter MomiChan"
        @click="completePreloader"
      >
        <span class="hmr-preloader-logo hmr-brand-3d" aria-hidden="true">
          <img ref="preloaderLogoRef" :src="brandMarkUrl" alt="" />
        </span>
        <span ref="preloaderLabelRef" class="hmr-preloader-label" aria-hidden="true"></span>
        <span
          ref="preloaderOutroLabelRef"
          class="hmr-preloader-label hmr-preloader-label--outro"
          aria-hidden="true"
        ></span>
        <span class="hmr-preloader-svg svg-strokes" aria-hidden="true">
          <svg viewBox="0 0 120 120" focusable="false">
            <circle class="hmr-preloader-track" cx="60" cy="60" r="46"></circle>
            <circle
              ref="preloaderProgressRef"
              class="hmr-preloader-progress"
              cx="60"
              cy="60"
              r="46"
            ></circle>
          </svg>
        </span>
      </button>
    </div>

    <div
      v-if="preloaderVisible"
      ref="preloaderRevealerRef"
      class="hmr-preloader-revealer"
      aria-hidden="true"
    ></div>

    <a class="hmr-skip-link" href="#hmr-main" aria-label="Skip to content"></a>

    <header class="hmr-site-header" :class="{ 'is-menu-open': menuOpen }">
      <div class="hmr-header-inner">
        <RouterLink
          class="hmr-brand-link"
          to="/"
          aria-label="MomiChan home"
          @click="closeMenu"
          @focus="pounceBrandPet"
          @pointerdown="pounceBrandPet"
          @pointerenter="pounceBrandPet"
        >
          <span
            ref="desktopBrandPetRef"
            class="hmr-brand-bg hmr-brand-3d hmr-brand-pet"
            aria-hidden="true"
          >
            <span class="hmr-brand-pet-core">
              <img class="hmr-brand-mark" :src="brandMarkUrl" alt="" />
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
            @focus="pounceBrandPet"
            @pointerdown="pounceBrandPet"
            @pointerenter="pounceBrandPet"
          >
            <span
              ref="mobileBrandPetRef"
              class="hmr-mobile-brand-frame hmr-brand-3d hmr-brand-pet"
              aria-hidden="true"
            >
              <span class="hmr-brand-pet-core">
                <img class="hmr-mobile-brand-logo" :src="brandMarkUrl" alt="" />
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

        <div class="hmr-auth-actions" aria-label="Authentication">
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

        <div class="hmr-current-time" aria-label="Current time">
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
        <div class="hmr-footer-bottom">
          <img class="hmr-footer-logo" :src="brandMarkUrl" alt="" aria-hidden="true" />
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
        <img v-for="index in 7" :key="index" :src="brandMarkUrl" alt="" />
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { gsap } from 'gsap'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, RouterView, useRoute } from 'vue-router'

import { useHmrAuthDisplay } from '@/hmr/composables/useHmrAuthDisplay'
import { useHmrBrandPet } from '@/hmr/composables/useHmrBrandPet'
import { useHmrCurrentTime } from '@/hmr/composables/useHmrCurrentTime'
import { useHmrInViewReveal } from '@/hmr/composables/useHmrInViewReveal'
import { useHmrScrollProgress } from '@/hmr/composables/useHmrScrollProgress'
import { useHmrTextReveal } from '@/hmr/composables/useHmrTextReveal'
import { warmHmrPriorityRoutes } from '@/hmr/runtime/hmrRouteWarmup'
import type { HmrNavItem, HmrPublicPageKey } from '@/hmr/types'
import { useThemeStore } from '@/stores/theme'

const SESSION_PRELOADER_KEY = 'momichan.preloader.seen'
const keepAliveNames = [
  'HomePage',
  'ExplorePage',
  'CommunityPage',
  'SchedulePage',
  'PostDetailPage',
]
const keepAlivePageKeys: HmrPublicPageKey[] = ['home', 'explore', 'community', 'schedule', 'post']

const route = useRoute()
const theme = useThemeStore()
const { locale, t } = useI18n()
const menuOpen = ref(false)
const preloaderVisible = ref(shouldShowPreloader())
const preloaderReady = ref(false)
const preloaderRef = ref<HTMLElement | null>(null)
const preloaderBackdropRef = ref<HTMLElement | null>(null)
const preloaderButtonRef = ref<HTMLButtonElement | null>(null)
const preloaderLogoRef = ref<HTMLImageElement | null>(null)
const preloaderLabelRef = ref<HTMLElement | null>(null)
const preloaderOutroLabelRef = ref<HTMLElement | null>(null)
const preloaderProgressRef = ref<SVGCircleElement | null>(null)
const preloaderRevealerRef = ref<HTMLElement | null>(null)
const desktopBrandPetRef = ref<HTMLElement | null>(null)
const mobileBrandPetRef = ref<HTMLElement | null>(null)
let preloaderTimeline: gsap.core.Timeline | undefined
let preloaderOutroTimeline: gsap.core.Timeline | undefined
const pageTransitionKey = computed(() => route.fullPath)
const { auth, authDisplay } = useHmrAuthDisplay()
const { currentTime, timeZoneLabel } = useHmrCurrentTime()
const { progress } = useHmrScrollProgress()
const { pounceBrandPet } = useHmrBrandPet([desktopBrandPetRef, mobileBrandPetRef])
const scrollProgressStyle = computed(() => ({
  '--hmr-scroll-progress': progress.value.toString(),
}))
const currentYear = new Date().getFullYear()
const brandMarkUrl = new URL('/icons/sitting-192.webp', window.location.origin).toString()
const preloaderTopMarks = ['YT', 'IG', 'X', 'TT', 'SR']
const preloaderBottomMarks = ['01', '02', '03', '04', '05', '06']

useHmrInViewReveal()
useHmrTextReveal()

const primaryNav = computed<HmrNavItem[]>(() => [
  { key: 'home', label: t('nav.home'), to: '/', icon: 'home' },
  { key: 'explore', label: t('nav.explore'), to: '/explore', icon: 'explore' },
  { key: 'community', label: t('nav.community'), to: '/community', icon: 'community' },
  { key: 'schedule', label: t('nav.schedule'), to: '/schedule', icon: 'schedule' },
])

const localeBadge = computed(() => {
  if (locale.value === 'ja-JP') return 'JA'
  if (locale.value === 'en-US') return 'EN'
  return 'ZH'
})

const activeNavKey = computed(() => {
  if (route.name === 'hmr-home' || route.path === '/') return 'home'

  const navKey = route.meta.navKey
  if (
    navKey === 'explore' ||
    navKey === 'community' ||
    navKey === 'schedule' ||
    navKey === 'settings'
  ) {
    return navKey
  }

  return null
})

const loginTarget = computed(() => ({
  path: '/login',
  query: { redirect: route.fullPath === '/login' ? '/' : route.fullPath },
}))

const registerTarget = computed(() => ({
  path: '/register',
  query: { redirect: route.fullPath === '/register' ? '/' : route.fullPath },
}))

function closeMenu(): void {
  menuOpen.value = false
}

function toggleMenu(): void {
  menuOpen.value = !menuOpen.value
}

function handleNavClick(event: MouseEvent, navigate: (event?: MouseEvent) => void): void {
  navigate(event)
  closeMenu()
}

function shouldKeepAlive(pageKey: unknown): boolean {
  return keepAlivePageKeys.includes(pageKey as HmrPublicPageKey)
}

function shouldShowPreloader(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (
    params.get('skipPreloader') === '1' ||
    window.localStorage.getItem('hmr.qa.skipPreloader') === 'true'
  ) {
    return false
  }
  return window.sessionStorage.getItem(SESSION_PRELOADER_KEY) !== 'true'
}

function markPreloaderSeen(): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(SESSION_PRELOADER_KEY, 'true')
  }
}

function getPreloaderElements() {
  return {
    backdrop: preloaderBackdropRef.value,
    preloader: preloaderRef.value,
    button: preloaderButtonRef.value,
    logo: preloaderLogoRef.value,
    label: preloaderLabelRef.value,
    outroLabel: preloaderOutroLabelRef.value,
    progress: preloaderProgressRef.value,
    revealer: preloaderRevealerRef.value,
  }
}

function setupPreloader(): void {
  warmHmrPriorityRoutes(route.fullPath)
  if (!preloaderVisible.value) return

  const elements = getPreloaderElements()
  const progress = elements.progress
  const button = elements.button

  if (!progress || !button) {
    markPreloaderSeen()
    preloaderVisible.value = false
    return
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const pathLength = progress.getTotalLength()
  gsap.set(progress, {
    strokeDasharray: pathLength,
    strokeDashoffset: pathLength,
  })
  gsap.set(elements.revealer, {
    clipPath: 'inset(0% 0% 0% 0%)',
    opacity: 0,
  })
  gsap.set(elements.preloader, {
    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
  })
  gsap.set(elements.button, {
    scale: prefersReducedMotion ? 1 : 0.86,
    rotate: prefersReducedMotion ? 0 : -16,
  })
  gsap.set([elements.label, elements.outroLabel], {
    yPercent: 105,
    opacity: 0,
  })

  if (prefersReducedMotion) {
    gsap.set(progress, { strokeDashoffset: 0 })
    gsap.set(elements.logo, { opacity: 0, scale: 0.82 })
    gsap.set(elements.label, { yPercent: 0, opacity: 1 })
    preloaderReady.value = true
    markPreloaderSeen()
    return
  }

  preloaderTimeline = gsap
    .timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => {
        preloaderReady.value = true
      },
    })
    .to(elements.backdrop?.querySelectorAll('span') ?? [], {
      opacity: 1,
      yPercent: 0,
      stagger: 0.035,
      duration: 0.42,
    })
    .to(
      elements.button,
      {
        scale: 1,
        rotate: 0,
        duration: 0.9,
        ease: 'elastic.out(1, 0.72)',
      },
      0.05
    )
    .to(
      progress,
      {
        strokeDashoffset: 0,
        duration: 1.35,
        ease: 'power2.inOut',
      },
      0.14
    )
    .to(
      elements.logo,
      {
        scale: 1.08,
        duration: 0.52,
        yoyo: true,
        repeat: 1,
      },
      0.42
    )
    .to(
      elements.logo,
      {
        opacity: 0,
        scale: 0.78,
        duration: 0.36,
      },
      1.28
    )
    .to(
      elements.label,
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.48,
      },
      1.48
    )
}

function completePreloader(): void {
  if (!preloaderReady.value || preloaderOutroTimeline) return

  const elements = getPreloaderElements()
  if (!elements.preloader || !elements.button || !elements.revealer) {
    markPreloaderSeen()
    preloaderVisible.value = false
    return
  }

  preloaderOutroTimeline = gsap
    .timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete: () => {
        markPreloaderSeen()
        preloaderVisible.value = false
      },
    })
    .to(elements.label, {
      yPercent: -105,
      opacity: 0,
      duration: 0.28,
    })
    .to(
      elements.outroLabel,
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.32,
      },
      '<0.04'
    )
    .to(elements.button, {
      scale: 1.18,
      rotate: 90,
      duration: 0.48,
      ease: 'back.inOut(1.6)',
    })
    .to(
      elements.preloader,
      {
        clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)',
        duration: 0.72,
      },
      '<0.08'
    )
    .set(
      elements.revealer,
      {
        opacity: 1,
      },
      '>-0.08'
    )
    .to(
      elements.revealer,
      {
        clipPath: 'inset(0% 0% 0% 100%)',
        duration: 0.82,
      },
      '<'
    )
    .to(
      elements.backdrop,
      {
        opacity: 0,
        duration: 0.58,
      },
      '<'
    )
}

watch(
  () => route.fullPath,
  () => {
    closeMenu()
    warmHmrPriorityRoutes(route.fullPath)
  }
)

onMounted(() => {
  theme.initializeTheme()
  void auth.resolveSession()
  void nextTick(() => setupPreloader())
})

onBeforeUnmount(() => {
  preloaderTimeline?.kill()
  preloaderOutroTimeline?.kill()
})
</script>
