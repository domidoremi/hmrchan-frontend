import { normalizeToThumbnailUrl } from '@/utils/mediaOptimizer'

function normalizeImageUrl(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function mapHomeImageUrl(
  image:
    | { url?: string | null | undefined; thumbnail_url?: string | null | undefined }
    | null
    | undefined,
  size: 'small' | 'medium' | 'large' = 'large'
): string | null {
  const source = normalizeImageUrl(image?.url) || normalizeImageUrl(image?.thumbnail_url)
  if (!source) return null
  return normalizeToThumbnailUrl(source, size) || source
}
