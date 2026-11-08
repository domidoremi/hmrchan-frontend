export { resolveOriginalImageStream } from '@/utils/mediaOptimizer'

export function shouldUpgradeThumbnailToOriginal({
  attempted,
  pending,
  highQualitySrc,
  thumbnailSize,
  duration,
  postType,
  naturalWidth,
  naturalHeight,
  renderedWidth,
  renderedHeight,
  pixelRatio = 1,
  fit = 'cover',
}: {
  attempted: boolean
  pending: boolean
  highQualitySrc: string | null
  thumbnailSize: string | undefined
  duration?: number | null
  postType?: string | null
  naturalWidth: number
  naturalHeight: number
  renderedWidth: number
  renderedHeight: number
  pixelRatio?: number
  fit?: 'cover' | 'contain'
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

  if (!naturalWidth || !naturalHeight || !renderedWidth || !renderedHeight) return false
  const widthScale = renderedWidth / naturalWidth
  const heightScale = renderedHeight / naturalHeight
  const scale =
    fit === 'contain' ? Math.min(widthScale, heightScale) : Math.max(widthScale, heightScale)
  return scale * pixelRatio > 1.05
}
