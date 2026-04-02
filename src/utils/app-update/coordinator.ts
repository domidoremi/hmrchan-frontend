export type AppUpdateCoordinatorMessage =
  | {
      type: 'leader-heartbeat'
      senderTabId: string
      timestamp: number
    }
  | {
      type: 'update-available'
      senderTabId: string
      timestamp: number
      scriptUrl: string
    }
  | {
      type: 'activation-start'
      senderTabId: string
      timestamp: number
      scriptUrl: string
      mode: 'auto' | 'manual'
    }
  | {
      type: 'activation-complete'
      senderTabId: string
      timestamp: number
      mode: 'auto' | 'manual'
    }
  | {
      type: 'toast-release'
      senderTabId: string
      timestamp: number
      reason: string
    }

interface AppUpdateCoordinatorOptions {
  channelName?: string
  heartbeatIntervalMs?: number
  leaseTtlMs?: number
  now?: () => number
  isDocumentVisible?: () => boolean
  onLeadershipChange?: (isLeader: boolean) => void
  onMessage?: (message: AppUpdateCoordinatorMessage) => void
}

type LeaderLease = {
  tabId: string
  expiresAt: number
}

const DEFAULT_CHANNEL_NAME = 'hmrchan-app-update'
const DEFAULT_LEADER_STORAGE_KEY = '__hmrchan_app_update_leader__'
const DEFAULT_MESSAGE_STORAGE_KEY = '__hmrchan_app_update_message__'

function createTabId(now: () => number): string {
  return `tab-${now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function isCoordinatorMessage(value: unknown): value is AppUpdateCoordinatorMessage {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'type' in value &&
    'senderTabId' in value &&
    'timestamp' in value
  )
}

export class AppUpdateCoordinator {
  readonly tabId: string

  private readonly channelName: string
  private readonly heartbeatIntervalMs: number
  private readonly leaseTtlMs: number
  private readonly now: () => number
  private readonly isDocumentVisible: () => boolean
  private readonly onLeadershipChange?: (isLeader: boolean) => void
  private readonly onMessage?: (message: AppUpdateCoordinatorMessage) => void
  private channel: BroadcastChannel | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private leadership = false
  private lastMessageCounter = 0
  private readonly leaderStorageKey = DEFAULT_LEADER_STORAGE_KEY
  private readonly messageStorageKey = DEFAULT_MESSAGE_STORAGE_KEY
  private readonly boundHandleStorage = (event: StorageEvent) => this.handleStorage(event)
  private readonly boundHandleVisibility = () => this.handleVisibilityChange()

  constructor(options: AppUpdateCoordinatorOptions = {}) {
    this.channelName = options.channelName ?? DEFAULT_CHANNEL_NAME
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 4_000
    this.leaseTtlMs = options.leaseTtlMs ?? 12_000
    this.now = options.now ?? (() => Date.now())
    this.isDocumentVisible =
      options.isDocumentVisible ??
      (() => typeof document !== 'undefined' && document.visibilityState === 'visible')
    this.onLeadershipChange = options.onLeadershipChange
    this.onMessage = options.onMessage
    this.tabId = createTabId(this.now)
  }

  start(): void {
    if (typeof window === 'undefined') return

    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(this.channelName)
      this.channel.addEventListener('message', (event: MessageEvent<unknown>) => {
        this.handleIncomingMessage(event.data)
      })
    }

    window.addEventListener('storage', this.boundHandleStorage)
    document.addEventListener('visibilitychange', this.boundHandleVisibility)

    this.heartbeatTimer = setInterval(() => {
      this.heartbeat()
    }, this.heartbeatIntervalMs)

    this.ensureLeadership()
  }

  stop(): void {
    if (typeof window === 'undefined') return

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    window.removeEventListener('storage', this.boundHandleStorage)
    document.removeEventListener('visibilitychange', this.boundHandleVisibility)
    this.releaseLeadership('stop')
    this.channel?.close()
    this.channel = null
  }

  isLeader(): boolean {
    return this.leadership
  }

  ensureLeadership(): boolean {
    if (typeof window === 'undefined' || !this.isDocumentVisible()) {
      this.syncLeadership(false)
      return false
    }

    const currentLease = this.readLeaderLease()
    if (
      !currentLease ||
      currentLease.tabId === this.tabId ||
      currentLease.expiresAt <= this.now()
    ) {
      this.writeLeaderLease()
      this.syncLeadership(true)
      this.publish({
        type: 'leader-heartbeat',
        senderTabId: this.tabId,
        timestamp: this.now(),
      })
      return true
    }

    this.syncLeadership(false)
    return false
  }

  releaseLeadership(reason: string): void {
    const currentLease = this.readLeaderLease()
    if (currentLease?.tabId === this.tabId) {
      localStorage.removeItem(this.leaderStorageKey)
    }

    if (this.leadership) {
      this.publish({
        type: 'toast-release',
        senderTabId: this.tabId,
        timestamp: this.now(),
        reason,
      })
    }

    this.syncLeadership(false)
  }

  publish(message: AppUpdateCoordinatorMessage): void {
    if (typeof window === 'undefined') return

    this.channel?.postMessage(message)

    this.lastMessageCounter += 1
    localStorage.setItem(
      this.messageStorageKey,
      JSON.stringify({
        id: `${this.tabId}:${this.lastMessageCounter}`,
        payload: message,
      })
    )
  }

  private heartbeat(): void {
    if (typeof window === 'undefined') return

    if (!this.isDocumentVisible()) {
      this.releaseLeadership('hidden')
      return
    }

    if (this.leadership) {
      this.writeLeaderLease()
      this.publish({
        type: 'leader-heartbeat',
        senderTabId: this.tabId,
        timestamp: this.now(),
      })
      return
    }

    this.ensureLeadership()
  }

  private handleVisibilityChange(): void {
    if (this.isDocumentVisible()) {
      this.ensureLeadership()
      return
    }

    this.releaseLeadership('hidden')
  }

  private handleStorage(event: StorageEvent): void {
    if (event.key === this.leaderStorageKey) {
      const currentLease = this.readLeaderLease()
      if (!currentLease && this.isDocumentVisible()) {
        this.ensureLeadership()
        return
      }

      if (currentLease?.tabId !== this.tabId && this.leadership) {
        this.syncLeadership(false)
      }
      return
    }

    if (event.key === this.messageStorageKey && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue) as { payload?: unknown }
        this.handleIncomingMessage(parsed.payload)
      } catch {
        // Ignore malformed storage bus payloads.
      }
    }
  }

  private handleIncomingMessage(rawMessage: unknown): void {
    if (!isCoordinatorMessage(rawMessage)) return
    if (rawMessage.senderTabId === this.tabId) return

    if (rawMessage.type === 'leader-heartbeat' && this.leadership) {
      const currentLease = this.readLeaderLease()
      if (currentLease?.tabId !== this.tabId) {
        this.syncLeadership(false)
      }
    }

    this.onMessage?.(rawMessage)
  }

  private syncLeadership(nextLeadership: boolean): void {
    if (this.leadership === nextLeadership) return
    this.leadership = nextLeadership
    this.onLeadershipChange?.(nextLeadership)
  }

  private writeLeaderLease(): void {
    localStorage.setItem(
      this.leaderStorageKey,
      JSON.stringify({
        tabId: this.tabId,
        expiresAt: this.now() + this.leaseTtlMs,
      } satisfies LeaderLease)
    )
  }

  private readLeaderLease(): LeaderLease | null {
    try {
      const rawValue = localStorage.getItem(this.leaderStorageKey)
      if (!rawValue) return null

      const parsed = JSON.parse(rawValue) as Partial<LeaderLease>
      if (typeof parsed.tabId !== 'string' || typeof parsed.expiresAt !== 'number') {
        return null
      }

      return {
        tabId: parsed.tabId,
        expiresAt: parsed.expiresAt,
      }
    } catch {
      return null
    }
  }
}
