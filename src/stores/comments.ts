import { ref, shallowRef, triggerRef, onScopeDispose } from 'vue'
import { defineStore } from 'pinia'
import { registerPrivateSessionReset } from '@/services/privateSessionState'
import type { Comment, CommentAttachment, CommentFormData } from '@/types'
import { sanitizeComment, validateComment, commentRateLimiter } from '@/utils/security'
import {
  apiClient,
  ApiError,
  commentService,
  type CommentListResponse,
  type RequestConfig,
} from '@/api'

const MAX_CACHED_POSTS = 20

export const useCommentsStore = defineStore('comments', () => {
  const comments = shallowRef<Map<string, Comment[]>>(new Map())
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  let latestFetchRequestId = 0
  let fetchCommentsController: AbortController | null = null
  const fetchRepliesControllers = new Map<string, AbortController>()
  const fetchRepliesTokens = new Map<string, number>()
  let currentFetchingPostId: string | null = null

  function touchComments() {
    triggerRef(comments)
  }

  function isAbortError(err: unknown): boolean {
    return err instanceof DOMException
      ? err.name === 'AbortError'
      : err instanceof Error && err.name === 'AbortError'
  }

  function abortFetchCommentsRequest() {
    fetchCommentsController?.abort()
    fetchCommentsController = null
  }

  function buildRepliesRequestKey(postId: string, commentId: string): string {
    return `${postId}:${commentId}`
  }

  function abortFetchRepliesRequest(requestKey: string) {
    const controller = fetchRepliesControllers.get(requestKey)
    controller?.abort()
    fetchRepliesControllers.delete(requestKey)
  }

  function abortFetchRepliesRequestsByPost(postId: string) {
    for (const requestKey of fetchRepliesControllers.keys()) {
      if (!requestKey.startsWith(`${postId}:`)) continue
      abortFetchRepliesRequest(requestKey)
      fetchRepliesTokens.delete(requestKey)
    }
  }

  function abortAllFetchRepliesRequests() {
    for (const requestKey of fetchRepliesControllers.keys()) {
      abortFetchRepliesRequest(requestKey)
    }
    fetchRepliesTokens.clear()
  }

  function getCommentsByPostId(postId: string): Comment[] {
    return comments.value.get(postId) || []
  }

  function sortComments(list: Comment[], sort: 'newest' | 'oldest' | 'popular'): Comment[] {
    const items = [...list]
    const toTime = (value?: string) => {
      if (!value) return 0
      const ts = Date.parse(value)
      return Number.isNaN(ts) ? 0 : ts
    }

    if (sort === 'popular') {
      items.sort((a, b) => {
        const likeDiff = getCommentLikeCount(b) - getCommentLikeCount(a)
        if (likeDiff !== 0) return likeDiff
        return toTime(b.created_at) - toTime(a.created_at)
      })
      return items
    }

    if (sort === 'oldest') {
      items.sort((a, b) => toTime(a.created_at) - toTime(b.created_at))
      return items
    }

    items.sort((a, b) => toTime(b.created_at) - toTime(a.created_at))
    return items
  }

  function getCommentLikeCount(comment: Comment): number {
    return comment.like_count ?? comment.likes_count ?? 0
  }

  function getCommentReplyCount(comment: Comment): number {
    return comment.reply_count ?? comment.replies_count ?? comment.replies?.length ?? 0
  }

  function normalizeCommentTree(comment: Comment): Comment {
    const replies = comment.replies?.map(normalizeCommentTree)
    const likeCount = getCommentLikeCount(comment)
    const replyCount = comment.reply_count ?? comment.replies_count ?? replies?.length ?? 0

    return {
      ...comment,
      like_count: likeCount,
      likes_count: likeCount,
      reply_count: replyCount,
      replies_count: replyCount,
      replies,
    }
  }

  function normalizeCommentList(list: Comment[]): Comment[] {
    return list.map(normalizeCommentTree)
  }

  async function hydrateCommentImages(
    imageIds: string[] | undefined
  ): Promise<CommentAttachment[]> {
    if (!imageIds?.length) return []

    const { commentService } = await import('@/api/commentService')
    const settled = await Promise.allSettled(
      imageIds.map((imageId) => commentService.getImage(imageId))
    )

    return settled.flatMap((result) => {
      if (result.status !== 'fulfilled') return []

      return [
        {
          id: result.value.id,
          url: result.value.url,
          thumbnail_url: result.value.thumbnail_url,
          filename: result.value.filename,
          file_size: result.value.file_size,
          mime_type: result.value.mime_type,
          width: result.value.width,
          height: result.value.height,
        },
      ]
    })
  }

  function getCommentsCount(postId: string): number {
    const postComments = comments.value.get(postId)
    if (!postComments) return 0
    return postComments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)
  }

  async function fetchComments(
    postId: string,
    sort: 'newest' | 'oldest' | 'popular' = 'newest',
    config?: RequestConfig
  ) {
    if (!postId || postId === 'undefined') return { success: false, error: 'Invalid postId' }
    const externalSignal = config?.signal
    abortFetchCommentsRequest()
    const controller = externalSignal ? null : new AbortController()
    if (controller) {
      fetchCommentsController = controller
    }
    const signal = externalSignal ?? controller?.signal
    const requestId = ++latestFetchRequestId
    currentFetchingPostId = postId

    isLoading.value = true
    error.value = null

    try {
      const baseUrl = `/posts/${postId}/comments`
      let data: CommentListResponse

      try {
        data = await apiClient.get<CommentListResponse>(baseUrl, {
          ...config,
          ...(signal ? { signal } : {}),
          skipErrorToast: true,
        })
      } catch (err) {
        if (err instanceof ApiError && (err.status === 400 || err.status === 422)) {
          data = await apiClient.get<CommentListResponse>(`${baseUrl}?sort=${sort}`, {
            ...config,
            ...(signal ? { signal } : {}),
            skipErrorToast: true,
          })
        } else if (err instanceof ApiError && err.status === 404) {
          data = {
            items: [],
            next_cursor: null,
            has_more: false,
          }
        } else {
          throw err
        }
      }

      if (requestId !== latestFetchRequestId || signal?.aborted) {
        return { success: false, error: 'aborted' as const }
      }

      const items = sortComments(normalizeCommentList(data.items || []), sort)
      comments.value.set(postId, items)

      while (comments.value.size > MAX_CACHED_POSTS) {
        const oldestKey = comments.value.keys().next().value
        if (oldestKey !== undefined) comments.value.delete(oldestKey)
      }
      touchComments()

      return { success: true, data: items }
    } catch (err) {
      if (isAbortError(err) || signal?.aborted || requestId !== latestFetchRequestId) {
        return { success: false, error: 'aborted' as const }
      }
      error.value = 'comment.error.fetchFailed'
      return { success: false, error: err }
    } finally {
      if (requestId === latestFetchRequestId) {
        isLoading.value = false
        currentFetchingPostId = null
        if (controller && fetchCommentsController === controller) {
          fetchCommentsController = null
        }
      }
    }
  }

  async function fetchReplies(commentId: string, postId?: string, config?: RequestConfig) {
    if (postId) {
      const postComments = comments.value.get(postId)
      if (postComments && findComment(postComments, commentId)) {
        return fetchRepliesForPost(postId, commentId, config)
      }
    }

    for (const [pId, pComments] of comments.value.entries()) {
      const found = findComment(pComments, commentId)
      if (found) {
        return fetchRepliesForPost(pId, commentId, config)
      }
    }

    return { success: false, error: 'comment.notFound' }
  }

  async function fetchRepliesForPost(postId: string, commentId: string, config?: RequestConfig) {
    const requestKey = buildRepliesRequestKey(postId, String(commentId))
    const externalSignal = config?.signal

    if (!externalSignal) {
      abortFetchRepliesRequest(requestKey)
    }

    const controller = externalSignal ? null : new AbortController()
    if (controller) {
      fetchRepliesControllers.set(requestKey, controller)
    }
    const signal = externalSignal ?? controller?.signal
    const requestToken = (fetchRepliesTokens.get(requestKey) ?? 0) + 1
    fetchRepliesTokens.set(requestKey, requestToken)

    try {
      const { commentService } = await import('@/api/commentService')
      const data = await commentService.getCommentReplies(
        commentId,
        { limit: 20 },
        {
          ...config,
          ...(signal ? { signal } : {}),
        }
      )

      if (signal?.aborted || requestToken !== fetchRepliesTokens.get(requestKey)) {
        return { success: false, error: 'aborted' as const }
      }

      if (data.items && data.items.length > 0) {
        const postComments = comments.value.get(postId) || []

        const fetchedReplies = normalizeCommentList((data.items ?? []) as unknown as Comment[])

        const updateCommentReplies = (list: Comment[]): Comment[] => {
          return list.map((c) => {
            if (String(c.id) === String(commentId)) {
              const existingReplies: Comment[] = normalizeCommentList(c.replies || [])
              const existingIds = new Set(existingReplies.map((r) => String(r.id)))
              const newReplies = fetchedReplies.filter((r) => !existingIds.has(String(r.id)))
              const mergedReplies = [...existingReplies, ...newReplies]
              const updatedReplyCount = Math.max(getCommentReplyCount(c), mergedReplies.length)

              const updated: Comment = {
                ...c,
                replies: mergedReplies,
                reply_count: updatedReplyCount,
                replies_count: updatedReplyCount,
              }
              return updated
            }
            if (c.replies && c.replies.length > 0) {
              const updatedReplies = updateCommentReplies(c.replies)
              const updated: Comment = {
                ...c,
                replies: updatedReplies,
              }
              return updated
            }
            return c
          })
        }

        comments.value.set(postId, updateCommentReplies(postComments))
        touchComments()
      }

      return { success: true, data: data.items }
    } catch (err) {
      if (
        isAbortError(err) ||
        signal?.aborted ||
        requestToken !== fetchRepliesTokens.get(requestKey)
      ) {
        return { success: false, error: 'aborted' as const }
      }
      return { success: false, error: 'comment.error.fetchRepliesFailed' }
    } finally {
      if (requestToken === fetchRepliesTokens.get(requestKey)) {
        fetchRepliesTokens.delete(requestKey)
        if (controller && fetchRepliesControllers.get(requestKey) === controller) {
          fetchRepliesControllers.delete(requestKey)
        }
      }
    }
  }

  async function addComment(postId: string, formData: CommentFormData) {
    if (!commentRateLimiter.canProceed()) {
      const remaining = Math.ceil(commentRateLimiter.getRemainingTime() / 1000)
      return {
        success: false,
        error: 'comment.error.rateLimited',
        remainingSeconds: remaining,
      }
    }

    const validation = validateComment(formData.content)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const sanitizedContent = sanitizeComment(formData.content)

    isLoading.value = true
    error.value = null

    try {
      const newComment = await apiClient.post<Comment>(
        `/posts/${postId}/comments`,
        {
          content: sanitizedContent,
          parent_id: formData.parent_id || null,
          image_ids: formData.image_ids?.length ? formData.image_ids : undefined,
        },
        { skipErrorToast: true }
      )
      const hydratedImages =
        newComment.images && newComment.images.length > 0
          ? newComment.images
          : await hydrateCommentImages(formData.image_ids)
      const normalizedNewComment = normalizeCommentTree({
        ...newComment,
        image_ids: newComment.image_ids ?? formData.image_ids,
        images: hydratedImages,
      })

      commentRateLimiter.record()

      const postComments = comments.value.get(postId) || []
      if (formData.parent_id) {
        const parentIdStr = String(formData.parent_id)
        const updateReplies = (commentList: Comment[]): Comment[] => {
          return commentList.map((comment) => {
            if (String(comment.id) === parentIdStr) {
              return {
                ...comment,
                replies: [...(comment.replies || []), normalizedNewComment],
                reply_count: getCommentReplyCount(comment) + 1,
                replies_count: getCommentReplyCount(comment) + 1,
              }
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: updateReplies(comment.replies),
              }
            }
            return comment
          })
        }
        comments.value.set(postId, updateReplies(postComments))
      } else {
        comments.value.set(postId, [normalizedNewComment, ...postComments])
      }
      touchComments()

      return { success: true, data: normalizedNewComment }
    } catch {
      error.value = 'comment.error.addFailed'
      return { success: false, error: 'comment.error.addFailed' }
    } finally {
      isLoading.value = false
    }
  }

  async function deleteComment(postId: string, commentId: string) {
    try {
      await apiClient.delete(`/comments/${commentId}`, { skipErrorToast: true })

      const postComments = comments.value.get(postId) || []
      removeComment(postComments, commentId)
      comments.value.set(postId, [...postComments])
      touchComments()

      return { success: true }
    } catch {
      return { success: false, error: 'comment.error.deleteFailed' }
    }
  }

  async function likeComment(commentId: string) {
    try {
      await commentService.likeComment(commentId, { skipErrorToast: true })

      updateCommentInAll(commentId, (comment) => {
        comment.is_liked = true
        const nextLikeCount = getCommentLikeCount(comment) + 1
        comment.like_count = nextLikeCount
        comment.likes_count = nextLikeCount
      })

      return { success: true }
    } catch {
      return { success: false, error: 'comment.error.likeFailed' }
    }
  }

  async function unlikeComment(commentId: string) {
    try {
      await commentService.unlikeComment(commentId, { skipErrorToast: true })

      updateCommentInAll(commentId, (comment) => {
        comment.is_liked = false
        const nextLikeCount = Math.max(0, getCommentLikeCount(comment) - 1)
        comment.like_count = nextLikeCount
        comment.likes_count = nextLikeCount
      })

      return { success: true }
    } catch {
      return { success: false, error: 'comment.error.unlikeFailed' }
    }
  }

  async function favoriteComment(commentId: string) {
    try {
      await commentService.favoriteComment(commentId, { skipErrorToast: true })

      updateCommentInAll(commentId, (comment) => {
        comment.is_favorited = true
      })

      return { success: true }
    } catch {
      return { success: false, error: 'comment.error.favoriteFailed' }
    }
  }

  async function unfavoriteComment(commentId: string) {
    try {
      await commentService.unfavoriteComment(commentId, { skipErrorToast: true })

      updateCommentInAll(commentId, (comment) => {
        comment.is_favorited = false
      })

      return { success: true }
    } catch {
      return { success: false, error: 'comment.error.unfavoriteFailed' }
    }
  }

  async function reportComment(commentId: string, reason: string, description?: string) {
    try {
      await commentService.reportComment(commentId, reason, description, { skipErrorToast: true })

      return { success: true }
    } catch {
      return { success: false, error: 'comment.error.reportFailed' }
    }
  }

  function findComment(commentList: Comment[], commentId: string): Comment | null {
    const commentIdStr = String(commentId)
    for (const comment of commentList) {
      if (String(comment.id) === commentIdStr) return comment
      if (comment.replies) {
        const found = findComment(comment.replies, commentId)
        if (found) return found
      }
    }
    return null
  }

  function removeComment(commentList: Comment[], commentId: string): boolean {
    const commentIdStr = String(commentId)
    const index = commentList.findIndex((c) => String(c.id) === commentIdStr)
    if (index !== -1) {
      commentList.splice(index, 1)
      return true
    }
    for (const comment of commentList) {
      if (comment.replies && removeComment(comment.replies, commentId)) {
        const nextReplyCount = Math.max(0, getCommentReplyCount(comment) - 1)
        comment.reply_count = nextReplyCount
        comment.replies_count = nextReplyCount
        return true
      }
    }
    return false
  }

  function updateCommentInAll(commentId: string, updater: (comment: Comment) => void) {
    let hasUpdated = false
    comments.value.forEach((postComments, postId) => {
      const comment = findComment(postComments, commentId)
      if (comment) {
        updater(comment)
        comments.value.set(postId, [...postComments])
        hasUpdated = true
      }
    })
    if (hasUpdated) {
      touchComments()
    }
  }

  function clearPostComments(postId: string) {
    if (currentFetchingPostId === postId) {
      abortFetchCommentsRequest()
      currentFetchingPostId = null
      isLoading.value = false
      latestFetchRequestId += 1
    }
    abortFetchRepliesRequestsByPost(postId)
    if (comments.value.delete(postId)) {
      touchComments()
    }
  }

  function clearAllComments() {
    abortFetchCommentsRequest()
    abortAllFetchRepliesRequests()
    comments.value.clear()
    touchComments()
    isLoading.value = false
    error.value = null
    currentFetchingPostId = null
    latestFetchRequestId += 1
  }

  onScopeDispose(registerPrivateSessionReset(clearAllComments))

  return {
    comments,
    isLoading,
    error,
    getCommentsByPostId,
    getCommentsCount,
    fetchComments,
    addComment,
    deleteComment,
    likeComment,
    unlikeComment,
    favoriteComment,
    unfavoriteComment,
    reportComment,
    clearPostComments,
    clearAllComments,
    fetchReplies,
  }
})
