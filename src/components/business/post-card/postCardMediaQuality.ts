import { extractMediaIdFromUrl, getMediaStreamUrl } from '@/utils/mediaOptimizer'

export function shouldUpgradeThumbnailToOriginal({
  attempted,
  pending,
  highQualitySrc,
  thumbnailSize,
  duration,
  postType,
  naturalWidth,
}: {
  attempted: boolean
  pending: boolean
  highQualitySrc: string | null
  thumbnailSize: string | undefined
  duration?: number | null
  postType?: string | null
  naturalWidth: number
}): boolean {
  if (attempted || pending || highQualitySrc || thumbnailSize !== 'large') return false
  if (duration && duration > 0) return false

  const normalizedType = postType?.toLowerCase()
  if (
    normalizedType === 'video' ||
    normalizedType === 'short' ||
    normalizedType === 'live_replay'
  ) {
    return false
  }

  return naturalWidth > 0 && naturalWidth < 600
}

export async function resolveOriginalImageStream(thumbnailUrl: string): Promise<string | null> {
  const mediaId = extractMediaIdFromUrl(thumbnailUrl)
  if (!mediaId) return null

  const streamUrl = getMediaStreamUrl(mediaId)

  try {
    const response = await fetch(streamUrl, {
      headers: { Range: 'bytes=0-15' },
      credentials: 'same-origin',
    })
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    const probe = new Uint8Array(await response.arrayBuffer())
    return response.ok && isImageStreamResponse(contentType, probe) ? streamUrl : null
  } catch {
    return null
  }
}

function isImageStreamResponse(contentType: string, bytes: Uint8Array): boolean {
  if (contentType.startsWith('image/')) return true
  if (contentType !== 'application/octet-stream' || bytes.length < 12) return false

  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50

  return isJpeg || isPng || isWebp
}
