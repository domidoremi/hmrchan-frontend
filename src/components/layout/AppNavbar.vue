<template>
  <nav class="navbar glass-navbar">
    <div class="container navbar-content">
      <!-- Logo -->
      <RouterLink to="/" class="navbar-brand">
        <span class="brand-name">{{ $t('app.name') }}</span>
      </RouterLink>

      <!-- Desktop Navigation -->
      <div class="navbar-links desktop-only">
        <RouterLink to="/" class="nav-link">
          <Home :size="20" />
          <span>{{ $t('nav.home') }}</span>
        </RouterLink>
        <RouterLink
          to="/explore"
          class="nav-link"
          @mouseenter="prefetchExplorePage"
          @focus="prefetchExplorePage"
        >
          <Compass :size="20" />
          <span>{{ $t('nav.explore') }}</span>
        </RouterLink>
        <RouterLink
          v-if="isAuthenticated"
          to="/favorites"
          class="nav-link"
          @mouseenter="prefetchFavoritesPage"
          @focus="prefetchFavoritesPage"
        >
          <Heart :size="20" />
          <span>{{ $t('nav.favorites') }}</span>
        </RouterLink>
        <RouterLink
          to="/authors"
          class="nav-link"
          @mouseenter="prefetchAuthorsPage"
          @focus="prefetchAuthorsPage"
        >
          <Users :size="20" />
          <span>{{ $t('nav.authors') }}</span>
        </RouterLink>
        <RouterLink
          to="/community"
          class="nav-link"
          @mouseenter="prefetchCommunityPage"
          @focus="prefetchCommunityPage"
        >
          <MessageSquare :size="20" />
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
          <Search :size="20" />
        </button>

        <button
          ref="settingsBtnRef"
          class="action-btn"
          @click="toggleSettings"
          :aria-label="$t('nav.settings')"
        >
          <Settings :size="20" />
        </button>

        <RouterLink
          v-if="!isAuthenticated"
          to="/login"
          class="login-btn"
          @mouseenter="prefetchLoginPage"
          @focus="prefetchLoginPage"
        >
          <LogIn :size="18" />
          <span class="desktop-only">{{ $t('nav.login') }}</span>
        </RouterLink>

        <button v-else ref="userBtnRef" class="user-btn" @click="toggleUserMenu">
          <img :src="userAvatar" :alt="user?.username" class="user-avatar" />
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
          <img :src="userAvatar" :alt="user?.username" class="user-avatar-lg" />
          <div>
            <div class="user-name">{{ user?.username }}</div>
            <div class="user-email">{{ user?.email }}</div>
          </div>
        </div>
        <div class="dropdown-links">
          <RouterLink
            to="/settings/profile"
            class="dropdown-link"
            @click="showUserMenu = false"
            @mouseenter="prefetchProfileSettingsPage"
            @focus="prefetchProfileSettingsPage"
          >
            <User :size="18" />
            <span>{{ $t('nav.profileSettings') }}</span>
          </RouterLink>
          <button class="dropdown-link danger" @click="handleLogout">
            <LogOut :size="18" />
            <span>{{ $t('nav.logout') }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </nav>

  <!-- Mobile Bottom Navigation -->
  <nav class="mobile-nav mobile-only">
    <RouterLink to="/" class="mobile-nav-item">
      <Home :size="22" />
      <span>{{ $t('nav.home') }}</span>
    </RouterLink>
    <RouterLink
      to="/explore"
      class="mobile-nav-item"
      @mouseenter="prefetchExplorePage"
      @focus="prefetchExplorePage"
    >
      <Compass :size="22" />
      <span>{{ $t('nav.explore') }}</span>
    </RouterLink>
    <RouterLink
      v-if="isAuthenticated"
      to="/favorites"
      class="mobile-nav-item"
      @mouseenter="prefetchFavoritesPage"
      @focus="prefetchFavoritesPage"
    >
      <Heart :size="22" />
      <span>{{ $t('nav.favorites') }}</span>
    </RouterLink>
    <RouterLink
      to="/authors"
      class="mobile-nav-item"
      @mouseenter="prefetchAuthorsPage"
      @focus="prefetchAuthorsPage"
    >
      <Users :size="22" />
      <span>{{ $t('nav.authors') }}</span>
    </RouterLink>
    <RouterLink
      to="/community"
      class="mobile-nav-item"
      @mouseenter="prefetchCommunityPage"
      @focus="prefetchCommunityPage"
    >
      <MessageSquare :size="22" />
      <span>{{ $t('nav.community') }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  Home,
  Compass,
  Heart,
  Users,
  Search,
  Settings,
  LogIn,
  LogOut,
  User,
  MessageSquare,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores'
import SettingsPanel from './SettingsPanel.vue'
import { prefetchExploreData, prefetchAuthorsData } from '@/utils/prefetch'
import { throttleRAF, scheduleDOMUpdate } from '@/utils/performance'

const router = useRouter()
const authStore = useAuthStore()
const { user, isAuthenticated } = storeToRefs(authStore)

const showSettings = ref(false)
const showUserMenu = ref(false)

const settingsBtnRef = ref<HTMLButtonElement | null>(null)
const userBtnRef = ref<HTMLButtonElement | null>(null)
const settingsDropdownRef = ref<HTMLDivElement | null>(null)
const userDropdownRef = ref<HTMLDivElement | null>(null)

const settingsDropdownStyle = ref<Record<string, string>>({})
const userDropdownStyle = ref<Record<string, string>>({})

const isMobile = ref(false)

const userAvatar = computed(() => {
  if (user.value?.avatar_url) return user.value.avatar_url
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.value?.username || 'default'}`
})

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
  router.push('/explore')
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
})
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  height: var(--navbar-height);
}

.navbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
}

.navbar-brand {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  text-decoration: none;
}

.brand-name {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.navbar-links {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

.nav-link {
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

.nav-link:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.nav-link.router-link-active {
  background: var(--color-primary-100);
  color: var(--color-primary);
}

[data-theme='dark'] .nav-link.router-link-active {
  background: rgba(139, 92, 246, 0.2);
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.login-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--color-primary);
  color: var(--color-white);
  border-radius: var(--radius-lg);
  font-weight: var(--font-medium);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.login-btn:hover {
  background: var(--color-primary-dark);
}

.user-btn {
  padding: 0;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--glass-border);
}

/* Dropdowns */
.settings-dropdown,
.user-dropdown {
  position: fixed;
  top: calc(var(--navbar-height) - var(--spacing-2));
  right: var(--spacing-4);
  min-width: 280px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--glass-border);
}

.user-avatar-lg {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.user-name {
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.user-email {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
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
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  text-decoration: none;
  transition: background var(--transition-fast);
}

.dropdown-link:hover {
  background: var(--glass-bg-light);
}

.dropdown-link.danger {
  color: var(--color-error);
}

/* Mobile Navigation */
.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--glass-bg-strong);
  backdrop-filter: var(--glass-blur-strong);
  border-top: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: var(--z-sticky);
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2);
  color: var(--color-text-tertiary);
  text-decoration: none;
  font-size: var(--text-xs);
  transition: color var(--transition-fast);
}

.mobile-nav-item:hover,
.mobile-nav-item.router-link-active {
  color: var(--color-primary);
}

/* Responsive */
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

  .settings-dropdown,
  .user-dropdown {
    left: var(--spacing-4);
    right: var(--spacing-4);
    min-width: auto;
  }
}
</style>
