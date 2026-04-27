import { ApiError, apiClient, type RequestConfig } from './client'
import {
  DEFAULT_PUBLIC_VISIBILITY_SCOPE,
  readPublicVisibilityHeaders,
  type PublicVisibilityScope,
} from './publicVisibility'
import { isServiceUnavailableError } from '@/fallbacks/publicPageFallback'
import { getContractResourceId } from '@/utils/contractResourceId'
import { getPublicSnapshot, setPublicSnapshot } from '@/utils/cache'

let homepageBootstrapFallbackPromise: Promise<HomeAggregateResponse> | null = null

async function loadHomepageBootstrapFallback(): Promise<HomeAggregateResponse> {
  if (!homepageBootstrapFallbackPromise) {
    homepageBootstrapFallbackPromise = import('@/fallbacks/homepageBootstrapFallback').then(
      ({ buildHomepageBootstrapFallback }) => buildHomepageBootstrapFallback()
    )
  }

  return homepageBootstrapFallbackPromise
}

export interface HomeImageAsset {
  url: string
  width: number | null
  height: number | null
  thumbnail_url: string
  alt: string
}

export interface HomeAuthorBrief {
  id: string | null
  display_name: string
  username: string | null
  avatar_url: string | null
  profile_url: string | null
  deep_link: string
  is_verified?: boolean | null
}

export interface HomeTagBrief {
  name: string
  display_text: string
  post_count?: number
  growth_rate?: number | null
  deep_link: string
}

export interface HomeHeroStat {
  key: string
  label: string
  value: number
  display_value: string
  hint: string
}

export interface HomeEditorialCard {
  post_id: string | null
  title: string | null
  text: string | null
  author: HomeAuthorBrief | null
  published_at?: string | null
  time_hint?: string | null
  tags: HomeTagBrief[]
  deep_link: string
}

export interface HomeHeroSpotlight {
  post_id: string | null
  title: string | null
  summary: string | null
  author: HomeAuthorBrief | null
  primary_tag?: HomeTagBrief | null
  image?: HomeImageAsset | null
  deep_link: string
}

export type HomePortalPreviewAuthor = HomeAuthorBrief | string | null

export interface HomePortalPreview {
  title: string
  summary: string
  meta: string
  deep_link: string
  author?: HomePortalPreviewAuthor
  image?: HomeImageAsset | null
}

export interface HomePortalItem {
  key: string
  title: string
  description: string
  count: number
  display_count: string
  icon: string
  accent: string
  deep_link: string
  preview?: HomePortalPreview | null
}

export interface HomeFeaturedAction {
  label: string
  type: string
  target: string
  tracking_key?: string | null
}

export interface HomeFeaturedRelatedPost {
  id?: string | null
  post_id?: string | null
  title?: string | null
  summary?: string | null
  excerpt?: string | null
  image?: HomeImageAsset | null
  cover?: HomeImageAsset | null
  thumbnail?: HomeImageAsset | null
  author?: HomeAuthorBrief | null
  content_type?: string | null
  platform?: string | null
  tags?: HomeTagBrief[]
  metrics?: {
    comment_count?: number | null
    like_count?: number | null
    share_count?: number | null
    view_count?: number | null
  } | null
  published_at?: string | null
  meta?: string | null
  deep_link?: string | null
}

export interface HomeFeaturedItem {
  id: string
  kind: string
  kicker: string
  title: string
  subtitle: string
  summary: string
  cover?: HomeImageAsset | null
  accent?: string | null
  primary_cta?: HomeFeaturedAction | null
  secondary_cta?: HomeFeaturedAction | null
  related_posts?: HomeFeaturedRelatedPost[]
  related_authors?: HomeAuthorBrief[]
}

export interface HomeLatestTextPostItem {
  rank: number
  post_id: string
  excerpt: string
  author: HomeAuthorBrief | null
  published_at?: string | null
  time_hint?: string | null
  tags: HomeTagBrief[]
  deep_link: string
}

export interface TrendsSummaryStats {
  fresh_post_count: number
  active_author_count: number
  rising_tag_count: number
}

export interface TrendsSummaryAuthor {
  id: string | null
  display_name: string
  avatar_url: string | null
  post_count: number
  engagement_score: number
  deep_link: string
}

export interface TrendsSummaryResponse {
  window: '24h' | '7d' | '30d' | string
  generated_at: string
  stats: TrendsSummaryStats
  tags: HomeTagBrief[]
  authors: TrendsSummaryAuthor[]
}

export interface HomeStoryDeckItem {
  rank: number
  post_id: string
  eyebrow: string
  title: string
  summary: string
  image?: HomeImageAsset | null
  author: HomeAuthorBrief | null
  published_at?: string | null
  meta?: string | null
  deep_link: string
}

export interface HomeScheduleHighlight {
  id: string
  title: string
  category: 'live' | 'media' | 'birth' | 'other' | string
  start_date: string
  end_date?: string | null
  is_all_day: boolean
  author: HomeAuthorBrief | null
  badge?: string | null
  deep_link: string
}

export interface HomeCommunityHighlight {
  discussion_id: string
  title: string
  excerpt: string
  comment_count: number
  participant_count: number
  updated_at: string
  deep_link: string
  author?: HomeAuthorBrief | null
}

export interface HomeAggregateResponse {
  version: string
  generated_at: string
  ttl_seconds?: number
  hero: {
    editorial_card: HomeEditorialCard | null
    spotlight: HomeHeroSpotlight | null
    stats: HomeHeroStat[]
    trending_tags: HomeTagBrief[]
  }
  portal: {
    items: HomePortalItem[]
  }
  featured: {
    items: HomeFeaturedItem[]
  }
  trends: {
    authors: TrendsSummaryAuthor[]
    tags: HomeTagBrief[]
    schedules: HomeScheduleHighlight[]
    community: HomeCommunityHighlight[]
  }
  latest_text_posts: HomeLatestTextPostItem[]
  story_deck: {
    items: HomeStoryDeckItem[]
    total: number
  }
}

export interface HomeFeaturedResponse {
  items: HomeFeaturedItem[]
}

export interface HomeStoryDeckResponse {
  items: HomeStoryDeckItem[]
  total: number
}

export interface HomeLatestTextPostsResponse {
  items: HomeLatestTextPostItem[]
  total: number
}

export interface HomeScheduleHighlightsResponse {
  items: HomeScheduleHighlight[]
  generated_at: string
}

export interface HomeCommunityHighlightsResponse {
  items: HomeCommunityHighlight[]
  generated_at: string
}

export interface HomeApiResult<T> {
  payload: T
  visibility: PublicVisibilityScope
  etag: string | null
}

export interface HomeBootstrapResult extends HomeApiResult<HomeAggregateResponse> {
  source: 'aggregate' | 'support' | 'cached' | 'fallback'
  reason?: string | null
}

const HOME_BOOTSTRAP_SNAPSHOT_SCOPE = 'home/bootstrap'

function collectHomeHeaders(config?: RequestConfig) {
  const meta = {
    visibility: DEFAULT_PUBLIC_VISIBILITY_SCOPE,
    etag: null as string | null,
  }

  return {
    meta,
    onResponseHeaders(headers: Headers) {
      meta.visibility = readPublicVisibilityHeaders(headers)
      meta.etag = headers.get('ETag')
      config?.onResponseHeaders?.(headers)
    },
  }
}

function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue
    query.set(key, String(value))
  }

  const serialized = query.toString()
  return serialized ? `?${serialized}` : ''
}

function normalizeHomeLink(link: string | null | undefined): string {
  const value = String(link ?? '').trim()
  if (!value) return ''
  if (value.startsWith('/post/')) {
    const parsed = value.match(/^\/post\/([^/?#]+)(.*)$/i)
    if (!parsed) return ''
    const publicPostId = getContractResourceId(parsed[1])
    return publicPostId ? `/post/${publicPostId}${parsed[2] ?? ''}` : ''
  }
  if (value.startsWith('/discussion/')) {
    return value
  }
  return value
}

function normalizeAuthorBrief(author: HomeAuthorBrief | null | undefined): HomeAuthorBrief | null {
  if (!author) return null
  return {
    ...author,
    deep_link: normalizeHomeLink(author.deep_link),
  }
}

function normalizeTagBrief(tag: HomeTagBrief): HomeTagBrief {
  return {
    ...tag,
    deep_link: normalizeHomeLink(tag.deep_link),
  }
}

function normalizeImageAsset(image: HomeImageAsset | null | undefined): HomeImageAsset | null {
  if (!image) return null
  return { ...image }
}

function normalizePortalPreviewAuthor(
  author: HomePortalPreviewAuthor | undefined
): HomePortalPreviewAuthor {
  if (!author) return null
  if (typeof author === 'string') {
    const value = author.trim()
    return value || null
  }
  return normalizeAuthorBrief(author)
}

function normalizePortalPreview(
  preview: HomePortalPreview | null | undefined
): HomePortalPreview | null {
  if (!preview) return null
  return {
    ...preview,
    author: normalizePortalPreviewAuthor(preview.author),
    image: normalizeImageAsset(preview.image),
    deep_link: normalizeHomeLink(preview.deep_link),
  }
}

function normalizeFeaturedItem(item: HomeFeaturedItem): HomeFeaturedItem {
  return {
    ...item,
    cover: normalizeImageAsset(item.cover),
    primary_cta: item.primary_cta
      ? {
          ...item.primary_cta,
          target: normalizeHomeLink(item.primary_cta.target),
        }
      : null,
    secondary_cta: item.secondary_cta
      ? {
          ...item.secondary_cta,
          target: normalizeHomeLink(item.secondary_cta.target),
        }
      : null,
    related_posts: (item.related_posts ?? []).map((post) => ({
      ...post,
      image: normalizeImageAsset(post.image ?? post.thumbnail),
      cover: normalizeImageAsset(post.cover ?? post.thumbnail),
      thumbnail: normalizeImageAsset(post.thumbnail ?? post.image ?? post.cover),
      author: normalizeAuthorBrief(post.author),
      deep_link: normalizeHomeLink(post.deep_link),
    })),
    related_authors: (item.related_authors ?? []).map((author) => normalizeAuthorBrief(author)!),
  }
}

function normalizeStoryDeckItem(item: HomeStoryDeckItem): HomeStoryDeckItem {
  return {
    ...item,
    image: normalizeImageAsset(item.image),
    author: normalizeAuthorBrief(item.author),
    deep_link: normalizeHomeLink(item.deep_link),
  }
}

function normalizeLatestTextItem(item: HomeLatestTextPostItem): HomeLatestTextPostItem {
  return {
    ...item,
    author: normalizeAuthorBrief(item.author),
    tags: (item.tags ?? []).map(normalizeTagBrief),
    deep_link: normalizeHomeLink(item.deep_link),
  }
}

function normalizeScheduleHighlight(item: HomeScheduleHighlight): HomeScheduleHighlight {
  return {
    ...item,
    author: normalizeAuthorBrief(item.author),
    deep_link: normalizeHomeLink(item.deep_link),
  }
}

function normalizeCommunityHighlight(item: HomeCommunityHighlight): HomeCommunityHighlight {
  return {
    ...item,
    author: normalizeAuthorBrief(item.author),
    deep_link: normalizeHomeLink(item.deep_link),
  }
}

function normalizeAggregate(payload: HomeAggregateResponse): HomeAggregateResponse {
  return {
    ...payload,
    hero: {
      editorial_card: payload.hero?.editorial_card
        ? {
            ...payload.hero.editorial_card,
            author: normalizeAuthorBrief(payload.hero.editorial_card.author),
            tags: (payload.hero.editorial_card.tags ?? []).map(normalizeTagBrief),
            deep_link: normalizeHomeLink(payload.hero.editorial_card.deep_link),
          }
        : null,
      spotlight: payload.hero?.spotlight
        ? {
            ...payload.hero.spotlight,
            author: normalizeAuthorBrief(payload.hero.spotlight.author),
            primary_tag: payload.hero.spotlight.primary_tag
              ? normalizeTagBrief(payload.hero.spotlight.primary_tag)
              : null,
            image: normalizeImageAsset(payload.hero.spotlight.image),
            deep_link: normalizeHomeLink(payload.hero.spotlight.deep_link),
          }
        : null,
      stats: payload.hero?.stats ?? [],
      trending_tags: (payload.hero?.trending_tags ?? []).map(normalizeTagBrief),
    },
    portal: {
      items: (payload.portal?.items ?? []).map((item) => ({
        ...item,
        deep_link: normalizeHomeLink(item.deep_link),
        preview: normalizePortalPreview(item.preview),
      })),
    },
    featured: {
      items: (payload.featured?.items ?? []).map(normalizeFeaturedItem),
    },
    trends: {
      authors: (payload.trends?.authors ?? []).map((author) => ({
        ...author,
        deep_link: normalizeHomeLink(author.deep_link),
      })),
      tags: (payload.trends?.tags ?? []).map(normalizeTagBrief),
      schedules: (payload.trends?.schedules ?? []).map(normalizeScheduleHighlight),
      community: (payload.trends?.community ?? []).map(normalizeCommunityHighlight),
    },
    latest_text_posts: (payload.latest_text_posts ?? []).map(normalizeLatestTextItem),
    story_deck: {
      items: (payload.story_deck?.items ?? []).map(normalizeStoryDeckItem),
      total: payload.story_deck?.total ?? 0,
    },
  }
}

function getPrimaryFeaturedAuthor(
  item: HomeFeaturedItem | null | undefined
): HomeAuthorBrief | null {
  if (!item) return null
  return item.related_authors?.[0] ?? item.related_posts?.[0]?.author ?? null
}

function buildPortalItems(data: {
  featured: HomeFeaturedResponse
  trends: TrendsSummaryResponse
  schedules: HomeScheduleHighlightsResponse
  community: HomeCommunityHighlightsResponse
}): HomePortalItem[] {
  const featuredCount = data.featured.items.length
  const authorCount = data.trends.authors.length
  const scheduleCount = data.schedules.items.length
  const communityCount = data.community.items.length

  return [
    {
      key: 'recommend',
      title: 'Featured',
      description: 'Curated full-screen stories for the homepage',
      count: featuredCount,
      display_count: String(featuredCount),
      icon: 'sparkles',
      accent: 'mist',
      deep_link: '/explore',
    },
    {
      key: 'authors',
      title: 'Authors',
      description: 'Active creators from the current public content window',
      count: authorCount,
      display_count: String(authorCount),
      icon: 'users',
      accent: 'sky',
      deep_link: '/authors',
    },
    {
      key: 'schedule',
      title: 'Schedule',
      description: 'Upcoming published events that are already safe for public browse',
      count: scheduleCount,
      display_count: String(scheduleCount),
      icon: 'calendar',
      accent: 'sun',
      deep_link: '/schedule',
    },
    {
      key: 'community',
      title: 'Community',
      description: 'Discussions bubbling up from the latest public conversations',
      count: communityCount,
      display_count: String(communityCount),
      icon: 'message-circle',
      accent: 'mint',
      deep_link: '/community',
    },
  ]
}

function buildAggregateFromSupport(data: {
  featured: HomeFeaturedResponse
  storyDeck: HomeStoryDeckResponse
  latestTextPosts: HomeLatestTextPostsResponse
  trends: TrendsSummaryResponse
  schedules: HomeScheduleHighlightsResponse
  community: HomeCommunityHighlightsResponse
}): HomeAggregateResponse {
  const editorial = data.latestTextPosts.items[0] ?? null
  const spotlight = data.featured.items[0] ?? null
  const spotlightAuthor = getPrimaryFeaturedAuthor(spotlight)

  return normalizeAggregate({
    version: 'home.v1',
    generated_at:
      data.trends.generated_at ||
      data.schedules.generated_at ||
      data.community.generated_at ||
      new Date().toISOString(),
    ttl_seconds: 60,
    hero: {
      editorial_card: editorial
        ? {
            post_id: editorial.post_id,
            title: editorial.author?.display_name || editorial.excerpt,
            text: editorial.excerpt,
            author: editorial.author,
            published_at: editorial.published_at ?? null,
            time_hint: editorial.time_hint ?? null,
            tags: editorial.tags ?? [],
            deep_link: editorial.deep_link,
          }
        : null,
      spotlight: spotlight
        ? {
            post_id:
              spotlight.related_posts?.[0]?.post_id ??
              spotlight.related_posts?.[0]?.id ??
              spotlight.primary_cta?.target.replace(/^\/post\//, '') ??
              null,
            title: spotlight.title,
            summary: spotlight.summary || spotlight.subtitle,
            author: spotlightAuthor,
            primary_tag: null,
            image: spotlight.cover ?? null,
            deep_link: spotlight.primary_cta?.target ?? '',
          }
        : null,
      stats: [
        {
          key: 'updates',
          label: 'Updates',
          value: data.trends.stats.fresh_post_count,
          display_value: String(data.trends.stats.fresh_post_count),
          hint: 'fresh posts in this window',
        },
        {
          key: 'authors',
          label: 'Authors',
          value: data.trends.stats.active_author_count,
          display_value: String(data.trends.stats.active_author_count),
          hint: 'active authors in this window',
        },
        {
          key: 'tags',
          label: 'Tags',
          value: data.trends.stats.rising_tag_count,
          display_value: String(data.trends.stats.rising_tag_count),
          hint: 'rising tags in this window',
        },
      ],
      trending_tags: data.trends.tags ?? [],
    },
    portal: {
      items: buildPortalItems({
        featured: data.featured,
        trends: data.trends,
        schedules: data.schedules,
        community: data.community,
      }),
    },
    featured: data.featured,
    trends: {
      authors: data.trends.authors,
      tags: data.trends.tags,
      schedules: data.schedules.items,
      community: data.community.items,
    },
    latest_text_posts: data.latestTextPosts.items,
    story_deck: data.storyDeck,
  })
}

async function getWithMeta<T>(endpoint: string, config?: RequestConfig): Promise<HomeApiResult<T>> {
  const { meta, onResponseHeaders } = collectHomeHeaders(config)
  const payload = await apiClient.get<T>(endpoint, {
    ...config,
    onResponseHeaders,
  })

  return {
    payload,
    visibility: meta.visibility,
    etag: meta.etag,
  }
}

function resolveBootstrapFallbackReason(error: unknown): string | null {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return null
}

export const homeService = {
  async getHome(config?: RequestConfig): Promise<HomeApiResult<HomeAggregateResponse>> {
    const result = await getWithMeta<HomeAggregateResponse>('/home', config)
    return {
      ...result,
      payload: normalizeAggregate(result.payload),
    }
  },

  async getFeatured(
    limit = 4,
    config?: RequestConfig
  ): Promise<HomeApiResult<HomeFeaturedResponse>> {
    const result = await getWithMeta<HomeFeaturedResponse>(
      `/home/featured${buildQuery({ limit })}`,
      config
    )
    return {
      ...result,
      payload: {
        items: (result.payload.items ?? []).map(normalizeFeaturedItem),
      },
    }
  },

  async getStoryDeck(
    limit = 5,
    config?: RequestConfig
  ): Promise<HomeApiResult<HomeStoryDeckResponse>> {
    const result = await getWithMeta<HomeStoryDeckResponse>(
      `/home/story-deck${buildQuery({ limit })}`,
      config
    )
    return {
      ...result,
      payload: {
        items: (result.payload.items ?? []).map(normalizeStoryDeckItem),
        total: result.payload.total ?? 0,
      },
    }
  },

  async getLatestTextPosts(
    limit = 10,
    config?: RequestConfig
  ): Promise<HomeApiResult<HomeLatestTextPostsResponse>> {
    const result = await getWithMeta<HomeLatestTextPostsResponse>(
      `/posts/text/latest${buildQuery({ limit })}`,
      config
    )
    return {
      ...result,
      payload: {
        items: (result.payload.items ?? []).map(normalizeLatestTextItem),
        total: result.payload.total ?? 0,
      },
    }
  },

  async getTrendsSummary(
    window = '7d',
    config?: RequestConfig
  ): Promise<HomeApiResult<TrendsSummaryResponse>> {
    const result = await getWithMeta<TrendsSummaryResponse>(
      `/trends/summary${buildQuery({ window })}`,
      config
    )
    return {
      ...result,
      payload: {
        ...result.payload,
        tags: (result.payload.tags ?? []).map(normalizeTagBrief),
        authors: (result.payload.authors ?? []).map((author) => ({
          ...author,
          deep_link: normalizeHomeLink(author.deep_link),
        })),
      },
    }
  },

  async getScheduleHighlights(
    limit = 6,
    config?: RequestConfig
  ): Promise<HomeApiResult<HomeScheduleHighlightsResponse>> {
    const result = await getWithMeta<HomeScheduleHighlightsResponse>(
      `/schedules/highlights${buildQuery({ limit })}`,
      config
    )
    return {
      ...result,
      payload: {
        ...result.payload,
        items: (result.payload.items ?? []).map(normalizeScheduleHighlight),
      },
    }
  },

  async getCommunityHighlights(
    limit = 6,
    config?: RequestConfig
  ): Promise<HomeApiResult<HomeCommunityHighlightsResponse>> {
    const result = await getWithMeta<HomeCommunityHighlightsResponse>(
      `/community/highlights${buildQuery({ limit })}`,
      config
    )
    return {
      ...result,
      payload: {
        ...result.payload,
        items: (result.payload.items ?? []).map(normalizeCommunityHighlight),
      },
    }
  },

  async loadHomepageBootstrap(config?: RequestConfig): Promise<HomeBootstrapResult> {
    const cachedSnapshot = await getPublicSnapshot<HomeAggregateResponse>(
      HOME_BOOTSTRAP_SNAPSHOT_SCOPE
    )

    const buildUnavailableResult = async (reason: string | null): Promise<HomeBootstrapResult> => {
      if (cachedSnapshot) {
        return {
          payload: cachedSnapshot,
          visibility: DEFAULT_PUBLIC_VISIBILITY_SCOPE,
          etag: null,
          source: 'cached',
          reason,
        }
      }

      return {
        payload: await loadHomepageBootstrapFallback(),
        visibility: DEFAULT_PUBLIC_VISIBILITY_SCOPE,
        etag: null,
        source: 'fallback',
        reason,
      }
    }

    try {
      const result = await this.getHome(config)
      await setPublicSnapshot(HOME_BOOTSTRAP_SNAPSHOT_SCOPE, {}, result.payload)
      return {
        ...result,
        source: 'aggregate',
        reason: null,
      }
    } catch (aggregateError) {
      if (isServiceUnavailableError(aggregateError)) {
        return buildUnavailableResult(resolveBootstrapFallbackReason(aggregateError))
      }

      const [
        featuredResult,
        storyDeckResult,
        latestTextPostsResult,
        trendsResult,
        scheduleHighlightsResult,
        communityHighlightsResult,
      ] = await Promise.allSettled([
        this.getFeatured(4, config),
        this.getStoryDeck(5, config),
        this.getLatestTextPosts(10, config),
        this.getTrendsSummary('7d', config),
        this.getScheduleHighlights(6, config),
        this.getCommunityHighlights(6, config),
      ])

      if (
        featuredResult.status !== 'fulfilled' ||
        storyDeckResult.status !== 'fulfilled' ||
        latestTextPostsResult.status !== 'fulfilled' ||
        trendsResult.status !== 'fulfilled' ||
        scheduleHighlightsResult.status !== 'fulfilled' ||
        communityHighlightsResult.status !== 'fulfilled'
      ) {
        return buildUnavailableResult(resolveBootstrapFallbackReason(aggregateError))
      }

      const payload = buildAggregateFromSupport({
        featured: featuredResult.value.payload,
        storyDeck: storyDeckResult.value.payload,
        latestTextPosts: latestTextPostsResult.value.payload,
        trends: trendsResult.value.payload,
        schedules: scheduleHighlightsResult.value.payload,
        community: communityHighlightsResult.value.payload,
      })
      await setPublicSnapshot(HOME_BOOTSTRAP_SNAPSHOT_SCOPE, {}, payload)

      return {
        payload,
        visibility:
          featuredResult.value.visibility ??
          storyDeckResult.value.visibility ??
          latestTextPostsResult.value.visibility,
        etag: null,
        source: 'support',
        reason: null,
      }
    }
  },
}
