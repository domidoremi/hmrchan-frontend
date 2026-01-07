<template>
  <nav class="navbar glass-navbar" :class="{ 'navbar-hidden': isNavbarHidden }">
    <div class="container navbar-content">
      <!-- Logo -->
      <RouterLink to="/" class="navbar-brand">
        <div class="brand-logo">
          <div class="brand-icon">
            <Sparkles :size="18" />
          </div>
          <span class="brand-name">{{ $t('app.name') }}</span>
        </div>
      </RouterLink>

      <!-- Desktop Navigation -->
      <div class="navbar-links desktop-only">
        <RouterLink to="/" class="nav-link" active-class="nav-link--active">
          <Home :size="18" />
          <span>{{ $t('nav.home') }}</span>
        </RouterLink>
        <RouterLink
          to="/explore"
          class="nav-link"
          active-class="nav-link--active"
          @mouseenter="prefetchExplorePage"
          @focus="prefetchExplorePage"
        >
          <Compass :size="18" />
          <span>{{ $t('nav.explore') }}</span>
        </RouterLink>
        <RouterLink
          v-if="isAuthenticated"
          to="/favorites"
          class="nav-link"
          active-class="nav-link--active"
          @mouseenter="prefetchFavoritesPage"
          @focus="prefetchFavoritesPage"
        >
          <Heart :size="18" />
          <span>{{ $t('nav.favorites') }}</span>
        </RouterLink>
        <RouterLink
          to="/authors"
          class="nav-link"
          active-class="nav-link--active"
          @mouseenter="prefetchAuthorsPage"
          @focus="prefetchAuthorsPage"
        >
          <Users :size="18" />
          <span>{{ $t('nav.authors') }}</span>
        </RouterLink>
        <RouterLink
          to="/community"
          class="nav-link"
          active-class="nav-link--active"
          @mouseenter="prefetchCommunityPage"
          @focus="prefetchCommunityPage"
        >
          <MessageSquare :size="18" />
          <span>{{ $t('nav.community') }}</span>
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
          <Search :size="18" />
        </button>

        <button
          ref="settingsBtnRef"
          class="action-btn"
          :class="{ 'action-btn--active': showSettings }"
          @click="toggleSettings"
          :aria-label="$t('nav.settings')"
        >
          <Settings :size="18" :class="{ 'icon-spin': showSettings }" />
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
          <LogIn :size="16" />
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
              <User :size="16" />
            </div>
            <span>{{ $t('nav.profile') }}</span>
            <ChevronRight :size="14" class="dropdown-link-arrow" />
          </RouterLink>
          <RouterLink
            to="/settings/profile"
            class="dropdown-link"
            @click="showUserMenu = false"
            @mouseenter="prefetchProfileSettingsPage"
            @focus="prefetchProfileSettingsPage"
          >
            <div class="dropdown-link-icon">
              <Settings :size="16" />
            </div>
            <span>{{ $t('nav.profileSettings') }}</span>
            <ChevronRight :size="14" class="dropdown-link-arrow" />
          </RouterLink>
        </div>
        <div class="dropdown-divider" />
        <div class="dropdown-links">
          <button class="dropdown-link dropdown-link--danger" @click="handleLogout">
            <div class="dropdown-link-icon dropdown-link-icon--danger">
              <LogOut :size="16" />
            </div>
            <span>{{ $t('nav.logout') }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </nav>

  <!-- Mobile Bottom Navigation -->
  <nav class="mobile-nav mobile-only">
    <RouterLink to="/" class="mobile-nav-item" active-class="mobile-nav-item--active">
      <div class="mobile-nav-icon">
        <Home :size="20" />
      </div>
      <span>{{ $t('nav.home') }}</span>
    </RouterLink>
    <RouterLink
      to="/explore"
      class="mobile-nav-item"
      active-class="mobile-nav-item--active"
      @mouseenter="prefetchExplorePage"
      @focus="prefetchExplorePage"
    >
      <div class="mobile-nav-icon">
        <Compass :size="20" />
      </div>
      <span>{{ $t('nav.explore') }}</span>
    </RouterLink>
    <RouterLink
      :to="mobileFavoritesLink"
      class="mobile-nav-item"
      active-class="mobile-nav-item--active"
      @mouseenter="prefetchFavoritesPage"
      @focus="prefetchFavoritesPage"
    >
      <div class="mobile-nav-icon">
        <Heart :size="20" />
      </div>
      <span>{{ $t('nav.favorites') }}</span>
    </RouterLink>
    <RouterLink
      to="/authors"
      class="mobile-nav-item"
      active-class="mobile-nav-item--active"
      @mouseenter="prefetchAuthorsPage"
      @focus="prefetchAuthorsPage"
    >
      <div class="mobile-nav-icon">
        <Users :size="20" />
      </div>
      <span>{{ $t('nav.authors') }}</span>
    </RouterLink>
    <RouterLink
      to="/community"
      class="mobile-nav-item"
      active-class="mobile-nav-item--active"
      @mouseenter="prefetchCommunityPage"
      @focus="prefetchCommunityPage"
    >
      <div class="mobile-nav-icon">
        <MessageSquare :size="20" />
      </div>
      <span>{{ $t('nav.community') }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, defineAsyncComponent, nextTick, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  ChevronRight,
  Compass,
  Heart,
  Home,
  LogIn,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  User,
  Users,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores'
import { getUserDisplayName } from '@/utils/user'
import { useUserAvatar, preloadUserAvatar } from '@/composables/useUserAvatar'
import { prefetchExploreData, prefetchAuthorsData } from '@/utils/prefetch'
import { throttleRAF, scheduleDOMUpdate } from '@/utils/performance'

// 懒加载设置面板，减少首屏 JS
const SettingsPanel = defineAsyncComponent(() => import('./SettingsPanel.vue'))

const router = useRouter()
const authStore = useAuthStore()
const { user, isAuthenticated } = storeToRefs(authStore)

const mobileFavoritesLink = computed(() => {
  if (isAuthenticated.value) return '/favorites'
  return {
    path: '/login',
    query: { redirect: '/favorites' },
  }
})

const showSettings = ref(false)
const showUserMenu = ref(false)

const settingsBtnRef = ref<HTMLButtonElement | null>(null)
const userBtnRef = ref<HTMLButtonElement | null>(null)
const settingsDropdownRef = ref<HTMLDivElement | null>(null)
const userDropdownRef = ref<HTMLDivElement | null>(null)

const settingsDropdownStyle = ref<Record<string, string>>({})
const userDropdownStyle = ref<Record<string, string>>({})

const isMobile = ref(false)
const isNavbarHidden = ref(false)
let lastScrollY = 0
const scrollThreshold = 100

// 使用统一的用户头像 composable，确保与其他组件同步
const { avatarUrl: userAvatar } = useUserAvatar()

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

function toggleSettings() {
  showUserMenu.value = false
  showSettings.value = !showSettings.value

  if (showSettings.value) {
    nextTick(() => updateDropdownPosition('settings'))
  }
}

function toggleUserMenu() {
  showSettings.value = false
  showUserMenu.value = !showUserMenu.value

  if (showUserMenu.value) {
    nextTick(() => updateDropdownPosition('user'))
  }
}

function handleLogout() {
  authStore.logout()
  showUserMenu.value = false
  router.push('/')
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.settings-dropdown') && !target.closest('.action-btn')) {
    showSettings.value = false
  }
  if (!target.closest('.user-dropdown') && !target.closest('.user-btn')) {
    showUserMenu.value = false
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

  lastScrollY = currentScrollY
})

// 使用 throttleRAF 节流 resize 事件，避免高频触发导致的性能问题
const handleResize = throttleRAF(() => {
  updateIsMobile()
  if (showSettings.value) {
    nextTick(() => updateDropdownPosition('settings'))
  }
  if (showUserMenu.value) {
    nextTick(() => updateDropdownPosition('user'))
  }
})

onMounted(() => {
  updateIsMobile()
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
})
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  height: var(--navbar-height);
  transition: transform var(--duration-normal) var(--ease-out);
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

/* ========== Brand ========== */
.navbar-brand {
  text-decoration: none;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.brand-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-accent);
  border-radius: var(--radius-lg);
  color: var(--color-white);
  box-shadow: var(--glass-glow);
}

.brand-name {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ========== Navigation Links ========== */
.navbar-links {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
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
  transition: all var(--transition-fast);
}

.nav-link::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: transparent;
  transition: background var(--transition-fast);
}

.nav-link:hover {
  color: var(--color-text-primary);
}

.nav-link:hover::before {
  background: var(--glass-bg-subtle);
}

.nav-link--active {
  color: var(--color-primary);
}

.nav-link--active::before {
  background: rgba(var(--color-primary-rgb), 0.1);
}

.nav-link--active::after {
  content: '';
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: var(--color-primary);
  border-radius: var(--radius-full);
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
  box-shadow: 0 -4px 16px -4px rgba(0, 0, 0, 0.1);
}

.mobile-nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1 1 0;
  gap: var(--spacing-1);
  padding: var(--spacing-2) var(--spacing-3);
  color: var(--color-text-tertiary);
  text-decoration: none;
  font-size: 10px;
  font-weight: var(--font-medium);
  transition: all var(--transition-fast);
  min-width: 64px;
}

.mobile-nav-item::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 32px;
  height: 3px;
  background: var(--gradient-primary);
  border-radius: 0 0 3px 3px;
  transition: transform var(--transition-fast);
}

.mobile-nav-item--active::before {
  transform: translateX(-50%) scaleX(1);
}

.mobile-nav-icon {
  position: relative;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.mobile-nav-item:active .mobile-nav-icon {
  transform: scale(0.9);
}

.mobile-nav-item:hover,
.mobile-nav-item--active {
  color: var(--color-primary);
}

.mobile-nav-item--active .mobile-nav-icon {
  background: rgba(var(--color-primary-rgb), 0.15);
  box-shadow: 0 0 0 4px rgba(var(--color-primary-rgb), 0.08);
}

.mobile-nav-item--active .mobile-nav-icon svg {
  animation: nav-icon-bounce 0.5s ease-out;
}

@keyframes nav-icon-bounce {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
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
