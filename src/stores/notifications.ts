/**
 * Notifications Store - 通知状态管理
 *
 * 集中管理通知列表、未读计数、轮询刷新
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  notificationService,
  type Notification,
  type NotificationType,
} from '@/api/notificationService'

const POLL_INTERVAL = 60_000 // 60s

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<Notification[]>([])
  const total = ref(0)
  const unreadCount = ref(0)
  const page = ref(1)
  const hasMore = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const filterType = ref<NotificationType | undefined>(undefined)
  const unreadOnly = ref(false)

  let pollTimer: ReturnType<typeof setInterval> | null = null

  const hasUnread = computed(() => unreadCount.value > 0)

  async function fetchNotifications(reset = false) {
    if (isLoading.value) return
    isLoading.value = true
    error.value = null

    try {
      if (reset) page.value = 1

      const res = await notificationService.getNotifications(page.value, 20, {
        type: filterType.value,
        unreadOnly: unreadOnly.value,
      })

      if (reset) {
        items.value = res.items
      } else {
        const existingIds = new Set(items.value.map((n) => n.id))
        const newItems = res.items.filter((n) => !existingIds.has(n.id))
        items.value = [...items.value, ...newItems]
      }

      total.value = res.total
      unreadCount.value = res.unread_count
      hasMore.value = res.has_more
    } catch {
      error.value = 'notification.error.fetchFailed'
    } finally {
      isLoading.value = false
    }
  }

  async function loadMore() {
    if (!hasMore.value || isLoading.value) return
    page.value++
    await fetchNotifications()
  }

  async function refreshUnreadCount() {
    try {
      const res = await notificationService.getUnreadCount()
      unreadCount.value = res.unread_count
    } catch {
      // silent
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      await notificationService.markAsRead(notificationId)
      const item = items.value.find((n) => n.id === notificationId)
      if (item && !item.is_read) {
        item.is_read = true
        item.read_at = new Date().toISOString()
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch {
      // silent
    }
  }

  async function markAllAsRead(type?: NotificationType) {
    try {
      await notificationService.markAllAsRead(type)
      items.value.forEach((n) => {
        if (!type || n.type === type) {
          n.is_read = true
          n.read_at = n.read_at || new Date().toISOString()
        }
      })
      if (!type) {
        unreadCount.value = 0
      } else {
        await refreshUnreadCount()
      }
    } catch {
      // silent
    }
  }

  async function deleteNotification(notificationId: string) {
    try {
      await notificationService.deleteNotification(notificationId)
      const idx = items.value.findIndex((n) => n.id === notificationId)
      if (idx !== -1) {
        const removed = items.value[idx]
        items.value.splice(idx, 1)
        total.value = Math.max(0, total.value - 1)
        if (removed && !removed.is_read) {
          unreadCount.value = Math.max(0, unreadCount.value - 1)
        }
      }
    } catch {
      // silent
    }
  }

  async function clearNotifications(readOnly = true) {
    try {
      await notificationService.clearNotifications(readOnly)
      if (readOnly) {
        items.value = items.value.filter((n) => !n.is_read)
        total.value = items.value.length
      } else {
        items.value = []
        total.value = 0
        unreadCount.value = 0
      }
    } catch {
      // silent
    }
  }

  function setFilter(type?: NotificationType, onlyUnread = false) {
    filterType.value = type
    unreadOnly.value = onlyUnread
    fetchNotifications(true)
  }

  function startPolling() {
    stopPolling()
    pollTimer = setInterval(refreshUnreadCount, POLL_INTERVAL)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function $reset() {
    stopPolling()
    items.value = []
    total.value = 0
    unreadCount.value = 0
    page.value = 1
    hasMore.value = false
    error.value = null
    filterType.value = undefined
    unreadOnly.value = false
  }

  return {
    items,
    total,
    unreadCount,
    hasMore,
    isLoading,
    error,
    filterType,
    unreadOnly,
    hasUnread,
    fetchNotifications,
    loadMore,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
    setFilter,
    startPolling,
    stopPolling,
    $reset,
  }
})
