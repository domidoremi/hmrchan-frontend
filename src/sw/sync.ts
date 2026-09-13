import { sw } from './types'

export async function triggerClientSync(): Promise<void> {
  const clients = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true })
  if (!clients.length) {
    throw new Error('No window client is available to synchronize offline actions')
  }

  const results = await Promise.all(
    clients.map((client) => {
      return new Promise<{ ok: boolean; error?: string }>((resolve) => {
        const channel = new MessageChannel()
        const timeout = setTimeout(() => resolve({ ok: false, error: 'timeout' }), 15000)

        channel.port1.onmessage = (event) => {
          clearTimeout(timeout)
          const data: unknown = event.data
          if (data && typeof data === 'object' && 'ok' in data && data.ok === true) {
            resolve({ ok: true })
          } else {
            const error =
              data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
                ? data.error
                : 'invalid synchronization acknowledgement'
            resolve({ ok: false, error })
          }
        }

        client.postMessage({ type: 'SYNC_OFFLINE_ACTIONS' }, [channel.port2])
      })
    })
  )

  if (!results.some((result) => result.ok)) {
    const error = results.map((result) => result.error).find(Boolean) ?? 'client sync failed'
    throw new Error(`Offline action synchronization was not acknowledged: ${error}`)
  }
}
