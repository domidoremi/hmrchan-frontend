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

      <!-- Stats Strip -->
      <div class="notif-stats">
        <div class="stat-pill">
          <Bell :size="14" />
          <span class="stat-value">{{ total }}</span>
          <span class="stat-label">{{ $t('profile.totalNotifications') }}</span>
        </div>
        <span class="stat-divider" />
        <div class="stat-pill stat-pill--unread">
          <BellDot :size="14" />
          <span class="stat-value">{{ unreadCount }}</span>
          <span class="stat-label">{{ $t('profile.unreadNotifications') }}</span>
        </div>
        <span class="stat-divider" />
        <div class="stat-pill">
          <MessageCircle :size="14" />
          <span class="stat-value">{{ commentCount }}</span>
        </div>
        <span class="stat-divider" />
        <div class="stat-pill stat-pill--likes">
          <Heart :size="14" />
          <span class="stat-value">{{ likeCount }}</span>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <button
          v-for="filter in filters"
          :key="filter.value"
          class="filter-chip"
          :class="{ 'filter-chip--active': activeFilter === filter.value }"
          @click="activeFilter = filter.value"
        >
          <component :is="filter.icon" :size="16" />
          <span>{{ filter.label }}</span>
          <span v-if="filter.value === 'unread' && unreadCount > 0" class="filter-badge">
            {{ unreadCount }}
          </span>
        </button>
      </div>

      <!-- Content -->
      <div class="page-body glass-card-enhanced">
        <ProfileNotificationsTab ref="notifTabRef" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ProfileNotificationsPage' })

import { ref, computed } from 'vue'
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
import ProfileNotificationsTab from '@/components/profile/ProfileNotificationsTab.vue'
import ProfileSubPageHeader from '@/components/profile/ProfileSubPageHeader.vue'
import Button from '@/components/ui/Button.vue'

const { t } = useI18n()
const notifStore = useNotificationsStore()
const toastStore = useToastStore()

const activeFilter = ref('all')

const total = computed(() => notifStore.total)
const unreadCount = computed(() => notifStore.unreadCount)
const commentCount = computed(
  () =>
    notifStore.items.filter((n) =>
      ['comment', 'comment_reply', 'comment_mention', 'reply'].includes(n.type)
    ).length
)
const likeCount = computed(
  () => notifStore.items.filter((n) => ['like', 'comment_like'].includes(n.type)).length
)

const filters = computed(() => [
  { value: 'all', label: t('common.all'), icon: Inbox },
  { value: 'unread', label: t('profile.unread'), icon: BellDot },
  { value: 'comments', label: t('profile.tabs.comments'), icon: MessageCircle },
  { value: 'likes', label: t('profile.tabs.likes'), icon: Heart },
  { value: 'system', label: t('profile.system'), icon: AlertCircle },
])

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

/* ===== Stats Strip ===== */
.notif-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: clamp(1rem, 2.5vw, 1.5rem);
  padding: clamp(0.625rem, 1.5vw, 0.75rem) clamp(0.75rem, 2vw, 1rem);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border-subtle);
  border-radius: var(--radius-full);
  overflow-x: auto;
  scrollbar-width: none;
}

.notif-stats::-webkit-scrollbar {
  display: none;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  white-space: nowrap;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  flex-shrink: 0;
}

.stat-pill--unread {
  color: var(--color-error);
}

.stat-pill--likes {
  color: #f43f5e;
}

.stat-value {
  font-weight: var(--font-bold);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
}

.stat-pill--unread .stat-value {
  color: var(--color-error);
}

.stat-pill--likes .stat-value {
  color: #f43f5e;
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.stat-divider {
  width: 1px;
  height: 1rem;
  background: var(--glass-border-subtle);
  flex-shrink: 0;
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

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: clamp(0.5rem, 1.2vw, 0.625rem) clamp(0.75rem, 2vw, 1rem);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border-subtle);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    color var(--duration-fast) var(--ease-smooth),
    background var(--duration-fast) var(--ease-smooth),
    border-color var(--duration-fast) var(--ease-smooth),
    transform var(--duration-fast) var(--ease-bounce-soft);
}

.filter-chip:hover {
  color: var(--color-primary);
  border-color: rgba(var(--color-primary-rgb), 0.25);
  background: rgba(var(--color-primary-rgb), 0.06);
}

.filter-chip--active {
  color: var(--color-on-primary);
  background: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.2);
}

.filter-chip--active:hover {
  color: var(--color-on-primary);
  background: var(--color-primary);
  border-color: var(--color-primary);
  transform: scale(1.03);
}

.filter-badge {
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

.filter-chip--active .filter-badge {
  background: rgba(255, 255, 255, 0.3);
  color: var(--color-on-primary);
}

/* ===== Page Body ===== */
.page-body {
  padding: clamp(1rem, 3vw, 1.5rem);
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .stat-label {
    display: none;
  }
}

@media (max-width: 480px) {
  .notif-stats {
    gap: var(--spacing-2);
  }

  .stat-divider {
    display: none;
  }
}
</style>

<style>
/* ===== Material 3 Overrides ===== */
#app[data-ui-style='material'] .notifications-page .notif-stats {
  border-radius: 12px;
}

#app[data-ui-style='material'] .notifications-page .filter-chip {
  border-radius: 8px;
}

#app[data-ui-style='material'] .notifications-page .filter-chip--active {
  box-shadow: var(--shadow-sm);
}

#app[data-ui-style='material'] .notifications-page .page-body {
  border-radius: 12px;
}

/* ===== Dark Theme ===== */
[data-theme='dark'] .notifications-page .notif-stats {
  background: var(--glass-bg-light);
  border-color: var(--glass-border);
}

[data-theme='dark'] .notifications-page .filter-chip--active {
  box-shadow: 0 0 12px rgba(var(--color-primary-rgb), 0.2);
}

/* ===== Blue Theme ===== */
[data-theme='blue'] .notifications-page .stat-pill--unread {
  color: #ef4444;
}

[data-theme='blue'] .notifications-page .filter-chip--active {
  background: #3b82f6;
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
}

[data-theme='blue'] .notifications-page .filter-chip:hover:not(.filter-chip--active) {
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.2);
  background: rgba(59, 130, 246, 0.04);
}

/* ===== Material + Dark ===== */
#app[data-ui-style='material'][data-theme='dark'] .notifications-page .notif-stats {
  background: var(--md-surface-container, rgba(28, 28, 32, 0.92));
  border-color: rgba(255, 255, 255, 0.06);
}

#app[data-ui-style='material'][data-theme='dark'] .notifications-page .page-body {
  background: var(--md-surface-container, rgba(28, 28, 32, 0.92));
  border-color: rgba(255, 255, 255, 0.06);
}

#app[data-ui-style='material'][data-theme='dark'] .notifications-page .filter-chip {
  background: var(--md-surface-container-high, rgba(40, 40, 48, 1));
  border-color: rgba(255, 255, 255, 0.06);
}

/* ===== Material + Blue ===== */
#app[data-ui-style='material'][data-theme='blue'] .notifications-page .notif-stats {
  background: #ffffff;
  border-color: rgba(59, 130, 246, 0.08);
}

#app[data-ui-style='material'][data-theme='blue'] .notifications-page .page-body {
  background: #ffffff;
  border-color: rgba(59, 130, 246, 0.08);
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.06);
}
</style>
