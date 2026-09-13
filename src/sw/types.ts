/// <reference lib="webworker" />

// This entry executes in a browser service worker, not the window global.
declare const self: ServiceWorkerGlobalScope
export const sw = self

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
  ports: readonly MessagePort[]
}

export interface PushDataLike {
  json(): unknown
  text(): string
}

export interface PushEventLike extends ExtendableEventLike {
  data?: PushDataLike | null
}

export interface NotificationEventLike extends ExtendableEventLike {
  action: string
  notification: Notification
}
