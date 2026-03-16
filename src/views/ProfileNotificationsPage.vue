<template>
  <div class="notifications-page">
    <div class="container">
      <ProfileSubPageHeader
        :title="$t('profile.tabs.notifications')"
        :subtitle="$t('profile.notificationsSubtitle')"
      >
        <template #actions>
          <Button v-if="unreadCount > 0" variant="ghost" size="sm" @click="handleMarkAllRead">
            <CheckCheck :size="14" />
            {{ $t('profile.markAllRead') }}
          </Button>
        </template>
      </ProfileSubPageHeader>

      <!-- Inline Stats -->
      <div class="notif-stats">
        <span class="notifications-stat-pill ui-pill ui-pill--stat">
          <Bell :size="14" />
          {{ total }}
        </span>
        <span
          v-if="unreadCount > 0"
          class="notifications-stat-pill notifications-stat-pill--unread ui-pill ui-pill--stat"
        >
          <BellDot :size="14" />
          {{ unreadCount }}
        </span>
        <span class="notifications-stat-pill ui-pill ui-pill--stat">
          <MessageCircle :size="14" />
          {{ commentCount }}
        </span>
        <span class="notifications-stat-pill ui-pill ui-pill--stat">
          <Heart :size="14" />
          {{ likeCount }}
        </span>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <button
          v-for="filter in filters"
          :key="filter.value"
          type="button"
          class="notifications-filter-pill page-control-btn page-control-btn--compact"
          :class="{ 'notifications-filter-pill--active': activeFilter === filter.value }"
          :aria-pressed="activeFilter === filter.value"
          @click="activeFilter = filter.value"
        >
          <component :is="filter.icon" :size="16" />
          <span>{{ filter.label }}</span>
          <span
            v-if="filter.value === 'unread' && unreadCount > 0"
            class="notifications-filter-badge"
          >
            {{ unreadCount }}
          </span>
        </button>
      </div>

      <!-- Content -->
      <div class="page-body glass-card-enhanced">
        <ProfileNotificationsTab />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ProfileNotificationsPage' })

import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Bell,
  BellDot,
  Heart,
  MessageCircle,
  CheckCheck,
  Inbox,
  AlertCircle,
} from 'lucide-vue-next'
import { useNotificationsStore, useToastStore } from '@/stores'
import type { NotificationType } from '@/api'
import ProfileNotificationsTab from '@/components/profile/ProfileNotificationsTab.vue'
import ProfileSubPageHeader from '@/components/profile/ProfileSubPageHeader.vue'
import Button from '@/components/ui/Button.vue'

const { t } = useI18n()
const notifStore = useNotificationsStore()
const toastStore = useToastStore()

const activeFilter = ref('all')

const total = computed(() => notifStore.total)
const unreadCount = computed(() => notifStore.unreadCount)

const COMMENT_TYPES = ['comment_reply', 'comment_mention', 'reply']
const LIKE_TYPES = ['comment_like', 'like']

const commentCount = computed(
  () => notifStore.items.filter((n) => COMMENT_TYPES.includes(n.type)).length
)
const likeCount = computed(() => notifStore.items.filter((n) => LIKE_TYPES.includes(n.type)).length)

const filters = computed(() => [
  { value: 'all', label: t('common.all'), icon: Inbox },
  { value: 'unread', label: t('profile.unread'), icon: BellDot },
  { value: 'comments', label: t('profile.tabs.comments'), icon: MessageCircle },
  { value: 'likes', label: t('profile.tabs.likes'), icon: Heart },
  { value: 'system', label: t('profile.system'), icon: AlertCircle },
])

// 筛选器 → store.setFilter 映射
const FILTER_TYPE_MAP: Record<string, NotificationType | undefined> = {
  all: undefined,
  unread: undefined,
  comments: 'comment_reply',
  likes: 'comment_like',
  system: 'system',
}

watch(activeFilter, (value) => {
  const type = FILTER_TYPE_MAP[value]
  const unreadOnly = value === 'unread'
  notifStore.setFilter(type, unreadOnly)
})

async function handleMarkAllRead() {
  await notifStore.markAllAsRead()
  toastStore.success(t('profile.allMarkedRead'))
}
</script>

<style scoped>
.notifications-page {
  min-height: 100dvh;
  min-height: 100svh;
  padding: clamp(1rem, 3vw, 1.5rem) 0;
}

/* ===== Inline Stats ===== */
.notif-stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin-bottom: clamp(0.75rem, 2vw, 1rem);
}

.notifications-stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem clamp(0.5rem, 1.2vw, 0.625rem);
  background: var(--profile-chip-bg);
  border: 1px solid var(--profile-chip-border);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  font-variant-numeric: tabular-nums;
  color: var(--profile-chip-text);
  white-space: nowrap;
}

.notifications-stat-pill--unread {
  color: var(--color-error);
  background: var(--color-error-alpha);
  border-color: rgba(var(--color-error-rgb), 0.2);
}

/* ===== Filter Bar ===== */
.filter-bar {
  display: flex;
  gap: var(--spacing-2);
  margin-bottom: clamp(1rem, 2.5vw, 1.5rem);
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: var(--spacing-1);
}

.filter-bar::-webkit-scrollbar {
  display: none;
}

.notifications-filter-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: clamp(0.5rem, 1.2vw, 0.625rem) clamp(0.875rem, 2.2vw, 1.125rem);
  background: var(--profile-action-bg);
  border: 1px solid var(--profile-action-border);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    color var(--duration-fast) var(--ease-smooth),
    background var(--duration-fast) var(--ease-smooth),
    border-color var(--duration-fast) var(--ease-smooth),
    box-shadow var(--duration-fast) var(--ease-smooth);
}

.notifications-filter-pill:hover {
  color: var(--color-primary);
  border-color: var(--profile-action-border-strong);
  background: var(--profile-action-bg-hover);
}

.notifications-filter-pill--active {
  color: var(--color-primary);
  background: var(--profile-surface-bg-soft);
  border-color: var(--profile-action-border-strong);
  box-shadow: var(--profile-surface-shadow);
}

.notifications-filter-pill--active:hover {
  color: var(--color-primary);
  background: var(--profile-surface-bg-soft);
  border-color: var(--profile-action-border-strong);
}

.notifications-filter-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.25rem;
  background: var(--color-error);
  color: var(--color-white);
  font-size: 0.625rem;
  font-weight: var(--font-bold);
  border-radius: var(--radius-full);
  line-height: 1;
}

.notifications-filter-pill--active .notifications-filter-badge {
  background: rgba(var(--color-primary-rgb), 0.12);
  color: currentColor;
}

/* ===== Page Body ===== */
.page-body {
  padding: clamp(1rem, 3vw, 1.5rem);
  border-radius: var(--profile-shell-radius);
  border: 1px solid var(--profile-surface-border);
  background: var(--profile-surface-bg);
  box-shadow: var(--profile-surface-shadow);
}

/* ===== Responsive ===== */
@media (max-width: 480px) {
  .notif-stats {
    flex-wrap: wrap;
  }
}
</style>

<style>
/* ===== Material 3 Overrides ===== */
#app[data-ui-style='material'] .notifications-page .notifications-stat-pill {
  border-radius: var(--radius-md);
}

#app[data-ui-style='material'] .notifications-page .notifications-filter-pill {
  border-radius: var(--radius-md);
}

#app[data-ui-style='material'] .notifications-page .notifications-filter-pill--active {
  box-shadow: var(--shadow-sm);
}

#app[data-ui-style='material'] .notifications-page .page-body {
  border-radius: var(--radius-lg);
}

/* ===== Dark Theme ===== */
[data-theme='dark'] .notifications-page .notifications-stat-pill {
  background: var(--profile-chip-bg);
  border-color: var(--profile-chip-border);
}

[data-theme='dark'] .notifications-page .notifications-filter-pill--active {
  box-shadow: 0 0 12px rgba(var(--color-primary-rgb), 0.2);
}

/* ===== Blue Theme ===== */
[data-theme='blue'] .notifications-page .notifications-stat-pill--unread {
  color: #ef4444;
}

[data-theme='blue'] .notifications-page .notifications-filter-pill--active {
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.22);
  box-shadow: var(--profile-surface-shadow);
}

[data-theme='blue']
  .notifications-page
  .notifications-filter-pill:hover:not(.notifications-filter-pill--active) {
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.2);
  background: rgba(59, 130, 246, 0.04);
}

/* ===== Material + Dark ===== */
#app[data-ui-style='material'][data-theme='dark'] .notifications-page .notifications-stat-pill {
  background: var(--md-surface-container-high, rgba(40, 40, 48, 1));
  border-color: rgba(255, 255, 255, 0.06);
}

#app[data-ui-style='material'][data-theme='dark'] .notifications-page .page-body {
  background: var(--md-surface-container, rgba(28, 28, 32, 0.92));
  border-color: rgba(255, 255, 255, 0.06);
}

#app[data-ui-style='material'][data-theme='dark'] .notifications-page .notifications-filter-pill {
  background: var(--profile-action-bg);
  border-color: rgba(255, 255, 255, 0.06);
}

/* ===== Material + Blue ===== */
#app[data-ui-style='material'][data-theme='blue'] .notifications-page .notifications-stat-pill {
  background: var(--profile-surface-bg);
  border-color: rgba(59, 130, 246, 0.08);
}

#app[data-ui-style='material'][data-theme='blue'] .notifications-page .page-body {
  background: var(--profile-surface-bg);
  border-color: rgba(59, 130, 246, 0.08);
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.06);
}
</style>
