<template>
  <nav
    ref="navbarRef"
    class="navbar navbar--minimal"
    :class="{
      'navbar-hidden': isNavbarHidden,
      'navbar--chromeless': props.chromeless,
      'navbar--post-detail': isPostDetailRoute,
    }"
  >
    <div class="container navbar-content">
      <div class="navbar-shell" :class="{ 'navbar-shell--actions-only': !isMobile }">
        <RouterLink v-if="isMobile" to="/" class="navbar-brand" :aria-label="$t('app.name')">
          <BrandPetLogo variant="inline" class="navbar-brand__logo" />
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
            v-if="!isMobile && !isAuthEntryRoute"
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
            v-else-if="!isAuthEntryRoute"
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
            v-if="!isAuthEntryRoute"
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
            v-if="!isAuthenticated && isAuthEntryRoute"
            to="/"
            class="login-btn nav-action-btn nav-action-btn--primary nav-action-btn--auth-home"
            :aria-label="$t('nav.backHome')"
          >
            <ArrowLeft :size="16" aria-hidden="true" />
            <span class="desktop-only">{{ $t('nav.backHome') }}</span>
          </RouterLink>

          <RouterLink
            v-else-if="!isAuthenticated"
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
        <SettingsPanel external-scroll @close="closeSettings()" />
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
              :to="profileSettingsLink"
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
              :to="profileNotificationsLink"
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
              :to="profileSecurityLink"
              class="dropdown-link user-menu-card"
              role="menuitem"
              @click="showUserMenu = false"
            >
              <div class="dropdown-link-icon user-menu-card__icon">
                <AnimatedIcon name="explore" :fallback-icon="Shield" size="sm" />
              </div>
              <span class="user-menu-card__label">{{ $t('profile.securityHubTitle') }}</span>
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
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  LogIn,
  LogOut,
  Search,
  Settings,
  Shield,
  User,
} from '@lucide/vue'
import { getAvatarFallbackLabel } from '@/utils/avatarPresentation'
import { getUserDisplayName } from '@/utils/user'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { useUserAvatar, preloadUserAvatar } from '@/composables/useUserAvatar'
import { prefetchExploreData, prefetchAuthorsData } from '@/utils/prefetch'
import { runWhenIdle, throttleRAF, scheduleDOMUpdate } from '@/utils/performance'
import { resolveNavbarDropdownPosition } from '@/components/layout/navbarDropdownPosition'
import { withProfileReturnTo } from '@/utils/profileReturnTo'
import { logoutFromAuthSurface, useAuthSurface } from '@/services/authSurface'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import BrandPetLogo from '@/components/brand/BrandPetLogo.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Separator from '@/components/ui/Separator.vue'

const NAVBAR_ROUTE_FREEZE_MS = 280

const props = withDefaults(
  defineProps<{
    chromeless?: boolean
  }>(),
  {
    chromeless: false,
  }
)

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
const profileSettingsLink = computed(() =>
  withProfileReturnTo('/profile/settings', { returnTo: route.fullPath })
)
const profileNotificationsLink = computed(() =>
  withProfileReturnTo('/profile/notifications', { returnTo: route.fullPath })
)
const profileSecurityLink = computed(() =>
  withProfileReturnTo('/profile/security', { returnTo: route.fullPath })
)
const isPostDetailRoute = computed(() => route.name === 'post-detail')
const isAuthEntryRoute = computed(() => route.path === '/login' || route.path === '/register')
const { user, isAuthenticated } = useAuthSurface()
const showSettings = ref(false)
const showUserMenu = ref(false)
const isDesktopSearchExpanded = ref(false)
const desktopSearchQuery = ref('')

const settingsBtnRef = useTemplateRef<HTMLButtonElement>('settingsBtnRef')
const userBtnRef = useTemplateRef<HTMLButtonElement>('userBtnRef')
const settingsDropdownRef = useTemplateRef<HTMLDivElement>('settingsDropdownRef')
const userDropdownRef = useTemplateRef<HTMLDivElement>('userDropdownRef')
const navbarRef = useTemplateRef<HTMLElement>('navbarRef')
const desktopSearchInputRef = useTemplateRef<HTMLInputElement>('desktopSearchInputRef')

const desktopSearchInputId = 'navbar-desktop-search'

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
const isNavbarOverlayOpen = computed(() => showSettings.value || showUserMenu.value)
const isRouteVisibilityFrozen = ref(false)
let lastScrollY = 0
const scrollThreshold = 100
const hideHysteresis = 24
const showHysteresis = 16
const minScrollDelta = 4
let lastToggleTime = 0
let routeVisibilityFreezeTimer: ReturnType<typeof setTimeout> | null = null
const MOBILE_NAV_BREAKPOINT_QUERY = '(max-width: 960px)'

let navbarHeightPx = '64px'

function syncNavbarVisibleHeight() {
  if (typeof document === 'undefined') return
  const measuredHeight = navbarRef.value?.getBoundingClientRect().height
  navbarHeightPx =
    measuredHeight && Number.isFinite(measuredHeight) ? `${measuredHeight}px` : navbarHeightPx
  document.documentElement.style.setProperty('--navbar-visible-height', navbarHeightPx)
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

function clearRouteVisibilityFreeze() {
  if (!routeVisibilityFreezeTimer) return
  window.clearTimeout(routeVisibilityFreezeTimer)
  routeVisibilityFreezeTimer = null
}

function freezeNavbarVisibilityForRouteChange() {
  clearRouteVisibilityFreeze()
  isRouteVisibilityFrozen.value = true
  isNavbarHidden.value = false
  syncNavbarVisibleHeight()
  lastScrollY = window.scrollY

  routeVisibilityFreezeTimer = window.setTimeout(() => {
    isRouteVisibilityFrozen.value = false
    routeVisibilityFreezeTimer = null
    lastScrollY = window.scrollY
    handleScroll()
  }, NAVBAR_ROUTE_FREEZE_MS)
}

// 路由变化时关闭所有菜单
watch(
  () => route.fullPath,
  () => {
    closeSettings()
    closeUserMenu()
    freezeNavbarVisibilityForRouteChange()
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

function restoreTriggerFocus(kind: 'settings' | 'user') {
  if (kind === 'settings') {
    settingsBtnRef.value?.focus()
    return
  }
  userBtnRef.value?.focus()
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

function toggleSettings() {
  updateIsMobile()
  closeUserMenu()

  if (showSettings.value) {
    closeSettings()
    return
  }

  isNavbarHidden.value = false
  syncNavbarVisibleHeight()
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
  closeSettings()

  if (showUserMenu.value) {
    closeUserMenu()
    return
  }

  isNavbarHidden.value = false
  syncNavbarVisibleHeight()
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

async function handleLogout() {
  await logoutFromAuthSurface()
  closeUserMenu()
  await router.push('/')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return

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
  const visibilityLocked =
    isHomeRailNavLockEnabled() || isNavbarOverlayOpen.value || isRouteVisibilityFrozen.value
  const showAt = Math.max(0, scrollThreshold - showHysteresis)
  const hideAt = scrollThreshold + hideHysteresis

  if (visibilityLocked) {
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

  if (delta > 0 && currentScrollY > hideAt) {
    nextHidden = true
  } else if (delta < 0) {
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
  clearRouteVisibilityFreeze()
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

<style scoped src="../../styles/components/app-navbar.css"></style>
