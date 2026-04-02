import { applyRuntimeConfig } from './runtime'
import { clearAllCaches, clearOldMedia, getCacheSize } from './strategies'
import { sw, type MessageEventLike } from './types'

export function handleMessage(event: MessageEventLike): void {
  const data =
    event.data && typeof event.data === 'object'
      ? (event.data as { type?: unknown; payload?: unknown })
      : {}
  const type = typeof data.type === 'string' ? data.type : ''

  switch (type) {
    case 'CONFIG':
      applyRuntimeConfig(data.payload)
      break

    case 'SKIP_WAITING':
      event.waitUntil(Promise.resolve(sw.skipWaiting()))
      break

    case 'CLEAR_CACHE':
      event.waitUntil(clearAllCaches())
      break

    case 'CLEAR_OLD_MEDIA':
      event.waitUntil(clearOldMedia())
      break

    case 'GET_CACHE_SIZE': {
      const port = event.ports[0]
      if (!port) break
      event.waitUntil(
        getCacheSize().then((size) => {
          port.postMessage({ size })
        })
      )
      break
    }

    default:
      break
  }
}
