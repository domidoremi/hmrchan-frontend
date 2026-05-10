<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="hostRef"
      class="hmr-desk-pet-host"
      :class="{
        'hmr-desk-pet-host--ready': isReady,
        'hmr-desk-pet-host--static': isStaticMode,
      }"
      :style="hostStyle"
      data-testid="desk-pet-host"
    >
      <DeskPet :state="petState" :static-mode="isStaticMode" :muted="isStaticMode" />
      <button
        class="hmr-desk-pet-close"
        type="button"
        aria-label="关闭桌宠"
        @click="disableDeskPet"
      >
        <span></span>
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'

import DeskPet, { type DeskPetState } from '@/hmr/components/DeskPet.vue'
import { usePreferencesStore } from '@/stores/preferences'

type CooldownKey = 'cta' | 'scroll' | 'idle' | 'patrol'

interface PetPoint {
  x: number
  y: number
}

const homeRouteNames = new Set(['hmr-home'])
const preferencesStore = usePreferencesStore()
const { preferences, animationsAllowed } = storeToRefs(preferencesStore)
const route = useRoute()

const hostRef = ref<HTMLElement | null>(null)
const visible = ref(false)
const isReady = ref(false)
const petState = ref<DeskPetState>('idle')
const position = ref<PetPoint>(fallbackPosition())
const isReducedMotion = ref(false)
const isMobile = ref(false)
const cooldowns = new Map<CooldownKey, number>()
const timers = new Set<number>()

let motionQuery: MediaQueryList | undefined
let mobileQuery: MediaQueryList | undefined
let motionQueryListener: (() => void) | undefined
let mobileQueryListener: (() => void) | undefined
let lastScrollY = 0
let lastScrollAt = 0
let routeFrame: number | undefined

const isHomeRoute = computed(() => homeRouteNames.has(String(route.name)))
const isStaticMode = computed(() => isReducedMotion.value || !animationsAllowed.value)
const canAutoShow = computed(
  () =>
    isHomeRoute.value &&
    preferences.value.deskPet.enabled &&
    preferences.value.deskPet.autoHeroInteraction
)
const hostStyle = computed(() => ({
  '--hmr-desk-pet-x': `${position.value.x}px`,
  '--hmr-desk-pet-y': `${position.value.y}px`,
}))

function fallbackPosition(): PetPoint {
  if (typeof window === 'undefined') return { x: 0, y: 0 }
  return {
    x: Math.max(window.innerWidth - 190, 16),
    y: Math.max(window.innerHeight - 210, 80),
  }
}

function now(): number {
  return Date.now()
}

function setTimer(callback: () => void, delay: number): number {
  const timer = window.setTimeout(() => {
    timers.delete(timer)
    callback()
  }, delay)
  timers.add(timer)
  return timer
}

function clearTimers(): void {
  timers.forEach((timer) => window.clearTimeout(timer))
  timers.clear()
}

function isCoolingDown(key: CooldownKey): boolean {
  return (cooldowns.get(key) ?? 0) > now()
}

function startCooldown(key: CooldownKey, duration: number): void {
  cooldowns.set(key, now() + duration)
}

function setStateFor(duration: number, state: DeskPetState, fallback: DeskPetState = 'idle'): void {
  petState.value = state
  if (isStaticMode.value) return
  setTimer(() => {
    petState.value = fallback
  }, duration)
}

function anchorPosition(): PetPoint {
  const anchor =
    document.querySelector<HTMLElement>('[data-desk-pet-anchor="hero-cta"]') ??
    document.querySelector<HTMLElement>('.hero-btn')
  if (!anchor) return fallbackPosition()

  const rect = anchor.getBoundingClientRect()
  const petWidth = hostRef.value?.getBoundingClientRect().width ?? 104
  const x = Math.min(Math.max(rect.right - petWidth * 0.72, 12), window.innerWidth - petWidth - 12)
  const y = Math.min(Math.max(rect.top - petWidth * 0.98, 72), window.innerHeight - petWidth - 12)
  return { x, y }
}

function perchAtHero(): void {
  position.value = anchorPosition()
}

function playIntro(): void {
  if (isStaticMode.value) {
    petState.value = 'idle'
    isReady.value = true
    return
  }

  petState.value = 'jumping'
  setTimer(() => {
    perchAtHero()
    petState.value = 'idle'
    isReady.value = true
    scheduleIdlePrompt()
    schedulePatrol()
  }, 720)
}

async function showForHome(): Promise<void> {
  clearTimers()
  visible.value = true
  isReady.value = false
  petState.value = 'jumping'
  position.value = fallbackPosition()
  await nextTick()
  perchAtHero()
  playIntro()
}

function hideDeskPet(): void {
  visible.value = false
  isReady.value = false
  clearTimers()
}

function disableDeskPet(): void {
  preferencesStore.setDeskPetEnabled(false)
  hideDeskPet()
}

function handleCtaAttention(): void {
  if (!visible.value || isCoolingDown('cta')) return
  startCooldown('cta', 1800)
  setStateFor(900, 'waving')
}

function handleScroll(): void {
  if (!visible.value || isStaticMode.value || isCoolingDown('scroll')) return
  const currentY = window.scrollY
  const currentAt = now()
  const deltaY = Math.abs(currentY - lastScrollY)
  const deltaT = Math.max(currentAt - lastScrollAt, 1)
  lastScrollY = currentY
  lastScrollAt = currentAt

  if (deltaY / deltaT < 2.8) return
  startCooldown('scroll', 12_000)
  setStateFor(1400, 'failed')
}

function handleResize(): void {
  if (!visible.value) return
  perchAtHero()
}

function scheduleIdlePrompt(): void {
  if (!visible.value || isStaticMode.value) return
  const delay = 25_000 + Math.floor(Math.random() * 15_000)
  setTimer(() => {
    if (!visible.value || isCoolingDown('idle')) return
    startCooldown('idle', 16_000)
    setStateFor(1700, Math.random() > 0.5 ? 'waiting' : 'review')
    scheduleIdlePrompt()
  }, delay)
}

function schedulePatrol(): void {
  if (!visible.value || isStaticMode.value || isMobile.value) return
  setTimer(() => {
    if (!visible.value || isCoolingDown('patrol') || isMobile.value) {
      schedulePatrol()
      return
    }

    startCooldown('patrol', 24_000)
    const direction: DeskPetState = Math.random() > 0.5 ? 'running-right' : 'running-left'
    petState.value = direction
    const travel = Math.min(window.innerWidth * 0.1, 120)
    const sign = direction === 'running-right' ? 1 : -1
    position.value = {
      ...position.value,
      x: Math.min(Math.max(position.value.x + travel * sign, 12), window.innerWidth - 130),
    }
    setTimer(() => {
      petState.value = 'idle'
      perchAtHero()
      schedulePatrol()
    }, 1600)
  }, 18_000)
}

function addAnchorListeners(): void {
  const anchor =
    document.querySelector<HTMLElement>('[data-desk-pet-anchor="hero-cta"]') ??
    document.querySelector<HTMLElement>('.hero-btn')
  if (!anchor) return

  anchor.addEventListener('pointerenter', handleCtaAttention)
  anchor.addEventListener('focus', handleCtaAttention)
  anchor.addEventListener('click', handleCtaAttention)
}

function removeAnchorListeners(): void {
  const anchors = document.querySelectorAll<HTMLElement>(
    '[data-desk-pet-anchor="hero-cta"], .hero-btn'
  )
  anchors.forEach((anchor) => {
    anchor.removeEventListener('pointerenter', handleCtaAttention)
    anchor.removeEventListener('focus', handleCtaAttention)
    anchor.removeEventListener('click', handleCtaAttention)
  })
}

function setupMediaQueries(): void {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  mobileQuery = window.matchMedia('(max-width: 767px)')
  motionQueryListener = () => {
    isReducedMotion.value = Boolean(motionQuery?.matches)
  }
  mobileQueryListener = () => {
    isMobile.value = Boolean(mobileQuery?.matches)
  }
  motionQuery.addEventListener('change', motionQueryListener)
  mobileQuery.addEventListener('change', mobileQueryListener)
  motionQueryListener()
  mobileQueryListener()
}

function cleanupMediaQueries(): void {
  if (motionQuery && motionQueryListener) {
    motionQuery.removeEventListener('change', motionQueryListener)
  }
  if (mobileQuery && mobileQueryListener) {
    mobileQuery.removeEventListener('change', mobileQueryListener)
  }
}

function scheduleRouteSync(): void {
  if (routeFrame !== undefined) {
    window.cancelAnimationFrame(routeFrame)
  }

  routeFrame = window.requestAnimationFrame(() => {
    routeFrame = undefined
    removeAnchorListeners()
    if (!canAutoShow.value) {
      hideDeskPet()
      return
    }

    void showForHome().then(() => {
      addAnchorListeners()
    })
  })
}

watch(canAutoShow, scheduleRouteSync)
watch(isStaticMode, () => {
  if (!visible.value) return
  petState.value = 'idle'
  clearTimers()
  if (!isStaticMode.value) {
    scheduleIdlePrompt()
    schedulePatrol()
  }
})

onMounted(() => {
  preferencesStore.initializePreferences()
  setupMediaQueries()
  scheduleRouteSync()
  lastScrollY = window.scrollY
  lastScrollAt = now()
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleResize, { passive: true })
})

onBeforeUnmount(() => {
  hideDeskPet()
  removeAnchorListeners()
  cleanupMediaQueries()
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
  if (routeFrame !== undefined) {
    window.cancelAnimationFrame(routeFrame)
  }
})
</script>

<style scoped>
.hmr-desk-pet-host {
  position: fixed;
  inset-block-start: 0;
  inset-inline-start: 0;
  z-index: 95;
  display: grid;
  place-items: center;
  pointer-events: none;
  opacity: 0;
  transform: translate3d(var(--hmr-desk-pet-x), var(--hmr-desk-pet-y), 0) scale(0.86);
  transform-origin: 50% 80%;
  transition:
    opacity 260ms var(--hmr-ease),
    transform 520ms var(--hmr-ease);
  will-change: opacity, transform;
}

.hmr-desk-pet-host--ready {
  opacity: 1;
  transform: translate3d(var(--hmr-desk-pet-x), var(--hmr-desk-pet-y), 0) scale(1);
}

.hmr-desk-pet-host--static {
  transition-duration: 1ms;
}

.hmr-desk-pet-close {
  position: absolute;
  inset-block-start: -0.35rem;
  inset-inline-end: -0.35rem;
  display: grid;
  inline-size: 1.6rem;
  aspect-ratio: 1;
  place-items: center;
  border: 1px solid rgb(var(--hmr-base-rgb) / 16%);
  border-radius: 999em;
  background: var(--hmr-bg);
  color: var(--hmr-base);
  cursor: pointer;
  opacity: 0;
  pointer-events: auto;
  transform: scale(0.84);
  transition:
    opacity 180ms var(--hmr-ease),
    transform 220ms var(--hmr-ease);
}

.hmr-desk-pet-close span,
.hmr-desk-pet-close::after {
  position: absolute;
  inline-size: 0.72rem;
  block-size: 0.09rem;
  border-radius: 999em;
  background: currentcolor;
  content: '';
}

.hmr-desk-pet-close span {
  transform: rotate(45deg);
}

.hmr-desk-pet-close::after {
  transform: rotate(-45deg);
}

.hmr-desk-pet-host:hover .hmr-desk-pet-close,
.hmr-desk-pet-close:focus-visible {
  opacity: 1;
  transform: scale(1);
}

@media (max-width: 767px) {
  .hmr-desk-pet-host {
    z-index: 5;
  }
}
</style>
