export const sw = self as ServiceWorkerGlobalScope & typeof globalThis

export interface ExtendableEventLike extends Event {
  waitUntil(promise: Promise<unknown>): void
}

export interface FetchEventLike extends ExtendableEventLike {
  request: Request
  preloadResponse: Promise<Response | undefined>
  respondWith(response: Promise<Response> | Response): void
}

export interface SyncEventLike extends ExtendableEventLike {
  tag: string
}

export interface MessageEventLike extends ExtendableEventLike {
  data: unknown
  ports: MessagePort[]
}

export interface PushDataLike {
  json(): unknown
  text(): string
}

export interface PushEventLike extends ExtendableEventLike {
  data?: PushDataLike
}

export interface NotificationEventLike extends ExtendableEventLike {
  action: string
  notification: Notification
}
