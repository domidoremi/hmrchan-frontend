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
  --app-side-nav-item-radius: 999rem;
  --app-side-nav-border: var(--chrome-action-border);
  --app-side-nav-border-strong: var(--chrome-action-border-strong);
  --app-side-nav-bg: transparent;
  --app-side-nav-hover-bg: var(--chrome-muted-bg);
  --app-side-nav-active-bg: color-mix(
    in srgb,
    var(--chrome-muted-bg-strong) 78%,
    rgba(var(--color-primary-rgb), 0.12)
  );
  --app-side-nav-ink: var(--color-text-secondary);
  --app-side-nav-ink-active: var(--color-primary);
  position: fixed;
  inset-block: 0;
  inset-inline-start: var(--app-side-nav-inline-start, clamp(0.75rem, 2vw, 1.25rem));
  z-index: calc(var(--z-sticky) + 1);
  inline-size: var(--app-side-nav-width, clamp(3.5rem, 5vw, 4rem));
  padding-block: max(env(safe-area-inset-top, 0rem), clamp(0.75rem, 2vw, 1rem))
    max(env(safe-area-inset-bottom, 0rem), clamp(0.75rem, 2vw, 1rem));
  pointer-events: none;
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
  border: 0.0625rem solid var(--app-side-nav-border);
  border-radius: var(--app-side-nav-item-radius);
  background: var(--app-side-nav-bg);
  color: var(--app-side-nav-ink);
  text-decoration: none;
  transition:
    color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  box-shadow: none;
}

.app-side-nav__brand:hover,
.app-side-nav__link:hover,
.app-side-nav__brand:focus-visible,
.app-side-nav__link:focus-visible {
  border-color: var(--app-side-nav-border-strong);
  background: var(--app-side-nav-hover-bg);
  color: var(--app-side-nav-ink-active);
  transform: translate3d(0.125rem, 0, 0);
}

.app-side-nav__link--active {
  border-color: var(--app-side-nav-border-strong);
  background: var(--app-side-nav-active-bg);
  color: var(--app-side-nav-ink-active);
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

:global(#app[data-ui-style='material'] .app-side-nav),
:global([data-ui-style='material'] .app-side-nav) {
  --app-side-nav-item-radius: var(--ui-radius-button, var(--radius-xl));
  --app-side-nav-hover-bg: color-mix(
    in srgb,
    var(--chrome-muted-bg) 74%,
    rgba(var(--color-primary-rgb), 0.1)
  );
  --app-side-nav-active-bg: color-mix(
    in srgb,
    var(--chrome-muted-bg-strong) 72%,
    rgba(var(--color-primary-rgb), 0.16)
  );
  --app-side-nav-border: var(--ui-surface-border);
}

:global(#app[data-theme='dark'] .app-side-nav),
:global([data-theme='dark'] .app-side-nav) {
  --app-side-nav-border: color-mix(
    in srgb,
    var(--chrome-action-border) 82%,
    rgba(255, 255, 255, 0.12)
  );
  --app-side-nav-border-strong: color-mix(
    in srgb,
    var(--chrome-action-border-strong) 78%,
    rgba(var(--color-primary-rgb), 0.18)
  );
}

:global(#app[data-theme='blue'] .app-side-nav),
:global([data-theme='blue'] .app-side-nav) {
  --app-side-nav-hover-bg: color-mix(in srgb, var(--chrome-muted-bg) 72%, rgba(59, 130, 246, 0.08));
  --app-side-nav-active-bg: color-mix(
    in srgb,
    var(--chrome-muted-bg-strong) 68%,
    rgba(59, 130, 246, 0.16)
  );
}
</style>
