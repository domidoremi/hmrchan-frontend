export { resolveOriginalImageStream } from '@/utils/mediaOptimizer'

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
