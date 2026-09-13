// Range is a request, not a guarantee: never buffer an entire original media file.
const PROBE_BYTES = 16
const PROBE_TIMEOUT_MS = 5000

export async function probeImageStream(
  url: string,
  isImage: (contentType: string, bytes: Uint8Array) => boolean
): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  let response: Response | undefined
  try {
    response = await fetch(url, {
      headers: { Range: `bytes=0-${PROBE_BYTES - 1}` },
      credentials: 'same-origin',
      signal: controller.signal,
    })
    if (!response.ok) return null
    const contentType =
      response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() ?? ''
    if (contentType.startsWith('image/')) return url
    if (contentType !== 'application/octet-stream' || !response.body) return null

    reader = response.body.getReader()
    const prefix = new Uint8Array(PROBE_BYTES)
    let length = 0
    while (length < prefix.length) {
      const { done, value } = await reader.read()
      if (done) break
      const bytes = value.subarray(0, prefix.length - length)
      prefix.set(bytes, length)
      length += bytes.length
    }
    return isImage(contentType, prefix.subarray(0, length)) ? url : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
    // Do not delay rendering while the network acknowledges cancellation.
    if (reader) {
      void reader.cancel().catch(() => {})
      reader.releaseLock()
    } else if (response?.body) {
      void response.body.cancel().catch(() => {})
    }
    controller.abort()
  }
}
