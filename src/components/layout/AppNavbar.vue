<template>
  <nav ref="navbarRef" class="navbar navbar--minimal" :class="{ 'navbar-hidden': isNavbarHidden }">
    <div class="container navbar-content">
      <div class="navbar-shell" :class="{ 'navbar-shell--actions-only': !isMobile }">
        <RouterLink v-if="isMobile" to="/" class="navbar-brand" :aria-label="$t('app.name')">
          <span class="navbar-brand__meta">
            <span class="brand-name gradient-text">{{ $t('app.name') }}</span>
          </span>
        </RouterLink>

        <div
          class="navbar-actions"
          @mouseleave="handleNavbarActionsLeave"
          @focusout="handleNavbarActionsFocusOut"
        >
          <form
            v-if="!isMobile"
            class="nav-search-shell"
            :class="{ 'nav-search-shell--expanded': isDesktopSearchExpanded }"
            role="search"
            @submit.prevent="handleDesktopSearchSubmit"
            @mouseenter="expandDesktopSearch()"
            @mouseleave="collapseDesktopSearch()"
            @focusin="expandDesktopSearch(false)"
            @focusout="handleDesktopSearchFocusOut"
          >
            <label class="nav-search-shell__field" :for="desktopSearchInputId">
              <span class="sr-only">{{ $t('common.search') }}</span>
              <input
                :id="desktopSearchInputId"
                ref="desktopSearchInputRef"
                v-model="desktopSearchQuery"
                type="search"
                class="nav-search-shell__input"
                :placeholder="$t('common.search')"
                autocomplete="off"
                enterkeyhint="search"
                @keydown.esc.prevent="handleDesktopSearchEscape"
              />
            </label>
            <button
              type="submit"
              class="nav-action-btn nav-action-btn--pill nav-action-btn--search"
              @mouseenter="prefetchSearchPage"
              @focus="prefetchSearchPage"
              :aria-label="$t('common.search')"
            >
              <AnimatedIcon name="search" :fallback-icon="Search" size="md" />
              <span class="sr-only">{{ $t('common.search') }}</span>
            </button>
          </form>

          <button
            v-else
            type="button"
            class="nav-action-btn nav-action-btn--pill nav-action-btn--search"
            @click="goToSearch"
            @mouseenter="prefetchSearchPage"
            @focus="prefetchSearchPage"
            :aria-label="$t('common.search')"
          >
            <AnimatedIcon name="search" :fallback-icon="Search" size="md" />
            <span class="nav-action-btn__label">{{ $t('common.search') }}</span>
          </button>

          <button
            v-if="isMobile"
            type="button"
            ref="routeBtnRef"
            class="nav-action-btn nav-action-btn--square nav-route-btn"
            :class="{ 'nav-action-btn--active': showRouteMenu }"
            :aria-label="$t('common.primaryNavigation')"
            :aria-expanded="showRouteMenu"
            aria-haspopup="dialog"
            :aria-controls="showRouteMenu ? 'navbar-route-menu' : undefined"
            @click="toggleRouteMenu"
          >
            <AnimatedIcon name="explore" :fallback-icon="Menu" size="md" :active="showRouteMenu" />
            <span class="nav-action-btn__label">{{ $t('common.primaryNavigation') }}</span>
          </button>

          <button
            type="button"
            ref="settingsBtnRef"
            class="nav-action-btn nav-action-btn--square"
            :class="{ 'nav-action-btn--active': showSettings }"
            @click="toggleSettings"
            @mouseenter="prefetchSettingsPanel"
            @focus="prefetchSettingsPanel"
            :aria-label="$t('nav.settings')"
            :aria-expanded="showSettings"
            aria-haspopup="dialog"
            :aria-controls="showSettings ? 'navbar-settings-panel' : undefined"
          >
            <AnimatedIcon
              name="sparkle"
              :fallback-icon="Settings"
              size="md"
              :active="showSettings"
            />
          </button>

          <RouterLink
            v-if="!isAuthenticated"
            :to="{
              path: '/login',
              query: {
                redirect:
                  $route.path !== '/' && $route.path !== '/login' && $route.path !== '/register'
                    ? $route.fullPath
                    : undefined,
              },
            }"
            class="login-btn nav-action-btn nav-action-btn--primary"
            :aria-label="$t('nav.login')"
            @mouseenter="prefetchLoginPage"
            @focus="prefetchLoginPage"
          >
            <AnimatedIcon name="user" :fallback-icon="LogIn" size="sm" />
            <span class="desktop-only">{{ $t('nav.login') }}</span>
          </RouterLink>

          <button
            v-else
            type="button"
            ref="userBtnRef"
            class="nav-user-btn"
            :class="{ 'nav-user-btn--active': showUserMenu }"
            :aria-label="$t('nav.profile')"
            :aria-expanded="showUserMenu"
            aria-haspopup="menu"
            :aria-controls="showUserMenu ? 'navbar-user-menu' : undefined"
            @click="toggleUserMenu"
          >
            <Avatar
              :src="userAvatar"
              :alt="user?.username"
              :fallback="userAvatarFallbackLabel"
              size="custom"
              loading="eager"
              class="nav-user-avatar"
            />
            <div class="nav-user-status" />
          </button>
        </div>
      </div>
    </div>

    <!-- Settings Dropdown -->
    <Transition name="dropdown">
      <div
        v-if="showRouteMenu && isMobile"
        id="navbar-route-menu"
        ref="routeDropdownRef"
        v-click-outside="{ handler: () => closeRouteMenu(), include: [routeBtnRef] }"
        class="route-dropdown glass-dropdown"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('common.primaryNavigation')"
        tabindex="-1"
        @click.stop
      >
        <div class="route-dropdown__grid">
          <RouterLink
            v-for="item in mobileRouteItems"
            :key="item.path"
            :to="getNavigationLink(item)"
            class="route-dropdown__link"
            :class="{ 'route-dropdown__link--active': isRouteActive(item.path) }"
            @click="closeRouteMenu()"
            @mouseenter="prefetchMobileRoute(item.path)"
            @focus="prefetchMobileRoute(item.path)"
          >
            <component :is="item.icon" class="route-dropdown__icon" aria-hidden="true" />
            <span>{{ $t(item.i18nKey) }}</span>
          </RouterLink>
        </div>
        <div class="route-dropdown__footer">
          <RouterLink to="/about" class="route-dropdown__utility" @click="closeRouteMenu()">
            <Info class="route-dropdown__icon" aria-hidden="true" />
            <span>{{ $t('nav.about') }}</span>
          </RouterLink>
        </div>
      </div>
    </Transition>

    <!-- Settings Dropdown -->
    <Transition name="dropdown">
      <div
        v-if="showSettings"
        id="navbar-settings-panel"
        ref="settingsDropdownRef"
        v-click-outside="{ handler: () => closeSettings(), include: [settingsBtnRef] }"
        class="settings-dropdown glass-dropdown"
        :data-positioned="isSettingsDropdownPositioned"
        :style="settingsDropdownStyle"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('nav.settings')"
        tabindex="-1"
        @click.stop
      >
        <SettingsPanel @close="closeSettings()" />
      </div>
    </Transition>

    <!-- User Menu Dropdown -->
    <Transition name="dropdown">
      <div
        v-if="showUserMenu && isAuthenticated"
        id="navbar-user-menu"
        ref="userDropdownRef"
        v-click-outside="{ handler: () => closeUserMenu(), include: [userBtnRef] }"
        class="user-dropdown glass-dropdown"
        :data-positioned="isUserDropdownPositioned"
        :style="userDropdownStyle"
        role="menu"
        :aria-label="$t('nav.profile')"
        tabindex="-1"
        @click.stop
      >
        <div class="user-menu-shell">
          <div class="user-info">
            <div class="user-avatar-wrapper">
              <Avatar
                :src="userAvatar"
                :alt="user ? getUserDisplayName(user) : ''"
                :fallback="userAvatarFallbackLabel"
                size="custom"
                loading="eager"
                class="user-avatar-lg"
              />
              <div class="nav-user-status nav-user-status--lg" />
            </div>
            <div class="user-details">
              <div class="user-menu-eyebrow">{{ $t('profile.summary') }}</div>
              <div class="user-name">{{ user ? getUserDisplayName(user) : '' }}</div>
              <div class="user-email">{{ user?.email }}</div>
            </div>
          </div>

          <div class="user-menu-primary">
            <RouterLink
              to="/profile"
              class="dropdown-link user-menu-card"
              role="menuitem"
              @click="showUserMenu = false"
            >
              <div class="dropdown-link-icon user-menu-card__icon">
                <AnimatedIcon name="user" :fallback-icon="User" size="sm" />
              </div>
              <span class="user-menu-card__label">{{ $t('nav.profile') }}</span>
              <AnimatedIcon
                name="explore"
                :fallback-icon="ChevronRight"
                size="sm"
                class="dropdown-link-arrow user-menu-card__arrow"
              />
            </RouterLink>
            <RouterLink
              to="/profile/settings"
              class="dropdown-link user-menu-card"
              role="menuitem"
              @click="showUserMenu = false"
              @mouseenter="prefetchProfileSettingsPage"
              @focus="prefetchProfileSettingsPage"
            >
              <div class="dropdown-link-icon user-menu-card__icon">
                <AnimatedIcon name="sparkle" :fallback-icon="Settings" size="sm" />
              </div>
              <span class="user-menu-card__label">{{ $t('nav.profileSettings') }}</span>
              <AnimatedIcon
                name="explore"
                :fallback-icon="ChevronRight"
                size="sm"
                class="dropdown-link-arrow user-menu-card__arrow"
              />
            </RouterLink>
            <RouterLink
              to="/profile/notifications"
              class="dropdown-link user-menu-card"
              role="menuitem"
              @click="showUserMenu = false"
            >
              <div class="dropdown-link-icon user-menu-card__icon">
                <AnimatedIcon name="sparkle" :fallback-icon="Bell" size="sm" />
              </div>
              <span class="user-menu-card__label">{{ $t('profile.tabs.notifications') }}</span>
              <AnimatedIcon
                name="explore"
                :fallback-icon="ChevronRight"
                size="sm"
                class="dropdown-link-arrow user-menu-card__arrow"
              />
            </RouterLink>
            <RouterLink
              to="/profile/devices"
              class="dropdown-link user-menu-card"
              role="menuitem"
              @click="showUserMenu = false"
            >
              <div class="dropdown-link-icon user-menu-card__icon">
                <AnimatedIcon name="explore" :fallback-icon="Smartphone" size="sm" />
              </div>
              <span class="user-menu-card__label">{{ $t('profile.tabs.devices') }}</span>
              <AnimatedIcon
                name="explore"
                :fallback-icon="ChevronRight"
                size="sm"
                class="dropdown-link-arrow user-menu-card__arrow"
              />
            </RouterLink>
          </div>

          <Separator />
        </div>

        <div class="dropdown-links dropdown-links--secondary">
          <button
            type="button"
            class="dropdown-link dropdown-link--danger"
            role="menuitem"
            @click="handleLogout"
          >
            <div class="dropdown-link-icon dropdown-link-icon--danger">
              <AnimatedIcon name="sparkle" :fallback-icon="LogOut" size="sm" />
            </div>
            <span>{{ $t('nav.logout') }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </nav>
</template>

<script setup lang="ts">
import {
  computed,
  ref,
  watch,
  onMounted,
  onUnmounted,
  defineAsyncComponent,
  nextTick,
  useTemplateRef,
} from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  Bell,
  ChevronRight,
  Info,
  LogIn,
  LogOut,
  Menu,
  Search,
  Settings,
  Smartphone,
  User,
} from '@lucide/vue'
import { useAuthStore } from '@/stores'
import { getAvatarFallbackLabel } from '@/utils/avatarPresentation'
import { getUserDisplayName } from '@/utils/user'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { useUserAvatar, preloadUserAvatar } from '@/composables/useUserAvatar'
import { prefetchExploreData, prefetchAuthorsData } from '@/utils/prefetch'
import { runWhenIdle, throttleRAF, scheduleDOMUpdate } from '@/utils/performance'
import { resolveNavbarDropdownPosition } from '@/components/layout/navbarDropdownPosition'
import { useNavigation } from '@/composables/useNavigation'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Separator from '@/components/ui/Separator.vue'

// 懒加载设置面板，减少首屏 JS
const SettingsPanel = defineAsyncComponent(() => import('./SettingsPanel.vue'))

// 预加载设置面板的标志
let hasPrefetchedSettingsPanel = false

// 预加载设置面板组件
function prefetchSettingsPanel() {
  if (hasPrefetchedSettingsPanel) return
  hasPrefetchedSettingsPanel = true
  import('./SettingsPanel.vue').catch(() => {})
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { user, isAuthenticated } = storeToRefs(authStore)
const { mobileNavItems, getNavigationLink } = useNavigation()

const showRouteMenu = ref(false)
const showSettings = ref(false)
const showUserMenu = ref(false)
const isDesktopSearchExpanded = ref(false)
const desktopSearchQuery = ref('')

const routeBtnRef = useTemplateRef<HTMLButtonElement>('routeBtnRef')
const routeDropdownRef = useTemplateRef<HTMLDivElement>('routeDropdownRef')
const settingsBtnRef = useTemplateRef<HTMLButtonElement>('settingsBtnRef')
const userBtnRef = useTemplateRef<HTMLButtonElement>('userBtnRef')
const settingsDropdownRef = useTemplateRef<HTMLDivElement>('settingsDropdownRef')
const userDropdownRef = useTemplateRef<HTMLDivElement>('userDropdownRef')
const navbarRef = useTemplateRef<HTMLElement>('navbarRef')
const desktopSearchInputRef = useTemplateRef<HTMLInputElement>('desktopSearchInputRef')

const desktopSearchInputId = 'navbar-desktop-search'

useFocusTrap(routeDropdownRef, showRouteMenu, {
  autoFocus: true,
  restoreFocus: false,
  initialFocus: '.route-dropdown__link',
  onEscape: () => closeRouteMenu({ restoreFocus: true }),
})

useFocusTrap(settingsDropdownRef, showSettings, {
  autoFocus: true,
  restoreFocus: false,
  onEscape: () => closeSettings({ restoreFocus: true }),
})

useFocusTrap(userDropdownRef, showUserMenu, {
  autoFocus: true,
  restoreFocus: false,
  initialFocus: '.user-menu-card',
  onEscape: () => closeUserMenu({ restoreFocus: true }),
})

const settingsDropdownStyle = ref<Record<string, string>>({})
const userDropdownStyle = ref<Record<string, string>>({})
const isSettingsDropdownPositioned = ref(false)
const isUserDropdownPositioned = ref(false)

const isMobile = ref(false)
const isNavbarHidden = ref(false)
let lastScrollY = 0
const scrollThreshold = 100
const hideHysteresis = 24
const showHysteresis = 16
const minScrollDelta = 4
let lastToggleTime = 0
const MOBILE_NAV_BREAKPOINT_QUERY = '(max-width: 960px)'

let navbarHeightPx = '64px'

function syncNavbarVisibleHeight() {
  if (typeof document === 'undefined') return
  const measuredHeight = navbarRef.value?.getBoundingClientRect().height
  navbarHeightPx =
    measuredHeight && Number.isFinite(measuredHeight) ? `${measuredHeight}px` : navbarHeightPx
  // When navbar is hidden via translateY(-100%), expose 0px so fixed headers can pin to top.
  document.documentElement.style.setProperty(
    '--navbar-visible-height',
    isNavbarHidden.value ? '0px' : navbarHeightPx
  )
}

function isHomeRailNavLockEnabled(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.dataset.homeRailNavLock === 'true'
}

// 使用统一的用户头像 composable，确保与其他组件同步
const { avatarUrl: userAvatar } = useUserAvatar()
const userAvatarFallbackLabel = computed(() =>
  getAvatarFallbackLabel(
    user.value ? getUserDisplayName(user.value) : undefined,
    user.value?.username,
    user.value?.email
  )
)

const prefetchedPageKeys = new Set<string>()
const mobileRouteItems = computed(() => mobileNavItems.value)

function runOncePrefetch(key: string, loader: () => void) {
  if (prefetchedPageKeys.has(key)) return
  prefetchedPageKeys.add(key)
  loader()
}

function prefetchExplorePage() {
  runOncePrefetch('explore', () => {
    import('@/views/ExplorePage.vue').catch(() => {})
    prefetchExploreData()
  })
}

function prefetchSearchPage() {
  runOncePrefetch('search', () => {
    import('@/views/SearchPage.vue').catch(() => {})
  })
}

function prefetchAuthorsPage() {
  runOncePrefetch('authors', () => {
    import('@/views/AuthorsPage.vue').catch(() => {})
    prefetchAuthorsData()
  })
}

function prefetchLoginPage() {
  runOncePrefetch('login', () => {
    import('@/views/LoginPage.vue').catch(() => {})
  })
}

function prefetchProfileSettingsPage() {
  runOncePrefetch('profile-settings', () => {
    import('@/views/ProfileSettingsPage.vue').catch(() => {})
  })
}

// 路由变化时关闭所有菜单
watch(
  () => route.fullPath,
  () => {
    closeRouteMenu()
    closeSettings()
    closeUserMenu()
    nextTick(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          handleScroll()
        })
      })
    })
  }
)

watch([() => route.fullPath, isAuthenticated], () => {
  if (hasCompletedIdlePrefetchCycle) {
    cancelIdlePrefetch()
    return
  }
  scheduleNavigationIdlePrefetch()
})

watch(
  () => route.query.q,
  (value) => {
    desktopSearchQuery.value = typeof value === 'string' ? value : ''
  },
  { immediate: true }
)

// 预加载头像以提高导航栏显示优先级
watch(
  userAvatar,
  (url) => {
    if (url && isAuthenticated.value) {
      preloadUserAvatar(url)
    }
  },
  { immediate: true }
)

function shouldPrefetchOnIdle(): boolean {
  if (typeof navigator === 'undefined') return false
  if (!isAuthenticated.value) return false
  if (!navigator.onLine) return false

  const connection = (
    navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection
  if (!connection) return true
  if (connection.saveData) return false
  if (connection.effectiveType && ['slow-2g', '2g', '3g'].includes(connection.effectiveType))
    return false
  return true
}

function goToSearch() {
  router.push('/search')
}

function isRouteActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(path + '/')
}

function expandDesktopSearch(focusInput = true) {
  if (isMobile.value) return
  isDesktopSearchExpanded.value = true
  closeSettings()
  closeUserMenu()
  prefetchSearchPage()
  if (focusInput) {
    nextTick(() => desktopSearchInputRef.value?.focus())
  }
}

function collapseDesktopSearch(force = false) {
  if (isMobile.value) return
  if (!force && document.activeElement === desktopSearchInputRef.value) return
  isDesktopSearchExpanded.value = false
}

async function handleDesktopSearchSubmit() {
  if (isMobile.value) {
    await router.push('/search')
    return
  }

  const query = desktopSearchQuery.value.trim()
  if (!query) {
    expandDesktopSearch()
    return
  }

  await router.push(`/search?q=${encodeURIComponent(query)}`)
}

function handleDesktopSearchFocusOut(event: FocusEvent) {
  const nextTarget = event.relatedTarget as Node | null
  if (nextTarget && (event.currentTarget as HTMLElement | null)?.contains(nextTarget)) return
  collapseDesktopSearch(true)
}

function handleNavbarActionsLeave() {
  collapseDesktopSearch(true)
}

function handleNavbarActionsFocusOut(event: FocusEvent) {
  const nextTarget = event.relatedTarget as Node | null
  if (nextTarget && (event.currentTarget as HTMLElement | null)?.contains(nextTarget)) return
  collapseDesktopSearch(true)
}

function handleDesktopSearchEscape() {
  desktopSearchQuery.value = typeof route.query.q === 'string' ? route.query.q : ''
  collapseDesktopSearch(!desktopSearchQuery.value)
}

function restoreTriggerFocus(kind: 'route' | 'settings' | 'user') {
  if (kind === 'route') {
    routeBtnRef.value?.focus()
    return
  }
  if (kind === 'settings') {
    settingsBtnRef.value?.focus()
    return
  }
  userBtnRef.value?.focus()
}

function closeRouteMenu(options: { restoreFocus?: boolean } = {}) {
  if (!showRouteMenu.value) return
  showRouteMenu.value = false
  if (options.restoreFocus) {
    nextTick(() => restoreTriggerFocus('route'))
  }
}

function closeSettings(options: { restoreFocus?: boolean } = {}) {
  if (!showSettings.value) return
  showSettings.value = false
  isSettingsDropdownPositioned.value = false
  settingsDropdownStyle.value = {}
  if (options.restoreFocus) {
    nextTick(() => restoreTriggerFocus('settings'))
  }
}

function closeUserMenu(options: { restoreFocus?: boolean } = {}) {
  if (!showUserMenu.value) return
  showUserMenu.value = false
  isUserDropdownPositioned.value = false
  userDropdownStyle.value = {}
  if (options.restoreFocus) {
    nextTick(() => restoreTriggerFocus('user'))
  }
}

function toggleRouteMenu() {
  updateIsMobile()
  if (!isMobile.value) return

  closeSettings()
  closeUserMenu()

  if (showRouteMenu.value) {
    closeRouteMenu()
    return
  }

  showRouteMenu.value = true
}

function toggleSettings() {
  updateIsMobile()
  closeRouteMenu()
  closeUserMenu()

  if (showSettings.value) {
    closeSettings()
    return
  }

  showSettings.value = true
  isSettingsDropdownPositioned.value = isMobile.value
  settingsDropdownStyle.value = isMobile.value
    ? {}
    : {
        opacity: '0',
        visibility: 'hidden',
        pointerEvents: 'none',
      }
  nextTick(() => updateDropdownPosition('settings'))
}

function toggleUserMenu() {
  updateIsMobile()
  closeRouteMenu()
  closeSettings()

  if (showUserMenu.value) {
    closeUserMenu()
    return
  }

  showUserMenu.value = true
  isUserDropdownPositioned.value = isMobile.value
  userDropdownStyle.value = isMobile.value
    ? {}
    : {
        opacity: '0',
        visibility: 'hidden',
        pointerEvents: 'none',
      }
  nextTick(() => updateDropdownPosition('user'))
}

function handleLogout() {
  authStore.logout()
  closeUserMenu()
  router.push('/')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return

  if (showRouteMenu.value) {
    event.preventDefault()
    closeRouteMenu({ restoreFocus: true })
    return
  }

  if (showUserMenu.value) {
    event.preventDefault()
    closeUserMenu({ restoreFocus: true })
    return
  }

  if (showSettings.value) {
    event.preventDefault()
    closeSettings({ restoreFocus: true })
  }
}

function updateIsMobile() {
  isMobile.value = window.matchMedia(MOBILE_NAV_BREAKPOINT_QUERY).matches
  if (isMobile.value) {
    isDesktopSearchExpanded.value = false
    return
  }
  closeRouteMenu()
}

function prefetchMobileRoute(path: string) {
  switch (path) {
    case '/explore':
      prefetchExplorePage()
      return
    case '/authors':
      prefetchAuthorsPage()
      return
    case '/favorites':
      runOncePrefetch('favorites', () => {
        import('@/views/FavoritesPage.vue').catch(() => {})
      })
      return
    case '/community':
      runOncePrefetch('community', () => {
        import('@/views/CommunityPage.vue').catch(() => {})
      })
      return
    case '/schedule':
      runOncePrefetch('schedule', () => {
        import('@/views/SchedulePage.vue').catch(() => {})
      })
      return
    default:
      return
  }
}

function updateDropdownPosition(kind: 'settings' | 'user') {
  updateIsMobile()

  if (isMobile.value) {
    if (kind === 'settings') {
      settingsDropdownStyle.value = {
        transformOrigin: '50% 0.75rem',
      }
      isSettingsDropdownPositioned.value = true
    } else {
      userDropdownStyle.value = {
        transformOrigin: '50% 0.75rem',
      }
      isUserDropdownPositioned.value = true
    }
    return
  }

  const triggerEl = kind === 'settings' ? settingsBtnRef.value : userBtnRef.value
  const dropdownEl = kind === 'settings' ? settingsDropdownRef.value : userDropdownRef.value
  if (!triggerEl || !dropdownEl) return

  // 使用 scheduleDOMUpdate 分离读写操作，避免布局抖动
  scheduleDOMUpdate(
    // 读取阶段：批量获取所有布局值
    () => ({
      triggerRect: triggerEl.getBoundingClientRect(),
      dropdownRect: dropdownEl.getBoundingClientRect(),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }),
    // 写入阶段：基于读取的值更新样式
    ({ triggerRect, dropdownRect, viewportWidth, viewportHeight }) => {
      const position = resolveNavbarDropdownPosition({
        triggerRect,
        dropdownRect,
        viewportWidth,
        viewportHeight,
      })

      const style = {
        left: `${position.left}px`,
        top: `${position.top}px`,
        right: 'auto',
        maxInlineSize: `${position.maxInlineSize}px`,
        maxBlockSize: `${position.maxBlockSize}px`,
        transformOrigin: position.transformOrigin,
      }

      if (kind === 'settings') {
        settingsDropdownStyle.value = style
        isSettingsDropdownPositioned.value = true
      } else {
        userDropdownStyle.value = style
        isUserDropdownPositioned.value = true
      }
    }
  )
}

// 滚动处理：实现导航栏渐进式隐藏
const handleScroll = throttleRAF(() => {
  const currentScrollY = window.scrollY
  const delta = currentScrollY - lastScrollY
  const railNavLocked = isHomeRailNavLockEnabled()
  const showAt = Math.max(0, scrollThreshold - showHysteresis)
  const hideAt = scrollThreshold + hideHysteresis

  if (railNavLocked) {
    const nextHidden = false
    if (nextHidden !== isNavbarHidden.value) {
      isNavbarHidden.value = nextHidden
      syncNavbarVisibleHeight()
      lastToggleTime = performance.now()
    }
    lastScrollY = currentScrollY
    return
  }

  if (Math.abs(delta) < minScrollDelta) {
    lastScrollY = currentScrollY
    return
  }

  let nextHidden = isNavbarHidden.value

  if (railNavLocked && currentScrollY > hideAt) {
    nextHidden = true
  } else if (delta > 0 && currentScrollY > hideAt) {
    nextHidden = true
  } else if (delta < 0 && !railNavLocked) {
    nextHidden = false
  } else if (currentScrollY <= showAt) {
    nextHidden = false
  }

  if (nextHidden !== isNavbarHidden.value) {
    const now = performance.now()
    if (now - lastToggleTime >= 120) {
      isNavbarHidden.value = nextHidden
      syncNavbarVisibleHeight()
      lastToggleTime = now
    }
  } else if (currentScrollY <= showAt) {
    // 确保靠近顶部时高度变量正确
    syncNavbarVisibleHeight()
  }

  lastScrollY = currentScrollY
})

// 使用 throttleRAF 节流 resize 事件，避免高频触发导致的性能问题
const handleResize = throttleRAF(() => {
  updateIsMobile()
  syncNavbarVisibleHeight()
  if (showSettings.value) {
    nextTick(() => updateDropdownPosition('settings'))
  }
  if (showUserMenu.value) {
    nextTick(() => updateDropdownPosition('user'))
  }
})

let cancelIdlePrefetchTask: (() => void) | null = null
let hasCompletedIdlePrefetchCycle = false
const IDLE_PREFETCH_START_DELAY_MS = 8000
const IDLE_PREFETCH_TIMEOUT_MS = 1500

function cancelIdlePrefetch() {
  cancelIdlePrefetchTask?.()
  cancelIdlePrefetchTask = null
}

function scheduleIdlePrefetch(task: () => void) {
  cancelIdlePrefetch()

  let cancelIdleRun: (() => void) | null = null
  const startTimer = window.setTimeout(() => {
    cancelIdleRun = runWhenIdle(() => {
      cancelIdleRun = null
      cancelIdlePrefetchTask = null
      task()
    }, IDLE_PREFETCH_TIMEOUT_MS)

    cancelIdlePrefetchTask = () => {
      cancelIdleRun?.()
      cancelIdleRun = null
      cancelIdlePrefetchTask = null
    }
  }, IDLE_PREFETCH_START_DELAY_MS)

  cancelIdlePrefetchTask = () => {
    window.clearTimeout(startTimer)
    cancelIdleRun?.()
    cancelIdleRun = null
    cancelIdlePrefetchTask = null
  }
}

function scheduleNavigationIdlePrefetch() {
  if (hasCompletedIdlePrefetchCycle || !shouldPrefetchOnIdle()) {
    cancelIdlePrefetch()
    return
  }

  scheduleIdlePrefetch(() => {
    if (hasCompletedIdlePrefetchCycle) return
    hasCompletedIdlePrefetchCycle = true
    prefetchExplorePage()
    prefetchAuthorsPage()
  })
}

function resetIdlePrefetchCycle() {
  hasCompletedIdlePrefetchCycle = false
  scheduleNavigationIdlePrefetch()
}

function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') {
    cancelIdlePrefetch()
    return
  }

  resetIdlePrefetchCycle()
}

function handleWindowOnline() {
  resetIdlePrefetchCycle()
}

onMounted(() => {
  updateIsMobile()

  // Cache CSS variable for navbar height.
  try {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--navbar-height')
      .trim()
    if (raw) navbarHeightPx = raw
  } catch {
    // ignore
  }

  // Initialize visible height.
  syncNavbarVisibleHeight()
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('online', handleWindowOnline)
  requestAnimationFrame(() => {
    handleScroll()
  })
  scheduleNavigationIdlePrefetch()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('online', handleWindowOnline)
  handleResize.cancel?.()
  handleScroll.cancel?.()
  cancelIdlePrefetch()

  // Reset to default on unmount.
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--navbar-visible-height', '')
  }
})
</script>

<style scoped>
.navbar {
  --nav-shell-bg: transparent;
  --nav-shell-border: transparent;
  --nav-shell-shadow: none;
  --nav-muted-bg: var(--chrome-muted-bg);
  --nav-muted-bg-strong: var(--chrome-muted-bg-strong);
  --nav-muted-border: var(--chrome-muted-border);
  --nav-muted-border-strong: var(--chrome-muted-border-strong);
  --nav-chip-bg: var(--chrome-chip-bg);
  --nav-chip-border: var(--chrome-chip-border);
  --nav-chip-text: var(--chrome-chip-text);
  --nav-action-bg: color-mix(in srgb, var(--chrome-action-bg) 34%, transparent);
  --nav-action-bg-hover: color-mix(in srgb, var(--chrome-action-bg-hover) 56%, transparent);
  --nav-action-border: color-mix(in srgb, var(--chrome-action-border) 58%, transparent);
  --nav-action-border-strong: color-mix(
    in srgb,
    var(--chrome-action-border-strong) 74%,
    rgba(var(--color-primary-rgb), 0.18)
  );
  --nav-dropdown-bg: var(--ui-compat-surface-base);
  --nav-dropdown-border: var(--ui-compat-border);
  --nav-dropdown-shadow: var(--ui-compat-shadow);
  --nav-dropdown-backdrop: var(--ui-compat-backdrop);
  position: fixed;
  inset-block-start: 0;
  inset-inline: 0;
  z-index: var(--z-sticky);
  display: flex;
  align-items: center;
  height: var(--navbar-height);
  padding-block: max(env(safe-area-inset-top, 0rem), clamp(0.75rem, 2vw, 1rem))
    clamp(0.35rem, 1vw, 0.5rem);
  transition:
    transform var(--duration-normal) var(--ease-out),
    box-shadow var(--transition-fast);
  transform: translate3d(0, 0, 0);
  will-change: transform;
  isolation: isolate;
}

.navbar.navbar-hidden {
  transform: translate3d(0, -100%, 0);
}

.navbar-content {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-3);
  min-inline-size: 0;
  padding-inline-end: clamp(0.25rem, 0.8vw, 0.75rem);
}

.navbar-shell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(0.75rem, 2vw, 1.5rem);
  inline-size: 100%;
  min-inline-size: 0;
  padding: 0.35rem clamp(0.4rem, 1.4vw, 0.75rem);
  border: 0.0625rem solid var(--nav-shell-border);
  border-radius: 999rem;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.navbar-shell--actions-only {
  inline-size: auto;
  margin-inline-start: auto;
  justify-content: flex-end;
}

/* ========== Brand ========== */
.navbar-brand {
  display: inline-flex;
  align-items: center;
  flex: 0 1 auto;
  min-inline-size: 0;
  text-decoration: none;
}

.navbar-brand__meta {
  display: inline-flex;
  align-items: center;
  min-inline-size: 0;
}

.brand-name {
  font-size: clamp(1rem, 1.3vw, 1.1rem);
  font-weight: var(--font-bold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

/* ========== Actions ========== */
.navbar-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-2);
  min-inline-size: 0;
  flex-wrap: nowrap;
}

.nav-search-shell {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  min-inline-size: 0;
}

.nav-search-shell__field {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  max-inline-size: 0;
  overflow: hidden;
  opacity: 0;
  transform: translate3d(0.75rem, 0, 0);
  transition:
    max-inline-size var(--duration-fast) var(--ease-out),
    opacity var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.nav-search-shell--expanded .nav-search-shell__field,
.nav-search-shell:hover .nav-search-shell__field,
.nav-search-shell:focus-within .nav-search-shell__field {
  max-inline-size: clamp(11rem, 18vw, 14rem);
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.nav-search-shell__input {
  inline-size: clamp(11rem, 18vw, 14rem);
  min-inline-size: 0;
  min-block-size: 2.5rem;
  padding-inline: 0.95rem;
  border: 0.0625rem solid color-mix(in srgb, var(--nav-action-border) 78%, transparent);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--nav-action-bg-hover) 72%, transparent);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  line-height: 1;
  outline: none;
}

.nav-search-shell__input::placeholder {
  color: var(--color-text-tertiary);
}

.nav-search-shell__input:focus {
  border-color: var(--nav-action-border-strong);
}

.nav-action-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-inline-size: var(--ui-action-size, 2.5rem);
  block-size: var(--ui-action-size, 2.5rem);
  padding-inline: var(--spacing-3);
  border-radius: var(--ui-radius-button, var(--radius-lg));
  border: 1px solid var(--nav-action-border);
  background: var(--nav-action-bg);
  box-shadow: inset 0 0.0625rem 0 rgba(255, 255, 255, 0.12);
  color: var(--color-text-secondary);
  transition:
    color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.nav-action-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: transparent;
  transition: background var(--transition-fast);
}

.nav-action-btn:hover {
  color: var(--color-primary);
  border-color: var(--nav-action-border-strong);
  transform: translate3d(0, -0.0625rem, 0);
}

.nav-action-btn:hover::before {
  background: var(--nav-action-bg-hover);
}

.nav-action-btn--pill {
  border-radius: var(--radius-full);
}

.nav-action-btn--square {
  padding-inline: 0;
}

.nav-action-btn--search {
  gap: var(--spacing-2);
  padding-inline: 0.625rem;
}

.nav-action-btn__label {
  position: relative;
  z-index: 1;
  white-space: nowrap;
  font-size: var(--text-sm);
  color: inherit;
}

.nav-action-btn--active {
  color: var(--color-primary);
  border-color: var(--nav-action-border-strong);
}

.nav-action-btn--active::before {
  background: var(--nav-action-bg-hover);
}

.nav-action-btn--primary {
  border-color: color-mix(
    in srgb,
    var(--nav-action-border-strong) 76%,
    rgba(var(--color-primary-rgb), 0.16)
  );
  background: color-mix(in srgb, var(--nav-action-bg) 74%, rgba(var(--color-primary-rgb), 0.12));
  color: var(--color-text-primary);
  box-shadow: none;
}

.nav-action-btn--primary:hover,
.nav-action-btn--primary.nav-action-btn--active {
  color: var(--color-primary);
  border-color: rgba(var(--color-primary-rgb), 0.18);
  box-shadow: none;
}

.nav-action-btn--primary:hover::before,
.nav-action-btn--primary.nav-action-btn--active::before {
  background: linear-gradient(180deg, rgba(var(--color-primary-rgb), 0.06), transparent);
}

.icon-spin {
  animation: icon-spin var(--duration-slow) var(--ease-out);
}

@keyframes icon-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(180deg);
  }
}

/* ========== Login Button ========== */
.login-btn {
  gap: var(--spacing-2);
  padding-inline: var(--spacing-4);
  min-inline-size: 5.5rem;
  font-size: var(--text-sm);
  text-decoration: none;
  white-space: nowrap;
}

.login-btn:hover,
.login-btn:focus,
.login-btn:active,
.login-btn:visited,
.login-btn.router-link-active,
.login-btn.router-link-exact-active {
  color: currentColor;
}

@media (max-width: 960px) {
  .login-btn {
    padding: var(--spacing-2);
    border-radius: var(--ui-radius-button, var(--radius-lg));
    min-width: var(--ui-action-size, 2.5rem);
    min-height: var(--ui-action-size, 2.5rem);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}

/* ========== User Button ========== */
.nav-user-btn {
  position: relative;
  padding: 0.125rem;
  border: 1px solid var(--nav-action-border);
  background: color-mix(in srgb, var(--nav-action-bg) 82%, transparent);
  border-radius: 50%;
  box-shadow: none;
  transition:
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.nav-user-btn::before {
  content: '';
  position: absolute;
  inset: -0.125rem;
  border-radius: 50%;
  background: transparent;
  transition: background var(--transition-fast);
}

.nav-user-btn:hover::before,
.nav-user-btn--active::before {
  background: var(--nav-action-bg-hover);
  opacity: 1;
}

.nav-user-avatar.ui-avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  border: 2px solid var(--nav-chip-border);
  background: var(--nav-muted-bg);
  transition: border-color var(--transition-fast);
}

.nav-user-btn:hover .nav-user-avatar,
.nav-user-btn--active .nav-user-avatar {
  border-color: var(--color-primary);
}

.nav-user-status {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 0.625rem;
  height: 0.625rem;
  background: var(--color-success);
  border: 2px solid var(--nav-muted-bg-strong);
  border-radius: 50%;
}

/* ========== Dropdowns ========== */
.route-dropdown,
.settings-dropdown,
.user-dropdown {
  position: fixed;
  inset-block-start: calc(var(--navbar-visible-height) + var(--spacing-2));
  inset-inline-end: var(--spacing-4);
  --nav-dropdown-enter-y: -0.45rem;
  --nav-dropdown-leave-y: -0.18rem;
  --nav-dropdown-enter-scale: 0.965;
  --nav-dropdown-leave-scale: 0.985;
  transform-origin: top right;
  inline-size: min(24rem, calc(100vw - 2rem));
  max-block-size: min(var(--app-safe-block-size), 36rem);
  transition:
    opacity var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-spring),
    visibility 0s linear var(--duration-fast);
}

.route-dropdown.glass-dropdown,
.settings-dropdown.glass-dropdown,
.user-dropdown.glass-dropdown {
  background: var(--nav-dropdown-bg);
  border: 1px solid var(--nav-dropdown-border);
  border-radius: var(--ui-radius-dropdown, var(--radius-xl));
  box-shadow: var(--nav-dropdown-shadow);
  backdrop-filter: var(--nav-dropdown-backdrop);
  -webkit-backdrop-filter: var(--nav-dropdown-backdrop);
}

.settings-dropdown.glass-dropdown,
.user-dropdown.glass-dropdown {
  background: var(--ui-compat-surface-elevated);
  border-color: var(--ui-compat-border);
  box-shadow: var(--ui-compat-shadow-strong);
  backdrop-filter: var(--ui-compat-backdrop);
  -webkit-backdrop-filter: var(--ui-compat-backdrop);
}

.settings-dropdown.glass-dropdown {
  padding: clamp(0.25rem, 0.8vw, 0.375rem);
}

.user-dropdown.glass-dropdown {
  overflow: hidden;
  padding: 0;
}

.settings-dropdown[data-positioned='false'],
.user-dropdown[data-positioned='false'] {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translate3d(0, -0.35rem, 0) scale3d(0.985, 0.985, 1);
}

.settings-dropdown[data-positioned='true'],
.user-dropdown[data-positioned='true'] {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
  transition-delay: 0s;
}

.dropdown-enter-active.route-dropdown,
.dropdown-enter-active.settings-dropdown,
.dropdown-enter-active.user-dropdown {
  transition:
    opacity 220ms var(--ease-out),
    transform 280ms var(--ease-spring);
}

.dropdown-leave-active.route-dropdown,
.dropdown-leave-active.settings-dropdown,
.dropdown-leave-active.user-dropdown {
  transition:
    opacity 180ms var(--ease-in),
    transform 180ms var(--ease-in);
}

.dropdown-enter-from.route-dropdown,
.dropdown-enter-from.settings-dropdown,
.dropdown-enter-from.user-dropdown {
  opacity: 0;
  transform: translate3d(0, var(--nav-dropdown-enter-y), 0)
    scale3d(var(--nav-dropdown-enter-scale), var(--nav-dropdown-enter-scale), 1);
}

.dropdown-leave-to.route-dropdown,
.dropdown-leave-to.settings-dropdown,
.dropdown-leave-to.user-dropdown {
  opacity: 0;
  transform: translate3d(0, var(--nav-dropdown-leave-y), 0)
    scale3d(var(--nav-dropdown-leave-scale), var(--nav-dropdown-leave-scale), 1);
}

.route-dropdown {
  inset-inline: clamp(0.75rem, 3vw, 1rem);
  inline-size: auto;
  max-inline-size: calc(100vw - (clamp(0.75rem, 3vw, 1rem) * 2));
  padding: var(--spacing-3);
  background: color-mix(in srgb, var(--chrome-surface-bg-soft) 88%, transparent);
  border-color: color-mix(in srgb, var(--chrome-surface-border) 82%, transparent);
  box-shadow: var(--nav-dropdown-shadow);
}

.route-dropdown__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-2);
}

.route-dropdown__link,
.route-dropdown__utility {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-block-size: 4.75rem;
  padding: 0.75rem 0.5rem;
  border: 0.0625rem solid transparent;
  border-radius: var(--ui-radius-button, var(--radius-lg));
  background: color-mix(in srgb, var(--chrome-action-bg) 28%, transparent);
  color: var(--color-text-primary);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  text-align: center;
  text-decoration: none;
  transition:
    transform var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.route-dropdown__link:hover,
.route-dropdown__link:focus-visible,
.route-dropdown__utility:hover,
.route-dropdown__utility:focus-visible {
  border-color: var(--nav-action-border-strong);
  background: color-mix(in srgb, var(--chrome-action-bg-hover) 48%, transparent);
  color: var(--color-primary);
  transform: translate3d(0, -0.0625rem, 0);
}

.route-dropdown__link--active {
  border-color: color-mix(
    in srgb,
    var(--nav-action-border-strong) 76%,
    rgba(var(--color-primary-rgb), 0.16)
  );
  background: color-mix(in srgb, var(--chrome-action-bg-hover) 56%, transparent);
  color: var(--color-primary);
}

.route-dropdown__icon {
  inline-size: 1.125rem;
  block-size: 1.125rem;
  flex: 0 0 auto;
}

.route-dropdown__footer {
  margin-block-start: var(--spacing-2);
  padding-block-start: var(--spacing-2);
  border-block-start: 0.0625rem solid color-mix(in srgb, var(--nav-muted-border) 72%, transparent);
}

.route-dropdown__utility {
  min-block-size: 3.5rem;
  flex-direction: row;
  justify-content: flex-start;
  padding-inline: 0.875rem;
}

.settings-dropdown :deep(.settings-header),
.settings-dropdown :deep(.settings-group),
.user-dropdown .user-info,
.user-dropdown .dropdown-link {
  will-change: transform, opacity;
}

.dropdown-enter-active.settings-dropdown :deep(.settings-header),
.dropdown-enter-active.settings-dropdown :deep(.settings-group),
.dropdown-enter-active.user-dropdown .user-info,
.dropdown-enter-active.user-dropdown .dropdown-link,
.dropdown-leave-active.settings-dropdown :deep(.settings-header),
.dropdown-leave-active.settings-dropdown :deep(.settings-group),
.dropdown-leave-active.user-dropdown .user-info,
.dropdown-leave-active.user-dropdown .dropdown-link {
  transition:
    opacity 220ms var(--ease-out),
    transform 260ms var(--ease-out);
}

.dropdown-enter-from.settings-dropdown :deep(.settings-header),
.dropdown-leave-to.settings-dropdown :deep(.settings-header),
.dropdown-enter-from.user-dropdown .user-info,
.dropdown-leave-to.user-dropdown .user-info {
  opacity: 0;
  transform: translate3d(0, -0.25rem, 0);
}

.dropdown-enter-from.settings-dropdown :deep(.settings-group),
.dropdown-leave-to.settings-dropdown :deep(.settings-group),
.dropdown-enter-from.user-dropdown .dropdown-link,
.dropdown-leave-to.user-dropdown .dropdown-link {
  opacity: 0;
  transform: translate3d(0, 0.35rem, 0);
}

.dropdown-enter-active.settings-dropdown :deep(.settings-group:nth-of-type(1)),
.dropdown-enter-active.user-dropdown .dropdown-link:nth-of-type(1) {
  transition-delay: 24ms;
}

.dropdown-enter-active.settings-dropdown :deep(.settings-group:nth-of-type(2)),
.dropdown-enter-active.user-dropdown .dropdown-link:nth-of-type(2) {
  transition-delay: 48ms;
}

.dropdown-enter-active.settings-dropdown :deep(.settings-group:nth-of-type(3)),
.dropdown-enter-active.user-dropdown .dropdown-link:nth-of-type(3) {
  transition-delay: 72ms;
}

.user-info {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: clamp(0.875rem, 1.5vw, 1rem);
  padding: clamp(0.875rem, 1.5vw, 1rem);
  border: 1px solid var(--ui-compat-border);
  border-radius: calc(var(--ui-compat-panel-radius) - 0.375rem);
  background: var(--ui-compat-surface-interactive);
  box-shadow: inset 0 0.0625rem 0 rgba(255, 255, 255, 0.08);
}

.user-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.user-avatar-lg.ui-avatar {
  width: clamp(3.5rem, 9vw, 4.25rem);
  height: clamp(3.5rem, 9vw, 4.25rem);
  border-radius: 50%;
  border: 2px solid var(--nav-chip-border);
  background: var(--nav-muted-bg);
}

.nav-user-status--lg {
  width: 0.7rem;
  height: 0.7rem;
  border-width: 2px;
  inset-inline-end: 0.1rem;
  inset-block-end: 0.1rem;
}

.user-details {
  display: grid;
  align-content: center;
  gap: 0.15rem;
  min-width: 0;
}

.user-menu-shell {
  display: grid;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
}

.user-menu-eyebrow {
  margin-bottom: 0.125rem;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ui-compat-text-muted);
}

.user-name {
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: var(--text-sm);
  color: var(--ui-compat-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-menu-primary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(0.625rem, 1vw, 0.75rem);
  align-items: stretch;
  grid-auto-rows: minmax(0, 1fr);
}

.dropdown-links {
  padding: var(--spacing-2);
}

.dropdown-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  width: 100%;
  padding: var(--spacing-3);
  border-radius: var(--ui-radius-button, var(--radius-lg));
  border: 1px solid var(--ui-compat-border);
  background: transparent;
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  text-decoration: none;
  transition:
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.dropdown-link:hover,
.dropdown-link:focus-visible {
  background: var(--ui-compat-surface-interactive-strong);
  border-color: var(--ui-compat-border-strong);
  outline: none;
}

.dropdown-link:hover .dropdown-link-arrow {
  opacity: 1;
}

.dropdown-link-icon {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ui-compat-surface-interactive);
  border: 1px solid var(--ui-compat-border);
  border-radius: var(--radius-md);
  color: var(--ui-compat-text-secondary);
  transition:
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.dropdown-link:hover .dropdown-link-icon {
  background: var(--ui-compat-surface-accent);
  border-color: var(--ui-compat-border-strong);
  color: var(--color-primary);
}

.dropdown-link-arrow {
  margin-left: auto;
  color: var(--color-text-tertiary);
  opacity: 0;
  transition:
    opacity var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.dropdown-link--danger {
  color: var(--color-error);
}

.dropdown-link--danger .dropdown-link-icon,
.dropdown-link-icon--danger {
  background: var(--ui-compat-surface-danger);
  border-color: var(--ui-compat-danger-border);
  color: var(--color-error);
}

.dropdown-link--danger:hover {
  background: var(--ui-compat-surface-danger);
  border-color: var(--ui-compat-danger-border);
}

.dropdown-link--danger:hover .dropdown-link-icon {
  background: rgba(var(--color-error-rgb), 0.15);
}

.dropdown-links--secondary {
  padding: 0 var(--spacing-4) var(--spacing-4);
}

.user-menu-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  min-block-size: 4.25rem;
  gap: 0.75rem;
  padding: 0.8rem 0.95rem;
  background: var(--ui-compat-surface-interactive);
}

.user-menu-card__icon {
  width: 2rem;
  height: 2rem;
  align-self: center;
  justify-self: center;
}

.user-menu-card__label {
  display: block;
  min-width: 0;
  min-height: auto;
  font-weight: var(--font-semibold);
  line-height: 1.35;
  align-self: center;
}

.user-menu-card__arrow {
  margin-left: 0;
  opacity: 0.55;
  align-self: center;
  justify-self: end;
}

/* ========== Responsive ========== */
.desktop-only {
  display: flex;
}

@media (max-width: 960px) {
  .desktop-only {
    display: none;
  }

  .nav-search-shell {
    display: none;
  }

  .nav-action-btn {
    inline-size: var(--ui-action-size, 2.5rem);
    padding-inline: 0;
    transform: none;
  }

  .nav-action-btn__label {
    display: none;
  }

  .brand-name {
    font-size: var(--text-lg);
  }

  .navbar-shell {
    padding-inline: 0.75rem;
  }

  .navbar-actions {
    gap: 0.375rem;
  }

  .route-dropdown {
    --nav-dropdown-enter-y: -0.3rem;
    --nav-dropdown-leave-y: -0.14rem;
    --nav-dropdown-enter-scale: 0.99;
    --nav-dropdown-leave-scale: 0.995;
    inset-inline: clamp(0.75rem, 3vw, 1rem);
    inset-block-start: calc(var(--navbar-visible-height) + clamp(0.5rem, 2vw, 0.75rem));
    max-block-size: min(var(--app-safe-block-size), 32rem);
    overflow: auto;
  }

  .settings-dropdown,
  .user-dropdown {
    --nav-dropdown-enter-y: -0.3rem;
    --nav-dropdown-leave-y: -0.14rem;
    --nav-dropdown-enter-scale: 0.99;
    --nav-dropdown-leave-scale: 0.995;
    inset-inline: clamp(0.75rem, 3vw, 1rem);
    inset-block-start: calc(var(--navbar-visible-height) + clamp(0.5rem, 2vw, 0.75rem));
    inline-size: auto;
    max-inline-size: calc(100vw - (clamp(0.75rem, 3vw, 1rem) * 2));
    max-block-size: min(var(--app-safe-block-size), 34rem);
  }

  .user-menu-primary {
    grid-template-columns: 1fr;
  }

  .user-info {
    grid-template-columns: auto minmax(0, 1fr);
  }
}

:global(#app[data-theme='dark'] .nav-action-btn--primary),
:global([data-theme='dark'] .nav-action-btn--primary) {
  background: color-mix(in srgb, var(--nav-action-bg) 78%, rgba(var(--color-primary-rgb), 0.12));
  color: var(--color-text-primary);
}

:global(#app[data-theme='dark'] .navbar),
:global([data-theme='dark'] .navbar) {
  --nav-shell-bg: transparent;
  --nav-shell-border: color-mix(
    in srgb,
    var(--chrome-surface-border) 86%,
    rgba(255, 255, 255, 0.1)
  );
  --nav-shell-shadow: none;
}

:global(#app[data-theme='blue'] .navbar),
:global([data-theme='blue'] .navbar) {
  --nav-shell-bg: transparent;
  --nav-shell-border: rgba(96, 165, 250, 0.16);
}

:global(#app[data-ui-style='material'] .navbar),
:global([data-ui-style='material'] .navbar) {
  --nav-action-bg: color-mix(in srgb, var(--chrome-action-bg) 90%, transparent);
  --nav-dropdown-bg: var(--ui-compat-surface-base);
  --nav-dropdown-border: var(--ui-compat-border);
  --nav-dropdown-shadow: var(--ui-compat-shadow);
  --nav-dropdown-backdrop: var(--ui-compat-backdrop);
  --nav-shell-shadow: none;
}

:global(#app[data-ui-style='ios'] .navbar),
:global([data-ui-style='ios'] .navbar) {
  --nav-dropdown-bg: color-mix(in srgb, var(--chrome-surface-bg-soft) 92%, transparent);
  --nav-dropdown-backdrop: blur(0.75rem);
}

:global(#app[data-ui-style='material'] .nav-action-btn--pill),
:global([data-ui-style='material'] .nav-action-btn--pill),
:global(#app[data-ui-style='material'] .nav-search-shell__input),
:global([data-ui-style='material'] .nav-search-shell__input) {
  border-radius: var(--ui-radius-button, var(--radius-lg));
}
</style>
