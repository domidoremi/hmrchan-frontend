import { describe, expect, it, vi, beforeEach } from 'vitest'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
  response: vi.fn(),
}))

vi.mock('../client', () => ({
  apiClient: {
    get: clientMocks.get,
    patch: clientMocks.patch,
    post: clientMocks.post,
    response: clientMocks.response,
  },
}))

import { consumeInboxStream, inboxService, splitInboxSseFrames } from '../inboxService'

describe('inboxService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds cursor-based inbox queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    await inboxService.getInbox({
      limit: 80,
      cursor: 'cursor-1',
      category: 'security',
      status: 'archived',
    })

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/inbox?limit=50&status=archived&cursor=cursor-1&category=security',
      undefined
    )
  })

  it('sends the documented preferences patch payload', async () => {
    vi.mocked(clientMocks.patch).mockResolvedValueOnce({ items: [] })

    await inboxService.patchInboxPreferences({
      interaction: {
        inbox_enabled: true,
        email_enabled: false,
      },
    })

    expect(clientMocks.patch).toHaveBeenCalledWith(
      '/inbox/preferences',
      {
        interaction: {
          inbox_enabled: true,
          email_enabled: false,
        },
      },
      undefined
    )
  })

  it('splits SSE frames and preserves incomplete remainder chunks', () => {
    const { frames, remainder } = splitInboxSseFrames(
      [
        'event: heartbeat',
        '',
        'event: summary.updated',
        'data: {"total":{"count":99,"is_capped":true},"categories":{"interaction":{"count":12,"is_capped":false},"security":{"count":2,"is_capped":false},"system":{"count":0,"is_capped":false}}}',
        '',
        'event: message.created',
        'data: {"id":"uuid-1"',
      ].join('\n')
    )

    expect(frames).toEqual([
      { event: 'heartbeat', data: '' },
      {
        event: 'summary.updated',
        data: '{"total":{"count":99,"is_capped":true},"categories":{"interaction":{"count":12,"is_capped":false},"security":{"count":2,"is_capped":false},"system":{"count":0,"is_capped":false}}}',
      },
    ])
    expect(remainder).toBe('event: message.created\ndata: {"id":"uuid-1"')
  })

  it('parses inbox SSE events from a fetch-readable stream', async () => {
    const encoder = new TextEncoder()
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('event: heartbeat\n\n'))
          controller.enqueue(
            encoder.encode(
              'event: summary.updated\ndata: {"total":{"count":2,"is_capped":false},"categories":{"interaction":{"count":1,"is_capped":false},"security":{"count":1,"is_capped":false},"system":{"count":0,"is_capped":false}}}\n\n'
            )
          )
          controller.enqueue(
            encoder.encode(
              'event: message.created\ndata: {"id":"uuid-1","category":"interaction","event_type":"comment.like","priority":"normal","title":"Test","body":"Body","aggregate_count":2,"is_read":false,"read_at":null,"archived_at":null,"first_event_at":"2026-03-31T00:00:00Z","last_event_at":"2026-03-31T01:00:00Z","created_at":"2026-03-31T00:00:00Z","updated_at":"2026-03-31T01:00:00Z","last_actor":{"id":"actor-1","username":"tester","avatar_url":null}}\n\n'
            )
          )
          controller.close()
        },
      })
    )

    const events: Array<{ event: string; data: unknown }> = []

    await consumeInboxStream(response, {
      onEvent(event) {
        events.push(event)
      },
    })

    expect(events).toEqual([
      { event: 'heartbeat', data: null },
      {
        event: 'summary.updated',
        data: {
          total: { count: 2, is_capped: false },
          categories: {
            interaction: { count: 1, is_capped: false },
            security: { count: 1, is_capped: false },
            system: { count: 0, is_capped: false },
          },
        },
      },
      {
        event: 'message.created',
        data: expect.objectContaining({
          id: 'uuid-1',
          aggregate_count: 2,
          category: 'interaction',
        }),
      },
    ])
  })
})
