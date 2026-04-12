import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  consumeInboxStream,
  inboxService,
  type InboxCategory,
  type InboxMessage,
  type InboxPreference,
  type InboxStatus,
  type InboxStreamEvent,
  type InboxSummary,
} from '@/api/inboxService'

type InboxCategoryFilter = InboxCategory | 'all'
type NotificationStreamState = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'degraded'

const PAGE_LIMIT = 20
const MAX_STREAM_RECONNECT_ATTEMPTS = 5
const STREAM_RECONNECT_BASE_DELAY = 1_000
const STREAM_RECONNECT_MAX_DELAY = 30_000

function createSummaryCounter(count = 0, isCapped = false) {
  return { count, is_capped: isCapped }
}

function createEmptySummary(): InboxSummary {
  return {
    total: createSummaryCounter(),
    categories: {
      interaction: createSummaryCounter(),
      security: createSummaryCounter(),
      system: createSummaryCounter(),
    },
  }
}

function createDefaultPreferences(): InboxPreference[] {
  return [
    { category: 'interaction', inbox_enabled: true, email_enabled: false },
    { category: 'security', inbox_enabled: true, email_enabled: true },
    { category: 'system', inbox_enabled: true, email_enabled: true },
  ]
}

function compareInboxMessages(a: InboxMessage, b: InboxMessage): number {
  const dateDiff = new Date(b.last_event_at).getTime() - new Date(a.last_event_at).getTime()
  if (dateDiff !== 0) return dateDiff
  return b.id.localeCompare(a.id)
}

function sortInboxMessages(items: InboxMessage[]): InboxMessage[] {
  return [...items].sort(compareInboxMessages)
}

function normalizeSummary(summary: InboxSummary | null | undefined): InboxSummary {
  const safe = summary ?? createEmptySummary()
  return {
    total: {
      count: safe.total?.count ?? 0,
      is_capped: safe.total?.is_capped ?? false,
    },
    categories: {
      interaction: {
        count: safe.categories?.interaction?.count ?? 0,
        is_capped: safe.categories?.interaction?.is_capped ?? false,
      },
      security: {
        count: safe.categories?.security?.count ?? 0,
        is_capped: safe.categories?.security?.is_capped ?? false,
      },
      system: {
        count: safe.categories?.system?.count ?? 0,
        is_capped: safe.categories?.system?.is_capped ?? false,
      },
    },
  }
}

function formatCappedCount(count: number, isCapped: boolean): string | undefined {
  if (count <= 0) return undefined
  return isCapped ? `${count}+` : `${count}`
}

export const useNotificationsStore = defineStore('notifications', () => {
  const items = shallowRef<InboxMessage[]>([])
  const nextCursor = ref<string | null>(null)
  const hasMore = ref(false)
  const isLoading = ref(false)
  const isSummaryLoading = ref(false)
  const isPreferencesLoading = ref(false)
  const error = ref<string | null>(null)
  const summaryError = ref<string | null>(null)
  const preferencesError = ref<string | null>(null)
  const streamError = ref<string | null>(null)
  const streamState = ref<NotificationStreamState>('idle')
  const status = ref<InboxStatus>('all')
  const category = ref<InboxCategoryFilter>('all')
  const summary = ref<InboxSummary>(createEmptySummary())
  const preferences = ref<InboxPreference[]>(createDefaultPreferences())
  const preferencesLoaded = ref(false)
  const hasInitialized = ref(false)
  const savingPreferences = ref<Record<InboxCategory, boolean>>({
    interaction: false,
    security: false,
    system: false,
  })

  let fetchNotificationsController: AbortController | null = null
  let fetchNotificationsToken = 0
  let fetchSummaryController: AbortController | null = null
  let fetchSummaryToken = 0
  let fetchPreferencesController: AbortController | null = null
  let fetchPreferencesToken = 0
  let streamController: AbortController | null = null
  let streamConnectionToken = 0
  let streamReconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  let shouldKeepStreamAlive = false

  const unreadCount = computed(() => summary.value.total.count)
  const unreadDisplayCount = computed(() =>
    formatCappedCount(summary.value.total.count, summary.value.total.is_capped)
  )
  const hasUnread = computed(() => unreadCount.value > 0)
  const hasArchivableReadItems = computed(() =>
    items.value.some((item) => !item.archived_at && item.is_read)
  )
  const preferencesByCategory = computed<Record<InboxCategory, InboxPreference>>(() => {
    const record = {
      interaction: { category: 'interaction', inbox_enabled: true, email_enabled: false },
      security: { category: 'security', inbox_enabled: true, email_enabled: true },
      system: { category: 'system', inbox_enabled: true, email_enabled: true },
    }

    for (const item of preferences.value) {
      record[item.category] = item
    }

    return record
  })

  function matchesCurrentFilters(item: InboxMessage): boolean {
    const statusMatch =
      status.value === 'all'
        ? !item.archived_at
        : status.value === 'unread'
          ? !item.archived_at && !item.is_read
          : Boolean(item.archived_at)

    const categoryMatch = category.value === 'all' ? true : item.category === category.value
    return statusMatch && categoryMatch
  }

  function clearReconnectTimer() {
    if (streamReconnectTimer) {
      clearTimeout(streamReconnectTimer)
      streamReconnectTimer = null
    }
  }

  function abortFetchNotifications() {
    fetchNotificationsController?.abort()
    fetchNotificationsController = null
  }

  function abortFetchSummary() {
    fetchSummaryController?.abort()
    fetchSummaryController = null
  }

  function abortFetchPreferences() {
    fetchPreferencesController?.abort()
    fetchPreferencesController = null
  }

  function abortStream() {
    streamController?.abort()
    streamController = null
  }

  function setItems(nextItems: InboxMessage[]) {
    items.value = sortInboxMessages(nextItems.filter(matchesCurrentFilters))
  }

  function mergeItems(nextItems: InboxMessage[]) {
    const merged = new Map(items.value.map((item) => [item.id, item]))
    for (const item of nextItems) {
      merged.set(item.id, item)
    }

    items.value = sortInboxMessages([...merged.values()].filter(matchesCurrentFilters))
  }

  function removeItem(messageId: string) {
    items.value = items.value.filter((item) => item.id !== messageId)
  }

  function patchVisibleItem(
    messageId: string,
    updater: (item: InboxMessage) => InboxMessage
  ): InboxMessage | null {
    const current = items.value.find((item) => item.id === messageId)
    if (!current) return null

    const next = updater(current)
    if (!matchesCurrentFilters(next)) {
      removeItem(messageId)
      return next
    }

    items.value = sortInboxMessages(
      items.value.map((item) => (item.id === messageId ? next : item))
    )
    return next
  }

  function setSummary(nextSummary: InboxSummary) {
    summary.value = normalizeSummary(nextSummary)
    summaryError.value = null
  }

  function decrementSummaryForItem(item: InboxMessage) {
    if (item.archived_at || item.is_read) return

    const nextSummary = normalizeSummary(summary.value)
    if (!nextSummary.total.is_capped) {
      nextSummary.total.count = Math.max(0, nextSummary.total.count - 1)
    }
    const categorySummary = nextSummary.categories[item.category]
    if (categorySummary && !categorySummary.is_capped) {
      categorySummary.count = Math.max(0, categorySummary.count - 1)
    }
    summary.value = nextSummary
  }

  function zeroSummary() {
    const nextSummary = normalizeSummary(summary.value)
    nextSummary.total = createSummaryCounter()
    nextSummary.categories.interaction = createSummaryCounter()
    nextSummary.categories.security = createSummaryCounter()
    nextSummary.categories.system = createSummaryCounter()
    summary.value = nextSummary
  }

  async function fetchNotifications(reset = false): Promise<boolean> {
    if (reset) {
      abortFetchNotifications()
    } else if (isLoading.value || !hasMore.value || !nextCursor.value) {
      return false
    }

    const controller = new AbortController()
    fetchNotificationsController = controller
    const requestToken = ++fetchNotificationsToken
    isLoading.value = true
    error.value = null

    if (reset) {
      nextCursor.value = null
      hasMore.value = false
    }

    try {
      const response = await inboxService.getInbox(
        {
          limit: PAGE_LIMIT,
          cursor: reset ? null : nextCursor.value,
          category: category.value,
          status: status.value,
        },
        {
          signal: controller.signal,
          skipErrorToast: true,
        }
      )

      if (controller.signal.aborted || requestToken !== fetchNotificationsToken) return false

      if (reset) {
        setItems(response.items)
      } else {
        mergeItems(response.items)
      }

      nextCursor.value = response.next_cursor ?? null
      hasMore.value = Boolean(response.has_more && response.next_cursor)
      hasInitialized.value = true
      return true
    } catch {
      if (controller.signal.aborted || requestToken !== fetchNotificationsToken) return false
      if (reset) {
        items.value = []
        nextCursor.value = null
        hasMore.value = false
      }
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

  async function fetchSummary(force = false): Promise<boolean> {
    if (isSummaryLoading.value && !force) {
      return false
    }
    if (force) {
      abortFetchSummary()
    }

    const controller = new AbortController()
    fetchSummaryController = controller
    const requestToken = ++fetchSummaryToken
    isSummaryLoading.value = true
    summaryError.value = null

    try {
      const response = await inboxService.getInboxSummary({
        signal: controller.signal,
        skipErrorToast: true,
      })

      if (controller.signal.aborted || requestToken !== fetchSummaryToken) return false
      setSummary(response)
      return true
    } catch {
      if (controller.signal.aborted || requestToken !== fetchSummaryToken) return false
      summaryError.value = 'notification.error.summaryFailed'
      return false
    } finally {
      if (requestToken === fetchSummaryToken) {
        isSummaryLoading.value = false
        if (fetchSummaryController === controller) {
          fetchSummaryController = null
        }
      }
    }
  }

  async function fetchPreferences(force = false): Promise<boolean> {
    if (preferencesLoaded.value && !force) {
      return true
    }
    if (isPreferencesLoading.value && !force) {
      return false
    }
    if (force) {
      abortFetchPreferences()
    }

    const controller = new AbortController()
    fetchPreferencesController = controller
    const requestToken = ++fetchPreferencesToken
    isPreferencesLoading.value = true
    preferencesError.value = null

    try {
      const response = await inboxService.getInboxPreferences({
        signal: controller.signal,
        skipErrorToast: true,
      })

      if (controller.signal.aborted || requestToken !== fetchPreferencesToken) return false
      preferences.value = response.items.length > 0 ? response.items : createDefaultPreferences()
      preferencesLoaded.value = true
      return true
    } catch {
      if (controller.signal.aborted || requestToken !== fetchPreferencesToken) return false
      preferencesError.value = 'notification.error.preferencesFailed'
      return false
    } finally {
      if (requestToken === fetchPreferencesToken) {
        isPreferencesLoading.value = false
        if (fetchPreferencesController === controller) {
          fetchPreferencesController = null
        }
      }
    }
  }

  async function savePreferences(
    inboxCategory: InboxCategory,
    patch: {
      inbox_enabled?: boolean
      email_enabled?: boolean
    }
  ): Promise<boolean> {
    const current = preferencesByCategory.value[inboxCategory]
    const normalized = {
      inbox_enabled: patch.inbox_enabled ?? current.inbox_enabled,
      email_enabled: patch.email_enabled ?? current.email_enabled,
    }

    if (patch.inbox_enabled === false || normalized.inbox_enabled === false) {
      normalized.inbox_enabled = false
      normalized.email_enabled = false
    } else if (normalized.email_enabled) {
      normalized.inbox_enabled = true
    }

    preferencesError.value = null
    savingPreferences.value = {
      ...savingPreferences.value,
      [inboxCategory]: true,
    }

    try {
      await inboxService.patchInboxPreferences(
        {
          [inboxCategory]: normalized,
        },
        {
          skipErrorToast: true,
        }
      )

      await fetchPreferences(true)
      return true
    } catch {
      preferencesError.value = 'notification.error.preferencesFailed'
      return false
    } finally {
      savingPreferences.value = {
        ...savingPreferences.value,
        [inboxCategory]: false,
      }
    }
  }

  function setStatus(nextStatus: InboxStatus) {
    if (status.value === nextStatus) return
    status.value = nextStatus
    void fetchNotifications(true)
  }

  function setCategory(nextCategory: InboxCategoryFilter) {
    if (category.value === nextCategory) return
    category.value = nextCategory
    void fetchNotifications(true)
  }

  async function loadMore(): Promise<boolean> {
    return fetchNotifications(false)
  }

  async function markAsRead(messageId: string): Promise<boolean> {
    const current = items.value.find((item) => item.id === messageId)

    try {
      await inboxService.markInboxRead(messageId, { skipErrorToast: true })

      if (current && !current.is_read) {
        decrementSummaryForItem(current)
        patchVisibleItem(messageId, (item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at ?? new Date().toISOString(),
        }))
      }

      await fetchSummary(true)
      return true
    } catch {
      return false
    }
  }

  async function markAllAsRead(): Promise<boolean> {
    try {
      await inboxService.markAllInboxRead({ skipErrorToast: true })

      if (status.value === 'unread') {
        items.value = []
      } else {
        items.value = sortInboxMessages(
          items.value.map((item) => ({
            ...item,
            is_read: true,
            read_at: item.read_at ?? new Date().toISOString(),
          }))
        )
      }
      zeroSummary()

      await Promise.all([fetchNotifications(true), fetchSummary(true)])
      return true
    } catch {
      return false
    }
  }

  async function archiveMessage(messageId: string): Promise<boolean> {
    const current = items.value.find((item) => item.id === messageId)

    try {
      await inboxService.archiveInboxMessage(messageId, { skipErrorToast: true })

      if (current) {
        decrementSummaryForItem(current)
        removeItem(messageId)
      }

      await Promise.all([fetchNotifications(true), fetchSummary(true)])
      return true
    } catch {
      return false
    }
  }

  async function archiveRead(): Promise<boolean> {
    try {
      await inboxService.archiveReadInboxMessages({ skipErrorToast: true })

      if (status.value !== 'archived') {
        items.value = items.value.filter((item) => !item.is_read)
      }

      await Promise.all([fetchNotifications(true), fetchSummary(true)])
      return true
    } catch {
      return false
    }
  }

  async function handleStreamEvent(event: InboxStreamEvent) {
    switch (event.event) {
      case 'snapshot':
      case 'summary.updated':
        setSummary(event.data)
        break
      case 'message.created':
      case 'message.updated':
        mergeItems([event.data])
        break
      case 'heartbeat':
        break
    }
  }

  function scheduleReconnect(errorKey = 'notification.error.streamFailed') {
    clearReconnectTimer()

    if (!shouldKeepStreamAlive) {
      streamState.value = 'idle'
      return
    }

    if (reconnectAttempts >= MAX_STREAM_RECONNECT_ATTEMPTS) {
      streamState.value = 'degraded'
      streamError.value = 'notification.error.streamDegraded'
      return
    }

    streamState.value = 'reconnecting'
    streamError.value = errorKey

    const delay = Math.min(
      STREAM_RECONNECT_BASE_DELAY * 2 ** reconnectAttempts,
      STREAM_RECONNECT_MAX_DELAY
    )
    reconnectAttempts += 1

    streamReconnectTimer = setTimeout(async () => {
      await Promise.all([fetchNotifications(true), fetchSummary(true)])
      if (!shouldKeepStreamAlive) return
      void openStreamConnection()
    }, delay)
  }

  async function openStreamConnection(): Promise<void> {
    if (!shouldKeepStreamAlive) return

    clearReconnectTimer()
    abortStream()

    const controller = new AbortController()
    streamController = controller
    const requestToken = ++streamConnectionToken
    streamState.value = reconnectAttempts > 0 ? 'reconnecting' : 'connecting'
    streamError.value = null

    try {
      const response = await inboxService.openInboxStreamResponse({
        signal: controller.signal,
        skipErrorToast: true,
      })

      if (
        controller.signal.aborted ||
        requestToken !== streamConnectionToken ||
        !shouldKeepStreamAlive
      ) {
        return
      }

      reconnectAttempts = 0
      streamState.value = 'live'
      streamError.value = null

      await consumeInboxStream(response, {
        signal: controller.signal,
        onEvent: handleStreamEvent,
      })

      if (
        controller.signal.aborted ||
        requestToken !== streamConnectionToken ||
        !shouldKeepStreamAlive
      ) {
        return
      }

      scheduleReconnect('notification.error.streamDisconnected')
    } catch {
      if (
        controller.signal.aborted ||
        requestToken !== streamConnectionToken ||
        !shouldKeepStreamAlive
      ) {
        return
      }
      scheduleReconnect('notification.error.streamFailed')
    } finally {
      if (streamController === controller) {
        streamController = null
      }
    }
  }

  async function initialize(): Promise<boolean> {
    shouldKeepStreamAlive = true
    clearReconnectTimer()
    reconnectAttempts = 0
    streamError.value = null

    const [notificationsOk, summaryOk] = await Promise.all([
      fetchNotifications(true),
      fetchSummary(true),
    ])

    if (notificationsOk && summaryOk) {
      hasInitialized.value = true
      void openStreamConnection()
    } else {
      streamState.value = 'idle'
    }

    return notificationsOk && summaryOk
  }

  function stopStream() {
    shouldKeepStreamAlive = false
    clearReconnectTimer()
    abortStream()
    streamState.value = 'idle'
    streamError.value = null
  }

  async function retryStream(): Promise<boolean> {
    shouldKeepStreamAlive = true
    reconnectAttempts = 0
    streamError.value = null

    const [notificationsOk, summaryOk] = await Promise.all([
      fetchNotifications(true),
      fetchSummary(true),
    ])

    if (!notificationsOk || !summaryOk) {
      streamState.value = 'degraded'
      return false
    }

    void openStreamConnection()
    return true
  }

  function $reset() {
    abortFetchNotifications()
    abortFetchSummary()
    abortFetchPreferences()
    stopStream()
    items.value = []
    nextCursor.value = null
    hasMore.value = false
    isLoading.value = false
    isSummaryLoading.value = false
    isPreferencesLoading.value = false
    error.value = null
    summaryError.value = null
    preferencesError.value = null
    streamState.value = 'idle'
    status.value = 'all'
    category.value = 'all'
    summary.value = createEmptySummary()
    preferences.value = createDefaultPreferences()
    preferencesLoaded.value = false
    hasInitialized.value = false
    savingPreferences.value = {
      interaction: false,
      security: false,
      system: false,
    }
  }

  return {
    items,
    nextCursor,
    hasMore,
    isLoading,
    isSummaryLoading,
    isPreferencesLoading,
    error,
    summaryError,
    preferencesError,
    streamError,
    streamState,
    status,
    category,
    summary,
    preferences,
    preferencesLoaded,
    hasInitialized,
    savingPreferences,
    unreadCount,
    unreadDisplayCount,
    hasUnread,
    hasArchivableReadItems,
    preferencesByCategory,
    fetchNotifications,
    fetchSummary,
    fetchPreferences,
    savePreferences,
    setStatus,
    setCategory,
    loadMore,
    markAsRead,
    markAllAsRead,
    archiveMessage,
    archiveRead,
    initialize,
    stopStream,
    retryStream,
    $reset,
  }
})
