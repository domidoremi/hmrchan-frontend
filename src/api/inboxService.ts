import { apiClient, type RequestConfig } from './client'

export type InboxCategory = 'interaction' | 'security' | 'system'
export type InboxStatus = 'all' | 'unread' | 'archived'
export type InboxPriority = 'low' | 'normal' | 'high' | 'critical'

export interface InboxActor {
  id: string
  username: string
  avatar_url?: string | null
}

export interface InboxMessage {
  id: string
  category: InboxCategory
  event_type: string
  priority: InboxPriority
  title: string
  body: string | null
  target_type?: string | null
  target_uuid?: string | null
  action_url?: string | null
  payload?: Record<string, unknown> | null
  aggregate_count: number
  is_read: boolean
  read_at?: string | null
  archived_at?: string | null
  first_event_at: string
  last_event_at: string
  created_at: string
  updated_at: string
  last_actor?: InboxActor | null
}

export interface InboxListResponse {
  items: InboxMessage[]
  next_cursor?: string | null
  has_more: boolean
}

export interface InboxSummaryCount {
  count: number
  is_capped: boolean
}

export interface InboxSummary {
  total: InboxSummaryCount
  categories: Record<InboxCategory, InboxSummaryCount>
}

export interface InboxPreference {
  category: InboxCategory
  inbox_enabled: boolean
  email_enabled: boolean
}

export interface InboxPreferencesResponse {
  items: InboxPreference[]
}

export interface InboxPreferencesPatch {
  [key: string]:
    | {
        inbox_enabled?: boolean
        email_enabled?: boolean
      }
    | undefined
}

export type InboxStreamEvent =
  | {
      event: 'snapshot' | 'summary.updated'
      data: InboxSummary
    }
  | {
      event: 'message.created' | 'message.updated'
      data: InboxMessage
    }
  | {
      event: 'heartbeat'
      data: null
    }

interface RawSseFrame {
  event: string
  data: string
}

const STREAM_TIMEOUT = 24 * 60 * 60 * 1000
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT)
}

function isInboxCategory(value: unknown): value is InboxCategory {
  return value === 'interaction' || value === 'security' || value === 'system'
}

function isInboxSummary(value: unknown): value is InboxSummary {
  if (!value || typeof value !== 'object') return false
  const summary = value as Partial<InboxSummary>
  return Boolean(
    summary.total &&
    typeof summary.total.count === 'number' &&
    typeof summary.total.is_capped === 'boolean' &&
    summary.categories &&
    typeof summary.categories.interaction?.count === 'number' &&
    typeof summary.categories.interaction?.is_capped === 'boolean' &&
    typeof summary.categories.security?.count === 'number' &&
    typeof summary.categories.security?.is_capped === 'boolean' &&
    typeof summary.categories.system?.count === 'number' &&
    typeof summary.categories.system?.is_capped === 'boolean'
  )
}

function isInboxMessage(value: unknown): value is InboxMessage {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<InboxMessage>
  return Boolean(
    typeof item.id === 'string' &&
    isInboxCategory(item.category) &&
    typeof item.event_type === 'string' &&
    typeof item.title === 'string' &&
    typeof item.last_event_at === 'string' &&
    typeof item.created_at === 'string' &&
    typeof item.updated_at === 'string' &&
    typeof item.aggregate_count === 'number' &&
    typeof item.is_read === 'boolean'
  )
}

function decodeInboxStreamEvent(frame: RawSseFrame): InboxStreamEvent | null {
  if (frame.event === 'heartbeat') {
    return {
      event: 'heartbeat',
      data: null,
    }
  }

  if (!frame.data.trim()) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(frame.data)
  } catch {
    return null
  }

  if ((frame.event === 'snapshot' || frame.event === 'summary.updated') && isInboxSummary(parsed)) {
    return {
      event: frame.event,
      data: parsed,
    }
  }

  if (
    (frame.event === 'message.created' || frame.event === 'message.updated') &&
    isInboxMessage(parsed)
  ) {
    return {
      event: frame.event,
      data: parsed,
    }
  }

  return null
}

export const MAX_INBOX_SSE_FRAME_CHARS = 256 * 1024

function assertInboxSseFrameSize(frame: string): void {
  if (frame.length > MAX_INBOX_SSE_FRAME_CHARS) {
    throw new Error(`Inbox SSE frame exceeds ${MAX_INBOX_SSE_FRAME_CHARS} characters`)
  }
}

export function splitInboxSseFrames(buffer: string): {
  frames: RawSseFrame[]
  remainder: string
} {
  const normalized = buffer.replace(/\r\n/g, '\n')
  const segments = normalized.split('\n\n')
  const remainder = segments.pop() ?? ''
  const frames: RawSseFrame[] = []

  for (const segment of segments) {
    assertInboxSseFrameSize(segment)
    const trimmed = segment.trim()
    if (!trimmed) continue

    const lines = segment.split('\n')
    let event = 'message'
    const dataLines: string[] = []

    for (const line of lines) {
      if (!line || line.startsWith(':')) continue
      const separatorIndex = line.indexOf(':')
      const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex)
      const rawValue = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1)
      const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue

      if (field === 'event' && value) {
        event = value
      }
      if (field === 'data') {
        dataLines.push(value)
      }
    }

    frames.push({
      event,
      data: dataLines.join('\n'),
    })
  }

  assertInboxSseFrameSize(remainder)
  return { frames, remainder }
}

export async function consumeInboxStream(
  response: Response,
  options: {
    signal?: AbortSignal
    onEvent: (event: InboxStreamEvent) => void | Promise<void>
  }
): Promise<void> {
  const { signal, onEvent } = options

  if (!response.body) {
    throw new Error('Inbox stream body is not readable')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let abortHandler: (() => void) | null = null

  if (signal?.aborted) {
    await reader.cancel().catch(() => undefined)
    throw new DOMException('Aborted', 'AbortError')
  }

  const abortPromise = signal
    ? new Promise<never>((_, reject) => {
        abortHandler = () => {
          void reader.cancel().catch(() => {})
          reject(new DOMException('Aborted', 'AbortError'))
        }
        signal.addEventListener('abort', abortHandler, { once: true })
      })
    : null

  try {
    while (true) {
      const readResult = abortPromise
        ? await Promise.race([reader.read(), abortPromise])
        : await reader.read()

      if (readResult.done) break

      buffer += decoder.decode(readResult.value, { stream: true })
      const { frames, remainder } = splitInboxSseFrames(buffer)
      buffer = remainder

      for (const frame of frames) {
        const parsed = decodeInboxStreamEvent(frame)
        if (parsed) {
          await onEvent(parsed)
        }
      }
    }

    buffer += decoder.decode()
    if (buffer.trim()) {
      const { frames } = splitInboxSseFrames(`${buffer}\n\n`)
      for (const frame of frames) {
        const parsed = decodeInboxStreamEvent(frame)
        if (parsed) {
          await onEvent(parsed)
        }
      }
    }
  } catch (error) {
    await reader.cancel(error).catch(() => undefined)
    throw error
  } finally {
    if (signal && abortHandler) {
      signal.removeEventListener('abort', abortHandler)
    }
  }
}

export const inboxService = {
  async getInbox(
    options?: {
      limit?: number
      cursor?: string | null
      category?: InboxCategory | 'all'
      status?: InboxStatus
    },
    config?: RequestConfig
  ): Promise<InboxListResponse> {
    const params = new URLSearchParams({
      limit: String(clampLimit(options?.limit)),
      status: options?.status ?? 'all',
    })

    if (options?.cursor) {
      params.set('cursor', options.cursor)
    }

    if (options?.category && options.category !== 'all') {
      params.set('category', options.category)
    }

    return apiClient.get<InboxListResponse>(`/inbox?${params.toString()}`, config)
  },

  async getInboxSummary(config?: RequestConfig): Promise<InboxSummary> {
    return apiClient.get<InboxSummary>('/inbox/summary', config)
  },

  async getInboxPreferences(config?: RequestConfig): Promise<InboxPreferencesResponse> {
    return apiClient.get<InboxPreferencesResponse>('/inbox/preferences', config)
  },

  async patchInboxPreferences(
    payload: InboxPreferencesPatch,
    config?: RequestConfig
  ): Promise<InboxPreferencesResponse> {
    return apiClient.patch<InboxPreferencesResponse>('/inbox/preferences', payload, config)
  },

  async markInboxRead(messageId: string, config?: RequestConfig): Promise<InboxMessage> {
    return apiClient.patch<InboxMessage>(`/inbox/${messageId}/read`, undefined, config)
  },

  async markAllInboxRead(
    config?: RequestConfig
  ): Promise<{ success?: boolean; message?: string; count?: number }> {
    return apiClient.post('/inbox/read-all', undefined, config)
  },

  async archiveInboxMessage(messageId: string, config?: RequestConfig): Promise<InboxMessage> {
    return apiClient.patch<InboxMessage>(`/inbox/${messageId}/archive`, undefined, config)
  },

  async archiveReadInboxMessages(
    config?: RequestConfig
  ): Promise<{ success?: boolean; message?: string; count?: number }> {
    return apiClient.post('/inbox/archive-read', undefined, config)
  },

  async openInboxStreamResponse(config?: RequestConfig): Promise<Response> {
    return apiClient.response('/inbox/stream', {
      ...config,
      method: 'GET',
      timeout: config?.timeout ?? STREAM_TIMEOUT,
      headers: {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...(config?.headers ?? {}),
      },
    })
  },
}
