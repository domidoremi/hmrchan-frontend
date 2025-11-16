<template>
  <!-- 桌面端导航栏 -->
  <nav class="app-navbar desktop-nav">
    <div class="container navbar-content">
      <!-- Logo -->
      <RouterLink to="/" class="navbar-brand">
        <div class="brand-logo">HMR</div>
        <span class="brand-name">Chan</span>
      </RouterLink>

      <!-- 导航链接 (桌面端) -->
      <div class="navbar-links">
        <RouterLink to="/" class="nav-link">
          <Home :size="20" />
          <span>{{ $t('nav.home') }}</span>
        </RouterLink>

        <RouterLink to="/explore" class="nav-link">
          <Compass :size="20" />
          <span>{{ $t('nav.explore') }}</span>
        </RouterLink>

        <RouterLink v-if="isAuthenticated" to="/favorites" class="nav-link">
          <Heart :size="20" />
          <span>{{ $t('nav.favorites') }}</span>
        </RouterLink>

        <RouterLink to="/authors" class="nav-link">
          <Users :size="20" />
          <span>{{ $t('nav.authors') }}</span>
        </RouterLink>
      </div>

      <!-- 右侧操作 (桌面端) -->
      <div class="navbar-actions">
        <!-- 搜索按钮：跳转到搜索视图（Explore） -->
        <button class="action-button search-button" @click="goToSearch" :aria-label="$t('search.placeholder')">
          <Search :size="24" />
        </button>

        <!-- 离线队列状态按钮 -->
        <div class="queue-status-container">
          <button class="action-button queue-button" type="button" @click="toggleQueuePanel"
            :aria-label="$t('offline.actionsQueued')">
            <CloudOff :size="20" />
            <span v-if="queueStatus.pending > 0" class="queue-badge">
              {{ queueStatus.pending }}
            </span>
          </button>

          <Transition name="dropdown">
            <div v-if="showQueuePanel" ref="queueMenuRef" class="queue-dropdown glass-card">
              <div class="queue-header">
                <span class="queue-title">{{ $t('offline.queueTitle') }}</span>
              </div>
              <div class="queue-body">
                <p class="queue-description">
                  {{ $t('offline.actionsQueued') }}
                </p>
                <p v-if="queueStatus.pending > 0" class="queue-count">
                  {{ queueStatus.pending }}
                </p>
                <p v-else class="queue-empty">
                  {{ $t('offline.queueEmpty') }}
                </p>
              </div>
              <button class="queue-sync-button" type="button" @click="handleQueueSync"
                :disabled="!queueStatus.pending || !isOnline || isQueueSyncing">
                <span>{{ $t('offline.syncNow') }}</span>
              </button>
            </div>
          </Transition>
        </div>

        <!-- 统一设置按钮：语言/主题/布局等快捷设置（不跳转页面） -->
        <div class="settings-menu-container" ref="settingsMenuRef">
          <button class="action-button" type="button" @click="toggleSettingsPanel" :aria-label="$t('nav.settings')">
            <Settings :size="20" />
          </button>

          <!-- 桌面端设置面板，下拉在按钮下方展开 -->
          <Transition name="dropdown">
            <div v-if="showSettingsPanel && !isMobile" class="settings-dropdown glass-card">
              <div class="settings-group">
                <div class="settings-group-title">{{ $t('settings.theme') }}</div>
                <div class="settings-theme-options">
                  <button v-for="option in themeOptions" :key="option.value" type="button" class="settings-theme-button"
                    :class="{ active: theme === option.value }" @click="setTheme(option.value)">
                    <component :is="option.icon" :size="18" />
                    <span>{{ $t(`settings.${option.value}`) }}</span>
                  </button>
                </div>
              </div>

              <div class="settings-group">
                <div class="settings-group-title">{{ $t('settings.language') }}</div>
                <div class="settings-language-options">
                  <button v-for="localeOption in localeOptions" :key="localeOption.code" type="button"
                    class="settings-language-button" :class="{ active: locale === localeOption.code }"
                    @click="changeLanguage(localeOption.code)">
                    {{ localeOption.name }}
                  </button>
                </div>
              </div>

              <div class="settings-group">
                <div class="settings-group-title">{{ $t('settings.display') }}</div>
                <div class="settings-toggle-list">
                  <button type="button" class="settings-toggle" :class="{ active: settings.showHeroSection }"
                    @click="settingsStore.toggleSetting('showHeroSection')">
                    <span class="settings-toggle-label">{{
                      $t('settings.toggleHeroSection')
                    }}</span>
                    <span class="settings-toggle-indicator" :class="{ active: settings.showHeroSection }"></span>
                  </button>

                  <button type="button" class="settings-toggle" :class="{ active: settings.enableAnimations }"
                    @click="settingsStore.toggleSetting('enableAnimations')">
                    <span class="settings-toggle-label">{{ $t('settings.toggleAnimations') }}</span>
                    <span class="settings-toggle-indicator" :class="{ active: settings.enableAnimations }"></span>
                  </button>

                  <button type="button" class="settings-toggle" :class="{ active: settings.enableSwipeNavigation }"
                    @click="settingsStore.toggleSetting('enableSwipeNavigation')">
                    <span class="settings-toggle-label">{{
                      $t('settings.toggleSwipeNavigation')
                    }}</span>
                    <span class="settings-toggle-indicator" :class="{ active: settings.enableSwipeNavigation }"></span>
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 用户菜单 -->
        <div v-if="isAuthenticated" ref="userMenuRef" class="user-menu-container">
          <button class="user-avatar-button" @click="showUserMenu = !showUserMenu">
            <img :src="userAvatarUrl" :alt="user?.username || 'User'" />
          </button>

          <Transition name="dropdown">
            <div v-if="showUserMenu" class="user-dropdown glass-card">
              <div class="dropdown-header">
                <div class="user-avatar-large">
                  <img :src="userAvatarUrl" :alt="user?.username || 'User'" />
                </div>
                <div class="user-info">
                  <div class="user-name">{{ user?.username }}</div>
                  <div class="user-email">{{ user?.email }}</div>
                </div>
              </div>

              <div class="dropdown-links">
                <RouterLink to="/profile" class="dropdown-link" @click="showUserMenu = false">
                  <User :size="18" />
                  <span>{{ $t('nav.profile') }}</span>
                </RouterLink>

                <RouterLink to="/settings" class="dropdown-link" @click="showUserMenu = false">
                  <Settings :size="18" />
                  <span>{{ $t('nav.advancedSettings') }}</span>
                </RouterLink>

                <button class="dropdown-link danger" @click="handleLogout">
                  <LogOut :size="18" />
                  <span>{{ $t('nav.logout') }}</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 登录按钮 -->
        <RouterLink v-else to="/login" class="login-button">
          <LogIn :size="18" />
          <span>{{ $t('nav.login') }}</span>
        </RouterLink>
      </div>
    </div>
  </nav>

  <!-- 移动端顶部栏 -->
  <nav class="app-navbar mobile-top-nav">
    <div class="mobile-top-content">
      <!-- Logo -->
      <RouterLink to="/" class="navbar-brand">
        <div class="brand-logo">HMR</div>
        <span class="brand-name">Chan</span>
      </RouterLink>

      <!-- 右侧按钮 -->
      <div class="mobile-top-actions">
        <button class="action-button search-button" @click="goToSearch">
          <Search :size="24" />
        </button>

        <button class="action-button queue-button" type="button" @click="toggleQueuePanel"
          :aria-label="$t('offline.actionsQueued')">
          <CloudOff :size="20" />
          <span v-if="queueStatus.pending > 0" class="queue-badge">
            {{ queueStatus.pending }}
          </span>
        </button>

        <button class="action-button settings-menu-container" type="button" @click="toggleSettingsPanel"
          :aria-label="$t('nav.settings')">
          <Settings :size="20" />
        </button>

        <button v-if="isAuthenticated" class="action-button mobile-user-trigger" @click="showUserMenu = !showUserMenu">
          <img :src="userAvatarUrl" :alt="user?.username" class="mobile-avatar" />
        </button>

        <RouterLink v-else to="/login" class="action-button">
          <LogIn :size="20" />
        </RouterLink>
      </div>
    </div>
  </nav>

  <!-- 移动端底部导航栏 -->
  <nav class="mobile-bottom-nav">
    <RouterLink to="/" class="bottom-nav-item">
      <Home :size="24" />
      <span>{{ $t('nav.home') }}</span>
    </RouterLink>

    <RouterLink to="/explore" class="bottom-nav-item">
      <Compass :size="24" />
      <span>{{ $t('nav.explore') }}</span>
    </RouterLink>

    <RouterLink v-if="isAuthenticated" to="/favorites" class="bottom-nav-item">
      <Heart :size="24" />
      <span>{{ $t('nav.favorites') }}</span>
    </RouterLink>

    <RouterLink to="/authors" class="bottom-nav-item">
      <Users :size="24" />
      <span>{{ $t('nav.authors') }}</span>
    </RouterLink>

    <RouterLink to="/settings" class="bottom-nav-item">
      <Settings :size="24" />
      <span>{{ $t('nav.settings') }}</span>
    </RouterLink>
  </nav>

  <!-- 用户菜单弹出层（仅移动端） -->
  <Transition name="modal">
    <div v-if="showUserMenu && isAuthenticated && isMobile" class="mobile-user-modal" @click="showUserMenu = false">
      <div class="mobile-user-content glass-card" @click.stop>
        <div class="mobile-user-header">
          <div class="user-avatar-large">
            <img :src="userAvatarUrl" :alt="user?.username" />
          </div>
          <div class="user-info">
            <div class="user-name">{{ user?.username }}</div>
            <div class="user-email">{{ user?.email }}</div>
          </div>
          <button class="close-button" @click="showUserMenu = false">
            <X :size="24" />
          </button>
        </div>

        <div class="mobile-user-links">
          <RouterLink to="/profile" class="mobile-user-link" @click="showUserMenu = false">
            <User :size="20" />
            <span>{{ $t('nav.profile') }}</span>
          </RouterLink>

          <RouterLink to="/settings" class="mobile-user-link" @click="showUserMenu = false">
            <Settings :size="20" />
            <span>{{ $t('nav.advancedSettings') }}</span>
          </RouterLink>

          <button class="mobile-user-link danger" @click="handleLogout">
            <LogOut :size="20" />
            <span>{{ $t('nav.logout') }}</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- 全局设置面板结束 -->
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import {
  Home,
  Compass,
  Heart,
  Users,
  Search,
  CloudOff,
  Settings,
  User,
  LogOut,
  LogIn,
  X,
  Sun,
  Moon,
  Monitor,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useThemeStore } from '@/stores/theme'
import type { Theme } from '@/types'
import { offlineQueue } from '@/utils/offlineQueue'

const router = useRouter()
const { locale } = useI18n()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const themeStore = useThemeStore()

const { user, isAuthenticated } = storeToRefs(authStore)
const { settings } = storeToRefs(settingsStore)
const { theme } = storeToRefs(themeStore)

const showUserMenu = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)
const showSettingsPanel = ref(false)
const settingsMenuRef = ref<HTMLElement | null>(null)
const showQueuePanel = ref(false)
const queueMenuRef = ref<HTMLElement | null>(null)

const queueStatus = ref<{ pending: number; syncing: number; failed: number }>({
  pending: 0,
  syncing: 0,
  failed: 0,
})
const isQueueSyncing = ref(false)
const isOnline = ref(typeof window === 'undefined' ? true : navigator.onLine)

const hasQueueItems = computed(() => queueStatus.value.pending > 0)

const refreshQueueStatus = async () => {
  try {
    const status = await offlineQueue.getQueueStatus()
    queueStatus.value = status
  } catch (error) {
    console.error('[Offline Queue] Failed to get status:', error)
  }
}

const toggleQueuePanel = async () => {
  showQueuePanel.value = !showQueuePanel.value
  if (showQueuePanel.value) {
    await refreshQueueStatus()
  }
}

const handleQueueSync = async () => {
  if (!isOnline.value || !hasQueueItems.value || isQueueSyncing.value) return
  try {
    isQueueSyncing.value = true
    await offlineQueue.manualSync()
    await refreshQueueStatus()
  } catch (error) {
    console.error('[Offline Queue] Manual sync failed:', error)
  } finally {
    isQueueSyncing.value = false
  }
}

const handleOnlineChange = () => {
  if (typeof navigator !== 'undefined') {
    isOnline.value = navigator.onLine
  }
}

// 点击导航栏搜索按钮：跳转到 Explore 作为统一搜索视图
const goToSearch = () => {
  router.push({ path: '/search' })
}

// 移动端检测
const isMobile = ref(false)

const updateIsMobile = () => {
  if (typeof window === 'undefined') return
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
}

interface BottomNavItem {
  path: string
  requiresAuth?: boolean
}

const bottomNavItems = computed<BottomNavItem[]>(() => {
  const items: BottomNavItem[] = [{ path: '/' }, { path: '/explore' }]

  if (isAuthenticated.value) {
    items.push({ path: '/favorites', requiresAuth: true })
  }

  items.push({ path: '/authors' }, { path: '/settings' })
  return items
})

const themeOptions = [
  { value: 'light' as Theme, icon: Sun },
  { value: 'dark' as Theme, icon: Moon },
  { value: 'auto' as Theme, icon: Monitor },
]

const localeOptions = [
  { code: 'en', name: 'English' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'ja', name: '日本語' },
]

const toggleSettingsPanel = () => {
  showSettingsPanel.value = !showSettingsPanel.value
}

const setTheme = (newTheme: Theme) => {
  themeStore.setTheme(newTheme)
}

const changeLanguage = async (newLocale: string) => {
  const { changeLocale } = await import('@/composables/useI18nOptimized')
  await changeLocale(newLocale as 'en' | 'zh' | 'ja')
}

// 全局滑动切换主页面（仅移动端）
const swipeStartX = ref<number | null>(null)
const swipeStartY = ref<number | null>(null)
const swipeActive = ref(false)

const handleGlobalTouchStart = (event: TouchEvent) => {
  if (!isMobile.value || !settings.value.enableSwipeNavigation || event.touches.length !== 1) return
  const touch = event.touches[0]
  if (!touch) return
  const target = event.target as HTMLElement

  // 避免与底部导航点击冲突
  if (target.closest('.mobile-bottom-nav')) return

  swipeStartX.value = touch.clientX
  swipeStartY.value = touch.clientY
  swipeActive.value = true
}

const handleGlobalTouchEnd = (event: TouchEvent) => {
  if (!swipeActive.value || swipeStartX.value === null || swipeStartY.value === null) {
    swipeActive.value = false
    swipeStartX.value = null
    swipeStartY.value = null
    return
  }

  const touch = event.changedTouches[0]
  if (!touch) {
    swipeActive.value = false
    swipeStartX.value = null
    swipeStartY.value = null
    return
  }

  const deltaX = touch.clientX - swipeStartX.value
  const deltaY = touch.clientY - swipeStartY.value
  const absDeltaX = Math.abs(deltaX)
  const absDeltaY = Math.abs(deltaY)
  const threshold = 80

  swipeActive.value = false
  swipeStartX.value = null
  swipeStartY.value = null

  if (!isMobile.value || !settings.value.enableSwipeNavigation) return

  // 只有明显的水平滑动才触发
  if (absDeltaX < threshold || absDeltaX <= absDeltaY * 1.2) {
    return
  }

  const items = bottomNavItems.value
  if (!items.length) return

  const currentPath = router.currentRoute.value.path
  const currentIndex = items.findIndex((item) => currentPath.startsWith(item.path))
  if (currentIndex === -1) return

  const direction = deltaX > 0 ? -1 : 1
  const nextIndex = currentIndex + direction

  // 不循环，超出范围直接忽略
  if (nextIndex < 0 || nextIndex >= items.length) return

  const nextItem = items[nextIndex]
  if (!nextItem) return
  router.push(nextItem.path)
}

const userAvatarUrl = computed(() => {
  if (user.value?.avatar_url) {
    return user.value.avatar_url
  }
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.value?.username || 'default'}`
})

// 其他工具函数保留在此下方

const handleLogout = () => {
  authStore.logout()
  showUserMenu.value = false
  router.push('/')
}

// 点击外部关闭用户菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement

  const inMobileUserTrigger = target.closest('.mobile-user-trigger')
  const inMobileUserModal = target.closest('.mobile-user-modal')

  if (
    userMenuRef.value &&
    !userMenuRef.value.contains(target) &&
    !inMobileUserTrigger &&
    !inMobileUserModal
  ) {
    showUserMenu.value = false
  }

  const inSettingsButton = target.closest('.settings-menu-container')
  if (settingsMenuRef.value && !settingsMenuRef.value.contains(target) && !inSettingsButton) {
    showSettingsPanel.value = false
  }

  const inQueueContainer = target.closest('.queue-status-container')
  if (queueMenuRef.value && !queueMenuRef.value.contains(target) && !inQueueContainer) {
    showQueuePanel.value = false
  }
}
let queueStatusTimer: number | null = null

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  updateIsMobile()

  refreshQueueStatus()

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateIsMobile)
    window.addEventListener('touchstart', handleGlobalTouchStart, { passive: true })
    window.addEventListener('touchend', handleGlobalTouchEnd, { passive: true })
    window.addEventListener('touchcancel', handleGlobalTouchEnd, { passive: true })
    window.addEventListener('online', handleOnlineChange)
    window.addEventListener('offline', handleOnlineChange)

    queueStatusTimer = window.setInterval(() => {
      refreshQueueStatus()
    }, 15000)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateIsMobile)
    window.removeEventListener('touchstart', handleGlobalTouchStart)
    window.removeEventListener('touchend', handleGlobalTouchEnd)
    window.removeEventListener('touchcancel', handleGlobalTouchEnd)
    window.removeEventListener('online', handleOnlineChange)
    window.removeEventListener('offline', handleOnlineChange)

    if (queueStatusTimer !== null) {
      window.clearInterval(queueStatusTimer)
      queueStatusTimer = null
    }
  }
})
</script>

<style scoped>
/* ==================== 基础样式 ==================== */
.app-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--glass-border);
}

/* ==================== 桌面端导航栏 ==================== */
.desktop-nav {
  display: block;
}

.navbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4) var(--spacing-6);
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
}

/* Logo */
.navbar-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  text-decoration: none;
  transition: transform var(--transition-fast);
}

.navbar-brand:hover {
  transform: scale(1.05);
}

.brand-logo {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  border-radius: var(--radius-lg);
  font-weight: var(--font-bold);
  font-size: var(--text-lg);
  color: white;
}

.brand-name {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}

/* 导航链接 */
.navbar-links {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-weight: var(--font-medium);
  transition: all var(--transition-fast);
  position: relative;
}

.nav-link:hover {
  color: var(--color-primary);
  background: var(--glass-bg-light);
}

.nav-link.router-link-active {
  color: var(--color-primary);
  background: var(--glass-bg-light);
}

.nav-link.router-link-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: var(--color-primary);
  border-radius: 2px 2px 0 0;
}

/* 右侧操作 */
.navbar-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.navbar-actions .action-button,
.mobile-top-actions .action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  max-width: 40px;
  max-height: 40px;
  padding: 0;
  margin: 0;
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;
  flex-shrink: 0;
  aspect-ratio: 1 / 1;
}

/* 移动端增加触摸目标尺寸 */
@media (max-width: 768px) {

  .navbar-actions .action-button,
  .mobile-top-actions .action-button {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    max-width: 44px;
    max-height: 44px;
  }
}

/* 确保SVG图标尺寸正确 */
.navbar-actions .action-button svg,
.mobile-top-actions .action-button svg {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

/* 搜索按钮特殊样式 - 更醒目 */
.search-button {
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
}

.search-button:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(192, 132, 252, 0.1) 100%);
  border-color: var(--color-primary);
  transform: scale(1.05);
}

.action-button:hover {
  color: var(--color-primary);
  background: var(--glass-bg-light);
}

/* 用户头像按钮 */
.navbar-actions .user-avatar-button {
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  max-width: 40px;
  max-height: 40px;
  border-radius: 50%;
  border: 2px solid var(--glass-border);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-fast);
  background: none;
  padding: 0;
  flex-shrink: 0;
  aspect-ratio: 1 / 1;
}

/* 移动端增加触摸目标尺寸 */
@media (max-width: 768px) {
  .navbar-actions .user-avatar-button {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    max-width: 44px;
    max-height: 44px;
  }
}

.user-avatar-button:hover {
  border-color: var(--color-primary);
  transform: scale(1.05);
}

.user-avatar-button img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 用户菜单 */
.user-menu-container {
  position: relative;
  flex-shrink: 0;
  /* 防止容器被压缩 */
}

.settings-menu-container {
  position: relative;
  flex-shrink: 0;
}

.queue-status-container {
  position: relative;
  flex-shrink: 0;
}

.queue-button {
  position: relative;
}

.queue-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--color-danger, #ef4444);
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-dropdown {
  position: absolute;
  top: calc(100% + var(--spacing-2));
  right: 0;
  width: 320px;
  padding: var(--spacing-4);
  border-radius: var(--radius-xl);
  box-shadow: var(--glass-shadow);
  z-index: 1500;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  overflow: hidden;
}

.settings-dropdown::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(90deg, rgba(139, 92, 246, 0.9), rgba(56, 189, 248, 0.9));
  opacity: 0.95;
}

.queue-dropdown {
  position: absolute;
  top: calc(100% + var(--spacing-2));
  right: 0;
  width: 260px;
  padding: var(--spacing-4);
  border-radius: var(--radius-xl);
  box-shadow: var(--glass-shadow);
  z-index: 1500;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  overflow: hidden;
}

.queue-dropdown::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(90deg, rgba(96, 165, 250, 0.95), rgba(59, 130, 246, 0.95));
  opacity: 0.95;
}

.queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.queue-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.queue-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.queue-description {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.queue-count {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-primary);
}

.queue-empty {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.queue-sync-button {
  margin-top: var(--spacing-2);
  width: 100%;
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.queue-sync-button:disabled {
  opacity: 0.6;
  cursor: default;
}

.queue-sync-button:not(:disabled):hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.settings-group-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
}

.settings-theme-options,
.settings-language-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.settings-theme-button,
.settings-language-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.settings-theme-button.active,
.settings-language-button.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.settings-theme-button:hover,
.settings-language-button:hover {
  background: var(--glass-bg);
}

.settings-toggle-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.settings-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.settings-toggle.active {
  background: var(--glass-bg);
  color: var(--color-text-primary);
}

.settings-toggle-label {
  flex: 1;
  text-align: left;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + var(--spacing-2));
  right: 0;
  width: 280px;
  padding: var(--spacing-4);
  border-radius: var(--radius-xl);
  box-shadow: var(--glass-shadow);
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding-bottom: var(--spacing-4);
  border-bottom: 1px solid var(--glass-border);
  margin-bottom: var(--spacing-3);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(56, 189, 248, 0.08));
  border-radius: calc(var(--radius-xl) - 4px);
}

.user-avatar-large {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.user-avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  flex: 1;
  overflow: hidden;
}

.user-name {
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  font-size: var(--text-base);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-links {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.dropdown-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  text-decoration: none;
  background: none;
  border: none;
  width: 100%;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--text-base);
}

.dropdown-link:hover {
  background: var(--glass-bg-light);
  color: var(--color-primary);
}

.dropdown-link.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-danger);
}

/* 登录按钮 */
.login-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-5);
  border-radius: var(--radius-lg);
  background: var(--color-primary);
  color: white;
  text-decoration: none;
  font-weight: var(--font-semibold);
  transition: all var(--transition-fast);
}

.login-button:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

/* ==================== 移动端导航栏 ==================== */
.mobile-top-nav,
.mobile-bottom-nav {
  display: none;
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all var(--transition-fast);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* ==================== 响应式设计 (<768px) ==================== */
@media (max-width: 768px) {

  /* 隐藏桌面端导航栏 */
  .desktop-nav {
    display: none;
  }

  /* 显示移动端顶部栏 */
  .mobile-top-nav {
    display: block;
    padding: var(--spacing-3) var(--spacing-4);
  }

  .mobile-top-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mobile-top-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  /* 移动端action-button尺寸已在上方统一定义，这里只需确保不被覆盖 */
  .mobile-top-actions .action-button {
    width: 40px;
    height: 40px;
    padding: 0;
  }

  .mobile-top-actions .action-button svg {
    width: 24px;
    height: 24px;
  }

  .mobile-top-actions .mobile-avatar {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    border-radius: 50%;
    object-fit: cover;
    display: block;
    aspect-ratio: 1 / 1;
  }

  /* 显示移动端底部导航栏 */
  .mobile-bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    border-top: 1px solid var(--glass-border);
    padding: var(--spacing-2) var(--spacing-1);
    padding-bottom: calc(var(--spacing-2) + env(safe-area-inset-bottom));
    justify-content: space-around;
    align-items: center;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
    min-height: 64px;
  }

  .bottom-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-1);
    padding: var(--spacing-2);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    transition: all var(--transition-fast);
    flex: 1;
    max-width: 80px;
    min-width: 44px;
    min-height: 44px;
    /* 添加触摸优化 */
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  .bottom-nav-item:active {
    transform: scale(0.95);
    opacity: 0.8;
  }

  .bottom-nav-item.router-link-active {
    color: var(--color-primary);
    background: var(--glass-bg-light);
  }

  /* 移动端用户菜单 */
  .mobile-user-modal {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-end;
  }

  .mobile-user-content {
    width: 100%;
    max-height: 80vh;
    border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
    padding: var(--spacing-6);
    overflow-y: auto;
  }

  .mobile-user-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding-bottom: var(--spacing-4);
    border-bottom: 1px solid var(--glass-border);
    margin-bottom: var(--spacing-4);
    position: relative;
  }

  .close-button {
    position: absolute;
    top: 0;
    right: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--glass-bg-light);
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .close-button:active {
    transform: scale(0.95);
  }

  .mobile-user-links {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .mobile-user-link {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-4);
    border-radius: var(--radius-lg);
    background: var(--glass-bg-light);
    color: var(--color-text-primary);
    text-decoration: none;
    font-weight: var(--font-medium);
    transition: all var(--transition-fast);
    border: none;
    width: 100%;
    cursor: pointer;
    font-size: var(--text-base);
  }

  .mobile-user-link:active {
    transform: scale(0.98);
  }

  .mobile-user-link.danger {
    color: var(--color-danger);
  }

  /* Modal Transitions */
  .modal-enter-active,
  .modal-leave-active {
    transition: all 0.3s ease;
  }

  .modal-enter-from,
  .modal-leave-to {
    opacity: 0;
  }

  .modal-enter-active .mobile-user-content,
  .modal-leave-active .mobile-user-content {
    transition: transform 0.3s ease;
  }

  .modal-enter-from .mobile-user-content,
  .modal-leave-to .mobile-user-content {
    transform: translateY(100%);
  }

  /* 为底部导航栏留出空间 - 但不应用到登录/注册页面 */
  :global(body:not(.no-bottom-padding)) {
    padding-bottom: 72px;
  }
}

/* ==================== 搜索模态框样式 ==================== */
.search-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: var(--spacing-20);
  overflow-y: auto;
}

.search-modal-content {
  width: 100%;
  max-width: 700px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  margin-top: var(--spacing-10);
  overflow: hidden;
}

.search-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-5);
  border-bottom: 1px solid var(--glass-border);
  background: var(--glass-bg-light);
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--color-background);
  border: 2px solid var(--glass-border);
  border-radius: var(--radius-xl);
  transition: all var(--transition-fast);
}

.search-input-wrapper:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.search-icon {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  font-size: var(--text-base);
  outline: none;
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.clear-btn {
  padding: var(--spacing-1);
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.clear-btn:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.close-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--glass-bg-light);
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.close-btn:hover {
  background: var(--glass-bg);
  color: var(--color-text-primary);
  transform: scale(1.05);
}

/* 结束搜索模态相关样式清理 */
</style>
