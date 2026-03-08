/**
 * Notifications Store - 通知状态管理
 *
 * 集中管理通知列表、未读计数、轮询刷新
 */

import { ref, computed, shallowRef, triggerRef } from 'vue'
import { defineStore } from 'pinia'
import {
  notificationService,
  type Notification,
  type NotificationType,
} from '@/api/notificationService'

const POLL_INTERVAL = 60_000 // 60s

export const useNotificationsStore = defineStore('notifications', () => {
  const pageSize = 20
  const items = shallowRef<Notification[]>([])
  const total = ref(0)
  const totalPages = ref(0)
  const unreadCount = ref(0)
  const page = ref(1)
  const hasMoreFallback = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const filterType = ref<NotificationType | undefined>(undefined)
  const unreadOnly = ref(false)

  let pollTimer: ReturnType<typeof setInterval> | null = null
  let fetchNotificationsController: AbortController | null = null
  let fetchNotificationsToken = 0
  let refreshUnreadController: AbortController | null = null
  let refreshUnreadToken = 0

  function touchItems() {
    triggerRef(items)
  }

  const hasUnread = computed(() => unreadCount.value > 0)
  const hasMore = computed(() => {
    if (totalPages.value > 0) {
      return page.value < totalPages.value
    }
    if (typeof total.value === 'number' && total.value > 0) {
      return items.value.length < total.value
    }
    return hasMoreFallback.value
  })

  function abortFetchNotifications() {
    fetchNotificationsController?.abort()
    fetchNotificationsController = null
  }

  function abortRefreshUnreadCount() {
    refreshUnreadController?.abort()
    refreshUnreadController = null
  }

  async function fetchNotifications(reset = false): Promise<boolean> {
    if (reset) {
      abortFetchNotifications()
    } else if (isLoading.value) {
      return false
    }

    const controller = new AbortController()
    fetchNotificationsController = controller
    const requestToken = ++fetchNotificationsToken
    isLoading.value = true
    error.value = null

    try {
      if (reset) page.value = 1

      const res = await notificationService.getNotifications(
        page.value,
        pageSize,
        {
          type: filterType.value,
          unreadOnly: unreadOnly.value,
        },
        {
          signal: controller.signal,
          skipErrorToast: true,
        }
      )
      if (controller.signal.aborted || requestToken !== fetchNotificationsToken) return false

      if (reset) {
        items.value = res.items
      } else {
        const existingIds = new Set(items.value.map((n) => n.id))
        const newItems = res.items.filter((n) => !existingIds.has(n.id))
        items.value = [...items.value, ...newItems]
      }

      total.value = res.total
      totalPages.value = res.total_pages ?? 0
      unreadCount.value = res.unread_count
      hasMoreFallback.value = Boolean(res.has_more)
      return true
    } catch {
      if (controller.signal.aborted || requestToken !== fetchNotificationsToken) return false
      error.value = 'notification.error.fetchFailed'
      return false
    } finally {
      if (requestToken === fetchNotificationsToken) {
        isLoading.value = false
        if (fetchNotificationsController === controller) {
          fetchNotificationsController = null
        }
      }
    }
  }

  async function loadMore(): Promise<boolean> {
    if (!hasMore.value || isLoading.value) return false
    const nextPage = page.value + 1
    page.value = nextPage
    const ok = await fetchNotifications()
    if (!ok) {
      page.value = nextPage - 1
    }
    return ok
  }

  async function refreshUnreadCount(force = false): Promise<boolean> {
    if (refreshUnreadController && !force) {
      return false
    }
    if (force) {
      abortRefreshUnreadCount()
    }
    const controller = new AbortController()
    refreshUnreadController = controller
    const requestToken = ++refreshUnreadToken

    try {
      const res = await notificationService.getUnreadCount({
        signal: controller.signal,
        skipErrorToast: true,
      })
      if (controller.signal.aborted || requestToken !== refreshUnreadToken) return false
      unreadCount.value = res.unread_count
      return true
    } catch {
      if (controller.signal.aborted || requestToken !== refreshUnreadToken) return false
      return false
    } finally {
      if (requestToken === refreshUnreadToken && refreshUnreadController === controller) {
        refreshUnreadController = null
      }
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      await notificationService.markAsRead(notificationId, { skipErrorToast: true })
      const item = items.value.find((n) => n.id === notificationId)
      if (item && !item.is_read) {
        item.is_read = true
        item.read_at = new Date().toISOString()
        unreadCount.value = Math.max(0, unreadCount.value - 1)
        touchItems()
      }
    } catch {
      // silent
    }
  }

  async function markAllAsRead(type?: NotificationType) {
    try {
      await notificationService.markAllAsRead(type, { skipErrorToast: true })
      items.value.forEach((n) => {
        if (!type || n.type === type) {
          n.is_read = true
          n.read_at = n.read_at || new Date().toISOString()
        }
      })
      touchItems()
      if (!type) {
        unreadCount.value = 0
      } else {
        await refreshUnreadCount(true)
      }
    } catch {
      // silent
    }
  }

  async function deleteNotification(notificationId: string) {
    try {
      await notificationService.deleteNotification(notificationId, { skipErrorToast: true })
      const idx = items.value.findIndex((n) => n.id === notificationId)
      if (idx !== -1) {
        const removed = items.value[idx]
        items.value.splice(idx, 1)
        touchItems()
        total.value = Math.max(0, total.value - 1)
        totalPages.value = 0
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
      await notificationService.clearNotifications(readOnly, { skipErrorToast: true })
      if (readOnly) {
        items.value = items.value.filter((n) => !n.is_read)
        total.value = items.value.length
        totalPages.value = 0
        await refreshUnreadCount(true)
      } else {
        items.value = []
        total.value = 0
        totalPages.value = 0
        unreadCount.value = 0
      }
    } catch {
      // silent
    }
  }

  function setFilter(type?: NotificationType, onlyUnread = false) {
    filterType.value = type
    unreadOnly.value = onlyUnread
    void fetchNotifications(true)
  }

  function startPolling() {
    stopPolling()
    void refreshUnreadCount()
    pollTimer = setInterval(() => {
      void refreshUnreadCount()
    }, POLL_INTERVAL)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function $reset() {
    abortFetchNotifications()
    abortRefreshUnreadCount()
    stopPolling()
    items.value = []
    total.value = 0
    totalPages.value = 0
    unreadCount.value = 0
    page.value = 1
    hasMoreFallback.value = false
    isLoading.value = false
    error.value = null
    filterType.value = undefined
    unreadOnly.value = false
  }

  return {
    items,
    total,
    totalPages,
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
