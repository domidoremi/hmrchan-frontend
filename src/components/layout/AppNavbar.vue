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
import { Bell, ChevronRight, LogIn, LogOut, Search, Settings, Shield, User } from '@lucide/vue'
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
  --nav-action-bg: var(--ui-compat-surface-interactive);
  --nav-action-bg-hover: var(--ui-compat-surface-interactive-strong);
  --nav-action-border: color-mix(in srgb, var(--ui-compat-border) 72%, transparent);
  --nav-action-border-strong: color-mix(
    in srgb,
    var(--ui-compat-border-strong) 78%,
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

.navbar--chromeless {
  --nav-muted-bg: color-mix(in srgb, var(--ui-compat-surface-base) 72%, transparent);
  --nav-muted-bg-strong: color-mix(in srgb, var(--ui-compat-surface-elevated) 84%, transparent);
  --nav-muted-border: color-mix(in srgb, var(--ui-compat-border) 42%, transparent);
  --nav-muted-border-strong: color-mix(in srgb, var(--ui-compat-border-strong) 54%, transparent);
  --nav-chip-bg: color-mix(in srgb, var(--ui-compat-surface-base) 76%, transparent);
  --nav-chip-border: color-mix(in srgb, var(--ui-compat-border) 40%, transparent);
  --nav-action-bg: color-mix(in srgb, var(--ui-compat-surface-interactive) 72%, transparent);
  --nav-action-bg-hover: color-mix(
    in srgb,
    var(--ui-compat-surface-interactive-strong) 88%,
    transparent
  );
  --nav-action-border: color-mix(in srgb, var(--ui-compat-border) 36%, transparent);
  --nav-action-border-strong: color-mix(
    in srgb,
    var(--ui-compat-border-strong) 52%,
    rgba(var(--color-primary-rgb), 0.08)
  );
}

.navbar--chromeless.navbar--post-detail {
  --nav-muted-bg: transparent;
  --nav-muted-bg-strong: color-mix(in srgb, var(--ui-compat-surface-elevated) 44%, transparent);
  --nav-muted-border: transparent;
  --nav-muted-border-strong: color-mix(in srgb, var(--ui-compat-border-strong) 30%, transparent);
  --nav-chip-bg: transparent;
  --nav-chip-border: transparent;
  --nav-action-bg: transparent;
  --nav-action-bg-hover: color-mix(in srgb, var(--ui-compat-surface-interactive) 52%, transparent);
  --nav-action-border: transparent;
  --nav-action-border-strong: color-mix(in srgb, var(--ui-compat-border-strong) 36%, transparent);
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
  padding-block: max(0.5625rem, calc(var(--ui-control-padding-y-sm) - 0.03125rem));
  padding-inline: clamp(0.75rem, 1.5vw, 1rem);
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

.navbar--chromeless .navbar-shell {
  padding-inline: clamp(0.25rem, 1vw, 0.5rem);
  border-color: transparent;
  background: transparent;
  box-shadow: none;
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
  min-block-size: calc(var(--ui-control-height-sm) + 0.125rem);
  padding-block: max(0.5rem, calc(var(--ui-control-padding-y-sm) - 0.03125rem));
  padding-inline: 1rem 1.1875rem;
  border: 0.0625rem solid color-mix(in srgb, var(--nav-action-border) 78%, transparent);
  border-radius: var(--ui-compat-pill-radius, var(--radius-full));
  background: color-mix(in srgb, var(--nav-action-bg-hover) 72%, transparent);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  line-height: var(--appearance-ui-line-height);
  outline: none;
}

.nav-search-shell__input::placeholder {
  color: var(--color-text-tertiary);
}

.nav-search-shell__input:focus {
  border-color: var(--nav-action-border-strong);
}

.navbar--chromeless .nav-search-shell__input {
  border-color: color-mix(in srgb, var(--ui-compat-border) 30%, transparent);
  background: color-mix(in srgb, var(--ui-compat-surface-base) 78%, transparent);
  box-shadow: none;
}

.navbar--chromeless.navbar--post-detail .nav-search-shell__input {
  border-color: transparent;
  background: transparent;
}

.navbar--chromeless .nav-search-shell__input:focus {
  border-color: color-mix(in srgb, var(--ui-compat-border-strong) 62%, transparent);
}

.navbar--chromeless.navbar--post-detail .nav-search-shell__input:focus {
  border-color: var(--nav-action-border-strong);
  background: color-mix(in srgb, var(--ui-compat-surface-base) 44%, transparent);
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
  border-radius: var(--ui-compat-pill-radius, var(--radius-full));
}

.nav-action-btn--square {
  padding-inline: 0;
}

.nav-action-btn--search {
  gap: var(--spacing-2);
  padding-inline: 0.75rem;
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

.navbar--chromeless .nav-action-btn,
.navbar--chromeless .nav-user-btn {
  box-shadow: none;
}

.navbar--chromeless.navbar--post-detail .nav-action-btn,
.navbar--chromeless.navbar--post-detail .nav-user-btn {
  border-color: transparent;
  background: transparent;
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

.navbar--chromeless.navbar--post-detail .nav-user-avatar.ui-avatar {
  border-color: color-mix(in srgb, var(--ui-compat-border) 22%, transparent);
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
  inline-size: min(27.5rem, calc(100vw - 2rem));
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
  border-radius: var(--ui-compat-panel-radius, var(--ui-radius-dropdown, var(--radius-xl)));
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
  padding: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
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
  background: var(--ui-compat-surface-base);
  border-color: color-mix(in srgb, var(--ui-compat-border) 82%, transparent);
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
  border-radius: var(--ui-compat-control-radius, var(--ui-radius-button, var(--radius-lg)));
  background: color-mix(in srgb, var(--ui-compat-surface-interactive) 82%, transparent);
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
  background: color-mix(in srgb, var(--ui-compat-surface-interactive-strong) 92%, transparent);
  color: var(--color-primary);
  transform: translate3d(0, -0.0625rem, 0);
}

.route-dropdown__link--active {
  border-color: color-mix(
    in srgb,
    var(--nav-action-border-strong) 76%,
    rgba(var(--color-primary-rgb), 0.16)
  );
  background: color-mix(in srgb, var(--ui-compat-surface-interactive-strong) 96%, transparent);
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

.user-info {
  display: grid;
  grid-template-columns: minmax(3rem, 3.5rem) minmax(0, 1fr);
  align-items: center;
  gap: clamp(0.75rem, 1.4vw, 0.95rem);
  padding-block: clamp(0.875rem, 1.5vw, 1rem);
  padding-inline: clamp(0.875rem, 1.6vw, 1.1rem);
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
  width: clamp(3rem, 7vw, 3.55rem);
  height: clamp(3rem, 7vw, 3.55rem);
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
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 11.5rem), 1fr));
  gap: clamp(0.5rem, 0.9vw, 0.7rem);
  align-items: stretch;
  grid-auto-rows: auto;
}

.dropdown-links {
  padding: var(--spacing-2);
}

.dropdown-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  width: 100%;
  min-inline-size: 0;
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
  inline-size: clamp(2rem, 3vw, 2.25rem);
  block-size: clamp(2rem, 3vw, 2.25rem);
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
  margin-inline-start: auto;
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
  min-block-size: clamp(3.35rem, 6vw, 3.75rem);
  gap: 0.625rem;
  padding: 0.75rem 0.875rem;
  background: var(--ui-compat-surface-interactive);
}

.user-menu-card__icon {
  inline-size: clamp(2rem, 3vw, 2.25rem);
  block-size: clamp(2rem, 3vw, 2.25rem);
  align-self: center;
  justify-self: center;
}

.user-menu-card__label {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  min-block-size: 0;
  font-weight: var(--font-semibold);
  line-height: var(--appearance-ui-line-height);
  transform: translateY(var(--appearance-baseline-shift));
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
    grid-template-columns: minmax(2.85rem, 3.25rem) minmax(0, 1fr);
  }
}
</style>
