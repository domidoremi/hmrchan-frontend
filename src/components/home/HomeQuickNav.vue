<template>
  <nav
    ref="navRef"
    class="home-quick-nav"
    :class="{ 'is-dragging': isDragging }"
    :data-side="side"
    :aria-label="$t('home.quickNav.ariaLabel')"
    :style="quickNavStyle"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
  >
    <button
      v-for="anchor in anchors"
      :key="anchor.id"
      type="button"
      class="home-quick-nav__item"
      :class="{ 'is-active': anchor.id === activeId }"
      :aria-label="$t(anchor.labelKey)"
      :aria-current="anchor.id === activeId ? 'location' : undefined"
      @click="handleNavigate(anchor.id)"
    >
      <component :is="anchor.icon" :size="18" stroke-width="1.8" aria-hidden="true" />
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { HomeSectionAnchor } from '@/config/homeSections'

defineOptions({ name: 'HomeQuickNav' })

const props = defineProps<{
  anchors: readonly HomeSectionAnchor[]
  activeId: HomeSectionAnchor['id']
  side: 'left' | 'right'
}>()

const emit = defineEmits<{
  navigate: [target: HomeSectionAnchor['id']]
  'update:side': [side: 'left' | 'right']
}>()

const MOBILE_BREAKPOINT_QUERY = '(max-width: 960px)'
const DRAG_START_THRESHOLD_PX = 8

const navRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dragOffsetX = ref(0)
const activePointerId = ref<number | null>(null)
const pointerStartX = ref(0)
const pointerStartY = ref(0)
const shouldSuppressClick = ref(false)

const quickNavStyle = computed<Record<string, string>>(() => ({
  '--home-quick-nav-drag-x': `${dragOffsetX.value}px`,
}))

function isMobileQuickNav(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches
}

function resetDragState() {
  isDragging.value = false
  dragOffsetX.value = 0
  activePointerId.value = null
}

function handleNavigate(target: HomeSectionAnchor['id']) {
  if (shouldSuppressClick.value) {
    shouldSuppressClick.value = false
    return
  }

  emit('navigate', target)
}

function handlePointerDown(event: PointerEvent) {
  if (!isMobileQuickNav() || event.pointerType === 'mouse') return

  activePointerId.value = event.pointerId
  pointerStartX.value = event.clientX
  pointerStartY.value = event.clientY
  shouldSuppressClick.value = false
  navRef.value?.setPointerCapture?.(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  if (activePointerId.value !== event.pointerId || !isMobileQuickNav()) return

  const deltaX = event.clientX - pointerStartX.value
  const deltaY = event.clientY - pointerStartY.value

  if (!isDragging.value) {
    if (Math.hypot(deltaX, deltaY) < DRAG_START_THRESHOLD_PX) return
    isDragging.value = true
    shouldSuppressClick.value = true
  }

  dragOffsetX.value = deltaX
}

function commitDrag(event: PointerEvent) {
  if (activePointerId.value !== event.pointerId) return

  const didDrag = isDragging.value
  const nextSide =
    typeof window !== 'undefined' && event.clientX <= window.innerWidth / 2 ? 'left' : 'right'

  navRef.value?.releasePointerCapture?.(event.pointerId)
  resetDragState()

  if (didDrag && nextSide !== props.side) {
    emit('update:side', nextSide)
  }

  if (didDrag && typeof window !== 'undefined') {
    window.setTimeout(() => {
      shouldSuppressClick.value = false
    }, 0)
  }
}

function handlePointerUp(event: PointerEvent) {
  commitDrag(event)
}

function handlePointerCancel(event: PointerEvent) {
  commitDrag(event)
}

onBeforeUnmount(() => {
  resetDragState()
})
</script>

<style scoped>
.home-quick-nav {
  position: fixed;
  inset-inline-end: clamp(1rem, 2.6vw, 2rem);
  inset-block-start: 50%;
  z-index: calc(var(--z-sticky) + 4);
  display: grid;
  gap: 0.625rem;
  transform: translateY(-50%);
  transition:
    inset-inline-start var(--duration-fast) var(--ease-out),
    inset-inline-end var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
  --quick-nav-item-border: rgba(15, 23, 42, 0.06);
  --quick-nav-item-bg: rgba(255, 255, 255, 0.34);
  --quick-nav-item-color: color-mix(in srgb, var(--color-text-primary) 72%, transparent);
  --quick-nav-item-active-bg: rgba(255, 255, 255, 0.62);
  --quick-nav-item-active-border: rgba(var(--color-primary-rgb), 0.22);
  --quick-nav-item-active-color: var(--color-primary);
  --quick-nav-rail-border: rgba(15, 23, 42, 0.05);
  --quick-nav-rail-bg: rgba(255, 255, 255, 0.32);
}

.home-quick-nav__item {
  inline-size: 2.625rem;
  block-size: 2.625rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0.0625rem solid var(--quick-nav-item-border);
  border-radius: 999rem;
  background: var(--quick-nav-item-bg);
  color: var(--quick-nav-item-color);
  box-shadow: 0 1rem 2.25rem -1.9rem rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(0.25rem);
  -webkit-backdrop-filter: blur(0.25rem);
  transition:
    transform var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out);
}

.home-quick-nav__item:hover {
  transform: translate3d(0, -0.125rem, 0);
  border-color: rgba(var(--color-primary-rgb), 0.2);
  color: var(--color-text-primary);
}

.home-quick-nav__item.is-active {
  background: var(--quick-nav-item-active-bg);
  border-color: var(--quick-nav-item-active-border);
  color: var(--quick-nav-item-active-color);
  transform: scale(1.04);
}

@media (max-width: 960px) {
  .home-quick-nav {
    inset-block-start: 50%;
    inset-block-end: auto;
    display: grid;
    gap: 0.5rem;
    padding: 0.5rem;
    border: 0.0625rem solid var(--quick-nav-rail-border);
    border-radius: 999rem;
    background: var(--quick-nav-rail-bg);
    box-shadow: 0 1.1rem 2.2rem -1.85rem rgba(15, 23, 42, 0.2);
    backdrop-filter: blur(0.5rem);
    -webkit-backdrop-filter: blur(0.5rem);
    transform: translate3d(var(--home-quick-nav-drag-x, 0px), -50%, 0);
    touch-action: none;
  }

  .home-quick-nav[data-side='left'] {
    inset-inline-start: calc(env(safe-area-inset-left, 0rem) + 0.75rem);
    inset-inline-end: auto;
  }

  .home-quick-nav[data-side='right'] {
    inset-inline-start: auto;
    inset-inline-end: calc(env(safe-area-inset-right, 0rem) + 0.75rem);
  }

  .home-quick-nav.is-dragging {
    transition: none;
  }

  .home-quick-nav__item {
    inline-size: 2.5rem;
    block-size: 2.5rem;
    background: transparent;
    box-shadow: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-quick-nav,
  .home-quick-nav__item {
    transition: none;
  }
}
</style>
