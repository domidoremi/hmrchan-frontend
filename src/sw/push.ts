import { swLog } from './runtime'
import { sw, type NotificationEventLike, type PushEventLike } from './types'

interface PushPayload {
  title?: string
  body?: string
  url?: string
}

function parsePushPayload(
  event: PushEventLike
): Required<Pick<PushPayload, 'title' | 'body'>> & Pick<PushPayload, 'url'> {
  let payload: PushPayload = {
    title: '新消息',
    body: '您有新的内容更新',
  }

  if (!event.data) {
    return {
      title: payload.title || '新消息',
      body: payload.body || '您有新的内容更新',
      url: payload.url,
    }
  }

  try {
    payload = event.data.json() as PushPayload
  } catch {
    payload = {
      title: '新消息',
      body: event.data.text(),
    }
  }

  return {
    title: payload.title || '新消息',
    body: payload.body || '您有新的内容更新',
    url: payload.url,
  }
}

export function handlePush(event: PushEventLike): void {
  swLog('[SW] Push notification received')
  const payload = parsePushPayload(event)

  event.waitUntil(
    sw.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/sitting-192.webp',
      badge: '/icons/sitting-96.webp',
      data: payload.url || '/',
      actions: [
        { action: 'open', title: '查看' },
        { action: 'close', title: '关闭' },
      ],
    })
  )
}

export function handleNotificationClick(event: NotificationEventLike): void {
  swLog('[SW] Notification clicked:', event.action)
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  const urlToOpen = String(event.notification.data || '/')

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }

      if ('openWindow' in sw.clients) {
        return sw.clients.openWindow(urlToOpen)
      }

      return undefined
    })
  )
}
