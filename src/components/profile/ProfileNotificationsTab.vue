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
          <Skeleton width="70%" height="16px" />
          <Skeleton width="50%" height="14px" />
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
  min-height: 400px;
}

.tab-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-6);
}

.tab-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin: 0;
  flex: 1;
}

.unread-badge {
  padding: 0.25rem 0.75rem;
  background: var(--color-error);
  color: var(--color-white);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.notifications-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.notification-skeleton {
  display: flex;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.notification-item.unread {
  background: var(--glass-bg-light);
}

.notification-item.unread::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 0.25rem;
  height: 60%;
  background: var(--color-primary);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.notification-item:hover {
  transform: translateX(4px);
}

.notification-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.notification-icon.type-like {
  background: rgba(244, 63, 94, 0.1);
  color: var(--color-error);
}

.notification-icon.type-comment,
.notification-icon.type-reply {
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-primary);
}

.notification-icon.type-follow {
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
}

.notification-icon.type-system {
  background: rgba(251, 191, 36, 0.1);
  color: #f59e0b;
}

.notification-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.notification-text {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--color-text);
}

.notification-time {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.mark-read-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mark-read-btn:hover {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-color: var(--color-primary);
}

@media (max-width: 768px) {
  .tab-header {
    margin-bottom: var(--spacing-4);
    flex-wrap: wrap;
  }

  .tab-title {
    font-size: var(--text-lg);
  }

  .notification-item {
    padding: var(--spacing-3);
    gap: var(--spacing-2);
  }

  .notification-icon {
    width: 2rem;
    height: 2rem;
  }

  .notification-text {
    font-size: var(--text-xs);
  }

  .notifications-list {
    gap: var(--spacing-2);
  }
}
</style>
