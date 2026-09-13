import type { HomeImageAsset } from '@/api'
import { resolveMediaSources } from '@/utils/mediaOptimizer'

function resolveHomeImageSource(image: Partial<HomeImageAsset> | null | undefined) {
  return {
    media_id: image?.media_id ?? null,
    media_type: image?.media_type ?? null,
    stream_url: image?.stream_url ?? null,
    thumbnail_url: image?.thumbnail_url ?? null,
    file_path: image?.url ?? null,
  }
}

export function mapHomeImageUrl(image: Partial<HomeImageAsset> | null | undefined): string | null {
  return resolveMediaSources(resolveHomeImageSource(image)).displayUrl
}

export function mapHomeImageMedia(image: Partial<HomeImageAsset> | null | undefined) {
  return {
    media_id: image?.media_id ?? null,
    media_type: image?.media_type ?? null,
    stream_url: image?.stream_url ?? null,
    thumbnail_url: image?.thumbnail_url ?? image?.url ?? null,
  }
}
