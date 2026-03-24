<template>
  <aside class="app-side-nav" :aria-label="$t('common.siteNavigation')">
    <div class="app-side-nav__shell">
      <div class="app-side-nav__section app-side-nav__section--brand">
        <RouterLink
          to="/"
          class="app-side-nav__brand"
          :aria-label="$t('app.name')"
          :title="$t('app.name')"
        >
          <span class="app-side-nav__brand-mark">M</span>
          <span class="sr-only">{{ $t('app.name') }}</span>
        </RouterLink>
      </div>

      <nav
        class="app-side-nav__section app-side-nav__section--primary"
        :aria-label="$t('common.primaryNavigation')"
      >
        <RouterLink
          v-for="item in primaryNavItems"
          :key="item.path"
          :to="getNavigationLink(item)"
          class="app-side-nav__link"
          :class="{ 'app-side-nav__link--active': isRouteActive(item.path) }"
          :aria-label="$t(item.i18nKey)"
          :title="$t(item.i18nKey)"
          @mouseenter="prefetchRoute(item.path)"
          @focus="prefetchRoute(item.path)"
        >
          <component :is="item.icon" class="app-side-nav__icon" aria-hidden="true" />
          <span class="sr-only">{{ $t(item.i18nKey) }}</span>
        </RouterLink>
      </nav>

      <nav
        class="app-side-nav__section app-side-nav__section--utility"
        :aria-label="$t('common.utilityNavigation')"
      >
        <RouterLink
          v-for="item in utilityNavItems"
          :key="item.path"
          :to="item.to"
          class="app-side-nav__link"
          :class="{ 'app-side-nav__link--active': isRouteActive(item.path) }"
          :aria-label="$t(item.i18nKey)"
          :title="$t(item.i18nKey)"
        >
          <component :is="item.icon" class="app-side-nav__icon" aria-hidden="true" />
          <span class="sr-only">{{ $t(item.i18nKey) }}</span>
        </RouterLink>
      </nav>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { RouterLink, useRoute, type RouteLocationRaw } from 'vue-router'
import { Info, Settings2 } from 'lucide-vue-next'
import { prefetchAuthorsData, prefetchExploreData } from '@/utils/prefetch'
import { useNavigation } from '@/composables/useNavigation'
import type { NavigationItem } from '@/config/navigation'

interface UtilityNavItem {
  path: string
  i18nKey: string
  icon: Component
  to: RouteLocationRaw
}

const route = useRoute()
const { desktopNavItems, getNavigationLink } = useNavigation()

const prefetchedRoutes = new Set<string>()

const primaryNavItems = computed(() =>
  desktopNavItems.value.filter((item) =>
    ['/', '/explore', '/favorites', '/authors', '/community', '/schedule'].includes(item.path)
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
    to: getNavigationLink({ path: '/profile/settings', requiresAuth: true } as NavigationItem),
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
    case '/favorites':
      runOncePrefetch(path, () => {
        import('@/views/FavoritesPage.vue').catch(() => {})
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
</script>

<style scoped>
.app-side-nav {
  position: fixed;
  inset-block-start: calc(var(--navbar-visible-height) + clamp(0.75rem, 2vw, 1rem));
  inset-block-end: clamp(0.75rem, 2vw, 1rem);
  inset-inline-start: clamp(0.75rem, 2vw, 1.25rem);
  z-index: calc(var(--z-sticky) + 1);
  inline-size: clamp(3.5rem, 5vw, 4rem);
  pointer-events: none;
}

.app-side-nav__shell {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  block-size: 100%;
  gap: clamp(1rem, 2vw, 1.5rem);
}

.app-side-nav__section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
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
  inline-size: clamp(3rem, 4vw, 3.5rem);
  block-size: clamp(3rem, 4vw, 3.5rem);
  border: 0.0625rem solid rgba(148, 163, 184, 0.18);
  border-radius: 999rem;
  background: transparent;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition:
    color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.app-side-nav__brand:hover,
.app-side-nav__link:hover,
.app-side-nav__brand:focus-visible,
.app-side-nav__link:focus-visible {
  border-color: rgba(var(--color-primary-rgb), 0.24);
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-primary);
  transform: translate3d(0.125rem, 0, 0);
}

.app-side-nav__link--active {
  border-color: rgba(var(--color-primary-rgb), 0.26);
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-primary);
}

.app-side-nav__brand-mark {
  font-size: clamp(1rem, 1.5vw, 1.125rem);
  font-weight: var(--font-bold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.app-side-nav__icon {
  inline-size: 1.125rem;
  block-size: 1.125rem;
}

@media (max-width: 960px) {
  .app-side-nav {
    display: none;
  }
}

:global(#app[data-theme='dark'] .app-side-nav__brand),
:global(#app[data-theme='dark'] .app-side-nav__link),
:global([data-theme='dark'] .app-side-nav__brand),
:global([data-theme='dark'] .app-side-nav__link) {
  border-color: rgba(255, 255, 255, 0.12);
  color: var(--color-text-secondary);
}

:global(#app[data-theme='dark'] .app-side-nav__brand:hover),
:global(#app[data-theme='dark'] .app-side-nav__link:hover),
:global(#app[data-theme='dark'] .app-side-nav__brand:focus-visible),
:global(#app[data-theme='dark'] .app-side-nav__link:focus-visible),
:global([data-theme='dark'] .app-side-nav__brand:hover),
:global([data-theme='dark'] .app-side-nav__link:hover),
:global([data-theme='dark'] .app-side-nav__brand:focus-visible),
:global([data-theme='dark'] .app-side-nav__link:focus-visible) {
  background: rgba(255, 255, 255, 0.08);
}

:global(#app[data-theme='dark'] .app-side-nav__link--active),
:global([data-theme='dark'] .app-side-nav__link--active) {
  background: rgba(255, 255, 255, 0.1);
}
</style>
