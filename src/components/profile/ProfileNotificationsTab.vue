<template>
  <div class="notifications-tab">
    <div class="tab-header">
      <h2 class="tab-title">{{ $t('profile.tabs.notifications') }}</h2>
      <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
      <Button v-if="notifications.length > 0" variant="ghost" size="sm" @click="markAllAsRead">
        <AnimatedIcon name="sparkle" :fallback-icon="CheckCheck" size="sm" />
        {{ $t('profile.markAllRead') }}
      </Button>
    </div>

    <StateIndicator
      v-if="error"
      variant="error"
      :description="error"
      @action="fetchNotifications"
    />

    <div v-else-if="isLoading && notifications.length === 0" class="notifications-skeleton">
      <div v-for="i in 5" :key="i" class="notification-skeleton glass-card">
        <Skeleton variant="avatar" />
        <div style="flex: 1">
          <Skeleton width="70%" height="1rem" />
          <Skeleton width="50%" height="0.875rem" />
        </div>
      </div>
    </div>

    <template v-else>
      <StateIndicator
        v-if="notifications.length === 0"
        variant="empty"
        :description="$t('profile.noNotifications')"
      />

      <div v-else class="notifications-list">
        <article
          v-for="notif in notifications"
          :key="notif.id"
          class="notification-item glass-card"
          :class="{ unread: !notif.is_read }"
          @click="handleNotificationClick(notif)"
        >
          <div class="notification-icon" :class="`type-${notif.type}`">
            <AnimatedIcon
              :name="getNotificationAnimation(notif.type)"
              :fallback-icon="getNotificationIcon(notif.type)"
              size="md"
            />
          </div>
          <div class="notification-content">
            <p class="notification-text">{{ notif.title || notif.content }}</p>
            <span class="notification-time">{{ formatDate(notif.created_at) }}</span>
          </div>
          <button
            v-if="!notif.is_read"
            type="button"
            class="mark-read-btn"
            :title="$t('profile.markAsRead')"
            @click.stop="markAsRead(notif.id)"
          >
            <AnimatedIcon name="sparkle" :fallback-icon="Check" size="sm" />
          </button>
        </article>
      </div>

      <LoadMoreSection
        v-if="hasMore"
        :count="notifications.length"
        :total="total"
        :has-more="hasMore"
        :loading="isLoadingMore"
        @load-more="loadMore"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  AlertCircle,
  Check,
  CheckCheck,
} from 'lucide-vue-next'
import { useNotificationsStore, useToastStore } from '@/stores'
import { formatRelativeTime } from '@/utils/date'
import Button from '@/components/ui/Button.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

const { t } = useI18n()
const toastStore = useToastStore()
const notifStore = useNotificationsStore()

const notifications = computed(() => notifStore.items)
const isLoading = computed(() => notifStore.isLoading)
const error = computed(() => (notifStore.error ? t(notifStore.error) : null))
const total = computed(() => notifStore.total)
const hasMore = computed(() => notifStore.hasMore)
const unreadCount = computed(() => notifStore.unreadCount)
const isLoadingMore = computed(() => notifStore.isLoading && notifStore.items.length > 0)

function getNotificationIcon(type: string) {
  const icons: Record<string, typeof Bell> = {
    comment_reply: MessageCircle,
    comment_like: Heart,
    comment_mention: MessageCircle,
    follow: UserPlus,
    system: AlertCircle,
    report_resolved: AlertCircle,
    like: Heart,
    comment: MessageCircle,
    reply: MessageCircle,
  }
  return icons[type] || Bell
}

function getNotificationAnimation(type: string) {
  const animations: Record<string, string> = {
    comment_reply: 'sparkle',
    comment_like: 'heart',
    comment_mention: 'sparkle',
    follow: 'user',
    system: 'explore',
    report_resolved: 'explore',
    like: 'heart',
    comment: 'sparkle',
    reply: 'sparkle',
  }
  return animations[type] || 'sparkle'
}

async function fetchNotifications() {
  await notifStore.fetchNotifications(true)
}

async function loadMore() {
  await notifStore.loadMore()
}

async function markAsRead(notificationId: string) {
  await notifStore.markAsRead(notificationId)
}

async function markAllAsRead() {
  await notifStore.markAllAsRead()
  toastStore.success(t('profile.allMarkedRead'))
}

function handleNotificationClick(notif: {
  id: string
  is_read: boolean
  related_id?: number | null
  related_type?: string | null
}) {
  if (!notif.is_read) {
    markAsRead(notif.id)
  }
}

function formatDate(dateStr: string): string {
  return formatRelativeTime(dateStr, t)
}

onMounted(() => {
  notifStore.fetchNotifications(true)
  notifStore.startPolling()
})

onUnmounted(() => {
  notifStore.stopPolling()
})
</script>

<style scoped>
.notifications-tab {
  min-height: 20rem;
}

.tab-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: clamp(1.25rem, 3vw, 2rem);
}

.tab-title {
  font-size: clamp(var(--text-lg), 2.5vw, var(--text-xl));
  font-weight: var(--font-bold);
  margin: 0;
  flex: 1;
}

.unread-badge {
  padding: 0.125rem 0.5rem;
  background: var(--color-error);
  color: var(--color-white);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  min-width: 1.25rem;
  text-align: center;
  animation: pulse-badge 2s var(--ease-smooth) infinite;
}

@keyframes pulse-badge {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0);
  }
}

/* Skeleton */
.notifications-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.notification-skeleton {
  display: flex;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-light);
}

/* List */
.notifications-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: clamp(0.625rem, 2vw, 0.875rem);
  padding: clamp(0.75rem, 2vw, 1rem);
  cursor: pointer;
  position: relative;
  border-radius: var(--radius-lg);
  border: 1px solid transparent;
  transition:
    transform var(--duration-fast) var(--ease-out-smooth),
    background var(--duration-fast) var(--ease-smooth),
    border-color var(--duration-fast) var(--ease-smooth),
    box-shadow var(--duration-fast) var(--ease-smooth);
}

.notification-item:hover {
  transform: translateX(0.25rem);
  background: var(--glass-bg-light);
  border-color: var(--glass-border-subtle);
  box-shadow: var(--glass-shadow-sm);
}

.notification-item.unread {
  background: var(--glass-bg-light);
  border-color: rgba(var(--color-primary-rgb), 0.12);
}

.notification-item.unread::after {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 50%;
  background: var(--color-primary);
  border-radius: 0 2px 2px 0;
}

/* Icon */
.notification-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-lg);
  flex-shrink: 0;
  transition: transform var(--duration-fast) var(--ease-bounce-soft);
}

.notification-item:hover .notification-icon {
  transform: scale(1.08);
}

.notification-icon.type-like,
.notification-icon.type-comment_like {
  background: rgba(244, 63, 94, 0.1);
  color: var(--color-error);
}

.notification-icon.type-comment,
.notification-icon.type-reply,
.notification-icon.type-comment_reply,
.notification-icon.type-comment_mention {
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}

.notification-icon.type-follow {
  background: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
}

.notification-icon.type-system,
.notification-icon.type-report_resolved {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

/* Content */
.notification-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.notification-text {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--color-text-primary);
}

.unread .notification-text {
  font-weight: var(--font-medium);
}

.notification-time {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* Mark Read Button */
.mark-read-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  background: transparent;
  color: var(--color-text-tertiary);
  border: 1px solid var(--glass-border-medium);
  border-radius: var(--radius-full);
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0;
  transition:
    opacity var(--duration-fast) var(--ease-smooth),
    background var(--duration-fast) var(--ease-smooth),
    color var(--duration-fast) var(--ease-smooth),
    border-color var(--duration-fast) var(--ease-smooth),
    transform var(--duration-fast) var(--ease-bounce-soft);
}

.notification-item:hover .mark-read-btn {
  opacity: 1;
}

.mark-read-btn:hover {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-color: var(--color-primary);
  transform: scale(1.1);
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .tab-header {
    flex-wrap: wrap;
  }

  .notification-item {
    gap: var(--spacing-2);
  }

  .notification-icon {
    width: 2rem;
    height: 2rem;
  }

  .notification-text {
    font-size: var(--text-xs);
  }

  .mark-read-btn {
    opacity: 1;
  }
}
</style>

<style>
/* ===== Material 3 Overrides ===== */
#app[data-ui-style='material'] .notifications-tab .notification-item {
  border-radius: 8px;
}

#app[data-ui-style='material'] .notifications-tab .notification-item:hover {
  transform: none;
  background: rgba(var(--color-primary-rgb), 0.06);
}

#app[data-ui-style='material'] .notifications-tab .notification-item.unread::after {
  border-radius: 0;
  width: 3px;
}

#app[data-ui-style='material'] .notifications-tab .notification-icon {
  border-radius: 8px;
}

#app[data-ui-style='material'] .notifications-tab .mark-read-btn {
  border-radius: 50%;
}

#app[data-ui-style='material'] .notifications-tab .unread-badge {
  border-radius: 4px;
}

#app[data-ui-style='material'] .notifications-tab .notification-skeleton {
  border-radius: 8px;
}

/* ===== Dark Theme ===== */
[data-theme='dark'] .notifications-tab .notification-item.unread {
  background: rgba(var(--color-primary-rgb), 0.06);
  border-color: rgba(var(--color-primary-rgb), 0.15);
}

[data-theme='dark'] .notifications-tab .notification-item:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}

[data-theme='dark'] .notifications-tab .notification-icon.type-system,
[data-theme='dark'] .notifications-tab .notification-icon.type-report_resolved {
  background: rgba(245, 158, 11, 0.15);
}

/* ===== Blue Theme ===== */
[data-theme='blue'] .notifications-tab .notification-item.unread {
  background: rgba(59, 130, 246, 0.04);
  border-color: rgba(59, 130, 246, 0.12);
}

[data-theme='blue'] .notifications-tab .notification-item.unread::after {
  background: #3b82f6;
}

[data-theme='blue'] .notifications-tab .notification-icon.type-comment,
[data-theme='blue'] .notifications-tab .notification-icon.type-reply,
[data-theme='blue'] .notifications-tab .notification-icon.type-comment_reply,
[data-theme='blue'] .notifications-tab .notification-icon.type-comment_mention {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

[data-theme='blue'] .notifications-tab .unread-badge {
  background: #3b82f6;
}

/* ===== Material + Dark ===== */
#app[data-ui-style='material'][data-theme='dark'] .notifications-tab .notification-item {
  border-color: transparent;
}

#app[data-ui-style='material'][data-theme='dark'] .notifications-tab .notification-item.unread {
  background: rgba(var(--color-primary-rgb), 0.08);
  border-color: rgba(var(--color-primary-rgb), 0.12);
}

/* ===== Material + Blue ===== */
#app[data-ui-style='material'][data-theme='blue'] .notifications-tab .notification-item.unread {
  background: rgba(59, 130, 246, 0.05);
  border-color: rgba(59, 130, 246, 0.1);
}
</style>
