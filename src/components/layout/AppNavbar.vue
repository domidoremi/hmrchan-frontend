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

        <!-- 设置按钮 -->
        <RouterLink to="/settings" class="action-button">
          <Settings :size="20" />
        </RouterLink>

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
                  <span>{{ $t('nav.settings') }}</span>
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

        <button v-if="isAuthenticated" class="action-button" @click="showUserMenu = !showUserMenu">
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

  <!-- 用户菜单弹出层（移动端） -->
  <Transition name="modal">
    <div v-if="showUserMenu && isAuthenticated" class="mobile-user-modal" @click="showUserMenu = false">
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
            <span>{{ $t('nav.settings') }}</span>
          </RouterLink>

          <button class="mobile-user-link danger" @click="handleLogout">
            <LogOut :size="20" />
            <span>{{ $t('nav.logout') }}</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>

</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  Home,
  Compass,
  Heart,
  Users,
  Search,
  Settings,
  User,
  LogOut,
  LogIn,
  X,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const { user, isAuthenticated } = storeToRefs(authStore)
const { settings } = storeToRefs(settingsStore)

const showUserMenu = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

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
  const items: BottomNavItem[] = [
    { path: '/' },
    { path: '/explore' },
  ]

  if (isAuthenticated.value) {
    items.push({ path: '/favorites', requiresAuth: true })
  }

  items.push({ path: '/authors' }, { path: '/settings' })
  return items
})

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
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    showUserMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  updateIsMobile()

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateIsMobile)
    window.addEventListener('touchstart', handleGlobalTouchStart, { passive: true })
    window.addEventListener('touchend', handleGlobalTouchEnd, { passive: true })
    window.addEventListener('touchcancel', handleGlobalTouchEnd, { passive: true })
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateIsMobile)
    window.removeEventListener('touchstart', handleGlobalTouchStart)
    window.removeEventListener('touchend', handleGlobalTouchEnd)
    window.removeEventListener('touchcancel', handleGlobalTouchEnd)
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

.user-dropdown {
  position: absolute;
  top: calc(100% + var(--spacing-2));
  right: 0;
  width: 280px;
  padding: var(--spacing-4);
  border-radius: var(--radius-xl);
  box-shadow: var(--glass-shadow);
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding-bottom: var(--spacing-4);
  border-bottom: 1px solid var(--glass-border);
  margin-bottom: var(--spacing-3);
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
    justify-content: space-around;
    align-items: center;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
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
  }

  .bottom-nav-item:active {
    transform: scale(0.95);
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
