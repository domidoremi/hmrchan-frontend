import { sw } from './types'

export async function triggerClientSync(): Promise<boolean> {
  const clients = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true })
  if (!clients.length) return true

  const results = await Promise.all(
    clients.map((client) => {
      return new Promise<{ ok: boolean; error?: string }>((resolve) => {
        const channel = new MessageChannel()
        const timeout = setTimeout(() => resolve({ ok: false, error: 'timeout' }), 15000)

        channel.port1.onmessage = (event) => {
          clearTimeout(timeout)
          resolve((event.data as { ok?: boolean; error?: string } | undefined) || { ok: true })
        }

        client.postMessage({ type: 'SYNC_OFFLINE_ACTIONS' }, [channel.port2])
      })
    })
  )

  return results.some((result) => result.ok)
}
