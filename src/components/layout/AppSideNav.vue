<template>
  <aside
    class="app-side-nav"
    :class="{ 'app-side-nav--chromeless': props.chromeless }"
    :aria-label="$t('common.siteNavigation')"
  >
    <div class="app-side-nav__shell">
      <div class="app-side-nav__section app-side-nav__section--brand">
        <RouterLink
          to="/"
          class="app-side-nav__brand"
          :aria-label="$t('app.name')"
          :title="$t('app.name')"
          @pointermove="handleMagneticMove"
          @pointerleave="resetMagneticMove"
        >
          <BrandPetLogo variant="rail" class="app-side-nav__brand-mark" />
          <span class="sr-only">{{ $t('app.name') }}</span>
        </RouterLink>
      </div>

      <nav
        class="app-side-nav__section app-side-nav__section--primary"
        :aria-label="$t('common.primaryNavigation')"
        @pointerleave="clearDockHover('primary')"
        @focusout="handleDockSectionFocusOut('primary', $event)"
      >
        <RouterLink
          v-for="(item, index) in desktopPrimaryNavItems"
          :key="item.path"
          :to="getNavigationLink(item)"
          class="app-side-nav__link"
          :class="{ 'app-side-nav__link--active': isRouteActive(item.path) }"
          :style="getDockStyle('primary', index, desktopPrimaryNavItems.length)"
          :aria-label="$t(item.i18nKey)"
          :title="$t(item.i18nKey)"
          @mouseenter="prefetchRoute(item.path)"
          @pointerenter="setDockHover('primary', index)"
          @focus="handlePrimaryLinkFocus(item.path, index)"
          @pointermove="handleMagneticMove"
          @pointerleave="resetMagneticMove"
        >
          <component :is="item.icon" class="app-side-nav__icon" aria-hidden="true" />
          <span class="app-side-nav__label" aria-hidden="true">{{ $t(item.i18nKey) }}</span>
          <span class="sr-only">{{ $t(item.i18nKey) }}</span>
        </RouterLink>
      </nav>

      <nav
        class="app-side-nav__section app-side-nav__section--utility"
        :aria-label="$t('common.utilityNavigation')"
        @pointerleave="clearDockHover('utility')"
        @focusout="handleDockSectionFocusOut('utility', $event)"
      >
        <RouterLink
          v-for="(item, index) in utilityNavItems"
          :key="item.path"
          :to="item.to"
          class="app-side-nav__link"
          :class="{ 'app-side-nav__link--active': isRouteActive(item.path) }"
          :style="getDockStyle('utility', index, utilityNavItems.length)"
          :aria-label="$t(item.i18nKey)"
          :title="$t(item.i18nKey)"
          @pointerenter="setDockHover('utility', index)"
          @focus="setDockHover('utility', index)"
          @pointermove="handleMagneticMove"
          @pointerleave="resetMagneticMove"
        >
          <component :is="item.icon" class="app-side-nav__icon" aria-hidden="true" />
          <span class="app-side-nav__label" aria-hidden="true">{{ $t(item.i18nKey) }}</span>
          <span class="sr-only">{{ $t(item.i18nKey) }}</span>
        </RouterLink>
      </nav>
    </div>
  </aside>

  <nav
    ref="mobileDockRef"
    class="app-mobile-dock"
    :class="{ 'app-mobile-dock--chromeless': props.chromeless }"
    :aria-label="$t('common.primaryNavigation')"
  >
    <div class="app-mobile-dock__shell">
      <RouterLink
        v-for="item in mobilePrimaryNavItems"
        :key="item.path"
        :to="getNavigationLink(item)"
        class="app-mobile-dock__link"
        :class="{ 'app-mobile-dock__link--active': isRouteActive(item.path) }"
        :aria-label="$t(item.i18nKey)"
        :title="$t(item.i18nKey)"
        @mouseenter="prefetchRoute(item.path)"
        @focus="prefetchRoute(item.path)"
      >
        <component :is="item.icon" class="app-mobile-dock__icon" aria-hidden="true" />
        <span class="sr-only">{{ $t(item.i18nKey) }}</span>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, type Component } from 'vue'
import { RouterLink, useRoute, type RouteLocationRaw } from 'vue-router'
import { Info, Settings2 } from '@lucide/vue'
import { prefetchAuthorsData, prefetchExploreData } from '@/utils/prefetch'
import { createResizeObserver } from '@/utils/modernAPIs'
import { useNavigation } from '@/composables/useNavigation'
import type { NavigationItem } from '@/config/navigation'
import { withProfileReturnTo } from '@/utils/profileReturnTo'
import { useAuthSurface } from '@/services/authSurface'
import BrandPetLogo from '@/components/brand/BrandPetLogo.vue'

const props = withDefaults(
  defineProps<{
    chromeless?: boolean
  }>(),
  {
    chromeless: false,
  }
)

interface UtilityNavItem {
  path: string
  i18nKey: string
  icon: Component
  to: RouteLocationRaw
}

type DockSection = 'primary' | 'utility'

const MOBILE_DOCK_BREAKPOINT_QUERY = '(max-width: 960px)'

const route = useRoute()
const { isAuthenticated } = useAuthSurface()
const { desktopNavItems, mobileNavItems, getNavigationLink } = useNavigation()

const prefetchedRoutes = new Set<string>()
const hoveredDockIndex = ref<Record<DockSection, number | null>>({
  primary: null,
  utility: null,
})
const mobileDockRef = ref<HTMLElement | null>(null)
const isMobileDockViewport = ref(false)

let mobileDockResizeObserver: ResizeObserver | null = null

const desktopPrimaryNavItems = computed(() =>
  desktopNavItems.value.filter((item) =>
    ['/', '/explore', '/profile/favorites', '/authors', '/community', '/schedule'].includes(
      item.path
    )
  )
)

const mobilePrimaryNavItems = computed(() =>
  mobileNavItems.value.filter((item) =>
    ['/', '/explore', '/authors', '/community', '/schedule', '/about'].includes(item.path)
  )
)

const utilityNavItems = computed<UtilityNavItem[]>(() => [
  {
    path: '/about',
    i18nKey: 'nav.about',
    icon: Info,
    to: '/about',
  },
  {
    path: '/profile/settings',
    i18nKey: 'nav.profileSettings',
    icon: Settings2,
    to: isAuthenticated.value
      ? withProfileReturnTo('/profile/settings', { returnTo: route.fullPath })
      : getNavigationLink({ path: '/profile/settings', requiresAuth: true } as NavigationItem),
  },
])

function isRouteActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(path + '/')
}

function runOncePrefetch(key: string, loader: () => void) {
  if (prefetchedRoutes.has(key)) return
  prefetchedRoutes.add(key)
  loader()
}

function prefetchRoute(path: string) {
  switch (path) {
    case '/explore':
      runOncePrefetch(path, () => {
        import('@/views/ExplorePage.vue').catch(() => {})
        prefetchExploreData()
      })
      return
    case '/profile/favorites':
      runOncePrefetch(path, () => {
        import('@/views/profile/ProfileSectionPage.vue').catch(() => {})
      })
      return
    case '/authors':
      runOncePrefetch(path, () => {
        import('@/views/AuthorsPage.vue').catch(() => {})
        prefetchAuthorsData()
      })
      return
    case '/community':
      runOncePrefetch(path, () => {
        import('@/views/CommunityPage.vue').catch(() => {})
      })
      return
    case '/schedule':
      runOncePrefetch(path, () => {
        import('@/views/SchedulePage.vue').catch(() => {})
      })
      return
    default:
      return
  }
}

function handleMagneticMove(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement | null
  if (!target) return

  const rect = target.getBoundingClientRect()
  const offsetX = ((event.clientX - rect.left) / rect.width - 0.5) * 10
  const offsetY = ((event.clientY - rect.top) / rect.height - 0.5) * 8

  target.style.setProperty('--app-side-nav-magnet-x', `${offsetX.toFixed(2)}px`)
  target.style.setProperty('--app-side-nav-magnet-y', `${offsetY.toFixed(2)}px`)
}

function setDockHover(section: DockSection, index: number) {
  hoveredDockIndex.value[section] = index
}

function handlePrimaryLinkFocus(path: string, index: number) {
  prefetchRoute(path)
  setDockHover('primary', index)
}

function clearDockHover(section: DockSection) {
  hoveredDockIndex.value[section] = null
}

function handleDockSectionFocusOut(section: DockSection, event: FocusEvent) {
  const nextTarget = event.relatedTarget as Node | null
  if (nextTarget && (event.currentTarget as HTMLElement | null)?.contains(nextTarget)) return
  clearDockHover(section)
}

function getDockStyle(
  section: DockSection,
  index: number,
  totalItems: number
): Record<string, string> | undefined {
  if (totalItems < 2) return undefined

  const hoveredIndex = hoveredDockIndex.value[section]
  if (hoveredIndex === null) return undefined

  const distance = Math.abs(index - hoveredIndex)
  const direction = hoveredIndex === index ? 0 : index < hoveredIndex ? -1 : 1
  const linkScale = distance === 0 ? 1.08 : distance === 1 ? 0.94 : 0.97
  const iconScale = distance === 0 ? 1.18 : distance === 1 ? 0.88 : 0.94
  const shift = distance === 0 ? 0 : distance === 1 ? direction * 0.2 : direction * 0.08
  const emphasis = distance === 0 ? 1 : distance === 1 ? 0.9 : 0.78

  return {
    '--app-side-nav-dock-scale': linkScale.toFixed(3),
    '--app-side-nav-dock-icon-scale': iconScale.toFixed(3),
    '--app-side-nav-dock-shift': `${shift.toFixed(3)}rem`,
    '--app-side-nav-dock-emphasis': emphasis.toFixed(3),
  }
}

function resetMagneticMove(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement | null
  if (!target) return

  target.style.setProperty('--app-side-nav-magnet-x', '0px')
  target.style.setProperty('--app-side-nav-magnet-y', '0px')
}

function syncMobileDockHeight() {
  if (typeof document === 'undefined') return

  const nextHeight =
    isMobileDockViewport.value && mobileDockRef.value
      ? `${Math.ceil(mobileDockRef.value.getBoundingClientRect().height)}px`
      : '0px'

  document.documentElement.style.setProperty('--mobile-nav-height', nextHeight)
}

function disconnectMobileDockObserver() {
  mobileDockResizeObserver?.disconnect()
  mobileDockResizeObserver = null
}

function observeMobileDock() {
  if (typeof window === 'undefined' || !isMobileDockViewport.value || !mobileDockRef.value) {
    disconnectMobileDockObserver()
    syncMobileDockHeight()
    return
  }

  disconnectMobileDockObserver()

  if (typeof ResizeObserver !== 'undefined') {
    mobileDockResizeObserver = createResizeObserver(() => {
      syncMobileDockHeight()
    })
    mobileDockResizeObserver?.observe(mobileDockRef.value)
  }

  syncMobileDockHeight()
}

function syncViewportMode() {
  if (typeof window === 'undefined') return
  isMobileDockViewport.value = window.matchMedia(MOBILE_DOCK_BREAKPOINT_QUERY).matches
  void nextTick(() => observeMobileDock())
}

onMounted(() => {
  syncViewportMode()
  window.addEventListener('resize', syncViewportMode)
})

onUnmounted(() => {
  window.removeEventListener('resize', syncViewportMode)
  disconnectMobileDockObserver()
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--mobile-nav-height', '0px')
  }
})
</script>

<style scoped>
.app-side-nav {
  --app-side-nav-item-radius: var(--ui-compat-pill-radius, clamp(1rem, 1.75vw, 1.2rem));
  --app-side-nav-border: color-mix(in srgb, var(--ui-compat-border) 42%, transparent);
  --app-side-nav-border-strong: color-mix(
    in srgb,
    var(--ui-compat-border-strong) 56%,
    rgba(var(--color-primary-rgb), 0.12)
  );
  --app-side-nav-bg: color-mix(in srgb, var(--ui-compat-surface-interactive) 76%, transparent);
  --app-side-nav-hover-bg: color-mix(
    in srgb,
    var(--ui-compat-surface-interactive-strong) 88%,
    transparent
  );
  --app-side-nav-active-bg: color-mix(
    in srgb,
    var(--ui-compat-surface-interactive-strong) 92%,
    rgba(var(--color-primary-rgb), 0.12)
  );
  --app-side-nav-ink: var(--color-text-secondary);
  --app-side-nav-ink-active: var(--color-primary);
  --app-side-nav-label-bg: color-mix(in srgb, var(--ui-compat-surface-elevated) 92%, transparent);
  --app-side-nav-label-border: color-mix(in srgb, var(--ui-compat-border) 46%, transparent);
  --app-side-nav-label-shadow: none;
  position: fixed;
  inset-block: 0;
  inset-inline-start: var(--app-side-nav-inline-start, clamp(0.75rem, 2vw, 1.25rem));
  z-index: calc(var(--z-sticky) + 1);
  inline-size: var(--app-side-nav-width, clamp(2.875rem, 4vw, 3.25rem));
  padding-block: max(env(safe-area-inset-top, 0rem), clamp(0.75rem, 2vw, 1rem))
    max(env(safe-area-inset-bottom, 0rem), clamp(0.75rem, 2vw, 1rem));
  pointer-events: none;
}

.app-side-nav--chromeless {
  --app-side-nav-border: color-mix(in srgb, var(--ui-compat-border) 28%, transparent);
  --app-side-nav-border-strong: color-mix(
    in srgb,
    var(--ui-compat-border-strong) 42%,
    rgba(var(--color-primary-rgb), 0.08)
  );
  --app-side-nav-bg: color-mix(in srgb, var(--ui-compat-surface-interactive) 68%, transparent);
  --app-side-nav-hover-bg: color-mix(
    in srgb,
    var(--ui-compat-surface-interactive) 82%,
    transparent
  );
  --app-side-nav-active-bg: color-mix(
    in srgb,
    var(--ui-compat-surface-interactive-strong) 88%,
    rgba(var(--color-primary-rgb), 0.08)
  );
  --app-side-nav-label-shadow: none;
}

.app-side-nav__shell {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  block-size: 100%;
  gap: var(--app-side-nav-gap, clamp(1rem, 2vw, 1.5rem));
}

.app-side-nav__section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.5rem, 1vw, 0.75rem);
  pointer-events: auto;
}

.app-side-nav__section--primary {
  flex: 1 1 auto;
  justify-content: center;
}

.app-side-nav__brand,
.app-side-nav__link {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 100%;
  block-size: clamp(2.875rem, 4vw, 3.25rem);
  border: 0.0625rem solid var(--app-side-nav-border);
  border-radius: var(--app-side-nav-item-radius);
  background: var(--app-side-nav-bg);
  color: var(--app-side-nav-ink);
  text-decoration: none;
  overflow: visible;
  transition:
    color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out),
    opacity var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-spring);
  box-shadow: none;
  transform: translate3d(
      calc(var(--app-side-nav-magnet-x, 0px) * 0.16),
      calc((var(--app-side-nav-magnet-y, 0px) * 0.16) + var(--app-side-nav-dock-shift, 0rem)),
      0
    )
    scale(var(--app-side-nav-dock-scale, 1));
  opacity: var(--app-side-nav-dock-emphasis, 1);
}

.app-side-nav__brand:hover,
.app-side-nav__link:hover,
.app-side-nav__brand:focus-visible,
.app-side-nav__link:focus-visible {
  border-color: var(--app-side-nav-border-strong);
  background: var(--app-side-nav-hover-bg);
  color: var(--app-side-nav-ink-active);
  box-shadow: none;
}

.app-side-nav--chromeless .app-side-nav__brand,
.app-side-nav--chromeless .app-side-nav__link,
.app-side-nav--chromeless .app-side-nav__brand:hover,
.app-side-nav--chromeless .app-side-nav__link:hover,
.app-side-nav--chromeless .app-side-nav__brand:focus-visible,
.app-side-nav--chromeless .app-side-nav__link:focus-visible,
.app-side-nav--chromeless .app-side-nav__link--active {
  box-shadow: none;
}

.app-side-nav__link--active {
  border-color: var(--app-side-nav-border-strong);
  background: var(--app-side-nav-active-bg);
  color: var(--app-side-nav-ink-active);
  box-shadow: none;
}

.app-side-nav__icon {
  inline-size: 1.125rem;
  block-size: 1.125rem;
  transform: translate3d(0, 0, 0) scale(var(--app-side-nav-dock-icon-scale, 1));
  transition:
    transform var(--duration-fast) var(--ease-out),
    filter var(--duration-fast) var(--ease-out);
}

.app-side-nav__brand:hover .app-side-nav__brand-mark,
.app-side-nav__brand:focus-visible .app-side-nav__brand-mark {
  transform: translate3d(var(--app-side-nav-magnet-x, 0px), var(--app-side-nav-magnet-y, 0px), 0);
  filter: drop-shadow(0 0.45rem 0.85rem rgba(var(--color-primary-rgb), 0.24));
}

.app-side-nav__link:hover .app-side-nav__icon,
.app-side-nav__link:focus-visible .app-side-nav__icon,
.app-side-nav__link--active .app-side-nav__icon {
  transform: translate3d(var(--app-side-nav-magnet-x, 0px), var(--app-side-nav-magnet-y, 0px), 0)
    scale(var(--app-side-nav-dock-icon-scale, 1));
  filter: drop-shadow(0 0.45rem 0.85rem rgba(var(--color-primary-rgb), 0.24));
}

.app-side-nav__label {
  position: absolute;
  inset-inline-start: calc(100% + 0.75rem);
  inset-block-start: 50%;
  display: inline-flex;
  align-items: center;
  min-block-size: 2.375rem;
  padding-inline: 0.8rem;
  border: 0.0625rem solid var(--app-side-nav-label-border);
  border-radius: var(--appearance-radius-control-md);
  background: var(--app-side-nav-label-bg);
  box-shadow: var(--app-side-nav-label-shadow);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  line-height: 1;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transform: translate3d(-0.5rem, -50%, 0);
  transition:
    opacity var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.app-side-nav__link:hover .app-side-nav__label,
.app-side-nav__link:focus-visible .app-side-nav__label {
  opacity: 1;
  transform: translate3d(
    calc(var(--app-side-nav-magnet-x, 0px) * 0.22),
    calc(-50% + (var(--app-side-nav-magnet-y, 0px) * 0.12)),
    0
  );
}

.app-mobile-dock {
  display: none;
}

@media (max-width: 960px) {
  .app-side-nav {
    display: none;
  }

  .app-mobile-dock {
    position: fixed;
    inset-inline: 0;
    inset-block-end: 0;
    z-index: calc(var(--z-sticky) + 2);
    display: flex;
    justify-content: center;
    padding-inline: clamp(0.75rem, 4vw, 1rem);
    padding-block-end: max(env(safe-area-inset-bottom, 0rem), 0.5rem);
    padding-block-start: 0.35rem;
    pointer-events: none;
  }

  .app-mobile-dock__shell {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    align-items: center;
    gap: 0.375rem;
    inline-size: min(100%, 28rem);
    min-inline-size: 0;
    padding: 0.5rem;
    border: 0.0625rem solid color-mix(in srgb, var(--ui-compat-border) 70%, transparent);
    border-radius: 999rem;
    background: color-mix(in srgb, var(--ui-compat-surface-elevated) 82%, transparent);
    box-shadow: var(--ui-compat-shadow-strong);
    backdrop-filter: var(--ui-compat-backdrop);
    -webkit-backdrop-filter: var(--ui-compat-backdrop);
    pointer-events: auto;
  }

  .app-mobile-dock__link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 100%;
    min-inline-size: 0;
    min-block-size: 2.75rem;
    border: 0.0625rem solid transparent;
    border-radius: 999rem;
    color: var(--color-text-secondary);
    text-decoration: none;
    transition:
      transform var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out),
      background-color var(--duration-fast) var(--ease-out),
      border-color var(--duration-fast) var(--ease-out);
  }

  .app-mobile-dock__icon {
    inline-size: 1.125rem;
    block-size: 1.125rem;
    transition:
      transform var(--duration-fast) var(--ease-out),
      filter var(--duration-fast) var(--ease-out);
  }

  .app-mobile-dock__link:hover,
  .app-mobile-dock__link:focus-visible {
    color: var(--color-text-primary);
    background: color-mix(in srgb, var(--ui-compat-surface-interactive) 92%, transparent);
    border-color: color-mix(in srgb, var(--ui-compat-border-strong) 74%, transparent);
  }

  .app-mobile-dock__link--active {
    color: var(--color-primary);
    background: color-mix(
      in srgb,
      var(--ui-compat-surface-interactive-strong) 96%,
      rgba(var(--color-primary-rgb), 0.12)
    );
    border-color: color-mix(
      in srgb,
      var(--ui-compat-border-strong) 74%,
      rgba(var(--color-primary-rgb), 0.18)
    );
    transform: translate3d(0, -0.0625rem, 0) scale(1.04);
  }

  .app-mobile-dock__link--active .app-mobile-dock__icon {
    transform: scale(1.08);
    filter: drop-shadow(0 0.4rem 0.75rem rgba(var(--color-primary-rgb), 0.2));
  }
}
</style>
