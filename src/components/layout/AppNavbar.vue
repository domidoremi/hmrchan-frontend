<template>
  <nav class="glass-navbar">
    <div class="container navbar-content">
      <!-- Logo -->
      <RouterLink to="/" class="navbar-brand">
        <div class="brand-logo">HMR</div>
        <span class="brand-name">Chan</span>
      </RouterLink>

      <!-- 导航链接 -->
      <div class="navbar-nav" :class="{ 'nav-open': mobileMenuOpen }">
        <RouterLink to="/" class="nav-link" @click="closeMobileMenu">
          <Home :size="20" />
          <span>{{ $t('nav.home') }}</span>
        </RouterLink>

        <RouterLink to="/explore" class="nav-link" @click="closeMobileMenu">
          <Compass :size="20" />
          <span>{{ $t('nav.explore') }}</span>
        </RouterLink>

        <RouterLink
          v-if="isAuthenticated"
          to="/favorites"
          class="nav-link"
          @click="closeMobileMenu"
        >
          <Heart :size="20" />
          <span>{{ $t('nav.favorites') }}</span>
        </RouterLink>

        <RouterLink to="/authors" class="nav-link" @click="closeMobileMenu">
          <Users :size="20" />
          <span>{{ $t('nav.authors') }}</span>
        </RouterLink>
      </div>

      <!-- 搜索框 -->
      <div class="navbar-search hide-on-mobile">
        <Search :size="18" />
        <input
          v-model="searchQuery"
          type="search"
          :placeholder="$t('search.placeholder')"
          @keyup.enter="handleSearch"
        />
      </div>

      <!-- 右侧操作 -->
      <div class="navbar-actions">
        <!-- 主题切换 -->
        <button 
          class="action-button" 
          @click="toggleTheme" 
          :title="$t('settings.theme')"
          :aria-label="$t('settings.toggleTheme')"
          :aria-pressed="isDark ? 'true' : 'false'"
        >
          <Sun v-if="!isDark" :size="20" />
          <Moon v-else :size="20" />
        </button>

        <!-- 语言切换 -->
        <button 
          class="action-button" 
          @click="showLanguageMenu = !showLanguageMenu"
          :aria-label="$t('aria.languageMenu')"
          :aria-expanded="showLanguageMenu ? 'true' : 'false'"
          :aria-haspopup="true"
        >
          <Languages :size="20" />
        </button>

        <!-- 语言菜单 -->
        <div 
          v-if="showLanguageMenu" 
          class="language-menu glass-card"
          role="menu"
          :aria-label="$t('aria.languageMenu')"
        >
          <button
            v-for="locale in locales"
            :key="locale.code"
            class="language-item"
            :class="{ active: currentLocale === locale.code }"
            @click="changeLanguage(locale.code)"
          >
            {{ locale.name }}
          </button>
        </div>

        <!-- 用户菜单 -->
        <div v-if="isAuthenticated" class="user-menu">
          <button 
            class="user-avatar" 
            @click="showUserMenu = !showUserMenu"
            :aria-label="$t('aria.userMenu')"
            :aria-expanded="showUserMenu ? 'true' : 'false'"
            :aria-haspopup="true"
          >
            <img :src="userAvatarUrl" :alt="user?.username || 'User'" />
          </button>

          <div 
            v-if="showUserMenu" 
            class="user-dropdown glass-card"
            role="menu"
            :aria-label="$t('aria.userMenu')"
          >
            <div class="user-info">
              <p class="user-name">{{ user?.username }}</p>
              <p class="user-email">{{ user?.email }}</p>
            </div>
            <div class="dropdown-divider"></div>
            <RouterLink to="/profile" class="dropdown-item">
              <User :size="18" />
              {{ $t('nav.profile') }}
            </RouterLink>
            <RouterLink to="/favorites" class="dropdown-item">
              <Heart :size="18" />
              {{ $t('nav.favorites') }}
            </RouterLink>
            <RouterLink to="/settings" class="dropdown-item">
              <Settings :size="18" />
              {{ $t('nav.settings') }}
            </RouterLink>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" @click="handleLogout">
              <LogOut :size="18" />
              {{ $t('nav.logout') }}
            </button>
          </div>
        </div>

        <!-- 登录按钮 -->
        <RouterLink v-else to="/login">
          <GlassButton size="sm">
            {{ $t('nav.login') }}
          </GlassButton>
        </RouterLink>

        <!-- 移动端菜单按钮 -->
        <button 
          class="mobile-menu-button show-on-mobile" 
          @click="toggleMobileMenu"
          :aria-label="mobileMenuOpen ? $t('aria.closeMenu') : $t('aria.openMenu')"
          :aria-expanded="mobileMenuOpen ? 'true' : 'false'"
          :aria-controls="'mobile-nav'"
        >
          <Menu v-if="!mobileMenuOpen" :size="24" />
          <X v-else :size="24" />
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import {
  Home,
  Compass,
  Heart,
  Users,
  Search,
  Sun,
  Moon,
  Languages,
  User,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-vue-next'

import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { getUserAvatar } from '@/utils/avatar'
import GlassButton from '@/components/ui/GlassButton.vue'

const router = useRouter()
const { t, locale } = useI18n()

const authStore = useAuthStore()
const themeStore = useThemeStore()

const { user, isAuthenticated } = storeToRefs(authStore)
const { isDark } = storeToRefs(themeStore)

const searchQuery = ref('')
const showLanguageMenu = ref(false)
const showUserMenu = ref(false)
const mobileMenuOpen = ref(false)

const currentLocale = computed(() => locale.value)

// 用户头像URL（含默认头像）
const userAvatarUrl = computed(() => getUserAvatar(user.value, 40))

const locales = [
  { code: 'en', name: 'English' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'ja', name: '日本語' },
]

const toggleTheme = () => {
  themeStore.toggleTheme()
}

const changeLanguage = (newLocale: string) => {
  locale.value = newLocale
  localStorage.setItem('locale', newLocale)
  showLanguageMenu.value = false
}

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ path: '/explore', query: { q: searchQuery.value } })
    searchQuery.value = ''
  }
}

const handleLogout = () => {
  authStore.logout()
  showUserMenu.value = false
  router.push('/login')
}

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement

  // 检查是否点击在语言菜单外部
  if (showLanguageMenu.value) {
    const languageButton = document.querySelector(
      '.action-button:has(svg[data-lucide="languages"])',
    )
    const languageMenu = document.querySelector('.language-menu')
    if (
      languageButton &&
      languageMenu &&
      !languageButton.contains(target) &&
      !languageMenu.contains(target)
    ) {
      showLanguageMenu.value = false
    }
  }

  // 检查是否点击在用户菜单外部
  if (showUserMenu.value) {
    const userMenu = document.querySelector('.user-menu')
    if (userMenu && !userMenu.contains(target)) {
      showUserMenu.value = false
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.navbar-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  min-height: 64px;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  text-decoration: none;
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}

.brand-logo {
  width: 40px;
  height: 40px;
  background: var(--gradient-primary);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: var(--font-bold);
  font-size: var(--text-sm);
}

.navbar-nav {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex: 1;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-weight: var(--font-medium);
  transition: all var(--transition-fast);
}

.nav-link:hover,
.nav-link.router-link-active {
  background: var(--glass-bg-light);
  color: var(--color-primary);
}

.navbar-search {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  min-width: 300px;
  flex-shrink: 1;
  transition: all var(--transition-fast);
}

.navbar-search:focus-within {
  background: var(--glass-bg);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.navbar-search input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text-primary);
  font-size: var(--text-sm);
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  position: relative;
  flex-shrink: 0;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-button:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.language-menu,
.user-dropdown {
  position: absolute;
  top: calc(100% + var(--spacing-sm));
  right: 0;
  min-width: 200px;
  padding: var(--spacing-sm);
  z-index: var(--z-dropdown);
  animation: slideDown var(--transition-fast);
}

.language-item,
.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.language-item:hover,
.dropdown-item:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.language-item.active {
  background: var(--glass-bg-light);
  color: var(--color-primary);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--gradient-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  overflow: hidden;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar:hover {
  transform: scale(1.05);
  box-shadow: var(--glass-glow);
}

.user-info {
  padding: var(--spacing-md);
}

.user-name {
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.user-email {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.dropdown-divider {
  height: 1px;
  background: var(--glass-border);
  margin: var(--spacing-sm) 0;
}

.mobile-menu-button {
  display: none;
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 平板和小屏幕样式 */
@media (max-width: 1100px) {
  .navbar-search {
    min-width: 200px;
  }

  .navbar-content {
    gap: var(--spacing-md);
  }
}

/* 移动端样式 */
@media (max-width: 768px) {
  .navbar-nav {
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    flex-direction: column;
    background: var(--glass-bg-strong);
    backdrop-filter: var(--glass-blur-strong);
    padding: var(--spacing-lg);
    gap: var(--spacing-sm);
    transform: translateY(-100%);
    opacity: 0;
    transition: all var(--transition-base);
    pointer-events: none;
    z-index: var(--z-sticky);
  }

  .navbar-nav.nav-open {
    transform: translateY(0);
    opacity: 1;
    pointer-events: all;
  }

  .mobile-menu-button {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .navbar-search {
    min-width: auto;
  }
}
</style>
