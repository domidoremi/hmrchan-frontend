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
        <RouterLink to="/community" class="nav-link">
          <MessageSquare :size="20" />
          <span>{{ $t('nav.community') }}</span>
        </RouterLink>
      </div>

      <!-- Actions -->
      <div class="navbar-actions">
        <button class="action-btn" @click="goToSearch" :aria-label="$t('common.search')">
          <Search :size="20" />
        </button>

        <button class="action-btn" @click="toggleSettings" :aria-label="$t('nav.settings')">
          <Settings :size="20" />
        </button>

        <RouterLink v-if="!isAuthenticated" to="/login" class="login-btn">
          <LogIn :size="18" />
          <span class="desktop-only">{{ $t('nav.login') }}</span>
        </RouterLink>

        <button v-else class="user-btn" @click="toggleUserMenu">
          <img :src="userAvatar" :alt="user?.username" class="user-avatar" />
        </button>
      </div>
    </div>

    <!-- Settings Dropdown -->
    <Transition name="dropdown">
      <div v-if="showSettings" class="settings-dropdown glass-dropdown" @click.stop>
        <SettingsPanel @close="showSettings = false" />
      </div>
    </Transition>

    <!-- User Menu Dropdown -->
    <Transition name="dropdown">
      <div v-if="showUserMenu && isAuthenticated" class="user-dropdown glass-dropdown" @click.stop>
        <div class="user-info">
          <img :src="userAvatar" :alt="user?.username" class="user-avatar-lg" />
          <div>
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
  </nav>

  <!-- Mobile Bottom Navigation -->
  <nav class="mobile-nav mobile-only">
    <RouterLink to="/" class="mobile-nav-item">
      <Home :size="22" />
      <span>{{ $t('nav.home') }}</span>
    </RouterLink>
    <RouterLink to="/explore" class="mobile-nav-item">
      <Compass :size="22" />
      <span>{{ $t('nav.explore') }}</span>
    </RouterLink>
    <RouterLink v-if="isAuthenticated" to="/favorites" class="mobile-nav-item">
      <Heart :size="22" />
      <span>{{ $t('nav.favorites') }}</span>
    </RouterLink>
    <RouterLink to="/authors" class="mobile-nav-item">
      <Users :size="22" />
      <span>{{ $t('nav.authors') }}</span>
    </RouterLink>
    <RouterLink to="/community" class="mobile-nav-item">
      <MessageSquare :size="22" />
      <span>{{ $t('nav.community') }}</span>
    </RouterLink>
  </nav>
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
  LogIn,
  LogOut,
  User,
  MessageSquare,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores'
import SettingsPanel from './SettingsPanel.vue'

const router = useRouter()
const authStore = useAuthStore()
const { user, isAuthenticated } = storeToRefs(authStore)

const showSettings = ref(false)
const showUserMenu = ref(false)

const userAvatar = computed(() => {
  if (user.value?.avatar_url) return user.value.avatar_url
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.value?.username || 'default'}`
})

function goToSearch() {
  router.push('/explore')
}

function toggleSettings() {
  showUserMenu.value = false
  showSettings.value = !showSettings.value
}

function toggleUserMenu() {
  showSettings.value = false
  showUserMenu.value = !showUserMenu.value
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

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
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
