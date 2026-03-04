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

export const useDiscussionsStore = defineStore('discussions', () => {
  const items = ref<Discussion[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const totalPages = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

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

  const hasMore = computed(() => page.value < totalPages.value)
  const hasMoreComments = computed(() => commentsPage.value < commentsTotalPages.value)

  async function fetchDiscussions(reset = false) {
    if (isLoading.value) return
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

      const res: PaginatedApiResponse<Discussion> = await discussionService.list(params)

      if (reset) {
        items.value = res.items
      } else {
        const existingIds = new Set(items.value.map((d) => d.id))
        const newItems = res.items.filter((d) => !existingIds.has(d.id))
        items.value = [...items.value, ...newItems]
      }

      total.value = res.total
      totalPages.value = res.total_pages
    } catch {
      error.value = 'discussion.error.fetchFailed'
    } finally {
      isLoading.value = false
    }
  }

  async function loadMore() {
    if (!hasMore.value || isLoading.value) return
    page.value++
    await fetchDiscussions()
  }

  async function fetchDiscussion(id: string, config?: RequestConfig) {
    try {
      currentDiscussion.value = await discussionService.get(id, config)
      return currentDiscussion.value
    } catch {
      error.value = 'discussion.error.fetchFailed'
      return null
    }
  }

  async function fetchComments(discussionId: string, reset = false) {
    if (commentsLoading.value) return
    commentsLoading.value = true

    try {
      if (reset) commentsPage.value = 1

      const res = await discussionService.getComments(discussionId, {
        page: commentsPage.value,
        page_size: 20,
        sort: 'newest',
        preload_replies: 3,
      })

      if (reset) {
        currentComments.value = res.items
      } else {
        const existingIds = new Set(currentComments.value.map((c) => c.id))
        const newItems = res.items.filter((c) => !existingIds.has(c.id))
        currentComments.value = [...currentComments.value, ...newItems]
      }

      commentsTotal.value = res.total
      commentsTotalPages.value = res.total_pages
    } catch {
      // silent
    } finally {
      commentsLoading.value = false
    }
  }

  async function loadMoreComments(discussionId: string) {
    if (!hasMoreComments.value || commentsLoading.value) return
    commentsPage.value++
    await fetchComments(discussionId)
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
    fetchDiscussions(true)
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
    items.value = []
    total.value = 0
    page.value = 1
    totalPages.value = 0
    error.value = null
    currentCategory.value = undefined
    currentSort.value = 'latest'
    currentDiscussion.value = null
    currentComments.value = []
    commentsPage.value = 1
    commentsTotal.value = 0
    commentsTotalPages.value = 0
  }

  return {
    items,
    total,
    page,
    totalPages,
    isLoading,
    error,
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
