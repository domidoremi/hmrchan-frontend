<template>
  <!-- 桌面端导航栏 -->
  <nav class="app-navbar desktop-nav">
    <div class="container navbar-content">
      <!-- Logo -->
      <RouterLink to="/" class="navbar-brand">
        <div class="brand-logo">HMR</div>
        <span class="brand-name">Club</span>
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
            <div v-if="showQueuePanel" ref="queueMenuRef" class="queue-dropdown glass-card"
              :class="{ 'mobile-modal': isMobile }" @click.self="isMobile && (showQueuePanel = false)">
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
          <button class="action-button" type="button" @click.stop="toggleSettingsPanel"
            :aria-label="$t('nav.settings')">
            <Settings :size="20" />
          </button>

          <!-- 设置面板（桌面端下拉，移动端模态框） -->
          <Transition name="dropdown">
            <div v-if="showSettingsPanel" class="settings-dropdown glass-card" :class="{ 'mobile-modal': isMobile }"
              @click.self="isMobile && (showSettingsPanel = false)">
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

              <div class="settings-group settings-advanced-link">
                <button type="button" class="settings-advanced-button" @click="goToAdvancedSettings">
                  <Settings :size="18" />
                  <div class="advanced-labels">
                    <span class="advanced-title">{{ $t('settings.openAdvanced') }}</span>
                  </div>
                  <ArrowRight :size="16" />
                </button>
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
        <span class="brand-name">Club</span>
      </RouterLink>

      <div v-if="showAccessIndicator" class="mobile-access-indicator">
        <button type="button" class="access-chip"
          :aria-label="$t('aria.accessLimit', { current: accessCurrentDisplay, limit: accessLimitDisplay })">
          <span class="access-chip-count">
            {{ accessCurrentDisplay }} / {{ accessLimitDisplay }}
          </span>
        </button>
      </div>

      <!-- 右侧按钮 -->
      <div class="mobile-top-actions">
        <button class="action-button search-button" @click="goToSearch" :aria-label="$t('search.placeholder')">
          <Search :size="24" />
        </button>

        <!-- 离线队列按钮（移动端） -->
        <div class="queue-status-container">
          <button class="action-button queue-button" type="button" @click="toggleQueuePanel"
            :aria-label="$t('offline.actionsQueued')">
            <CloudOff :size="20" />
            <span v-if="queueStatus.pending > 0" class="queue-badge">
              {{ queueStatus.pending }}
            </span>
          </button>
        </div>

        <!-- 设置按钮（移动端） -->
        <div class="settings-menu-container">
          <button class="action-button" type="button" @click="toggleSettingsPanel" :aria-label="$t('nav.settings')">
            <Settings :size="20" />
          </button>
        </div>

        <button v-if="isAuthenticated" class="action-button mobile-user-trigger" @click="showUserMenu = !showUserMenu">
          <img :src="userAvatarUrl" :alt="user?.username" class="mobile-avatar" />
        </button>

        <RouterLink v-else to="/login" class="action-button" :aria-label="$t('nav.login')">
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
      <div class="mobile-user-content glass-card" role="dialog" aria-modal="true" :aria-label="$t('aria.userMenu')"
        @click.stop>
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

          <button class="mobile-user-link danger" @click="handleLogout">
            <LogOut :size="20" />
            <span>{{ $t('nav.logout') }}</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- 离线队列面板（移动端） -->
  <Transition name="modal">
    <div v-if="showQueuePanel && isMobile" class="mobile-user-modal" @click="showQueuePanel = false">
      <div class="mobile-user-content glass-card" role="dialog" aria-modal="true" :aria-label="$t('offline.queueTitle')"
        @click.stop>
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
    </div>
  </Transition>

  <!-- 快捷设置面板（移动端） -->
  <Transition name="modal">
    <div v-if="showSettingsPanel && isMobile" class="mobile-user-modal" @click="showSettingsPanel = false">
      <div class="mobile-user-content glass-card" role="dialog" aria-modal="true" :aria-label="$t('nav.settings')"
        @click.stop>
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
              <span class="settings-toggle-label">{{ $t('settings.toggleHeroSection') }}</span>
              <span class="settings-toggle-indicator" :class="{ active: settings.showHeroSection }"></span>
            </button>

            <button type="button" class="settings-toggle" :class="{ active: settings.enableAnimations }"
              @click="settingsStore.toggleSetting('enableAnimations')">
              <span class="settings-toggle-label">{{ $t('settings.toggleAnimations') }}</span>
              <span class="settings-toggle-indicator" :class="{ active: settings.enableAnimations }"></span>
            </button>

            <button type="button" class="settings-toggle" :class="{ active: settings.enableSwipeNavigation }"
              @click="settingsStore.toggleSetting('enableSwipeNavigation')">
              <span class="settings-toggle-label">{{ $t('settings.toggleSwipeNavigation') }}</span>
              <span class="settings-toggle-indicator" :class="{ active: settings.enableSwipeNavigation }"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- 全局设置面板结束 -->
</template>

<script setup lang="ts">
/**
 * 应用导航栏组件
 *
 * 功能描述：
 * - 提供应用主导航功能，支持桌面端和移动端不同布局
 * - 桌面端：顶部固定导航栏，包含Logo、导航链接、搜索、设置、用户菜单
 * - 移动端：顶部栏 + 底部导航栏，优化触摸交互体验
 *
 * 主要功能：
 * - 页面导航（首页、探索、收藏、作者）
 * - 搜索功能
 * - 离线队列状态管理
 * - 快捷设置面板（主题、语言、显示选项）
 * - 用户认证和账户管理
 *
 * 布局结构：
 * - 桌面端：单行水平布局，左侧Logo，中间导航，右侧操作按钮
 * - 移动端：顶部栏（Logo + 操作按钮）+ 底部导航栏（主要页面入口）
 *
 * 职责：
 * - 提供全局导航入口
 * - 管理用户会话状态
 * - 提供快捷设置访问
 * - 显示离线队列状态
 */

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
import { useAuthStore, useSettingsStore, useThemeStore } from '@/stores'
import type { Theme } from '@/types'
import { offlineQueue } from '@/utils/storage'
import { useI18nOptimized } from '@/composables/core/useI18nOptimized'

const navbarProps = withDefaults(
  defineProps<{
    accessCurrent?: number
    accessLimit?: number
    showAccessIndicator?: boolean
  }>(),
  {
    showAccessIndicator: false,
  },
)

const accessCurrentDisplay = computed(() => {
  return typeof navbarProps.accessCurrent === 'number' ? navbarProps.accessCurrent : 0
})

const accessLimitDisplay = computed(() => {
  const value = navbarProps.accessLimit
  if (typeof value !== 'number') return ''
  if (value === Infinity) return '∞'
  return value
})

const showAccessIndicator = computed(
  () => navbarProps.showAccessIndicator && typeof navbarProps.accessLimit === 'number',
)

/** 路由实例 */
const router = useRouter()

/** 国际化实例 */
const { locale } = useI18n()
const { changeLocale: changeLocaleOptimized } = useI18nOptimized()

/** Store 实例 */
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const themeStore = useThemeStore()

/** Store 响应式状态 */
const { user, isAuthenticated } = storeToRefs(authStore)
const { settings } = storeToRefs(settingsStore)
const { theme } = storeToRefs(themeStore)

/** 用户菜单显示状态 */
const showUserMenu = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

/** 设置面板显示状态 */
const showSettingsPanel = ref(false)
const settingsMenuRef = ref<HTMLElement | null>(null)

/** 离线队列面板显示状态 */
const showQueuePanel = ref(false)
const queueMenuRef = ref<HTMLElement | null>(null)

/** 离线队列状态 */
const queueStatus = ref<{ pending: number; syncing: number; failed: number }>({
  pending: 0,
  syncing: 0,
  failed: 0,
})

/** 队列同步状态 */
const isQueueSyncing = ref(false)

/** 网络在线状态 */
const isOnline = ref(typeof window === 'undefined' ? true : navigator.onLine)

/** 是否有待处理的队列项 */
const hasQueueItems = computed(() => queueStatus.value.pending > 0)

/**
 * 刷新离线队列状态
 * 从离线队列获取最新的待处理、同步中和失败的任务数量
 */
const refreshQueueStatus = async () => {
  try {
    const status = await offlineQueue.getQueueStatus()
    queueStatus.value = status
  } catch (error) {
    console.error('[Offline Queue] Failed to get status:', error)
  }
}

/**
 * 切换离线队列面板显示状态
 * 打开面板时会刷新队列状态
 */
const toggleQueuePanel = async () => {
  // console.log('[AppNavbar] Toggle queue panel - before:', showQueuePanel.value, 'isMobile:', isMobile.value)
  showQueuePanel.value = !showQueuePanel.value
  // console.log('[AppNavbar] Toggle queue panel - after:', showQueuePanel.value)
  if (showQueuePanel.value) {
    await refreshQueueStatus()
  }
}

/**
 * 手动同步离线队列
 * 仅在在线且有待处理项时执行
 */
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

/**
 * 处理网络状态变化
 * 更新在线状态标志
 */
const handleOnlineChange = () => {
  if (typeof navigator !== 'undefined') {
    isOnline.value = navigator.onLine
  }
}

/**
 * 跳转到搜索页面
 * 点击搜索按钮时触发
 */
const goToSearch = () => {
  router.push({ path: '/search' })
}

/** 跳转到设置页 */
const goToAdvancedSettings = () => {
  router.push({ path: '/settings' })
  showSettingsPanel.value = false
  showUserMenu.value = false
}

/** 移动端检测标志 */
const isMobile = ref(false)

/**
 * 更新移动端检测状态
 * 根据窗口宽度判断是否为移动端（768px 断点）
 */
const updateIsMobile = () => {
  if (typeof window === 'undefined') return
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
}

/** 主题选项配置 */
const themeOptions = [
  { value: 'light' as Theme, icon: Sun },
  { value: 'dark' as Theme, icon: Moon },
  { value: 'auto' as Theme, icon: Monitor },
]

/** 语言选项配置 */
const localeOptions = [
  { code: 'en', name: 'English' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'ja', name: '日本語' },
]

/**
 * 切换设置面板显示状态
 */
const toggleSettingsPanel = () => {
  // console.log('[AppNavbar] Toggle settings panel - before:', showSettingsPanel.value, 'isMobile:', isMobile.value)
  showSettingsPanel.value = !showSettingsPanel.value
  // console.log('[AppNavbar] Toggle settings panel - after:', showSettingsPanel.value)
}

/**
 * 设置主题
 * @param newTheme - 新的主题值（light/dark/auto）
 */
const setTheme = (newTheme: Theme) => {
  themeStore.setTheme(newTheme)
}

/**
 * 切换语言
 * @param newLocale - 新的语言代码
 */
const changeLanguage = async (newLocale: string) => {
  await changeLocaleOptimized(newLocale as 'en' | 'zh-CN' | 'ja')
}

/**
 * 用户头像 URL
 * 优先使用用户上传的头像，否则使用 DiceBear 生成的默认头像
 */
const userAvatarUrl = computed(() => {
  if (user.value?.avatar_url) {
    return user.value.avatar_url
  }
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.value?.username || 'default')}`
})

/**
 * 处理用户登出
 * 清除用户会话并跳转到首页
 */
const handleLogout = () => {
  authStore.logout()
  showUserMenu.value = false
  router.push('/')
}

/**
 * 处理点击外部区域
 * 关闭打开的下拉菜单和面板
 */
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
  const inSettingsDropdown = target.closest('.settings-dropdown')
  if (
    showSettingsPanel.value &&
    !inSettingsButton &&
    !inSettingsDropdown
  ) {
    showSettingsPanel.value = false
  }

  const inQueueButton = target.closest('.queue-status-container')
  const inQueueDropdown = target.closest('.queue-dropdown')
  if (
    showQueuePanel.value &&
    !inQueueButton &&
    !inQueueDropdown
  ) {
    showQueuePanel.value = false
  }
}

/** 队列状态定时器 */
let queueStatusTimer: number | null = null

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  updateIsMobile()

  refreshQueueStatus()

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateIsMobile)
    // ❌ 禁用手势跳转页面功能
    // window.addEventListener('touchstart', handleGlobalTouchStart, { passive: true })
    // window.addEventListener('touchend', handleGlobalTouchEnd, { passive: true })
    // window.addEventListener('touchcancel', handleGlobalTouchEnd, { passive: true })
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
    // ❌ 禁用手势跳转页面功能
    // window.removeEventListener('touchstart', handleGlobalTouchStart)
    // window.removeEventListener('touchend', handleGlobalTouchEnd)
    // window.removeEventListener('touchcancel', handleGlobalTouchEnd)
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
  transition: all var(--transition-fast);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-lg);
}

.navbar-brand:hover {
  transform: scale(1.05);
  background: rgba(139, 92, 246, 0.08);
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
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}

.mobile-top-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
}

.mobile-access-indicator {
  flex: 1;
  display: flex;
  justify-content: center;
}

.access-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
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
  max-width: calc(100vw - 32px);
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
  max-width: calc(100vw - 32px);
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

  /* 移动端模态框样式 - 应用于queue和settings面板 */
  .queue-dropdown.mobile-modal,
  .settings-dropdown.mobile-modal {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    right: auto !important;
    /* 重置桌面端的right: 0 */
    transform: translate(-50%, -50%) !important;
    width: calc(100vw - 32px) !important;
    max-width: 400px !important;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 9999 !important;
    /* 提高z-index确保在最顶层 */
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.3),
      0 0 0 100vmax rgba(0, 0, 0, 0.5) !important;
    /* 添加调试边框 */
    /* border: 3px solid red !important; */
  }

  .queue-dropdown.mobile-modal::before,
  .settings-dropdown.mobile-modal::before {
    position: sticky;
    top: 0;
    z-index: 1;
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
