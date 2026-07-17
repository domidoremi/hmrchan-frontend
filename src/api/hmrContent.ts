import { apiClient } from '@/api/client'
import { shouldUseScheduleApi } from '@/api/runtimeFlags'
import { buildExplorePostsEndpoint, buildExploreSuggestionsEndpoint } from './hmrContentPlatforms'
import {
  mapAuthor,
  mapCommunityContent,
  mapDiscussionDetailContent,
  mapExploreContent,
  mapHomeContent,
  mapPostDetailContent,
  mapScheduleContent,
} from './hmrContentMappers'
import {
  endpointsForProfileSection,
  fallbackSupportContent,
  mapProfileSectionContent,
  mapSettingsContent,
} from './hmrProfileContent'
import type { HmrAsyncResource } from '@/hmr/types'
import type {
  HmrAuthor,
  HmrCommunityContent,
  HmrDiscussionDetailContent,
  HmrExploreContent,
  HmrHomeContent,
  HmrPost,
  HmrPostDetailContent,
  HmrProfileSectionContent,
  HmrScheduleContent,
  HmrSettingsContent,
  HmrSupportContent,
} from './hmrContentTypes'
import type { HmrExploreLoadOptions } from './hmrContentPlatforms'
import {
  combineEndpointResults,
  isPreviewMemberSession,
  makeResource,
  readEndpoint,
  readEndpointResult,
  shouldUseFallbackContent,
  toApiErrorState,
} from './hmrContentResources'
import type { EndpointResult } from './hmrContentResources'

export {
  fallbackAuthors,
  fallbackCommunity,
  fallbackPosts,
  fallbackScheduleItems,
  fallbackSuggestions,
  fallbackTrends,
  seedAuthors,
  seedCommunity,
  seedPosts,
  seedScheduleItems,
  seedSuggestions,
  seedTrends,
} from './hmrContentFallbacks'

export { MOMICHAN_PLATFORMS, normalizePlatformId, summarizePlatforms } from './hmrContentPlatforms'

export type {
  HmrAuthor,
  HmrCommunityContent,
  HmrCommunityItem,
  HmrDiscussionDetail,
  HmrDiscussionDetailContent,
  HmrDiscussionRelatedPost,
  HmrExploreContent,
  HmrHomeContent,
  HmrMediaItem,
  HmrPlatformSummary,
  HmrPost,
  HmrPostDetailContent,
  HmrProfileSectionContent,
  HmrProfileSectionKey,
  HmrScheduleContent,
  HmrSettingsContent,
  HmrSupportContent,
} from './hmrContentTypes'

export type { HmrExploreLoadOptions } from './hmrContentPlatforms'

export async function loadHomeContentResource(): Promise<HmrAsyncResource<HmrHomeContent>> {
  const results = await Promise.all([
    readEndpointResult<unknown>('/home', { skipAuth: true }),
    readEndpointResult<unknown>('/home/featured', { skipAuth: true }),
    readEndpointResult<unknown>('/home/story-deck', { skipAuth: true }),
    readEndpointResult<unknown>('/community/highlights', { skipAuth: true }),
    readEndpointResult<unknown>('/trends/summary', { skipAuth: true }),
    readEndpointResult<unknown>('/schedules/highlights', { skipAuth: true }),
    readEndpointResult<unknown>('/posts?limit=10', { skipAuth: true }),
  ])
  const [home, featured, storyDeck, community, trends, scheduleHighlights, publicPosts] = results
  const status = combineEndpointResults(results)

  return makeResource(
    mapHomeContent(
      home?.data,
      featured?.data,
      storyDeck?.data,
      community?.data,
      trends?.data,
      scheduleHighlights?.data,
      publicPosts?.data
    ),
    status
  )
}

export async function loadHomePrimaryContentResource(): Promise<HmrAsyncResource<HmrHomeContent>> {
  const featured = await readEndpointResult<unknown>('/home/featured', { skipAuth: true })

  return makeResource(
    mapHomeContent(null, featured.data, null, null, null, null, null),
    combineEndpointResults([featured])
  )
}

export async function loadHomeContent(): Promise<HmrHomeContent> {
  return (await loadHomeContentResource()).data
}

export async function loadExploreContentResource(
  options: HmrExploreLoadOptions = {}
): Promise<HmrAsyncResource<HmrExploreContent>> {
  const postsEndpoint = buildExplorePostsEndpoint(options)
  const suggestionQuery = options.query?.trim() ?? ''
  const [mixed, posts, authors, suggestions] = await Promise.all([
    readEndpointResult<unknown>('/posts/mixed?limit=6', { skipAuth: true }),
    readEndpointResult<unknown>(postsEndpoint, { skipAuth: true }),
    readEndpointResult<unknown>('/authors?limit=6', { skipAuth: true }),
    readEndpointResult<unknown>(buildExploreSuggestionsEndpoint(suggestionQuery), {
      skipAuth: true,
    }),
  ])
  const results = [mixed, posts, authors, suggestions]
  const status = combineEndpointResults(results)

  return makeResource(
    mapExploreContent(mixed.data, posts.data, authors.data, suggestions.data, options),
    status
  )
}

export async function loadExploreContent(
  options: HmrExploreLoadOptions = {}
): Promise<HmrExploreContent> {
  return (await loadExploreContentResource(options)).data
}

export async function loadAuthorDetailContentResource(
  id: string
): Promise<HmrAsyncResource<HmrAuthor>> {
  const normalizedId = id.trim() || 'editorial'
  const result = await readEndpointResult<unknown>(`/authors/${encodeURIComponent(normalizedId)}`, {
    skipAuth: true,
  })

  return makeResource(mapAuthor(result.data, 0), {
    source: result.source,
    error: result.error,
    paths: [result.path],
  })
}

export async function loadAuthorDetailContent(id: string): Promise<HmrAuthor> {
  return (await loadAuthorDetailContentResource(id)).data
}

export async function loadCommunityContentResource(): Promise<
  HmrAsyncResource<HmrCommunityContent>
> {
  const results = await Promise.all([
    readEndpointResult<unknown>('/community/stats', { skipAuth: true }),
    readEndpointResult<unknown>('/community/latest', { skipAuth: true }),
    readEndpointResult<unknown>('/community/hot', { skipAuth: true }),
    readEndpointResult<unknown>('/community/feed', { skipAuth: true }),
    readEndpointResult<unknown>('/discussions', { skipAuth: true }),
  ])
  const [stats, latest, hot, feed, discussions] = results

  return makeResource(
    mapCommunityContent(stats?.data, latest?.data, hot?.data, feed?.data, discussions?.data),
    combineEndpointResults(results)
  )
}

export async function loadCommunityContent(): Promise<HmrCommunityContent> {
  return (await loadCommunityContentResource()).data
}

export async function loadDiscussionDetailContentResource(
  id: string
): Promise<HmrAsyncResource<HmrDiscussionDetailContent>> {
  const normalizedId = id.trim() || 'discussion'
  const results = await Promise.all([
    readEndpointResult<unknown>(`/discussions/${encodeURIComponent(normalizedId)}`, {
      skipAuth: true,
    }),
    readEndpointResult<unknown>(`/discussions/${encodeURIComponent(normalizedId)}/comments`, {
      skipAuth: true,
    }),
  ])
  const [discussion, comments] = results
  const status = combineEndpointResults(results)
  const data = mapDiscussionDetailContent(normalizedId, discussion?.data, comments?.data)

  if (status.error?.kind === 'restricted') {
    data.discussion = {
      id: normalizedId,
      title: '讨论暂不可公开预览',
      content: '当前讨论对公开访问受限。你可以稍后重试，或继续浏览其他公开讨论。',
      category: '讨论',
      authorName: 'MomiChan',
      createdAt: '',
      updatedAt: '',
      lastActivityAt: '',
      tags: [],
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      isPinned: false,
      isClosed: false,
    }
    data.comments = []
    delete data.relatedPost
    data.viewState = 'restricted'
  } else if (status.error?.kind === 'not-found') {
    data.discussion.title = '讨论不存在或已下架'
    data.viewState = 'not-found'
  } else if (status.error) {
    data.viewState = 'temporary-unavailable'
  }

  return makeResource(data, status)
}

export async function loadDiscussionDetailContent(id: string): Promise<HmrDiscussionDetailContent> {
  return (await loadDiscussionDetailContentResource(id)).data
}

export async function loadPostDetail(id: string): Promise<HmrPost> {
  return (await loadPostDetailContent(id)).post
}

export async function loadPostDetailContentResource(
  id: string
): Promise<HmrAsyncResource<HmrPostDetailContent>> {
  const normalizedId = id.trim() || 'signal-room'
  const results = await Promise.all([
    readEndpointResult<unknown>(`/posts/${encodeURIComponent(normalizedId)}`, { skipAuth: true }),
    readEndpointResult<unknown>(`/posts/${encodeURIComponent(normalizedId)}/comments`, {
      skipAuth: true,
    }),
  ])
  const [post, comments] = results
  const status = combineEndpointResults(results)
  const data = mapPostDetailContent(normalizedId, post?.data, comments?.data)

  if (status.error?.kind === 'restricted') {
    data.post = {
      id: normalizedId,
      title: '内容暂不可公开预览',
      excerpt: '当前帖子对公开访问受限。你可以稍后重试，或继续浏览其他公开内容。',
      authorName: 'MomiChan',
      tag: '',
      createdAt: '',
      statsLabel: '公开预览受限',
    }
    data.relatedPosts = []
    data.comments = []
    data.media = []
    data.viewState = 'restricted'
  } else if (status.error?.kind === 'not-found') {
    data.viewState = 'not-found'
  } else if (status.error) {
    data.viewState = 'temporary-unavailable'
  }

  return makeResource(data, status)
}

export async function loadPostDetailContent(id: string): Promise<HmrPostDetailContent> {
  return (await loadPostDetailContentResource(id)).data
}

export async function loadScheduleContentResource(): Promise<HmrAsyncResource<HmrScheduleContent>> {
  const paths = ['/schedules', '/schedules/calendar', '/schedules/highlights']
  if (!shouldUseScheduleApi()) {
    return makeResource(mapScheduleContent(null, null, null), {
      source: 'local',
      paths,
    })
  }

  const results = await Promise.all([
    readEndpointResult<unknown>('/schedules', { skipAuth: true }),
    readEndpointResult<unknown>('/schedules/calendar', { skipAuth: true }),
    readEndpointResult<unknown>('/schedules/highlights', { skipAuth: true }),
  ])
  const [schedules, calendar, highlights] = results

  return makeResource(
    mapScheduleContent(schedules?.data, calendar?.data, highlights?.data),
    combineEndpointResults(results)
  )
}

export async function loadScheduleContent(): Promise<HmrScheduleContent> {
  return (await loadScheduleContentResource()).data
}

export async function loadProfileSectionContentResource(
  rawSection: string
): Promise<HmrAsyncResource<HmrProfileSectionContent>> {
  if (isPreviewMemberSession()) {
    const data = await mapProfileSectionContent(rawSection, async () => null)
    return makeResource(data, {
      source: 'local',
      error: null,
      paths: endpointsForProfileSection(rawSection),
    })
  }

  const endpointResults: EndpointResult<unknown>[] = []
  const reader = async <T>(path: string): Promise<T | null> => {
    const result = await readEndpointResult<T>(path)
    endpointResults.push(result)
    return result.data
  }
  const data = await mapProfileSectionContent(rawSection, reader)
  const status =
    endpointResults.length > 0
      ? combineEndpointResults(endpointResults)
      : {
          source: 'local' as const,
          error: null,
          paths: endpointsForProfileSection(rawSection),
        }

  return makeResource(data, status)
}

export async function loadProfileSectionContent(
  rawSection: string
): Promise<HmrProfileSectionContent> {
  const reader = async <T>(path: string): Promise<T | null> => readEndpoint<T | null>(path, null)
  return mapProfileSectionContent(rawSection, reader)
}

export async function loadSettingsContentResource(): Promise<HmrAsyncResource<HmrSettingsContent>> {
  if (isPreviewMemberSession()) {
    return makeResource(mapSettingsContent(null, null, null), {
      source: 'local',
      error: null,
      paths: ['/preferences', '/2fa/status', '/devices'],
    })
  }

  const results = await Promise.all([
    readEndpointResult<unknown>('/preferences'),
    readEndpointResult<unknown>('/2fa/status'),
    readEndpointResult<unknown>('/devices'),
  ])
  const [preferences, twoFactor, devices] = results

  return makeResource(
    mapSettingsContent(preferences?.data, twoFactor?.data, devices?.data),
    combineEndpointResults(results)
  )
}

export async function loadSettingsContent(): Promise<HmrSettingsContent> {
  return (await loadSettingsContentResource()).data
}

export async function loadSupportContentResource(): Promise<HmrAsyncResource<HmrSupportContent>> {
  return makeResource(fallbackSupportContent(), {
    source: 'local',
    error: null,
    paths: ['/contact/send', '/feedback'],
  })
}

export async function loadSupportContent(): Promise<HmrSupportContent> {
  return fallbackSupportContent()
}

export async function submitContactResource(
  payload: Record<string, string>
): Promise<HmrAsyncResource<{ delivered: boolean; endpoint: string }>> {
  if (shouldUseFallbackContent()) {
    void payload
    return makeResource(
      { delivered: true, endpoint: 'local-preview' },
      {
        source: 'local',
        error: {
          kind: 'network',
          message: '当前内容暂时不可用。',
          path: '/contact/send',
        },
        paths: ['/contact/send', '/feedback'],
      }
    )
  }

  try {
    await apiClient.post('/contact/send', payload)
    return makeResource(
      { delivered: true, endpoint: '/contact/send' },
      { source: 'api', error: null, paths: ['/contact/send'] }
    )
  } catch (contactError) {
    try {
      await apiClient.post('/feedback', payload)
      return makeResource(
        { delivered: true, endpoint: '/feedback' },
        {
          source: 'api',
          error: toApiErrorState(contactError, '/contact/send'),
          paths: ['/contact/send', '/feedback'],
        }
      )
    } catch (feedbackError) {
      return makeResource(
        { delivered: false, endpoint: '/feedback' },
        {
          source: 'local',
          error: toApiErrorState(feedbackError, '/feedback'),
          paths: ['/contact/send', '/feedback'],
        }
      )
    }
  }
}

export async function submitContact(payload: Record<string, string>): Promise<void> {
  const resource = await submitContactResource(payload)
  if (!resource.data.delivered && resource.error) {
    throw new Error(resource.error.message)
  }
}
