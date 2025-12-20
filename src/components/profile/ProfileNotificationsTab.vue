<template>
  <div class="notifications-tab">
    <div class="tab-header">
      <h2 class="tab-title">{{ $t('profile.tabs.notifications') }}</h2>
      <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
      <Button v-if="notifications.length > 0" variant="ghost" size="sm" @click="markAllAsRead">
        <CheckCheck :size="16" />
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
        <div class="skeleton" style="height: 40px; width: 40px; border-radius: 50%" />
        <div style="flex: 1">
          <div class="skeleton" style="height: 16px; width: 70%; margin-bottom: 8px" />
          <div class="skeleton" style="height: 14px; width: 50%" />
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
            <component :is="getNotificationIcon(notif.type)" :size="20" />
          </div>
          <div class="notification-content">
            <p class="notification-text">{{ notif.message }}</p>
            <span class="notification-time">{{ formatDate(notif.created_at) }}</span>
          </div>
          <button
            v-if="!notif.is_read"
            type="button"
            class="mark-read-btn"
            :title="$t('profile.markAsRead')"
            @click.stop="markAsRead(notif.id)"
          >
            <Check :size="16" />
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Bell, Heart, MessageCircle, UserPlus, AlertCircle, Check, CheckCheck } from 'lucide-vue-next'
import { useToastStore } from '@/stores'
import { apiClient, ApiError } from '@/api'
import Button from '@/components/ui/Button.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'

type NotificationType = 'like' | 'comment' | 'reply' | 'follow' | 'system'

interface Notification {
  id: string
  type: NotificationType
  message: string
  is_read: boolean
  link?: string | null
  created_at: string
}

const router = useRouter()
const { t } = useI18n()
const toastStore = useToastStore()

const notifications = ref<Notification[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const total = ref(0)
const pageSize = 20

const hasMore = computed(() => notifications.value.length < total.value)
const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length)

function getNotificationIcon(type: NotificationType) {
  const icons = {
    like: Heart,
    comment: MessageCircle,
    reply: MessageCircle,
    follow: UserPlus,
    system: AlertCircle,
  }
  return icons[type] || Bell
}

async function fetchNotifications(reset = true) {
  if (reset) {
    if (isLoading.value) return
    isLoading.value = true
    page.value = 1
  } else {
    if (isLoadingMore.value) return
    isLoadingMore.value = true
  }

  error.value = null

  try {
    const res = await apiClient.get<{ items: Notification[]; total: number }>(
      `/users/me/notifications?page=${page.value}&page_size=${pageSize}`
    )

    if (reset) {
      notifications.value = res.items
    } else {
      notifications.value.push(...res.items)
    }
    total.value = res.total
  } catch (err) {
    if (notifications.value.length === 0) {
      if (err instanceof ApiError) {
        error.value = err.message
      } else {
        error.value = t('common.error')
      }
    }
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || isLoading.value || isLoadingMore.value) return

  page.value++
  await fetchNotifications(false)
}

async function markAsRead(notificationId: string) {
  try {
    await apiClient.put(`/notifications/${notificationId}/read`)
    const notif = notifications.value.find(n => n.id === notificationId)
    if (notif) {
      notif.is_read = true
    }
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    }
  }
}

async function markAllAsRead() {
  try {
    await apiClient.put('/notifications/read-all')
    notifications.value.forEach(n => {
      n.is_read = true
    })
    toastStore.success(t('profile.allMarkedRead'))
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  }
}

function handleNotificationClick(notif: Notification) {
  if (!notif.is_read) {
    markAsRead(notif.id)
  }

  if (notif.link) {
    router.push(notif.link)
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return t('common.justNow')
  if (diffMins < 60) return t('common.minutesAgo', { n: diffMins })
  if (diffHours < 24) return t('common.hoursAgo', { n: diffHours })
  if (diffDays < 7) return t('common.daysAgo', { n: diffDays })

  return date.toLocaleDateString()
}

onMounted(() => {
  fetchNotifications()
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
  padding: 4px 12px;
  background: var(--color-danger);
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
  width: 4px;
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
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.notification-icon.type-like {
  background: rgba(244, 63, 94, 0.1);
  color: var(--color-danger);
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
  width: 32px;
  height: 32px;
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mark-read-btn:hover {
  background: var(--color-primary);
  color: var(--color-white);
  border-color: var(--color-primary);
}

@media (max-width: 768px) {
  .notification-icon {
    width: 36px;
    height: 36px;
  }

  .notification-text {
    font-size: var(--text-xs);
  }
}
</style>
