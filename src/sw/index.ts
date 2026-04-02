import { handleFetch } from './fetch'
import { handleMessage } from './messages'
import { handleNotificationClick, handlePush } from './push'
import { swLog } from './runtime'
import { cleanupOutdatedCaches, precacheStaticAssets } from './strategies'
import { triggerClientSync } from './sync'
import {
  sw,
  type ExtendableEventLike,
  type FetchEventLike,
  type MessageEventLike,
  type NotificationEventLike,
  type PushEventLike,
  type SyncEventLike,
} from './types'

sw.addEventListener('install', (rawEvent) => {
  const event = rawEvent as ExtendableEventLike
  event.waitUntil(
    (async () => {
      await precacheStaticAssets()
      await sw.skipWaiting()
    })().catch((error) => {
      console.error('[SW] Install failed:', error)
    })
  )
})

sw.addEventListener('activate', (rawEvent) => {
  const event = rawEvent as ExtendableEventLike
  event.waitUntil(
    (async () => {
      await cleanupOutdatedCaches()

      const registrationWithPreload = sw.registration as ServiceWorkerRegistration & {
        navigationPreload?: {
          enable(): Promise<void>
        }
      }

      if (registrationWithPreload.navigationPreload) {
        try {
          await registrationWithPreload.navigationPreload.enable()
        } catch {
          // ignore
        }
      }

      await sw.clients.claim()
    })()
  )
})

sw.addEventListener('fetch', (rawEvent) => {
  handleFetch(rawEvent as FetchEventLike)
})

sw.addEventListener('sync', (rawEvent) => {
  const event = rawEvent as SyncEventLike
  swLog('[SW] Background sync:', event.tag)

  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(triggerClientSync())
  }
})

sw.addEventListener('push', (rawEvent) => {
  handlePush(rawEvent as PushEventLike)
})

sw.addEventListener('notificationclick', (rawEvent) => {
  handleNotificationClick(rawEvent as NotificationEventLike)
})

sw.addEventListener('message', (rawEvent) => {
  handleMessage(rawEvent as MessageEventLike)
})

swLog('[SW] Service Worker loaded')
