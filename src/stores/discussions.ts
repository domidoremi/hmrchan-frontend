/**
 * Discussions Store - 讨论状态管理
 *
 * 集中管理讨论列表、筛选、排序、点赞状态
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  discussionService,
  type Discussion,
  type DiscussionComment,
  type DiscussionCommentListResponse,
  type ListDiscussionsParams,
  type DiscussionCategory,
} from '@/api/discussionService'
import { normalizeDiscussionsSummaryCount } from '@/api/summaryCounts'
import type { RequestConfig } from '@/api/client'
import {
  getFallbackDiscussionById,
  getFallbackDiscussionCommentsCursor,
  getFallbackDiscussionsCursor,
} from '@/fallbacks/communityFallback'
import {
  isServiceUnavailableError,
  type PublicPageDataSource,
} from '@/fallbacks/publicPageFallback'
import { getPublicSnapshot, setPublicSnapshot } from '@/utils/cache'

const DISCUSSIONS_LIST_SNAPSHOT_SCOPE = 'community/discussions'
const DISCUSSION_DETAIL_SNAPSHOT_SCOPE = 'community/discussion'
const DISCUSSION_COMMENTS_SNAPSHOT_SCOPE = 'community/discussion-comments'

export const useDiscussionsStore = defineStore('discussions', () => {
  const items = ref<Discussion[]>([])
  const total = ref<number | null>(null)
  const nextCursor = ref<string | null>(null)
  const pageSize = ref(20)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const source = ref<PublicPageDataSource>('live')

  // 当前筛选/排序
  const currentCategory = ref<DiscussionCategory | undefined>(undefined)
  const currentSort = ref<ListDiscussionsParams['sort']>('latest')

  // 当前查看的讨论详情
  const currentDiscussion = ref<Discussion | null>(null)
  const currentComments = ref<DiscussionComment[]>([])
  const commentsTotal = ref(0)
  const commentsNextCursor = ref<string | null>(null)
  const commentsLoading = ref(false)
  const hasMoreCommentsState = ref(false)
  let fetchDiscussionController: AbortController | null = null
  let fetchDiscussionToken = 0
  let fetchDiscussionsController: AbortController | null = null
  let fetchDiscussionsToken = 0
  let fetchCommentsController: AbortController | null = null
  let fetchCommentsToken = 0

  const hasMoreState = ref(false)
  const hasMore = computed(() => hasMoreState.value)
  const hasMoreComments = computed(() => hasMoreCommentsState.value)

  function abortFetchDiscussions() {
    fetchDiscussionsController?.abort()
    fetchDiscussionsController = null
  }

  function abortFetchComments() {
    fetchCommentsController?.abort()
    fetchCommentsController = null
  }

  function abortFetchDiscussion() {
    fetchDiscussionController?.abort()
    fetchDiscussionController = null
  }

  function isAbortError(err: unknown): boolean {
    return err instanceof DOMException
      ? err.name === 'AbortError'
      : err instanceof Error && err.name === 'AbortError'
  }

  async function fetchDiscussions(reset = false): Promise<boolean> {
    if (reset) {
      abortFetchDiscussions()
    } else if (isLoading.value) {
      return false
    }

    const controller = new AbortController()
    fetchDiscussionsController = controller
    const requestToken = ++fetchDiscussionsToken
    isLoading.value = true
    error.value = null

    try {
      const params: ListDiscussionsParams = {
        limit: pageSize.value,
        cursor: reset ? null : nextCursor.value,
        category: currentCategory.value,
        sort: currentSort.value,
      }

      const res = await discussionService.list(params, {
        signal: controller.signal,
        skipErrorToast: true,
      })
      if (controller.signal.aborted || requestToken !== fetchDiscussionsToken) return false

      if (reset) {
        items.value = res.items
      } else {
        const existingIds = new Set(items.value.map((d) => d.id))
        const newItems = res.items.filter((d) => !existingIds.has(d.id))
        items.value = [...items.value, ...newItems]
      }

      nextCursor.value = res.next_cursor ?? null
      hasMoreState.value = Boolean(res.has_more && res.next_cursor)
      source.value = 'live'
      await setPublicSnapshot(DISCUSSIONS_LIST_SNAPSHOT_SCOPE, params, res)
      if (reset) {
        void refreshSummary()
      }
      return true
    } catch (err) {
      if (controller.signal.aborted || requestToken !== fetchDiscussionsToken) return false

      if (isServiceUnavailableError(err)) {
        const params: ListDiscussionsParams = {
          limit: pageSize.value,
          cursor: reset ? null : nextCursor.value,
          category: currentCategory.value,
          sort: currentSort.value,
        }
        const cachedRes = await getPublicSnapshot<{
          items: Discussion[]
          next_cursor?: string | null
          has_more: boolean
        }>(DISCUSSIONS_LIST_SNAPSHOT_SCOPE, params)
        const fallbackRes = cachedRes ?? getFallbackDiscussionsCursor(params)

        if (reset) {
          items.value = fallbackRes.items
        } else {
          const existingIds = new Set(items.value.map((d) => d.id))
          const newItems = fallbackRes.items.filter((d) => !existingIds.has(d.id))
          items.value = [...items.value, ...newItems]
        }

        nextCursor.value = fallbackRes.next_cursor ?? null
        hasMoreState.value = Boolean(fallbackRes.has_more && fallbackRes.next_cursor)
        source.value = cachedRes ? 'cached' : 'fallback'
        error.value = null
        return true
      }

      error.value = 'community.error.fetchFailed'
      return false
    } finally {
      if (requestToken === fetchDiscussionsToken) {
        isLoading.value = false
        if (fetchDiscussionsController === controller) {
          fetchDiscussionsController = null
        }
      }
    }
  }

  async function loadMore(): Promise<boolean> {
    if (!hasMore.value || isLoading.value) return false
    return fetchDiscussions(false)
  }

  async function refreshSummary(): Promise<void> {
    try {
      const summary = await discussionService.getSummary({ skipErrorToast: true })
      total.value = normalizeDiscussionsSummaryCount(summary)
    } catch {
      total.value = items.value.length > 0 ? items.value.length : null
    }
  }

  async function fetchDiscussion(id: string, config?: RequestConfig) {
    const externalSignal = config?.signal
    if (!externalSignal) {
      abortFetchDiscussion()
    }
    const controller = externalSignal ? null : new AbortController()
    if (controller) {
      fetchDiscussionController = controller
    }
    const signal = externalSignal ?? controller?.signal
    const requestToken = ++fetchDiscussionToken

    try {
      const discussion = await discussionService.get(id, {
        ...config,
        ...(signal ? { signal } : {}),
        skipErrorToast: true,
      })
      if (signal?.aborted || requestToken !== fetchDiscussionToken) return null
      currentDiscussion.value = discussion
      source.value = 'live'
      await setPublicSnapshot(DISCUSSION_DETAIL_SNAPSHOT_SCOPE, { id }, discussion)
      return currentDiscussion.value
    } catch (err) {
      if (signal?.aborted || isAbortError(err) || requestToken !== fetchDiscussionToken) return null

      if (isServiceUnavailableError(err)) {
        const cachedDiscussion = await getPublicSnapshot<Discussion>(
          DISCUSSION_DETAIL_SNAPSHOT_SCOPE,
          {
            id,
          }
        )
        const fallbackDiscussion = cachedDiscussion ?? getFallbackDiscussionById(id)
        if (fallbackDiscussion) {
          currentDiscussion.value = fallbackDiscussion
          source.value = cachedDiscussion ? 'cached' : 'fallback'
          error.value = null
          return currentDiscussion.value
        }
      }

      error.value = 'community.error.fetchFailed'
      return null
    } finally {
      if (
        controller &&
        fetchDiscussionController === controller &&
        requestToken === fetchDiscussionToken
      ) {
        fetchDiscussionController = null
      }
    }
  }

  async function fetchComments(discussionId: string, reset = false): Promise<boolean> {
    if (reset) {
      abortFetchComments()
    } else if (commentsLoading.value) {
      return false
    }

    const controller = new AbortController()
    fetchCommentsController = controller
    const requestToken = ++fetchCommentsToken
    commentsLoading.value = true

    try {
      const params = {
        limit: 20,
        cursor: reset ? null : commentsNextCursor.value,
        sort: 'newest' as const,
        preload_replies: 3,
      }
      const res = await discussionService.getComments(discussionId, params, {
        signal: controller.signal,
        skipErrorToast: true,
      })
      if (controller.signal.aborted || requestToken !== fetchCommentsToken) return false

      if (reset) {
        currentComments.value = res.items
      } else {
        const existingIds = new Set(currentComments.value.map((c) => c.id))
        const newItems = res.items.filter((c) => !existingIds.has(c.id))
        currentComments.value = [...currentComments.value, ...newItems]
      }

      commentsTotal.value = currentComments.value.length
      commentsNextCursor.value = res.next_cursor ?? null
      hasMoreCommentsState.value = Boolean(res.has_more && res.next_cursor)
      source.value = 'live'
      await setPublicSnapshot(
        DISCUSSION_COMMENTS_SNAPSHOT_SCOPE,
        { id: discussionId, cursor: params.cursor, limit: params.limit },
        res
      )
      return true
    } catch (err) {
      if (controller.signal.aborted || requestToken !== fetchCommentsToken) return false

      if (isServiceUnavailableError(err)) {
        const snapshotParams = {
          id: discussionId,
          cursor: reset ? null : commentsNextCursor.value,
          limit: 20,
        }
        const cachedRes = await getPublicSnapshot<DiscussionCommentListResponse>(
          DISCUSSION_COMMENTS_SNAPSHOT_SCOPE,
          snapshotParams
        )
        const fallbackRes: DiscussionCommentListResponse =
          cachedRes ??
          getFallbackDiscussionCommentsCursor(discussionId, {
            limit: 20,
            cursor: reset ? null : commentsNextCursor.value,
          })

        if (reset) {
          currentComments.value = fallbackRes.items
        } else {
          const existingIds = new Set(currentComments.value.map((c) => c.id))
          const newItems = fallbackRes.items.filter((c) => !existingIds.has(c.id))
          currentComments.value = [...currentComments.value, ...newItems]
        }

        commentsTotal.value = currentComments.value.length
        commentsNextCursor.value = fallbackRes.next_cursor ?? null
        hasMoreCommentsState.value = Boolean(fallbackRes.has_more && fallbackRes.next_cursor)
        source.value = cachedRes ? 'cached' : 'fallback'
        return true
      }

      return false
    } finally {
      if (requestToken === fetchCommentsToken) {
        commentsLoading.value = false
        if (fetchCommentsController === controller) {
          fetchCommentsController = null
        }
      }
    }
  }

  async function loadMoreComments(discussionId: string): Promise<boolean> {
    if (!hasMoreComments.value || commentsLoading.value) return false
    return fetchComments(discussionId)
  }

  async function likeDiscussion(discussionId: string) {
    try {
      const res = await discussionService.like(discussionId)
      updateDiscussionLocally(discussionId, {
        is_liked: true,
        likes_count: res.like_count,
        like_count: res.like_count,
      })
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  async function unlikeDiscussion(discussionId: string) {
    try {
      const res = await discussionService.unlike(discussionId)
      updateDiscussionLocally(discussionId, {
        is_liked: false,
        likes_count: res.like_count,
        like_count: res.like_count,
      })
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  async function likeComment(commentId: string) {
    try {
      await discussionService.likeComment(commentId)
      updateCommentLocally(commentId, (c) => {
        c.is_liked = true
        c.like_count++
        if (c.likes_count !== undefined) c.likes_count++
      })
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  async function unlikeComment(commentId: string) {
    try {
      await discussionService.unlikeComment(commentId)
      updateCommentLocally(commentId, (c) => {
        c.is_liked = false
        c.like_count = Math.max(0, c.like_count - 1)
        if (c.likes_count !== undefined) {
          c.likes_count = Math.max(0, c.likes_count - 1)
        }
      })
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  function setFilter(category?: DiscussionCategory, sort?: ListDiscussionsParams['sort']) {
    currentCategory.value = category
    if (sort) currentSort.value = sort
    void fetchDiscussions(true)
  }

  function updateDiscussionLocally(id: string, patch: Partial<Discussion>) {
    const idx = items.value.findIndex((d) => d.id === id)
    if (idx !== -1) {
      items.value[idx] = { ...items.value[idx]!, ...patch }
    }
    if (currentDiscussion.value?.id === id) {
      currentDiscussion.value = {
        ...currentDiscussion.value,
        ...patch,
      }
    }
  }

  function updateCommentLocally(commentId: string, updater: (c: DiscussionComment) => void) {
    const find = (list: DiscussionComment[]): boolean => {
      for (const c of list) {
        if (c.id === commentId) {
          updater(c)
          return true
        }
        if (c.replies && find(c.replies)) return true
      }
      return false
    }
    find(currentComments.value)
  }

  function $reset() {
    abortFetchDiscussion()
    abortFetchDiscussions()
    abortFetchComments()
    items.value = []
    total.value = null
    nextCursor.value = null
    hasMoreState.value = false
    isLoading.value = false
    error.value = null
    source.value = 'live'
    currentCategory.value = undefined
    currentSort.value = 'latest'
    currentDiscussion.value = null
    currentComments.value = []
    commentsTotal.value = 0
    commentsNextCursor.value = null
    commentsLoading.value = false
    hasMoreCommentsState.value = false
  }

  return {
    items,
    total,
    nextCursor,
    isLoading,
    error,
    source,
    hasMore,
    currentCategory,
    currentSort,
    currentDiscussion,
    currentComments,
    commentsTotal,
    commentsLoading,
    hasMoreComments,
    fetchDiscussions,
    loadMore,
    fetchDiscussion,
    fetchComments,
    loadMoreComments,
    likeDiscussion,
    unlikeDiscussion,
    likeComment,
    unlikeComment,
    setFilter,
    updateDiscussionLocally,
    $reset,
  }
})
