<template>
  <nav ref="navbarRef" class="navbar navbar--minimal" :class="{ 'navbar-hidden': isNavbarHidden }">
    <div class="container navbar-content">
      <div class="navbar-shell">
        <RouterLink to="/" class="navbar-brand" :aria-label="$t('app.name')">
          <span class="navbar-brand__meta">
            <span class="brand-name gradient-text">{{ $t('app.name') }}</span>
          </span>
        </RouterLink>

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

          <RouterLink
            to="/explore"
            class="nav-action-btn nav-action-btn--pill nav-action-btn--primary navbar-cta"
            :aria-label="$t('home.hero.primaryAction')"
            @mouseenter="prefetchExplorePage"
            @focus="prefetchExplorePage"
          >
            <AnimatedIcon name="explore" :fallback-icon="Compass" size="sm" />
            <span class="nav-action-btn__label">{{ $t('home.hero.primaryAction') }}</span>
          </RouterLink>

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
            class="login-btn nav-action-btn nav-action-btn--pill"
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
            <img :src="userAvatar" :alt="user?.username" class="nav-user-avatar" />
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
</template>

<script setup lang="ts">
import {
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
  Compass,
  LogIn,
  LogOut,
  Search,
  Settings,
  Smartphone,
  User,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores'
import { getUserDisplayName } from '@/utils/user'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { useUserAvatar, preloadUserAvatar } from '@/composables/useUserAvatar'
import { prefetchExploreData, prefetchAuthorsData } from '@/utils/prefetch'
import { runWhenIdle, throttleRAF, scheduleDOMUpdate } from '@/utils/performance'
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
const { user, isAuthenticated } = storeToRefs(authStore)

const showSettings = ref(false)
const showUserMenu = ref(false)

const settingsBtnRef = useTemplateRef<HTMLButtonElement>('settingsBtnRef')
const userBtnRef = useTemplateRef<HTMLButtonElement>('userBtnRef')
const settingsDropdownRef = useTemplateRef<HTMLDivElement>('settingsDropdownRef')
const userDropdownRef = useTemplateRef<HTMLDivElement>('userDropdownRef')
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
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleScroll, { passive: true })
  requestAnimationFrame(() => {
    handleScroll()
  })
  scheduleNavigationIdlePrefetch()
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
  --nav-shell-bg: rgba(255, 255, 255, 0.26);
  --nav-shell-border: rgba(148, 163, 184, 0.12);
  --nav-shell-shadow: 0 1.25rem 2.75rem -2rem rgba(15, 23, 42, 0.16);
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
  display: flex;
  align-items: center;
  height: var(--navbar-height);
  padding-block: 0.75rem;
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
  justify-content: center;
  gap: var(--spacing-3);
  min-inline-size: 0;
}

.navbar-shell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(0.75rem, 2vw, 1.5rem);
  inline-size: 100%;
  min-inline-size: 0;
  padding: 0.625rem clamp(0.75rem, 1.8vw, 1.1rem);
  border: 0.0625rem solid var(--nav-shell-border);
  border-radius: 999rem;
  background: var(--nav-shell-bg);
  box-shadow: var(--nav-shell-shadow);
  backdrop-filter: blur(0.5rem);
  -webkit-backdrop-filter: blur(0.5rem);
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
  border-color: rgba(var(--color-primary-rgb), 0.16);
  background: rgba(255, 255, 255, 0.62);
  color: var(--color-text-primary);
  box-shadow: 0 0.85rem 1.8rem -1.4rem rgba(15, 23, 42, 0.14);
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

.navbar-cta {
  text-decoration: none;
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
  background: rgba(255, 255, 255, 0.64);
  border: 1px solid var(--nav-shell-border);
  border-radius: var(--ui-radius-dropdown, var(--radius-xl));
  box-shadow: var(--nav-shell-shadow);
  backdrop-filter: blur(0.5rem);
  -webkit-backdrop-filter: blur(0.5rem);
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

/* ========== Responsive ========== */
.desktop-only {
  display: flex;
}

@media (max-width: 960px) {
  .desktop-only {
    display: none;
  }

  .nav-action-btn {
    inline-size: var(--ui-action-size, 2.5rem);
    padding-inline: 0;
  }

  .brand-name {
    font-size: var(--text-lg);
  }

  .navbar-shell {
    padding-inline: 0.75rem;
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
}

:global(#app[data-theme='dark'] .nav-action-btn--primary),
:global([data-theme='dark'] .nav-action-btn--primary) {
  background: rgba(15, 23, 42, 0.62);
  color: var(--color-text-primary);
}

:global(#app[data-theme='dark'] .navbar),
:global([data-theme='dark'] .navbar) {
  --nav-shell-bg: rgba(15, 23, 42, 0.28);
  --nav-shell-border: rgba(255, 255, 255, 0.1);
  --nav-shell-shadow: 0 1.5rem 3rem -2.25rem rgba(2, 6, 23, 0.34);
}

:global(#app[data-theme='blue'] .navbar),
:global([data-theme='blue'] .navbar) {
  --nav-shell-bg: rgba(239, 246, 255, 0.32);
  --nav-shell-border: rgba(96, 165, 250, 0.16);
}

:global(#app[data-ui-style='material'] .navbar),
:global([data-ui-style='material'] .navbar) {
  --nav-shell-shadow: var(--shadow-md);
}
</style>
