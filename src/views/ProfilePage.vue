<template>
  <div class="profile-page">
    <!-- Banner + Avatar Hero -->
    <div class="profile-banner" />

    <div class="container">
      <!-- Profile Card overlapping banner -->
      <div class="profile-card glass-card--editorial">
        <div class="profile-card__top">
          <div class="avatar-area">
            <Avatar :src="userAvatar" :alt="username" size="xl" class="profile-avatar" />
            <span class="avatar-status" />
          </div>

          <div class="profile-info">
            <p class="profile-kicker">{{ $t('nav.profile') }}</p>
            <div class="profile-name-row">
              <h1 class="profile-name">{{ displayName }}</h1>
              <button
                type="button"
                class="edit-btn"
                @click="editProfile"
                :aria-label="$t('profile.editProfile')"
              >
                <Pencil :size="14" />
              </button>
            </div>
            <p class="profile-handle">@{{ username }}</p>
            <p v-if="userBio" class="profile-bio">{{ userBio }}</p>
          </div>

          <!-- Quick Nav (desktop) -->
          <nav class="profile-quick-nav">
            <RouterLink
              v-for="link in quickLinks"
              :key="link.to"
              :to="link.to"
              class="quick-nav-item page-control-btn"
            >
              <component :is="link.icon" :size="18" />
              <span>{{ link.label }}</span>
              <span v-if="link.badge" class="quick-nav-badge">{{ link.badge }}</span>
            </RouterLink>
          </nav>
        </div>

        <!-- Stats Row -->
        <div class="profile-stats">
          <button
            v-for="stat in stats"
            :key="stat.key"
            type="button"
            class="stat-item"
            :class="{ 'stat-item--active': activeTab === stat.key }"
            :aria-pressed="activeTab === stat.key"
            @click="activeTab = stat.key"
          >
            <span v-if="stat.value" class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </button>
        </div>
      </div>

      <!-- Tab Content Area -->
      <div class="profile-content">
        <!-- Mobile Quick Nav -->
        <nav class="profile-quick-nav--mobile">
          <RouterLink
            v-for="link in quickLinks"
            :key="link.to"
            :to="link.to"
            class="quick-nav-chip page-control-btn page-control-btn--compact"
          >
            <component :is="link.icon" :size="14" />
            <span>{{ link.label }}</span>
            <span v-if="link.badge" class="quick-nav-badge--sm">{{ link.badge }}</span>
          </RouterLink>
        </nav>

        <!-- Tab Selector -->
        <div class="tab-bar page-toolbar">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            class="tab-btn"
            :class="{ 'tab-btn--active': activeTab === tab.value }"
            :aria-pressed="activeTab === tab.value"
            @click="activeTab = tab.value"
          >
            <component :is="tab.icon" :size="16" />
            <span class="tab-label">{{ tab.label }}</span>
          </button>
        </div>

        <div class="tab-panel">
          <Transition name="tab-slide" mode="out-in">
            <component :is="currentTabComponent" :key="activeTab" v-bind="currentTabProps" />
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ProfilePage' })

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  Heart,
  MessageSquare,
  ThumbsUp,
  Clock,
  Flag,
  Shield,
  Users,
  UserPlus,
  UserX,
  Pencil,
  Bookmark,
  Settings,
  Bell,
  Smartphone,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useFavoritesStore, useNotificationsStore } from '@/stores'
import { getUserAvatarUrl } from '@/composables/useUserAvatar'
import Avatar from '@/components/ui/Avatar.vue'
import ProfileFavoritesTab from '@/components/profile/ProfileFavoritesTab.vue'
import ProfileCommentsTab from '@/components/profile/ProfileCommentsTab.vue'
import ProfileLikesTab from '@/components/profile/ProfileLikesTab.vue'
import ProfileHistoryTab from '@/components/profile/ProfileHistoryTab.vue'
import ProfileCommentFavoritesTab from '@/components/profile/ProfileCommentFavoritesTab.vue'
import ProfileReportsTab from '@/components/profile/ProfileReportsTab.vue'
import ProfileSecurityTab from '@/components/profile/ProfileSecurityTab.vue'
import ProfileRelationsTab from '@/components/profile/ProfileRelationsTab.vue'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const favStore = useFavoritesStore()
const notifStore = useNotificationsStore()
const { user, isAuthenticated } = storeToRefs(authStore)

const activeTab = ref<
  | 'favorites'
  | 'comments'
  | 'likes'
  | 'history'
  | 'commentFavorites'
  | 'reports'
  | 'security'
  | 'followers'
  | 'following'
  | 'blocked'
>('favorites')

const tabs = computed(() => [
  { value: 'favorites' as const, label: t('profile.tabs.favorites'), icon: Heart },
  { value: 'comments' as const, label: t('profile.tabs.comments'), icon: MessageSquare },
  { value: 'likes' as const, label: t('profile.tabs.likes'), icon: ThumbsUp },
  {
    value: 'commentFavorites' as const,
    label: t('profile.tabs.commentFavorites'),
    icon: Bookmark,
  },
  { value: 'history' as const, label: t('profile.tabs.history'), icon: Clock },
  { value: 'reports' as const, label: t('profile.tabs.reports'), icon: Flag },
  { value: 'security' as const, label: t('profile.tabs.security'), icon: Shield },
  { value: 'followers' as const, label: t('profile.tabs.followers'), icon: Users },
  { value: 'following' as const, label: t('profile.tabs.following'), icon: UserPlus },
  { value: 'blocked' as const, label: t('profile.tabs.blocked'), icon: UserX },
])

const currentTabComponent = computed(() => {
  const components = {
    favorites: ProfileFavoritesTab,
    comments: ProfileCommentsTab,
    likes: ProfileLikesTab,
    commentFavorites: ProfileCommentFavoritesTab,
    history: ProfileHistoryTab,
    reports: ProfileReportsTab,
    security: ProfileSecurityTab,
    followers: ProfileRelationsTab,
    following: ProfileRelationsTab,
    blocked: ProfileRelationsTab,
  }
  return components[activeTab.value]
})

const currentTabProps = computed(() => {
  if (activeTab.value === 'followers') return { mode: 'followers' as const }
  if (activeTab.value === 'following') return { mode: 'following' as const }
  if (activeTab.value === 'blocked') return { mode: 'blocked' as const }
  return {}
})

const stats = computed(() => [
  {
    key: 'favorites' as const,
    value: favStore.total || undefined,
    label: t('profile.tabs.favorites'),
  },
  { key: 'comments' as const, value: undefined, label: t('profile.tabs.comments') },
  { key: 'likes' as const, value: undefined, label: t('profile.tabs.likes') },
  { key: 'history' as const, value: undefined, label: t('profile.tabs.history') },
])

const quickLinks = computed(() => [
  { to: '/profile/settings', icon: Settings, label: t('profile.settings') },
  {
    to: '/profile/notifications',
    icon: Bell,
    label: t('profile.tabs.notifications'),
    badge: notifStore.unreadCount > 0 ? notifStore.unreadCount : undefined,
  },
  { to: '/profile/devices', icon: Smartphone, label: t('profile.tabs.devices') },
])

const username = computed(() => user.value?.username ?? '')
const displayName = computed(() => {
  const fullName = (user.value as { full_name?: string } | null)?.full_name
  return fullName || user.value?.username || ''
})
const userBio = computed(() => (user.value as { bio?: string } | null)?.bio)
const userAvatar = computed(() => {
  return getUserAvatarUrl(user.value?.avatar_url, user.value?.username)
})

function editProfile() {
  router.push('/profile/settings#basic-info')
}

onMounted(() => {
  if (!isAuthenticated.value) {
    router.push('/login')
  }
})
</script>

<style scoped>
/* ===== Banner ===== */
.profile-banner {
  position: relative;
  height: clamp(8rem, 20vw, 14rem);
  overflow: hidden;
}

/* ===== Profile Card ===== */
.profile-card {
  position: relative;
  margin-top: clamp(-3.5rem, -5vw, -5rem);
  z-index: 2;
  padding: 0;
  overflow: visible;
  border-radius: var(--profile-shell-radius);
  border: 1px solid var(--profile-surface-border);
  background: var(--profile-surface-bg);
  box-shadow: var(--profile-surface-shadow);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
}

.profile-card__top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: clamp(1rem, 2vw, 1.5rem);
  align-items: start;
  padding: clamp(1.25rem, 3vw, 2rem);
  padding-top: clamp(0.75rem, 2vw, 1.25rem);
}

/* Avatar */
.avatar-area {
  position: relative;
  margin-top: clamp(-2.5rem, -4vw, -3.5rem);
}

.profile-avatar {
  width: clamp(4.5rem, 10vw, 6.5rem);
  height: clamp(4.5rem, 10vw, 6.5rem);
  border: 4px solid var(--color-background);
  box-shadow: var(--glass-shadow-md);
}

.avatar-status {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 0.875rem;
  height: 0.875rem;
  background: var(--color-success);
  border: 3px solid var(--color-background);
  border-radius: var(--radius-full);
}

/* Info */
.profile-info {
  min-width: 0;
  padding-top: var(--spacing-1);
}

.profile-kicker {
  margin: 0 0 0.25rem;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.profile-name {
  margin: 0;
  font-size: clamp(var(--text-lg), 2.5vw, var(--text-2xl));
  font-weight: var(--font-bold);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--radius-full);
  color: var(--color-text-tertiary);
  background: var(--profile-action-bg);
  border: 1px solid var(--profile-action-border);
  transition:
    color var(--duration-fast) var(--ease-smooth),
    background var(--duration-fast) var(--ease-smooth),
    border-color var(--duration-fast) var(--ease-smooth),
    transform var(--duration-fast) var(--ease-bounce-soft);
}

.edit-btn:hover {
  color: var(--color-primary);
  background: var(--profile-action-bg-hover);
  border-color: var(--profile-action-border-strong);
  transform: rotate(12deg);
}

.profile-handle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.profile-bio {
  margin: var(--spacing-2) 0 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  max-width: 50ch;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Quick Nav (desktop) */
.profile-quick-nav {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: 0.375rem;
  border: 1px solid var(--ui-compat-border);
  border-radius: var(--ui-compat-panel-radius);
  background: var(--ui-compat-surface-base);
  box-shadow: var(--ui-compat-shadow);
}

.quick-nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--ui-compat-control-radius);
  border: 1px solid var(--ui-compat-border);
  background: var(--ui-compat-surface-interactive);
  font-size: var(--text-sm);
  color: var(--ui-compat-text-secondary);
  text-decoration: none;
  transition:
    color var(--duration-fast) var(--ease-smooth),
    background var(--duration-fast) var(--ease-smooth),
    border-color var(--duration-fast) var(--ease-smooth);
}

.quick-nav-item:hover {
  color: var(--color-primary);
  background: var(--ui-compat-surface-interactive-strong);
  border-color: var(--ui-compat-border-strong);
}

.quick-nav-badge {
  margin-left: auto;
  min-width: 1.25rem;
  height: 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.375rem;
  background: var(--color-error);
  color: var(--color-white);
  font-size: 0.625rem;
  font-weight: var(--font-bold);
  border-radius: var(--radius-full);
}

/* Stats Row */
.profile-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--profile-muted-border);
  background: linear-gradient(180deg, transparent, rgba(var(--color-primary-rgb), 0.03));
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  padding: clamp(0.75rem, 2vw, 1rem) var(--spacing-2);
  cursor: pointer;
  position: relative;
  transition:
    background var(--duration-fast) var(--ease-smooth),
    color var(--duration-fast) var(--ease-smooth);
}

.stat-item::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 2rem;
  height: 2px;
  background: var(--color-primary);
  border-radius: 0.0625rem;
  transition: transform var(--duration-normal) var(--ease-bounce-soft);
}

.stat-item:hover {
  background: var(--profile-muted-bg);
}

.stat-item--active {
  background: rgba(var(--color-primary-rgb), 0.04);
}

.stat-item--active::after {
  transform: translateX(-50%) scaleX(1);
}

.stat-item--active .stat-value {
  color: var(--color-primary);
}

.stat-value {
  font-size: clamp(var(--text-base), 2vw, var(--text-xl));
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  transition: color var(--duration-fast) var(--ease-smooth);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* ===== Mobile Quick Nav ===== */
.profile-quick-nav--mobile {
  display: none;
}

/* ===== Tab Bar ===== */
.profile-content {
  margin-top: clamp(1rem, 2vw, 1.5rem);
  display: flex;
  flex-direction: column;
  gap: clamp(0.875rem, 2vw, 1.25rem);
}

.tab-bar {
  display: flex;
  align-items: stretch;
  gap: 0.125rem;
  padding: 0.1875rem;
  background: var(--ui-compat-surface-base);
  border: 1px solid var(--ui-compat-border);
  border-radius: var(--ui-compat-panel-radius);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-padding-inline: 0.1875rem;
  scrollbar-width: none;
  box-shadow: var(--ui-compat-shadow);
}

.tab-bar::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  flex: 1 1 0;
  min-inline-size: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: calc(var(--radius-xl) - 0.1875rem);
  border: 1px solid transparent;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--ui-compat-text-secondary);
  white-space: nowrap;
  transition:
    color var(--duration-fast) var(--ease-smooth),
    background var(--duration-fast) var(--ease-smooth),
    border-color var(--duration-fast) var(--ease-smooth),
    box-shadow var(--duration-fast) var(--ease-smooth);
}

.tab-btn:hover:not(.tab-btn--active) {
  color: var(--color-text-primary);
  background: var(--ui-compat-surface-interactive);
}

.tab-btn--active {
  color: var(--color-text-primary);
  background: var(--ui-compat-surface-interactive-strong);
  border-color: var(--ui-compat-border-strong);
  box-shadow: inset 0 0 0 0.0625rem rgba(var(--color-primary-rgb), 0.06);
}

.tab-label {
  display: inline;
}

.profile-quick-nav :deep(svg),
.profile-quick-nav--mobile :deep(svg),
.tab-btn :deep(svg) {
  flex-shrink: 0;
  inline-size: 1rem;
  block-size: 1rem;
}

/* Tab Panel */
.tab-panel {
  min-height: 20rem;
}

/* Tab Transition */
.tab-slide-enter-active,
.tab-slide-leave-active {
  transition:
    opacity var(--duration-fast) var(--ease-smooth),
    transform var(--duration-fast) var(--ease-out-smooth);
}

.tab-slide-enter-from {
  opacity: 0;
  transform: translateY(0.75rem);
}

.tab-slide-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .profile-card__top {
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
  }

  .profile-quick-nav {
    display: none;
  }

  .profile-quick-nav--mobile {
    display: flex;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-4);
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    padding-bottom: var(--spacing-1);
  }

  .profile-quick-nav--mobile::-webkit-scrollbar {
    display: none;
  }

  .quick-nav-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    min-inline-size: max-content;
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--ui-compat-surface-interactive);
    border: 1px solid var(--ui-compat-border);
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    color: var(--ui-compat-text-secondary);
    text-decoration: none;
    white-space: nowrap;
    flex-shrink: 0;
    transition:
      color var(--duration-fast) var(--ease-smooth),
      background var(--duration-fast) var(--ease-smooth),
      border-color var(--duration-fast) var(--ease-smooth);
  }

  .quick-nav-chip:hover {
    color: var(--color-primary);
    background: var(--ui-compat-surface-interactive-strong);
    border-color: var(--ui-compat-border-strong);
  }

  .quick-nav-badge--sm {
    min-width: 1rem;
    height: 1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.25rem;
    background: var(--color-error);
    color: var(--color-white);
    font-size: 0.5625rem;
    font-weight: var(--font-bold);
    border-radius: var(--radius-full);
  }

  .profile-stats {
    grid-template-columns: repeat(4, 1fr);
  }

  .stat-value {
    font-size: var(--text-base);
  }

  .tab-btn {
    flex: 0 0 auto;
    min-inline-size: 3rem;
    padding: var(--spacing-2);
    font-size: var(--text-xs);
    gap: var(--spacing-1);
  }

  .tab-label {
    display: none;
  }

  .tab-btn--active .tab-label {
    display: inline;
  }

  .tab-btn--active {
    padding-inline: var(--spacing-3);
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .profile-quick-nav {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>

<style>
/* ===== Material 3 Overrides ===== */
#app[data-ui-style='material'] .profile-page .profile-card {
  border-radius: var(--radius-lg);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background: var(--profile-surface-bg);
  box-shadow: var(--shadow-sm);
}

#app[data-ui-style='material'] .profile-page .profile-card::before {
  display: none;
}

#app[data-ui-style='material'] .profile-page .profile-card:hover {
  transform: none;
  box-shadow: var(--shadow-md);
}

#app[data-ui-style='material'] .profile-page .profile-avatar {
  border-width: 3px;
}

#app[data-ui-style='material'] .profile-page .edit-btn {
  border-radius: 50%;
}

#app[data-ui-style='material'] .profile-page .stat-item::after {
  border-radius: 0;
  height: 3px;
}

#app[data-ui-style='material'] .profile-page .tab-bar {
  border-radius: var(--radius-md);
  background: var(--ui-compat-surface-base);
  border-color: var(--ui-compat-border);
}

#app[data-ui-style='material'] .profile-page .tab-btn {
  border-radius: calc(var(--radius-lg) / 2);
}

#app[data-ui-style='material'] .profile-page .tab-btn--active {
  background: var(--ui-compat-surface-interactive-strong);
}

#app[data-ui-style='material'] .profile-page .quick-nav-item {
  border-radius: var(--radius-md);
}

#app[data-ui-style='material'] .profile-page .quick-nav-badge {
  border-radius: var(--radius-sm);
}

/* ===== Dark Theme ===== */
[data-theme='dark'] .profile-page .stat-item:hover {
  background: rgba(var(--color-primary-rgb), 0.06);
}

[data-theme='dark'] .profile-page .profile-stats {
  border-top-color: rgba(255, 255, 255, 0.06);
}

/* ===== Blue Theme ===== */
[data-theme='blue'] .profile-page .stat-item--active .stat-value {
  color: #3b82f6;
}

[data-theme='blue'] .profile-page .stat-item::after {
  background: #3b82f6;
}

[data-theme='blue'] .profile-page .tab-btn--active {
  color: #3b82f6;
}

[data-theme='blue'] .profile-page .quick-nav-item:hover {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.06);
}

[data-theme='blue'] .profile-page .quick-nav-badge {
  background: #3b82f6;
}

/* ===== Material + Dark ===== */
#app[data-ui-style='material'][data-theme='dark'] .profile-page .profile-card {
  background: var(--md-surface-container, rgba(28, 28, 32, 0.92));
  border-color: rgba(255, 255, 255, 0.06);
}

#app[data-ui-style='material'][data-theme='dark'] .profile-page .tab-bar {
  background: var(--ui-compat-surface-base);
}

#app[data-ui-style='material'][data-theme='dark'] .profile-page .tab-btn--active {
  background: var(--ui-compat-surface-interactive-strong);
}

/* ===== Material + Blue ===== */
#app[data-ui-style='material'][data-theme='blue'] .profile-page .profile-card {
  background: var(--profile-surface-bg);
  border-color: rgba(59, 130, 246, 0.1);
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.08);
}

#app[data-ui-style='material'][data-theme='blue'] .profile-page .tab-bar {
  background: var(--ui-compat-surface-base);
  border-color: var(--ui-compat-border);
}
</style>
