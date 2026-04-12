import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  getInbox: vi.fn(),
  getInboxSummary: vi.fn(),
  getInboxPreferences: vi.fn(),
  patchInboxPreferences: vi.fn(),
  markInboxRead: vi.fn(),
  markAllInboxRead: vi.fn(),
  archiveInboxMessage: vi.fn(),
  archiveReadInboxMessages: vi.fn(),
  openInboxStreamResponse: vi.fn(),
  consumeInboxStream: vi.fn(),
}))

vi.mock('@/api/inboxService', () => ({
  inboxService: {
    getInbox: apiMocks.getInbox,
    getInboxSummary: apiMocks.getInboxSummary,
    getInboxPreferences: apiMocks.getInboxPreferences,
    patchInboxPreferences: apiMocks.patchInboxPreferences,
    markInboxRead: apiMocks.markInboxRead,
    markAllInboxRead: apiMocks.markAllInboxRead,
    archiveInboxMessage: apiMocks.archiveInboxMessage,
    archiveReadInboxMessages: apiMocks.archiveReadInboxMessages,
    openInboxStreamResponse: apiMocks.openInboxStreamResponse,
  },
  consumeInboxStream: apiMocks.consumeInboxStream,
}))

import { inboxService } from '@/api/inboxService'
import { useNotificationsStore } from '../notifications'

function createMessage(
  id: string,
  overrides: Partial<{
    category: 'interaction' | 'security' | 'system'
    event_type: string
    priority: 'low' | 'normal' | 'high' | 'critical'
    title: string
    body: string | null
    aggregate_count: number
    is_read: boolean
    read_at: string | null
    archived_at: string | null
    last_event_at: string
  }> = {}
) {
  return {
    id,
    category: 'interaction' as const,
    event_type: 'comment.like',
    priority: 'normal' as const,
    title: `notification-${id}`,
    body: `body-${id}`,
    aggregate_count: 1,
    is_read: false,
    read_at: null,
    archived_at: null,
    first_event_at: '2026-03-30T00:00:00Z',
    last_event_at: '2026-03-30T00:00:00Z',
    created_at: '2026-03-30T00:00:00Z',
    updated_at: '2026-03-30T00:00:00Z',
    last_actor: {
      id: `actor-${id}`,
      username: `user-${id}`,
      avatar_url: null,
    },
    ...overrides,
  }
}

function createSummary(
  overrides?: Partial<{
    total: number
    interaction: number
    security: number
    system: number
    capped: boolean
  }>
) {
  const total = overrides?.total ?? 3
  const capped = overrides?.capped ?? false

  return {
    total: { count: total, is_capped: capped },
    categories: {
      interaction: { count: overrides?.interaction ?? total, is_capped: capped },
      security: { count: overrides?.security ?? 0, is_capped: false },
      system: { count: overrides?.system ?? 0, is_capped: false },
    },
  }
}

describe('useNotificationsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    vi.mocked(inboxService.getInbox).mockResolvedValue({
      items: [],
      next_cursor: null,
      has_more: false,
    })
    vi.mocked(inboxService.getInboxSummary).mockResolvedValue(
      createSummary({ total: 0, interaction: 0 })
    )
    vi.mocked(inboxService.getInboxPreferences).mockResolvedValue({
      items: [
        { category: 'interaction', inbox_enabled: true, email_enabled: false },
        { category: 'security', inbox_enabled: true, email_enabled: true },
        { category: 'system', inbox_enabled: true, email_enabled: true },
      ],
    })
    vi.mocked(inboxService.patchInboxPreferences).mockResolvedValue({
      items: [],
    })
    vi.mocked(inboxService.markInboxRead).mockResolvedValue(
      createMessage('read-1', { is_read: true })
    )
    vi.mocked(inboxService.markAllInboxRead).mockResolvedValue({ success: true, count: 0 })
    vi.mocked(inboxService.archiveInboxMessage).mockResolvedValue(
      createMessage('archived-1', { archived_at: '2026-03-31T00:00:00Z' })
    )
    vi.mocked(inboxService.archiveReadInboxMessages).mockResolvedValue({ success: true, count: 0 })
    vi.mocked(inboxService.openInboxStreamResponse).mockResolvedValue(new Response('ok'))
    vi.mocked(apiMocks.consumeInboxStream).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses cursor pagination, deduplicates by id, and reorders by last_event_at', async () => {
    vi.mocked(inboxService.getInbox)
      .mockResolvedValueOnce({
        items: [
          createMessage('1', { last_event_at: '2026-03-30T00:00:00Z' }),
          createMessage('2', { last_event_at: '2026-03-30T02:00:00Z' }),
        ],
        next_cursor: 'cursor-2',
        has_more: true,
      })
      .mockResolvedValueOnce({
        items: [
          createMessage('1', {
            aggregate_count: 3,
            last_event_at: '2026-03-30T03:00:00Z',
          }),
          createMessage('3', { last_event_at: '2026-03-30T02:30:00Z' }),
        ],
        next_cursor: null,
        has_more: false,
      })

    const store = useNotificationsStore()

    await store.fetchNotifications(true)
    await store.loadMore()

    expect(store.items.map((item) => item.id)).toEqual(['1', '3', '2'])
    expect(store.items[0]?.aggregate_count).toBe(3)
    expect(store.nextCursor).toBeNull()
    expect(store.hasMore).toBe(false)
  })

  it('normalizes preference payloads before saving', async () => {
    const store = useNotificationsStore()

    vi.mocked(inboxService.getInboxPreferences)
      .mockResolvedValueOnce({
        items: [
          { category: 'interaction', inbox_enabled: true, email_enabled: true },
          { category: 'security', inbox_enabled: true, email_enabled: true },
          { category: 'system', inbox_enabled: true, email_enabled: true },
        ],
      })
      .mockResolvedValueOnce({
        items: [
          { category: 'interaction', inbox_enabled: true, email_enabled: true },
          { category: 'security', inbox_enabled: false, email_enabled: false },
          { category: 'system', inbox_enabled: true, email_enabled: true },
        ],
      })

    await store.savePreferences('interaction', {
      email_enabled: true,
    })

    expect(inboxService.patchInboxPreferences).toHaveBeenNthCalledWith(
      1,
      {
        interaction: {
          inbox_enabled: true,
          email_enabled: true,
        },
      },
      expect.objectContaining({ skipErrorToast: true })
    )

    await store.savePreferences('security', {
      inbox_enabled: false,
    })

    expect(inboxService.patchInboxPreferences).toHaveBeenNthCalledWith(
      2,
      {
        security: {
          inbox_enabled: false,
          email_enabled: false,
        },
      },
      expect.objectContaining({ skipErrorToast: true })
    )
  })

  it('applies stream message updates by id and refreshes summary from snapshot events', async () => {
    vi.useFakeTimers()
    vi.mocked(inboxService.getInbox).mockResolvedValueOnce({
      items: [createMessage('1', { last_event_at: '2026-03-30T01:00:00Z' })],
      next_cursor: null,
      has_more: false,
    })
    vi.mocked(inboxService.getInboxSummary).mockResolvedValueOnce(
      createSummary({ total: 1, interaction: 1 })
    )
    vi.mocked(apiMocks.consumeInboxStream).mockImplementationOnce(
      async (_response, { onEvent }) => {
        await onEvent({
          event: 'message.updated',
          data: createMessage('1', {
            aggregate_count: 4,
            last_event_at: '2026-03-30T05:00:00Z',
          }),
        })
        await onEvent({
          event: 'summary.updated',
          data: createSummary({ total: 4, interaction: 4 }),
        })
      }
    )

    const store = useNotificationsStore()

    await store.initialize()
    await flushPromises()

    expect(store.items[0]?.id).toBe('1')
    expect(store.items[0]?.aggregate_count).toBe(4)
    expect(store.unreadCount).toBe(4)

    store.stopStream()
  })

  it('re-fetches list and summary before reconnecting the stream after a failure', async () => {
    vi.useFakeTimers()
    vi.mocked(inboxService.getInbox)
      .mockResolvedValueOnce({
        items: [createMessage('1')],
        next_cursor: null,
        has_more: false,
      })
      .mockResolvedValueOnce({
        items: [createMessage('2')],
        next_cursor: null,
        has_more: false,
      })
    vi.mocked(inboxService.getInboxSummary)
      .mockResolvedValueOnce(createSummary({ total: 1, interaction: 1 }))
      .mockResolvedValueOnce(createSummary({ total: 2, interaction: 2 }))
    vi.mocked(apiMocks.consumeInboxStream)
      .mockRejectedValueOnce(new Error('stream failed'))
      .mockImplementationOnce(() => new Promise(() => {}))

    const store = useNotificationsStore()

    await store.initialize()
    await flushPromises()

    expect(store.streamState).toBe('reconnecting')

    await vi.advanceTimersByTimeAsync(1_000)
    await flushPromises()

    expect(inboxService.getInbox).toHaveBeenCalledTimes(2)
    expect(inboxService.getInboxSummary).toHaveBeenCalledTimes(2)
    expect(inboxService.openInboxStreamResponse).toHaveBeenCalledTimes(2)

    store.stopStream()
  })
})
