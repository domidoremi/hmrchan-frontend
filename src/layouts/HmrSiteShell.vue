<template>
  <div
    class="hmr-site"
    :class="{ 'is-preloading': preloaderVisible }"
    :style="scrollProgressStyle"
    :data-hmr-scene-role="sceneRole"
    :data-hmr-preset-scene-fit="presetSceneFit"
  >
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
      :class="`is-${preloaderPhase}`"
      aria-label="MomiChan loading"
      aria-live="polite"
      role="status"
    >
      <div ref="preloaderOrbRef" class="hmr-preloader-orb" aria-hidden="true">
        <span ref="preloaderLogoRef" class="hmr-preloader-logo hmr-brand-3d" aria-hidden="true">
          <span ref="preloaderPetRef" class="hmr-preloader-pet hmr-brand-3d">
            <HmrBrandSprite
              :state="preloaderBrandState"
              :static-mode="staticMode"
              playback="preloader"
            />
          </span>
        </span>
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
      </div>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, RouterView, useRoute } from 'vue-router'

import HmrBrandSprite, { type HmrBrandSpriteState } from '@/hmr/components/HmrBrandSprite.vue'
import { useHmrAuthDisplay } from '@/hmr/composables/useHmrAuthDisplay'
import { useHmrBrandPet } from '@/hmr/composables/useHmrBrandPet'
import { useHmrCurrentTime } from '@/hmr/composables/useHmrCurrentTime'
import { useHmrInViewReveal } from '@/hmr/composables/useHmrInViewReveal'
import { resolveHmrPresetSceneFit, useHmrSceneRole } from '@/hmr/composables/useHmrSceneRole'
import { useHmrScrollProgress } from '@/hmr/composables/useHmrScrollProgress'
import { useHmrShellNavigation } from '@/hmr/composables/useHmrShellNavigation'
import { useHmrTextReveal } from '@/hmr/composables/useHmrTextReveal'
import { warmHmrPriorityRoutes, warmHmrSessionEntry } from '@/hmr/runtime/hmrRouteWarmup'
import { useThemeStore } from '@/stores/theme'
import { cancelIdleTask, runWhenIdle, type IdleTaskHandle } from '@/utils/performance'

type GsapApi = (typeof import('gsap'))['gsap']
type PreloaderTimeline = {
  kill: () => void
}

const SESSION_PRELOADER_KEY = 'momichan.preloader.seen'
const PRELOADER_MIN_DURATION_MS = 1700
const PRELOADER_MAX_WARMUP_MS = 4500
const REDUCED_PRELOADER_MIN_DURATION_MS = 450
const REDUCED_PRELOADER_MAX_WARMUP_MS = 1200
const ROUTE_WARMUP_STABILIZATION_DELAY_MS = 9000
const ROUTE_WARMUP_IDLE_TIMEOUT_MS = 8000
const ROUTE_WARMUP_IDLE_FALLBACK_DELAY_MS = 3000

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
const preloaderVisible = ref(shouldShowPreloader())
const preloaderPhase = ref<'initial' | 'warming' | 'crossing' | 'complete' | 'exiting'>('initial')
const preloaderRef = ref<HTMLElement | null>(null)
const preloaderBackdropRef = ref<HTMLElement | null>(null)
const preloaderOrbRef = ref<HTMLElement | null>(null)
const preloaderLogoRef = ref<HTMLElement | null>(null)
const preloaderPetRef = ref<HTMLElement | null>(null)
const preloaderProgressRef = ref<SVGCircleElement | null>(null)
const preloaderRevealerRef = ref<HTMLElement | null>(null)
const desktopBrandPetRef = ref<HTMLElement | null>(null)
const mobileBrandPetRef = ref<HTMLElement | null>(null)
const preloaderBrandState = ref<HmrBrandSpriteState>('idle')
let gsapApiPromise: Promise<GsapApi> | undefined
let gsapApi: GsapApi | undefined
let preloaderTimeline: PreloaderTimeline | undefined
let preloaderOutroTimeline: PreloaderTimeline | undefined
let routeWarmupHandle: IdleTaskHandle | undefined
let routeWarmupDelayTimer: number | undefined
let preloaderStarted = false
let preloaderCompletionTimer: number | undefined
let preloaderExitTimer: number | undefined
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
const currentYear = new Date().getFullYear()
const preloaderTopMarks = ['YT', 'IG', 'X', 'TT', 'SR']
const preloaderBottomMarks = ['01', '02', '03', '04', '05', '06']

useHmrInViewReveal()
useHmrTextReveal()

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
    orb: preloaderOrbRef.value,
    logo: preloaderLogoRef.value,
    pet: preloaderPetRef.value,
    progress: preloaderProgressRef.value,
    revealer: preloaderRevealerRef.value,
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function loadGsap(): Promise<GsapApi> {
  gsapApiPromise ??= import('gsap').then((module) => {
    gsapApi = module.gsap
    return module.gsap
  })
  return gsapApiPromise
}

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

function clearPreloaderCompletionTimer(): void {
  if (preloaderCompletionTimer === undefined) return
  window.clearTimeout(preloaderCompletionTimer)
  preloaderCompletionTimer = undefined
}

function clearPreloaderExitTimer(): void {
  if (preloaderExitTimer === undefined) return
  window.clearTimeout(preloaderExitTimer)
  preloaderExitTimer = undefined
}

function finishPreloaderExit(): void {
  clearPreloaderExitTimer()
  markPreloaderSeen()
  preloaderVisible.value = false
  preloaderBrandState.value = 'idle'
  schedulePriorityRouteWarmup()
}

function finishPreloaderCrossing(): void {
  if (!preloaderVisible.value || preloaderOutroTimeline) return
  clearPreloaderCompletionTimer()
  preloaderBrandState.value = 'review'
  preloaderPhase.value = 'complete'
  completePreloader()
}

async function setupPreloader(): Promise<void> {
  if (!preloaderVisible.value) return
  if (preloaderStarted) return
  preloaderStarted = true

  const elements = getPreloaderElements()
  const progress = elements.progress
  const orb = elements.orb

  if (!progress || !orb || !elements.logo || !elements.pet || !elements.revealer) {
    markPreloaderSeen()
    preloaderVisible.value = false
    return
  }

  let gsap: GsapApi
  try {
    gsap = await loadGsap()
  } catch {
    markPreloaderSeen()
    preloaderVisible.value = false
    return
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const minDuration = prefersReducedMotion
    ? REDUCED_PRELOADER_MIN_DURATION_MS
    : PRELOADER_MIN_DURATION_MS
  const maxWarmupMs = prefersReducedMotion
    ? REDUCED_PRELOADER_MAX_WARMUP_MS
    : PRELOADER_MAX_WARMUP_MS
  const pathLength = progress.getTotalLength()
  const startedAt = performance.now()
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
    opacity: 1,
  })
  gsap.set(elements.orb, {
    opacity: prefersReducedMotion ? 1 : 0,
    scale: prefersReducedMotion ? 1 : 0.86,
    rotate: prefersReducedMotion ? 0 : -10,
    transformPerspective: 820,
    transformOrigin: '50% 54%',
  })
  gsap.set(elements.logo, {
    opacity: 1,
    scale: 1,
    xPercent: 0,
    yPercent: 0,
    z: 0,
    rotateX: 0,
    rotateY: 0,
    transformPerspective: 820,
  })
  gsap.set(elements.pet, {
    opacity: 1,
    scale: prefersReducedMotion ? 0.92 : 0.78,
    z: prefersReducedMotion ? 0 : -44,
    rotateX: prefersReducedMotion ? 0 : 11,
    rotateY: prefersReducedMotion ? 0 : -9,
    transformPerspective: 820,
  })

  void warmHmrSessionEntry({
    path: route.fullPath,
    includeHomeBootstrap: route.path === '/',
    includeRouteChunks: false,
    resolveSession: auth.resolveSession,
    timeoutMs: maxWarmupMs,
  }).catch(() => undefined)

  if (prefersReducedMotion) {
    preloaderPhase.value = 'warming'
    preloaderBrandState.value = 'waiting'
    await wait(minDuration)
    preloaderPhase.value = 'complete'
    preloaderBrandState.value = 'review'
    gsap.set(progress, { strokeDashoffset: 0 })
    gsap.set(elements.logo, { opacity: 1, scale: 1, z: 0, rotateX: 0, rotateY: 0 })
    gsap.set(elements.pet, { opacity: 1, scale: 0.92, z: 0, rotateX: 0, rotateY: 0 })
    completePreloader()
    return
  }

  preloaderPhase.value = 'warming'
  preloaderBrandState.value = 'waiting'
  preloaderTimeline = gsap
    .timeline({
      defaults: { ease: 'power3.out' },
    })
    .to(elements.backdrop?.querySelectorAll('span') ?? [], {
      opacity: 1,
      yPercent: 0,
      stagger: 0.024,
      duration: 0.36,
    })
    .to(
      elements.orb,
      {
        opacity: 1,
        scale: 1,
        rotate: 0,
        duration: 0.58,
        ease: 'elastic.out(1, 0.74)',
      },
      0.06
    )
    .to(
      elements.logo,
      {
        opacity: 1,
        duration: 0.42,
      },
      0.18
    )
    .to(
      elements.pet,
      {
        opacity: 1,
        scale: 0.9,
        z: -18,
        rotateX: 6,
        rotateY: -4,
        duration: 0.42,
      },
      0.18
    )
    .to(
      progress,
      {
        strokeDashoffset: pathLength * 0.42,
        duration: 0.72,
        ease: 'power2.inOut',
      },
      0.42
    )
    .call(
      () => {
        preloaderBrandState.value = 'sendingPrompt'
      },
      [],
      0.84
    )

  await wait(minDuration)
  if (!preloaderVisible.value || preloaderOutroTimeline) return

  const elapsed = performance.now() - startedAt
  if (elapsed < minDuration) {
    await wait(minDuration - elapsed)
  }
  if (!preloaderVisible.value || preloaderOutroTimeline) return

  preloaderPhase.value = 'crossing'
  preloaderBrandState.value = 'runningRight'
  preloaderTimeline?.kill()
  clearPreloaderCompletionTimer()
  preloaderCompletionTimer = window.setTimeout(finishPreloaderCrossing, 900)
  preloaderTimeline = gsap
    .timeline({
      defaults: { ease: 'power3.out' },
      onComplete: finishPreloaderCrossing,
    })
    .call(
      () => {
        preloaderBrandState.value = 'jumping'
      },
      [],
      0.34
    )
    .to(progress, {
      strokeDashoffset: 0,
      duration: 0.46,
      ease: 'power2.inOut',
    })
    .to(
      elements.pet,
      {
        scale: 1.2,
        yPercent: -34,
        z: 150,
        rotateX: -18,
        rotateY: 16,
        duration: 0.26,
        ease: 'back.out(1.5)',
      },
      '<0.04'
    )
    .to(elements.pet, {
      scale: 0.94,
      yPercent: 0,
      z: 36,
      rotateX: 0,
      rotateY: 0,
      duration: 0.24,
      ease: 'power3.inOut',
    })
}

function completePreloader(): void {
  if (preloaderOutroTimeline) return
  clearPreloaderCompletionTimer()

  const elements = getPreloaderElements()
  const gsap = gsapApi
  if (!gsap || !elements.preloader || !elements.orb || !elements.revealer || !elements.pet) {
    preloaderPhase.value = 'exiting'
    finishPreloaderExit()
    return
  }

  preloaderPhase.value = 'exiting'
  preloaderExitTimer = window.setTimeout(finishPreloaderExit, 900)
  preloaderOutroTimeline = gsap
    .timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete: finishPreloaderExit,
    })
    .to(
      elements.pet,
      {
        opacity: 0,
        scale: 1.06,
        z: 120,
        duration: 0.2,
      },
      '<'
    )
    .to(
      elements.orb,
      {
        scale: 1.16,
        rotate: 14,
        opacity: 0,
        duration: 0.24,
        ease: 'back.in(1.4)',
      },
      '<0.04'
    )
    .to(
      elements.preloader,
      {
        opacity: 0,
        duration: 0.3,
      },
      '<0.08'
    )
    .set(
      elements.revealer,
      {
        opacity: 1,
      },
      '>-0.12'
    )
    .to(
      elements.revealer,
      {
        clipPath: 'inset(0% 0% 0% 100%)',
        duration: 0.34,
      },
      '<'
    )
    .to(
      elements.backdrop,
      {
        opacity: 0,
        duration: 0.28,
      },
      '<'
    )
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
  if (!preloaderVisible.value) {
    void auth.resolveSession()
    schedulePriorityRouteWarmup()
  }
  void nextTick(() => setupPreloader())
})

onBeforeUnmount(() => {
  cancelIdleTask(routeWarmupHandle)
  clearRouteWarmupDelayTimer()
  preloaderTimeline?.kill()
  preloaderOutroTimeline?.kill()
  clearPreloaderCompletionTimer()
  clearPreloaderExitTimer()
})
</script>
