<template>
  <nav class="navbar glass-navbar" :class="{ 'navbar-hidden': isNavbarHidden }">
    <div class="container navbar-content">
      <!-- Logo -->
      <RouterLink to="/" class="navbar-brand">
        <span class="brand-name gradient-text">mmc</span>
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
          <AnimatedIcon
            :name="getNavAnimation(item)"
            :fallback-icon="item.icon"
            size="md"
            :active="activeDesktopIndex === index"
          />
          <span>{{ $t(item.i18nKey) }}</span>
        </RouterLink>
      </div>

      <!-- Actions -->
      <div class="navbar-actions">
        <button
          class="action-btn"
          @click="goToSearch"
          @mouseenter="prefetchExplorePage"
          @focus="prefetchExplorePage"
          :aria-label="$t('common.search')"
        >
          <AnimatedIcon name="search" :fallback-icon="Search" size="md" />
        </button>

        <button
          ref="settingsBtnRef"
          class="action-btn"
          :class="{ 'action-btn--active': showSettings }"
          @click="toggleSettings"
          @mouseenter="prefetchSettingsPanel"
          @focus="prefetchSettingsPanel"
          :aria-label="$t('nav.settings')"
        >
          <AnimatedIcon name="sparkle" :fallback-icon="Settings" size="md" :active="showSettings" />
        </button>

        <RouterLink
          v-if="!isAuthenticated"
          :to="{
            path: '/login',
            query: { redirect: $route.fullPath !== '/' ? $route.fullPath : undefined },
          }"
          class="login-btn glass-button glass-button--primary"
          :aria-label="$t('nav.login')"
          @mouseenter="prefetchLoginPage"
          @focus="prefetchLoginPage"
        >
          <AnimatedIcon name="user" :fallback-icon="LogIn" size="sm" />
          <span class="desktop-only">{{ $t('nav.login') }}</span>
        </RouterLink>

        <button
          v-else
          ref="userBtnRef"
          class="user-btn"
          :class="{ 'user-btn--active': showUserMenu }"
          @click="toggleUserMenu"
        >
          <img :src="userAvatar" :alt="user?.username" class="user-avatar" />
          <div class="user-status" />
        </button>
      </div>
    </div>

    <!-- Settings Dropdown -->
    <Transition name="dropdown">
      <div
        v-if="showSettings"
        ref="settingsDropdownRef"
        class="settings-dropdown glass-dropdown"
        :style="settingsDropdownStyle"
        @click.stop
      >
        <SettingsPanel @close="showSettings = false" />
      </div>
    </Transition>

    <!-- User Menu Dropdown -->
    <Transition name="dropdown">
      <div
        v-if="showUserMenu && isAuthenticated"
        ref="userDropdownRef"
        class="user-dropdown glass-dropdown"
        :style="userDropdownStyle"
        @click.stop
      >
        <div class="user-info">
          <div class="user-avatar-wrapper">
            <img
              :src="userAvatar"
              :alt="user ? getUserDisplayName(user) : ''"
              class="user-avatar-lg"
            />
            <div class="user-status user-status--lg" />
          </div>
          <div class="user-details">
            <div class="user-name">{{ user ? getUserDisplayName(user) : '' }}</div>
            <div class="user-email">{{ user?.email }}</div>
          </div>
        </div>
        <div class="dropdown-divider" />
        <div class="dropdown-links">
          <RouterLink to="/profile" class="dropdown-link" @click="showUserMenu = false">
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
          <RouterLink to="/profile/devices" class="dropdown-link" @click="showUserMenu = false">
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
        <div class="dropdown-divider" />
        <div class="dropdown-links">
          <button class="dropdown-link dropdown-link--danger" @click="handleLogout">
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
  watchEffect,
} from 'vue'
import { RouterLink, useRouter } from 'vue-router'
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
import { getUserDisplayName } from '@/utils/user'
import { useUserAvatar, preloadUserAvatar } from '@/composables/useUserAvatar'
import { prefetchExploreData, prefetchAuthorsData } from '@/utils/prefetch'
import { throttleRAF, scheduleDOMUpdate, prefersReducedMotion } from '@/utils/performance'
import { useNavigation, registerPrefetchFunction } from '@/composables/useNavigation'
import type { NavigationItem } from '@/config/navigation'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

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
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
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

const showSettings = ref(false)
const showUserMenu = ref(false)

const navAnimationMap: Record<string, string> = {
  '/': 'home',
  '/explore': 'explore',
  '/favorites': 'heart',
  '/authors': 'user',
  '/community': 'sparkle',
}

function getNavAnimation(item: NavigationItem) {
  return navAnimationMap[item.path] || 'sparkle'
}

const settingsBtnRef = ref<HTMLButtonElement | null>(null)
const userBtnRef = ref<HTMLButtonElement | null>(null)
const settingsDropdownRef = ref<HTMLDivElement | null>(null)
const userDropdownRef = ref<HTMLDivElement | null>(null)
const navLinksRef = ref<HTMLDivElement | null>(null)
// 记录原始 body 样式，用于恢复
let originalBodyOverflow = ''
let originalBodyPaddingRight = ''

const settingsDropdownStyle = ref<Record<string, string>>({})
const userDropdownStyle = ref<Record<string, string>>({})

// 导航指示器样式
const navIndicatorStyle = ref<Record<string, string>>({
  opacity: '0',
  transform: 'translateX(0) scaleX(0)',
})

const isMobile = ref(false)
const isNavbarHidden = ref(false)
let lastScrollY = 0
const scrollThreshold = 100

let navbarHeightPx = '64px'

function syncNavbarVisibleHeight() {
  if (typeof document === 'undefined') return
  // When navbar is hidden via translateY(-100%), expose 0px so fixed headers can pin to top.
  document.documentElement.style.setProperty(
    '--navbar-visible-height',
    isNavbarHidden.value ? '0px' : navbarHeightPx
  )
}

// 使用统一的用户头像 composable，确保与其他组件同步
const { avatarUrl: userAvatar } = useUserAvatar()

// 移动端滑动指示器样式
const mobileIndicatorStyle = computed(() => {
  const index = activeMobileIndex.value
  if (index === -1) {
    return { opacity: '0', transform: 'translateX(0)' }
  }
  // 每个导航项占 20% 宽度，指示器居中
  const position = index * 20 + 10 // 10% 是半个导航项宽度
  return {
    opacity: '1',
    transform: `translateX(calc(${position}vw - 50%))`,
  }
})

// 预加载函数标志
let hasPrefetchedExplorePage = false
let hasPrefetchedAuthorsPage = false
let hasPrefetchedCommunityPage = false
let hasPrefetchedFavoritesPage = false
let hasPrefetchedLoginPage = false
let hasPrefetchedProfileSettingsPage = false

function prefetchExplorePage() {
  if (hasPrefetchedExplorePage) return
  hasPrefetchedExplorePage = true
  import('@/views/ExplorePage.vue').catch(() => {})
  prefetchExploreData()
}

function prefetchAuthorsPage() {
  if (hasPrefetchedAuthorsPage) return
  hasPrefetchedAuthorsPage = true
  import('@/views/AuthorsPage.vue').catch(() => {})
  prefetchAuthorsData()
}

function prefetchCommunityPage() {
  if (hasPrefetchedCommunityPage) return
  hasPrefetchedCommunityPage = true
  import('@/views/CommunityPage.vue').catch(() => {})
}

function prefetchFavoritesPage() {
  if (hasPrefetchedFavoritesPage) return
  hasPrefetchedFavoritesPage = true
  import('@/views/FavoritesPage.vue').catch(() => {})
}

function prefetchLoginPage() {
  if (hasPrefetchedLoginPage) return
  hasPrefetchedLoginPage = true
  import('@/views/LoginPage.vue').catch(() => {})
}

function prefetchProfileSettingsPage() {
  if (hasPrefetchedProfileSettingsPage) return
  hasPrefetchedProfileSettingsPage = true
  import('@/views/ProfileSettingsPage.vue').catch(() => {})
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
watchEffect(() => {
  // 触发依赖收集
  const _index = activeDesktopIndex.value
  const _auth = isAuthenticated.value
  // 使用变量避免 lint 警告
  void _index
  void _auth
  // 延迟更新以确保 DOM 已更新
  nextTick(() => {
    requestAnimationFrame(updateNavIndicator)
  })
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

function requestIdle(fn: () => void) {
  const ric = (
    window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void
    }
  ).requestIdleCallback
  if (ric) {
    ric(fn, { timeout: 2000 })
  } else {
    window.setTimeout(fn, 800)
  }
}

function goToSearch() {
  router.push('/search')
}

/**
 * 锁定 body 滚动，防止滚动穿透
 */
function lockBodyScroll() {
  if (typeof document === 'undefined') return

  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

  originalBodyOverflow = document.body.style.overflow
  originalBodyPaddingRight = document.body.style.paddingRight

  document.body.style.overflow = 'hidden'
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`
  }
}

/**
 * 解锁 body 滚动
 */
function unlockBodyScroll() {
  if (typeof document === 'undefined') return

  document.body.style.overflow = originalBodyOverflow
  document.body.style.paddingRight = originalBodyPaddingRight
}

function toggleSettings() {
  showUserMenu.value = false
  showSettings.value = !showSettings.value

  if (showSettings.value) {
    lockBodyScroll()
    nextTick(() => updateDropdownPosition('settings'))
  } else {
    unlockBodyScroll()
  }
}

function toggleUserMenu() {
  showSettings.value = false
  showUserMenu.value = !showUserMenu.value

  if (showUserMenu.value) {
    lockBodyScroll()
    nextTick(() => updateDropdownPosition('user'))
  } else {
    unlockBodyScroll()
  }
}

function handleLogout() {
  authStore.logout()
  showUserMenu.value = false
  unlockBodyScroll()
  router.push('/')
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  const wasSettingsOpen = showSettings.value
  const wasUserMenuOpen = showUserMenu.value

  if (!target.closest('.settings-dropdown') && !target.closest('.action-btn')) {
    showSettings.value = false
  }
  if (!target.closest('.user-dropdown') && !target.closest('.user-btn')) {
    showUserMenu.value = false
  }

  // 如果关闭了任何菜单，解锁滚动
  if ((wasSettingsOpen && !showSettings.value) || (wasUserMenuOpen && !showUserMenu.value)) {
    unlockBodyScroll()
  }
}

function updateIsMobile() {
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
}

function updateDropdownPosition(kind: 'settings' | 'user') {
  updateIsMobile()

  if (isMobile.value) {
    settingsDropdownStyle.value = {}
    userDropdownStyle.value = {}
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
      const margin = 16
      const offsetY = 8

      let left = triggerRect.right - dropdownRect.width
      let top = triggerRect.bottom + offsetY

      left = Math.max(margin, Math.min(left, viewportWidth - dropdownRect.width - margin))
      top = Math.max(margin, Math.min(top, viewportHeight - dropdownRect.height - margin))

      const style = {
        left: `${left}px`,
        top: `${top}px`,
        right: 'auto',
      }

      if (kind === 'settings') {
        settingsDropdownStyle.value = style
      } else {
        userDropdownStyle.value = style
      }
    }
  )
}

// 滚动处理：实现导航栏渐进式隐藏
const handleScroll = throttleRAF(() => {
  const currentScrollY = window.scrollY

  // 向下滚动且超过阈值时隐藏
  if (currentScrollY > lastScrollY && currentScrollY > scrollThreshold) {
    isNavbarHidden.value = true
  }
  // 向上滚动时显示
  else if (currentScrollY < lastScrollY) {
    isNavbarHidden.value = false
  }
  // 接近顶部时显示
  else if (currentScrollY <= scrollThreshold) {
    isNavbarHidden.value = false
  }

  syncNavbarVisibleHeight()
  lastScrollY = currentScrollY
})

// 使用 throttleRAF 节流 resize 事件，避免高频触发导致的性能问题
const handleResize = throttleRAF(() => {
  updateIsMobile()
  // 更新导航指示器
  updateNavIndicator()
  if (showSettings.value) {
    nextTick(() => updateDropdownPosition('settings'))
  }
  if (showUserMenu.value) {
    nextTick(() => updateDropdownPosition('user'))
  }
})

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
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleScroll, { passive: true })

  if (shouldPrefetchOnIdle()) {
    requestIdle(() => {
      prefetchExplorePage()
      prefetchAuthorsPage()
    })
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleScroll)

  // Reset to default on unmount.
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--navbar-visible-height', '')
  }

  // 清理：确保解锁滚动
  unlockBodyScroll()
})
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  height: var(--navbar-height);
  transition:
    transform var(--duration-normal) var(--ease-out),
    box-shadow var(--transition-fast);
  transform: translate3d(0, 0, 0);
  will-change: transform;
}

.navbar.navbar-hidden {
  transform: translate3d(0, -100%, 0);
}

.navbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
}

.glass-navbar {
  box-shadow:
    0 16px 30px -24px rgba(15, 23, 42, 0.4),
    0 6px 16px -12px rgba(15, 23, 42, 0.25);
}

/* ========== Brand ========== */
.navbar-brand {
  text-decoration: none;
}

.brand-name {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  letter-spacing: 0.08em;
}

/* ========== Navigation Links ========== */
.navbar-links {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

/* 滑动指示器 */
.nav-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 100%;
  background: rgba(var(--color-primary-rgb), 0.08);
  border-radius: var(--radius-lg);
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
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: var(--gradient-primary);
  border-radius: var(--radius-full);
  box-shadow: 0 0 8px rgba(var(--color-primary-rgb), 0.4);
}

.nav-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  transition:
    color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out);
  z-index: 1;
}

.nav-link svg {
  transition: transform var(--duration-fast) var(--ease-spring);
}

.nav-link:hover {
  color: var(--color-text-primary);
  background: rgba(var(--color-primary-rgb), 0.08);
}

.nav-link:hover svg {
  transform: scale(1.1);
}

.nav-link:active {
  transform: scale(0.97);
}

.nav-link--active {
  color: var(--color-primary);
}

.nav-link--active svg {
  animation: nav-icon-pop 0.4s var(--ease-spring);
}

@keyframes nav-icon-pop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

/* ========== Actions ========== */
.navbar-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.action-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.action-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: transparent;
  transition: background var(--transition-fast);
}

.action-btn:hover {
  color: var(--color-text-primary);
}

.action-btn:hover::before {
  background: var(--glass-bg-subtle);
}

.action-btn--active {
  color: var(--color-primary);
}

.action-btn--active::before {
  background: rgba(var(--color-primary-rgb), 0.1);
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
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--text-sm);
}

/* ========== User Button ========== */
.user-btn {
  position: relative;
  padding: 2px;
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.user-btn::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: transparent;
  transition: background var(--transition-fast);
}

.user-btn:hover::before,
.user-btn--active::before {
  background: var(--gradient-accent);
  opacity: 0.3;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--glass-border-strong);
  transition: border-color var(--transition-fast);
}

.user-btn:hover .user-avatar,
.user-btn--active .user-avatar {
  border-color: var(--color-primary);
}

.user-status {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  background: var(--color-success);
  border: 2px solid var(--glass-bg-strong);
  border-radius: 50%;
}

/* ========== Dropdowns ========== */
.settings-dropdown,
.user-dropdown {
  position: fixed;
  top: calc(var(--navbar-height) - var(--spacing-2));
  right: var(--spacing-4);
  min-width: 300px;
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
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--glass-border-strong);
}

.user-status--lg {
  width: 12px;
  height: 12px;
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
  height: 1px;
  margin: 0 var(--spacing-3);
  background: var(--glass-border);
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
  border-radius: var(--radius-lg);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.dropdown-link:hover {
  background: var(--glass-bg-subtle);
}

.dropdown-link:hover .dropdown-link-arrow {
  opacity: 1;
  transform: translateX(0);
}

.dropdown-link-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg-subtle);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.dropdown-link:hover .dropdown-link-icon {
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}

.dropdown-link-arrow {
  margin-left: auto;
  color: var(--color-text-tertiary);
  opacity: 0;
  transform: translateX(-4px);
  transition: all var(--transition-fast);
}

.dropdown-link--danger {
  color: var(--color-error);
}

.dropdown-link--danger .dropdown-link-icon,
.dropdown-link-icon--danger {
  background: rgba(var(--color-error-rgb), 0.1);
  color: var(--color-error);
}

.dropdown-link--danger:hover {
  background: rgba(var(--color-error-rgb), 0.08);
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
  height: 72px;
  background: var(--glass-bg-strong);
  backdrop-filter: var(--glass-blur-strong);
  -webkit-backdrop-filter: var(--glass-blur-strong);
  border-top: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: var(--z-sticky);
  box-shadow: 0 -4px 20px -4px rgba(0, 0, 0, 0.12);
}

/* 滑动指示器 - 跟随活跃项移动 */
.mobile-nav-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 48px;
  height: 3px;
  background: var(--gradient-primary);
  border-radius: 0 0 4px 4px;
  transition:
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.2s ease;
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.4);
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
  gap: 2px;
  padding: var(--spacing-2) var(--spacing-1);
  color: var(--color-text-tertiary);
  text-decoration: none;
  font-size: 10px;
  font-weight: var(--font-medium);
  transition: color 0.25s ease;
  min-width: 0;
  -webkit-tap-highlight-color: transparent;
}

.mobile-nav-icon {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xl);
  transition:
    background 0.3s ease,
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.3s ease;
}

.mobile-nav-icon svg {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.mobile-nav-label {
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* 点击反馈 */
.mobile-nav-item:active .mobile-nav-icon {
  transform: scale(0.85);
}

.mobile-nav--animated .mobile-nav-item:active .mobile-nav-icon {
  transition: transform 0.1s ease;
}

/* Hover 状态 */
.mobile-nav-item:hover {
  color: var(--color-text-secondary);
}

.mobile-nav-item:hover .mobile-nav-icon {
  background: rgba(var(--color-primary-rgb), 0.06);
}

/* 活跃状态 */
.mobile-nav-item--active {
  color: var(--color-primary);
}

.mobile-nav-item--active .mobile-nav-icon {
  background: rgba(var(--color-primary-rgb), 0.12);
  box-shadow:
    0 0 0 4px rgba(var(--color-primary-rgb), 0.06),
    0 4px 12px -2px rgba(var(--color-primary-rgb), 0.2);
}

.mobile-nav-item--active .mobile-nav-icon svg {
  transform: scale(1.1);
}

.mobile-nav-item--active .mobile-nav-label {
  font-weight: var(--font-semibold);
}

/* 切换动画 - 仅在启用动画时 */
.mobile-nav--animated .mobile-nav-item--active .mobile-nav-icon svg {
  animation: mobile-nav-icon-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.mobile-nav--animated .mobile-nav-item--active .mobile-nav-label {
  animation: mobile-nav-label-slide 0.3s ease;
}

@keyframes mobile-nav-icon-pop {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1.1);
  }
}

@keyframes mobile-nav-label-slide {
  0% {
    transform: translateY(4px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 涟漪效果背景 */
.mobile-nav-item::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(var(--color-primary-rgb), 0.1);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition:
    width 0.4s ease,
    height 0.4s ease,
    opacity 0.4s ease;
  opacity: 0;
  pointer-events: none;
}

.mobile-nav--animated .mobile-nav-item:active::after {
  width: 80px;
  height: 80px;
  opacity: 1;
  transition:
    width 0s,
    height 0s,
    opacity 0s;
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

@media (max-width: 768px) {
  .desktop-only {
    display: none;
  }

  .mobile-only {
    display: flex;
  }

  .brand-name {
    font-size: var(--text-lg);
  }

  .settings-dropdown,
  .user-dropdown {
    left: var(--spacing-4);
    right: var(--spacing-4);
    min-width: auto;
  }
}
</style>
