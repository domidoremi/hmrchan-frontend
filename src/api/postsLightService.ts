import { apiClient, type CursorCollectionResponse, type RequestConfig } from './client'
import { normalizePostExternalLinks, type PostExternalLink } from './postService'
import { buildQuery } from '@/utils/queryBuilder'

export interface PostsLightParams {
  limit?: number
  cursor?: string | null
}

export interface PostLightItem {
  id: string
  platform: string
  title?: string | null
  content?: string | null
  media_type?: 'video' | 'image' | 'text' | null
  thumbnail_url?: string | null
  thumbnail_width?: number
  thumbnail_height?: number
  published_at?: string
  view_count: number
  like_count: number
  media_count: number
  external_links: PostExternalLink[]
}

type RawPostLightItem = Omit<PostLightItem, 'external_links'> & {
  external_links?: unknown
}

type RawPostLightResponse = CursorCollectionResponse<RawPostLightItem> & {
  items?: RawPostLightItem[]
}

const DEFAULT_PARAMS = {
  limit: 20,
} as const

export const postsLightService = {
  async listLight(
    params: PostsLightParams = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<PostLightItem>> {
    const query = buildQuery({
      limit: params.limit ?? DEFAULT_PARAMS.limit,
      cursor: params.cursor ?? null,
    })

    const response = await apiClient.get<RawPostLightResponse>(`/posts/light${query}`, config)
    return {
      ...response,
      items: (response.items ?? []).map((item) => ({
        ...item,
        external_links: normalizePostExternalLinks(item.external_links, item.id),
      })),
      next_cursor: response.next_cursor ?? null,
      has_more: Boolean(response.has_more),
    }
  },

  async listMixed(
    params: PostsLightParams = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<PostLightItem>> {
    const query = buildQuery({
      limit: params.limit ?? DEFAULT_PARAMS.limit,
      cursor: params.cursor ?? null,
    })

    const response = await apiClient.get<RawPostLightResponse>(`/posts/mixed${query}`, config)
    return {
      ...response,
      items: (response.items ?? []).map((item) => ({
        ...item,
        external_links: normalizePostExternalLinks(item.external_links, item.id),
      })),
      next_cursor: response.next_cursor ?? null,
      has_more: Boolean(response.has_more),
    }
  },
}
