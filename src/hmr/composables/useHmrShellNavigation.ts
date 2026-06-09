import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import type { HmrNavItem, HmrPublicPageKey } from '@/hmr/types'
import { defaultLocale, localeBadges, supportedLocales, type SupportedLocale } from '@/i18n/locales'
import { createLoginRouteTarget, createRegisterRouteTarget } from '@/router/authTargets'

type HmrShellNavKey = 'home' | 'explore' | 'community' | 'schedule' | 'settings'
type RouterNavigate = (event?: MouseEvent) => void

const KEEP_ALIVE_NAMES = [
  'HomePage',
  'ExplorePage',
  'CommunityPage',
  'SchedulePage',
  'PostDetailPage',
]
const KEEP_ALIVE_PAGE_KEYS = new Set<HmrPublicPageKey>([
  'home',
  'explore',
  'community',
  'schedule',
  'post',
])
const SHELL_NAV_KEYS = new Set<HmrShellNavKey>([
  'home',
  'explore',
  'community',
  'schedule',
  'settings',
])

function isShellNavKey(value: unknown): value is HmrShellNavKey {
  return typeof value === 'string' && SHELL_NAV_KEYS.has(value as HmrShellNavKey)
}

export function useHmrShellNavigation() {
  const route = useRoute()
  const { locale, t } = useI18n({ useScope: 'global' })
  const menuOpen = ref(false)

  const primaryNav = computed<HmrNavItem[]>(() => [
    { key: 'home', label: t('nav.home'), to: '/', icon: 'home' },
    { key: 'explore', label: t('nav.explore'), to: '/explore', icon: 'explore' },
    { key: 'community', label: t('nav.community'), to: '/community', icon: 'community' },
    { key: 'schedule', label: t('nav.schedule'), to: '/schedule', icon: 'schedule' },
  ])

  const localeBadge = computed(() => {
    const currentLocale = supportedLocales.includes(locale.value as SupportedLocale)
      ? (locale.value as SupportedLocale)
      : defaultLocale

    return localeBadges[currentLocale]
  })

  const activeNavKey = computed<HmrShellNavKey | null>(() => {
    if (route.name === 'hmr-home' || route.path === '/') return 'home'
    return isShellNavKey(route.meta.navKey) ? route.meta.navKey : null
  })

  const loginTarget = computed(() => createLoginRouteTarget(route.fullPath, '/'))

  const registerTarget = computed(() => createRegisterRouteTarget(route.fullPath, '/'))

  function closeMenu(): void {
    menuOpen.value = false
  }

  function toggleMenu(): void {
    menuOpen.value = !menuOpen.value
  }

  function handleNavClick(event: MouseEvent, navigate: RouterNavigate): void {
    navigate(event)
    closeMenu()
  }

  function shouldKeepAlive(pageKey: unknown): boolean {
    return typeof pageKey === 'string' && KEEP_ALIVE_PAGE_KEYS.has(pageKey as HmrPublicPageKey)
  }

  return {
    activeNavKey,
    closeMenu,
    handleNavClick,
    keepAliveNames: KEEP_ALIVE_NAMES,
    localeBadge,
    loginTarget,
    menuOpen,
    primaryNav,
    registerTarget,
    shouldKeepAlive,
    toggleMenu,
  }
}
