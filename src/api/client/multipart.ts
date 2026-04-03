const encoder = new TextEncoder()

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const merged = new Uint8Array(totalLength)

  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }

  return merged
}

function encodeHeader(value: string): Uint8Array {
  return encoder.encode(value)
}

function normalizeFilename(value: string): string {
  return value.replace(/"/g, '%22')
}

export async function buildMultipartRequestBody(formData: FormData): Promise<{
  body: Uint8Array
  contentType: string
}> {
  const boundary = `----momi-${crypto.randomUUID()}`
  const chunks: Uint8Array[] = []

  for (const [name, value] of formData.entries()) {
    chunks.push(encodeHeader(`--${boundary}\r\n`))

    if (value instanceof Blob) {
      const filename = value instanceof File && value.name ? normalizeFilename(value.name) : 'blob'
      const contentType = value.type || 'application/octet-stream'
      chunks.push(
        encodeHeader(
          `Content-Disposition: form-data; name="${normalizeFilename(name)}"; filename="${filename}"\r\n`
        )
      )
      chunks.push(encodeHeader(`Content-Type: ${contentType}\r\n\r\n`))
      chunks.push(new Uint8Array(await value.arrayBuffer()))
      chunks.push(encodeHeader('\r\n'))
      continue
    }

    chunks.push(
      encodeHeader(`Content-Disposition: form-data; name="${normalizeFilename(name)}"\r\n\r\n`)
    )
    chunks.push(encodeHeader(String(value)))
    chunks.push(encodeHeader('\r\n'))
  }

  chunks.push(encodeHeader(`--${boundary}--\r\n`))

  return {
    body: concatUint8Arrays(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  }
}
