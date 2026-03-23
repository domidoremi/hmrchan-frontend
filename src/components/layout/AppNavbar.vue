<template>
  <nav ref="navbarRef" class="navbar glass-navbar" :class="{ 'navbar-hidden': isNavbarHidden }">
    <div class="container navbar-content">
      <!-- Logo -->
      <RouterLink to="/" class="navbar-brand" :aria-label="$t('app.name')">
        <span class="brand-name gradient-text">{{ $t('app.name') }}</span>
      </RouterLink>

      <!-- Desktop Navigation -->
      <div ref="navLinksRef" class="navbar-links desktop-only">
        <!-- 滑动指示器 -->
        <div class="nav-indicator" :style="navIndicatorStyle" />

        <!-- 动态渲染导航项 -->
        <RouterLink
          v-for="(item, index) in desktopNavItems"
          :key="item.path"
          :to="item.path"
          class="nav-link"
          active-class="nav-link--active"
          @mouseenter="handlePrefetch(item)"
          @focus="handlePrefetch(item)"
        >
          <span class="nav-link-icon-wrap">
            <AnimatedIcon
              :name="getNavAnimation(item)"
              :fallback-icon="item.icon"
              size="md"
              :active="activeDesktopIndex === index"
            />
            <span v-if="item.showBadge && scheduleHasNew" class="nav-badge-dot" />
          </span>
          <span>{{ $t(item.i18nKey) }}</span>
        </RouterLink>
      </div>

      <!-- Actions -->
      <div class="navbar-actions">
        <button
          type="button"
          class="nav-action-btn nav-action-btn--pill nav-action-btn--search"
          @click="goToSearch"
          @mouseenter="prefetchExplorePage"
          @focus="prefetchExplorePage"
          :aria-label="$t('common.search')"
        >
          <AnimatedIcon name="search" :fallback-icon="Search" size="md" />
          <span class="nav-action-btn__label desktop-only">{{ $t('common.search') }}</span>
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
          <AnimatedIcon name="sparkle" :fallback-icon="Settings" size="md" :active="showSettings" />
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
          class="login-btn nav-action-btn nav-action-btn--pill nav-action-btn--primary"
          :aria-label="$t('nav.login')"
          @mouseenter="prefetchLoginPage"
          @focus="prefetchLoginPage"
        >
          <AnimatedIcon name="user" :fallback-icon="LogIn" size="sm" />
          <span class="desktop-only">{{ $t('nav.login') }}</span>
        </RouterLink>

        <button
          type="button"
          v-else
          ref="userBtnRef"
          class="nav-user-btn"
          :class="{ 'nav-user-btn--active': showUserMenu }"
          :aria-label="$t('nav.profile')"
          :aria-expanded="showUserMenu"
          aria-haspopup="menu"
          :aria-controls="showUserMenu ? 'navbar-user-menu' : undefined"
          @click="toggleUserMenu"
        >
          <img :src="userAvatar" :alt="user?.username" class="nav-user-avatar" />
          <div class="nav-user-status" />
        </button>
      </div>
    </div>

    <!-- Settings Dropdown -->
    <Transition name="dropdown">
      <div
        v-if="showSettings"
        id="navbar-settings-panel"
        ref="settingsDropdownRef"
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
        class="user-dropdown glass-dropdown"
        :data-positioned="isUserDropdownPositioned"
        :style="userDropdownStyle"
        role="menu"
        :aria-label="$t('nav.profile')"
        tabindex="-1"
        @click.stop
      >
        <div class="user-info">
          <div class="user-avatar-wrapper">
            <img
              :src="userAvatar"
              :alt="user ? getUserDisplayName(user) : ''"
              class="user-avatar-lg"
            />
            <div class="nav-user-status nav-user-status--lg" />
          </div>
          <div class="user-details">
            <div class="user-name">{{ user ? getUserDisplayName(user) : '' }}</div>
            <div class="user-email">{{ user?.email }}</div>
          </div>
        </div>
        <Separator />
        <div class="dropdown-links">
          <RouterLink
            to="/profile"
            class="dropdown-link"
            role="menuitem"
            @click="showUserMenu = false"
          >
            <div class="dropdown-link-icon">
              <AnimatedIcon name="user" :fallback-icon="User" size="sm" />
            </div>
            <span>{{ $t('nav.profile') }}</span>
            <AnimatedIcon
              name="explore"
              :fallback-icon="ChevronRight"
              size="sm"
              class="dropdown-link-arrow"
            />
          </RouterLink>
          <RouterLink
            to="/profile/settings"
            class="dropdown-link"
            role="menuitem"
            @click="showUserMenu = false"
            @mouseenter="prefetchProfileSettingsPage"
            @focus="prefetchProfileSettingsPage"
          >
            <div class="dropdown-link-icon">
              <AnimatedIcon name="sparkle" :fallback-icon="Settings" size="sm" />
            </div>
            <span>{{ $t('nav.profileSettings') }}</span>
            <AnimatedIcon
              name="explore"
              :fallback-icon="ChevronRight"
              size="sm"
              class="dropdown-link-arrow"
            />
          </RouterLink>
          <RouterLink
            to="/profile/notifications"
            class="dropdown-link"
            role="menuitem"
            @click="showUserMenu = false"
          >
            <div class="dropdown-link-icon">
              <AnimatedIcon name="sparkle" :fallback-icon="Bell" size="sm" />
            </div>
            <span>{{ $t('profile.tabs.notifications') }}</span>
            <AnimatedIcon
              name="explore"
              :fallback-icon="ChevronRight"
              size="sm"
              class="dropdown-link-arrow"
            />
          </RouterLink>
          <RouterLink
            to="/profile/devices"
            class="dropdown-link"
            role="menuitem"
            @click="showUserMenu = false"
          >
            <div class="dropdown-link-icon">
              <AnimatedIcon name="explore" :fallback-icon="Smartphone" size="sm" />
            </div>
            <span>{{ $t('profile.tabs.devices') }}</span>
            <AnimatedIcon
              name="explore"
              :fallback-icon="ChevronRight"
              size="sm"
              class="dropdown-link-arrow"
            />
          </RouterLink>
        </div>
        <Separator />
        <div class="dropdown-links">
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

  <!-- Mobile Bottom Navigation - Enhanced -->
  <nav class="mobile-nav mobile-only" :class="{ 'mobile-nav--animated': shouldAnimateMobile }">
    <!-- 滑动指示器背景 -->
    <div class="mobile-nav-indicator" :style="mobileIndicatorStyle" />

    <!-- 动态渲染移动端导航项 -->
    <RouterLink
      v-for="(item, index) in mobileNavItems"
      :key="item.path"
      :to="item.requiresAuth && !isAuthenticated ? favoritesLink : item.path"
      class="mobile-nav-item"
      :class="{ 'mobile-nav-item--active': activeMobileIndex === index }"
      @mouseenter="handlePrefetch(item)"
      @focus="handlePrefetch(item)"
    >
      <div class="mobile-nav-icon">
        <AnimatedIcon
          :name="getNavAnimation(item)"
          :fallback-icon="item.icon"
          size="lg"
          :active="activeMobileIndex === index"
        />
        <span v-if="item.showBadge && scheduleHasNew" class="nav-badge-dot nav-badge-dot--mobile" />
      </div>
      <span class="mobile-nav-label">{{ $t(item.i18nKey) }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import {
  ref,
  watch,
  onMounted,
  onUnmounted,
  defineAsyncComponent,
  nextTick,
  computed,
  useTemplateRef,
} from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  Bell,
  ChevronRight,
  LogIn,
  LogOut,
  Search,
  Settings,
  Smartphone,
  User,
} from 'lucide-vue-next'
import { useAuthStore, useSettingsStore } from '@/stores'
import { useScheduleStore } from '@/stores/schedule'
import { getUserDisplayName } from '@/utils/user'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { useUserAvatar, preloadUserAvatar } from '@/composables/useUserAvatar'
import { prefetchExploreData, prefetchAuthorsData } from '@/utils/prefetch'
import {
  runWhenIdle,
  throttleRAF,
  scheduleDOMUpdate,
  prefersReducedMotion,
} from '@/utils/performance'
import { useNavigation, registerPrefetchFunction } from '@/composables/useNavigation'
import type { NavigationItem } from '@/config/navigation'
import { resolveNavbarDropdownPosition } from '@/components/layout/navbarDropdownPosition'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
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
const settingsStore = useSettingsStore()
const scheduleStore = useScheduleStore()
const { user, isAuthenticated } = storeToRefs(authStore)
const { settings } = storeToRefs(settingsStore)

// 使用导航 composable
const {
  desktopNavItems,
  mobileNavItems,
  activeDesktopIndex,
  activeMobileIndex,
  favoritesLink,
  handlePrefetch: handleNavPrefetch,
} = useNavigation()

// 是否启用动画
const shouldAnimateMobile = computed(
  () => settings.value.enableAnimations && !prefersReducedMotion()
)

// 日程未读标识
const scheduleHasNew = computed(() => scheduleStore.hasNew)

const showSettings = ref(false)
const showUserMenu = ref(false)

const navAnimationMap: Record<string, string> = {
  '/': 'home',
  '/explore': 'explore',
  '/favorites': 'heart',
  '/authors': 'user',
  '/community': 'sparkle',
  '/schedule': 'sparkle',
}

function getNavAnimation(item: NavigationItem) {
  return navAnimationMap[item.path] || 'sparkle'
}

const settingsBtnRef = useTemplateRef<HTMLButtonElement>('settingsBtnRef')
const userBtnRef = useTemplateRef<HTMLButtonElement>('userBtnRef')
const settingsDropdownRef = useTemplateRef<HTMLDivElement>('settingsDropdownRef')
const userDropdownRef = useTemplateRef<HTMLDivElement>('userDropdownRef')
const navLinksRef = useTemplateRef<HTMLDivElement>('navLinksRef')
const navbarRef = useTemplateRef<HTMLElement>('navbarRef')

useFocusTrap(settingsDropdownRef, showSettings, {
  autoFocus: true,
  restoreFocus: false,
  onEscape: () => closeSettings({ restoreFocus: true }),
})

useFocusTrap(userDropdownRef, showUserMenu, {
  autoFocus: true,
  restoreFocus: false,
  initialFocus: '.dropdown-link',
  onEscape: () => closeUserMenu({ restoreFocus: true }),
})

const settingsDropdownStyle = ref<Record<string, string>>({})
const userDropdownStyle = ref<Record<string, string>>({})
const isSettingsDropdownPositioned = ref(false)
const isUserDropdownPositioned = ref(false)

// 导航指示器样式
const navIndicatorStyle = ref<Record<string, string>>({
  opacity: '0',
  transform: 'translateX(0) scaleX(0)',
})

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

// 移动端滑动指示器样式
const mobileIndicatorStyle = computed(() => {
  const index = activeMobileIndex.value
  const count = mobileNavItems.value.length || 5
  if (index === -1) {
    return { opacity: '0', translate: '0 0' }
  }
  // 每个导航项占 1/count 宽度，指示器居中于该项
  const pct = ((index + 0.5) / count) * 100
  return {
    opacity: '1',
    left: `${pct}%`,
    translate: '-50% 0',
  }
})

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

function prefetchAuthorsPage() {
  runOncePrefetch('authors', () => {
    import('@/views/AuthorsPage.vue').catch(() => {})
    prefetchAuthorsData()
  })
}

function prefetchCommunityPage() {
  runOncePrefetch('community', () => {
    import('@/views/CommunityPage.vue').catch(() => {})
  })
}

function prefetchFavoritesPage() {
  runOncePrefetch('favorites', () => {
    import('@/views/FavoritesPage.vue').catch(() => {})
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

// 注册预加载函数到 composable
registerPrefetchFunction('prefetchExplorePage', prefetchExplorePage)
registerPrefetchFunction('prefetchAuthorsPage', prefetchAuthorsPage)
registerPrefetchFunction('prefetchCommunityPage', prefetchCommunityPage)
registerPrefetchFunction('prefetchFavoritesPage', prefetchFavoritesPage)

// 处理导航项预加载的包装函数
function handlePrefetch(item: NavigationItem) {
  handleNavPrefetch(item)
}

// 更新导航指示器位置
function updateNavIndicator() {
  if (isMobile.value || !navLinksRef.value) {
    navIndicatorStyle.value = { opacity: '0', transform: 'translateX(0) scaleX(0)' }
    return
  }

  const index = activeDesktopIndex.value
  if (index === -1) {
    navIndicatorStyle.value = { opacity: '0', transform: 'translateX(0) scaleX(0)' }
    return
  }

  const navLinks = navLinksRef.value.querySelectorAll('.nav-link')
  const activeLink = navLinks[index] as HTMLElement
  if (!activeLink) {
    navIndicatorStyle.value = { opacity: '0', transform: 'translateX(0) scaleX(0)' }
    return
  }

  const containerRect = navLinksRef.value.getBoundingClientRect()
  const linkRect = activeLink.getBoundingClientRect()

  const left = linkRect.left - containerRect.left
  const width = linkRect.width

  navIndicatorStyle.value = {
    opacity: '1',
    transform: `translateX(${left}px)`,
    width: `${width}px`,
  }
}

// 监听路由变化更新指示器
watch(
  [() => route.path, activeDesktopIndex, isAuthenticated],
  () => {
    nextTick(() => {
      requestAnimationFrame(updateNavIndicator)
    })
  },
  { immediate: true }
)

// 路由变化时关闭所有菜单
watch(
  () => route.fullPath,
  () => {
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

function isTargetWithin(
  target: Node | null,
  ...elements: Array<HTMLElement | null | undefined>
): boolean {
  if (!target) return false
  return elements.some((element) => element?.contains(target))
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node | null

  if (!isTargetWithin(target, settingsDropdownRef.value, settingsBtnRef.value)) {
    closeSettings()
  }
  if (!isTargetWithin(target, userDropdownRef.value, userBtnRef.value)) {
    closeUserMenu()
  }
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
  // 更新导航指示器
  updateNavIndicator()
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

  // 初始化导航指示器
  nextTick(() => {
    requestAnimationFrame(updateNavIndicator)
  })
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleScroll, { passive: true })
  requestAnimationFrame(() => {
    handleScroll()
  })
  scheduleNavigationIdlePrefetch()
  // 检查日程是否有新事件
  scheduleStore.checkForNew()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleScroll)
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
  --nav-shell-bg: var(--chrome-surface-bg);
  --nav-shell-border: var(--chrome-surface-border);
  --nav-shell-shadow: var(--chrome-surface-shadow);
  --nav-shell-divider: rgba(255, 255, 255, 0.42);
  --nav-muted-bg: var(--chrome-muted-bg);
  --nav-muted-bg-strong: var(--chrome-muted-bg-strong);
  --nav-muted-border: var(--chrome-muted-border);
  --nav-muted-border-strong: var(--chrome-muted-border-strong);
  --nav-chip-bg: var(--chrome-chip-bg);
  --nav-chip-border: var(--chrome-chip-border);
  --nav-chip-text: var(--chrome-chip-text);
  --nav-action-bg: var(--chrome-action-bg);
  --nav-action-bg-hover: var(--chrome-action-bg-hover);
  --nav-action-border: var(--chrome-action-border);
  --nav-action-border-strong: var(--chrome-action-border-strong);
  --nav-dropdown-bg: var(--chrome-surface-bg-soft);
  --nav-mobile-bg: var(--chrome-surface-bg);
  display: flex;
  align-items: center;
  height: var(--navbar-height);
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
  justify-content: space-between;
  gap: var(--spacing-4);
  min-inline-size: 0;
}

.glass-navbar {
  background: var(--nav-shell-bg);
  border-bottom: 1px solid var(--nav-shell-border);
  box-shadow: var(--nav-shell-shadow);
  backdrop-filter: blur(var(--blur-lg));
  -webkit-backdrop-filter: blur(var(--blur-lg));
}

/* ========== Brand ========== */
.navbar-brand {
  display: inline-flex;
  align-items: center;
  flex: 0 1 auto;
  min-inline-size: 0;
  text-decoration: none;
}

.brand-name {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: 0.04em;
  white-space: nowrap;
}

/* ========== Navigation Links ========== */
.navbar-links {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-1);
  padding: 0.1875rem;
  border: 1px solid var(--nav-muted-border);
  border-radius: var(--ui-radius-nav, var(--radius-lg));
  background: var(--nav-muted-bg);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  min-inline-size: 0;
}

/* 滑动指示器 */
.nav-indicator {
  position: absolute;
  top: 0.1875rem;
  bottom: 0.1875rem;
  left: 0.1875rem;
  height: auto;
  background: var(--nav-muted-bg-strong);
  border: 1px solid var(--nav-muted-border-strong);
  border-radius: var(--ui-radius-nav, var(--radius-lg));
  box-shadow: 0 1rem 2rem -1.6rem rgba(15, 23, 42, 0.28);
  transition:
    transform var(--duration-normal) var(--ease-spring),
    width var(--duration-normal) var(--ease-spring),
    opacity var(--duration-fast) var(--ease-out);
  pointer-events: none;
  z-index: 0;
}

.nav-indicator::after {
  content: '';
  position: absolute;
  bottom: 0.375rem;
  left: 50%;
  transform: translateX(-50%);
  width: 1.25rem;
  height: 0.1875rem;
  background: rgba(var(--color-primary-rgb), 0.76);
  border-radius: var(--radius-full);
  box-shadow: 0 0 0.5rem rgba(var(--color-primary-rgb), 0.28);
}

.nav-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--ui-radius-nav, var(--radius-lg));
  border: 1px solid transparent;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  transition:
    color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
  z-index: 1;
}

.nav-link:hover {
  color: var(--color-text-primary);
  background: rgba(var(--color-primary-rgb), 0.04);
  border-color: rgba(var(--color-primary-rgb), 0.08);
}

.nav-link--active {
  color: var(--color-primary);
}

/* ========== Actions ========== */
.navbar-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-2);
  min-inline-size: 0;
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
    box-shadow var(--duration-fast) var(--ease-out);
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
  border-color: rgba(var(--color-primary-rgb), 0.12);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.78)),
    var(--nav-action-bg);
  color: var(--color-text-primary);
  box-shadow: 0 0.85rem 1.8rem -1.4rem rgba(15, 23, 42, 0.18);
}

.nav-action-btn--primary:hover,
.nav-action-btn--primary.nav-action-btn--active {
  color: var(--color-primary);
  border-color: rgba(var(--color-primary-rgb), 0.18);
  box-shadow: 0 1rem 2rem -1.4rem rgba(15, 23, 42, 0.22);
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
  background: var(--nav-action-bg);
  border-radius: 50%;
  box-shadow: inset 0 0.0625rem 0 rgba(255, 255, 255, 0.1);
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

.nav-user-avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--nav-chip-border);
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

.settings-dropdown.glass-dropdown,
.user-dropdown.glass-dropdown {
  background: var(--nav-dropdown-bg);
  border: 1px solid var(--nav-shell-border);
  border-radius: var(--ui-radius-dropdown, var(--radius-xl));
  box-shadow: var(--nav-shell-shadow);
  backdrop-filter: blur(var(--blur-lg));
  -webkit-backdrop-filter: blur(var(--blur-lg));
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

.dropdown-enter-active.settings-dropdown,
.dropdown-enter-active.user-dropdown {
  transition:
    opacity 220ms var(--ease-out),
    transform 280ms var(--ease-spring);
}

.dropdown-leave-active.settings-dropdown,
.dropdown-leave-active.user-dropdown {
  transition:
    opacity 180ms var(--ease-in),
    transform 180ms var(--ease-in);
}

.dropdown-enter-from.settings-dropdown,
.dropdown-enter-from.user-dropdown {
  opacity: 0;
  transform: translate3d(0, var(--nav-dropdown-enter-y), 0)
    scale3d(var(--nav-dropdown-enter-scale), var(--nav-dropdown-enter-scale), 1);
}

.dropdown-leave-to.settings-dropdown,
.dropdown-leave-to.user-dropdown {
  opacity: 0;
  transform: translate3d(0, var(--nav-dropdown-leave-y), 0)
    scale3d(var(--nav-dropdown-leave-scale), var(--nav-dropdown-leave-scale), 1);
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
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
}

.user-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.user-avatar-lg {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--nav-chip-border);
}

.nav-user-status--lg {
  width: 0.75rem;
  height: 0.75rem;
  border-width: 2px;
}

.user-details {
  min-width: 0;
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
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-divider {
  height: 0.0625rem;
  margin: 0 var(--spacing-3);
  background: var(--nav-muted-border);
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
  border: 1px solid transparent;
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  text-decoration: none;
  transition:
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.dropdown-link:hover {
  background: var(--nav-muted-bg);
  border-color: var(--nav-muted-border-strong);
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
  background: var(--nav-chip-bg);
  border: 1px solid var(--nav-chip-border);
  border-radius: var(--radius-md);
  color: var(--nav-chip-text);
  transition:
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.dropdown-link:hover .dropdown-link-icon {
  background: rgba(var(--color-primary-rgb), 0.08);
  border-color: rgba(var(--color-primary-rgb), 0.14);
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
  background: rgba(var(--color-error-rgb), 0.08);
  border-color: rgba(var(--color-error-rgb), 0.12);
  color: var(--color-error);
}

.dropdown-link--danger:hover {
  background: rgba(var(--color-error-rgb), 0.08);
  border-color: rgba(var(--color-error-rgb), 0.16);
}

.dropdown-link--danger:hover .dropdown-link-icon {
  background: rgba(var(--color-error-rgb), 0.15);
}

/* ========== Mobile Navigation - 增强版 ========== */
.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4.5rem;
  background: var(--nav-mobile-bg);
  backdrop-filter: blur(var(--blur-lg));
  -webkit-backdrop-filter: blur(var(--blur-lg));
  border-top: 1px solid var(--nav-shell-border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: var(--z-sticky);
  box-shadow: 0 -1rem 2rem -1.5rem rgba(15, 23, 42, 0.22);
}

/* 滑动指示器 - 跟随活跃项移动 */
.mobile-nav-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 2rem;
  height: 0.1875rem;
  background: var(--color-primary);
  border-radius: 0 0 0.1875rem 0.1875rem;
  transition:
    left 280ms var(--ease-out),
    opacity 200ms var(--ease-out);
  box-shadow: 0 1px 6px rgba(var(--color-primary-rgb), 0.35);
  pointer-events: none;
}

.mobile-nav:not(.mobile-nav--animated) .mobile-nav-indicator {
  transition: none;
}

.mobile-nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1 1 0;
  gap: 0.125rem;
  padding: var(--spacing-2) var(--spacing-1);
  color: var(--color-text-tertiary);
  text-decoration: none;
  font-size: 0.625rem;
  font-weight: var(--font-medium);
  transition: color 0.25s ease;
  min-width: 0;
  -webkit-tap-highlight-color: transparent;
}

.mobile-nav-icon {
  position: relative;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ui-radius-nav-icon, var(--radius-xl));
  border: 1px solid transparent;
  transition:
    background 220ms var(--ease-out),
    border-color 220ms var(--ease-out),
    box-shadow 220ms var(--ease-out);
}

.mobile-nav-label {
  transition: opacity 220ms var(--ease-out);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Hover 状态 */
.mobile-nav-item:hover {
  color: var(--color-text-secondary);
}

.mobile-nav-item:hover .mobile-nav-icon {
  background: var(--nav-muted-bg);
  border-color: var(--nav-muted-border);
}

/* 活跃状态 */
.mobile-nav-item--active {
  color: var(--color-primary);
}

.mobile-nav-item--active .mobile-nav-icon {
  background: var(--nav-muted-bg-strong);
  border-color: var(--nav-muted-border-strong);
  box-shadow:
    0 0 0 4px rgba(var(--color-primary-rgb), 0.06),
    0 4px 12px -2px rgba(var(--color-primary-rgb), 0.2);
}

.mobile-nav-item--active .mobile-nav-label {
  font-weight: var(--font-semibold);
}

/* 旧的顶部指示器样式移除，使用新的滑动指示器 */
.mobile-nav-item::before {
  display: none;
}

/* ========== Responsive ========== */
.desktop-only {
  display: flex;
}

.mobile-only {
  display: none;
}

@media (max-width: 960px) {
  .desktop-only {
    display: none;
  }

  .mobile-only {
    display: flex;
  }

  .nav-action-btn {
    inline-size: var(--ui-action-size, 2.5rem);
    padding-inline: 0;
  }

  .brand-name {
    font-size: var(--text-lg);
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
    max-block-size: min(var(--app-safe-block-size-with-mobile-nav), 34rem);
  }
}

:global(#app[data-theme='dark'] .nav-action-btn--primary),
:global([data-theme='dark'] .nav-action-btn--primary) {
  background:
    linear-gradient(180deg, rgba(20, 28, 42, 0.92), rgba(10, 16, 28, 0.82)), var(--nav-action-bg);
  color: var(--color-text-primary);
}

/* ========== Nav Badge Dot ========== */
.nav-link-icon-wrap {
  position: relative;
  display: inline-flex;
}

.nav-badge-dot {
  position: absolute;
  top: -0.125rem;
  right: -0.25rem;
  width: 0.5rem;
  height: 0.5rem;
  background: var(--color-error);
  border-radius: 50%;
  border: 2px solid var(--nav-muted-bg-strong);
  animation: badge-pulse 2s ease-in-out infinite;
  pointer-events: none;
}

.nav-badge-dot--mobile {
  top: 0.125rem;
  right: 0.125rem;
  width: 0.4375rem;
  height: 0.4375rem;
}

@keyframes badge-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.2);
  }
}

:global(#app[data-theme='dark'] .navbar),
:global([data-theme='dark'] .navbar) {
  --nav-shell-divider: rgba(255, 255, 255, 0.12);
}

:global(#app[data-theme='blue'] .navbar),
:global([data-theme='blue'] .navbar) {
  --nav-shell-divider: rgba(59, 130, 246, 0.18);
}

:global(#app[data-ui-style='material'] .navbar),
:global([data-ui-style='material'] .navbar) {
  --nav-shell-shadow: var(--shadow-md);
}
</style>
