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
  type ListDiscussionsParams,
  type DiscussionCategory,
} from '@/api/discussionService'
import type { PaginatedApiResponse, RequestConfig } from '@/api/client'
import {
  getFallbackDiscussionById,
  getFallbackDiscussionComments,
  getFallbackDiscussions,
} from '@/fallbacks/communityFallback'
import {
  isServiceUnavailableError,
  resolvePublicFallbackReason,
  type PublicPageDataSource,
} from '@/fallbacks/publicPageFallback'

export const useDiscussionsStore = defineStore('discussions', () => {
  const items = ref<Discussion[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const totalPages = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const source = ref<PublicPageDataSource>('live')
  const fallbackReason = ref<string | null>(null)

  // 当前筛选/排序
  const currentCategory = ref<DiscussionCategory | undefined>(undefined)
  const currentSort = ref<ListDiscussionsParams['sort']>('latest')

  // 当前查看的讨论详情
  const currentDiscussion = ref<Discussion | null>(null)
  const currentComments = ref<DiscussionComment[]>([])
  const commentsPage = ref(1)
  const commentsTotal = ref(0)
  const commentsTotalPages = ref(0)
  const commentsLoading = ref(false)
  let fetchDiscussionController: AbortController | null = null
  let fetchDiscussionToken = 0
  let fetchDiscussionsController: AbortController | null = null
  let fetchDiscussionsToken = 0
  let fetchCommentsController: AbortController | null = null
  let fetchCommentsToken = 0

  const hasMore = computed(() => page.value < totalPages.value)
  const hasMoreComments = computed(() => commentsPage.value < commentsTotalPages.value)

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
      if (reset) page.value = 1

      const params: ListDiscussionsParams = {
        page: page.value,
        page_size: pageSize.value,
        category: currentCategory.value,
        sort: currentSort.value,
      }

      const res: PaginatedApiResponse<Discussion> = await discussionService.list(params, {
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

      total.value = res.total
      totalPages.value = res.total_pages
      source.value = 'live'
      fallbackReason.value = null
      return true
    } catch (err) {
      if (controller.signal.aborted || requestToken !== fetchDiscussionsToken) return false

      if (isServiceUnavailableError(err)) {
        const fallbackRes = getFallbackDiscussions(params)

        if (reset) {
          items.value = fallbackRes.items
        } else {
          const existingIds = new Set(items.value.map((d) => d.id))
          const newItems = fallbackRes.items.filter((d) => !existingIds.has(d.id))
          items.value = [...items.value, ...newItems]
        }

        total.value = fallbackRes.total
        totalPages.value = fallbackRes.total_pages
        source.value = 'fallback'
        fallbackReason.value = resolvePublicFallbackReason(err)
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
    const nextPage = page.value + 1
    page.value = nextPage
    const ok = await fetchDiscussions()
    if (!ok) {
      page.value = nextPage - 1
    }
    return ok
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
      fallbackReason.value = null
      return currentDiscussion.value
    } catch (err) {
      if (signal?.aborted || isAbortError(err) || requestToken !== fetchDiscussionToken) return null

      if (isServiceUnavailableError(err)) {
        const fallbackDiscussion = getFallbackDiscussionById(id)
        if (fallbackDiscussion) {
          currentDiscussion.value = fallbackDiscussion
          source.value = 'fallback'
          fallbackReason.value = resolvePublicFallbackReason(err)
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
      if (reset) commentsPage.value = 1

      const res = await discussionService.getComments(
        discussionId,
        {
          page: commentsPage.value,
          page_size: 20,
          sort: 'newest',
          preload_replies: 3,
        },
        {
          signal: controller.signal,
          skipErrorToast: true,
        }
      )
      if (controller.signal.aborted || requestToken !== fetchCommentsToken) return false

      if (reset) {
        currentComments.value = res.items
      } else {
        const existingIds = new Set(currentComments.value.map((c) => c.id))
        const newItems = res.items.filter((c) => !existingIds.has(c.id))
        currentComments.value = [...currentComments.value, ...newItems]
      }

      commentsTotal.value = res.total
      commentsTotalPages.value = res.total_pages
      source.value = 'live'
      fallbackReason.value = null
      return true
    } catch (err) {
      if (controller.signal.aborted || requestToken !== fetchCommentsToken) return false

      if (isServiceUnavailableError(err)) {
        const fallbackRes = getFallbackDiscussionComments(discussionId, {
          page: commentsPage.value,
          page_size: 20,
        })

        if (reset) {
          currentComments.value = fallbackRes.items
        } else {
          const existingIds = new Set(currentComments.value.map((c) => c.id))
          const newItems = fallbackRes.items.filter((c) => !existingIds.has(c.id))
          currentComments.value = [...currentComments.value, ...newItems]
        }

        commentsTotal.value = fallbackRes.total
        commentsTotalPages.value = fallbackRes.total_pages
        source.value = 'fallback'
        fallbackReason.value = resolvePublicFallbackReason(err)
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
    const nextPage = commentsPage.value + 1
    commentsPage.value = nextPage
    const ok = await fetchComments(discussionId)
    if (!ok) {
      commentsPage.value = nextPage - 1
    }
    return ok
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
    total.value = 0
    page.value = 1
    totalPages.value = 0
    isLoading.value = false
    error.value = null
    source.value = 'live'
    fallbackReason.value = null
    currentCategory.value = undefined
    currentSort.value = 'latest'
    currentDiscussion.value = null
    currentComments.value = []
    commentsPage.value = 1
    commentsTotal.value = 0
    commentsTotalPages.value = 0
    commentsLoading.value = false
  }

  return {
    items,
    total,
    page,
    totalPages,
    isLoading,
    error,
    source,
    fallbackReason,
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
