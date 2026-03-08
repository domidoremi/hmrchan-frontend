import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/notificationService', () => {
  const getNotifications = vi.fn()
  const getUnreadCount = vi.fn()
  const markAsRead = vi.fn()
  const markAllAsRead = vi.fn()
  const deleteNotification = vi.fn()
  const clearNotifications = vi.fn()

  return {
    notificationService: {
      getNotifications,
      getUnreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearNotifications,
    },
  }
})

import { notificationService } from '@/api/notificationService'
import { useNotificationsStore } from '../notifications'

const createNotification = (id: string) => ({
  id,
  type: 'system' as const,
  title: `notification-${id}`,
  content: null,
  is_read: false,
  created_at: '2026-03-09T00:00:00Z',
})

describe('Notifications Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('prefers pagination fields over top-level has_more', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValueOnce({
      items: [createNotification('1')],
      total: 30,
      unread_count: 3,
      page: 1,
      page_size: 20,
      total_pages: 2,
      has_more: false,
    })

    const store = useNotificationsStore()
    const ok = await store.fetchNotifications(true)

    expect(ok).toBe(true)
    expect(store.totalPages).toBe(2)
    expect(store.hasMore).toBe(true)
  })

  it('falls back to total count when total_pages is absent', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValueOnce({
      items: [createNotification('1')],
      total: 2,
      unread_count: 1,
      page: 1,
      page_size: 20,
    })

    const store = useNotificationsStore()
    const ok = await store.fetchNotifications(true)

    expect(ok).toBe(true)
    expect(store.totalPages).toBe(0)
    expect(store.hasMore).toBe(true)
  })
})
