/**
 * Comments Store - 评论状态管理
 */

import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Comment, CommentFormData } from '@/types'
import { sanitizeComment, validateComment, commentRateLimiter } from '@/utils/security'
import { apiClient, type PaginatedApiResponse } from '@/api'

export const useCommentsStore = defineStore('comments', () => {
  const comments = ref<Map<string, Comment[]>>(new Map())
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 获取某个帖子的评论
  function getCommentsByPostId(postId: string): Comment[] {
    return comments.value.get(postId) || []
  }

  // 获取评论数量
  function getCommentsCount(postId: string): number {
    const postComments = comments.value.get(postId)
    if (!postComments) return 0
    return postComments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)
  }

  // 获取评论 (模拟 API 调用)
  async function fetchComments(postId: string, sort: 'newest' | 'oldest' | 'popular' = 'newest') {
    isLoading.value = true
    error.value = null

    try {
      const data = await apiClient.get<PaginatedApiResponse<Comment>>(
        `/comments/post/${postId}?sort=${sort}`,
        { skipErrorToast: true }
      )
      comments.value.set(postId, data.items || [])
      return { success: true, data: data.items }
    } catch (err) {
      error.value = 'comment.error.fetchFailed'
      return { success: false, error: err }
    } finally {
      isLoading.value = false
    }
  }

  // 添加评论
  async function addComment(postId: string, formData: CommentFormData) {
    // 速率限制检查
    if (!commentRateLimiter.canProceed()) {
      const remaining = Math.ceil(commentRateLimiter.getRemainingTime() / 1000)
      return {
        success: false,
        error: 'comment.error.rateLimited',
        remainingSeconds: remaining,
      }
    }

    // 验证内容
    const validation = validateComment(formData.content)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // 清理内容
    const sanitizedContent = sanitizeComment(formData.content)

    isLoading.value = true
    error.value = null

    try {
      const newComment = await apiClient.post<Comment>(
        `/comments/post/${postId}`,
        {
          content: sanitizedContent,
          parent_id: formData.parent_id || null,
        },
        { skipErrorToast: true }
      )

      // 记录速率限制
      commentRateLimiter.record()

      // 更新本地状态 - 深拷贝确保响应式更新
      const postComments = comments.value.get(postId) || []
      if (formData.parent_id) {
        // 回复 - 递归查找并更新父评论
        const updateReplies = (commentList: Comment[]): Comment[] => {
          return commentList.map((comment) => {
            if (comment.id === formData.parent_id) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newComment],
                replies_count: (comment.replies_count || 0) + 1,
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
        // 顶级评论
        comments.value.set(postId, [newComment, ...postComments])
      }

      return { success: true, data: newComment }
    } catch {
      error.value = 'comment.error.addFailed'
      return { success: false, error: 'comment.error.addFailed' }
    } finally {
      isLoading.value = false
    }
  }

  // 删除评论
  async function deleteComment(postId: string, commentId: string) {
    try {
      await apiClient.delete(`/comments/${commentId}`, { skipErrorToast: true })

      // 更新本地状态 - 深拷贝并递归删除
      const postComments = comments.value.get(postId) || []
      const updatedComments = JSON.parse(JSON.stringify(postComments)) as Comment[]
      removeComment(updatedComments, commentId)
      comments.value.set(postId, updatedComments)

      return { success: true }
    } catch {
      return { success: false, error: 'comment.error.deleteFailed' }
    }
  }

  // 点赞评论
  async function likeComment(commentId: string) {
    try {
      await apiClient.post(`/comments/${commentId}/like`, null, { skipErrorToast: true })

      // 更新本地状态
      updateCommentInAll(commentId, (comment) => {
        comment.is_liked = true
        comment.likes_count++
      })

      return { success: true }
    } catch {
      return { success: false, error: 'comment.error.likeFailed' }
    }
  }

  // 取消点赞
  async function unlikeComment(commentId: string) {
    try {
      await apiClient.delete(`/comments/${commentId}/like`, { skipErrorToast: true })

      // 更新本地状态
      updateCommentInAll(commentId, (comment) => {
        comment.is_liked = false
        comment.likes_count = Math.max(0, comment.likes_count - 1)
      })

      return { success: true }
    } catch {
      return { success: false, error: 'comment.error.unlikeFailed' }
    }
  }

  // 收藏评论
  async function favoriteComment(commentId: string) {
    try {
      await apiClient.post(`/comments/${commentId}/favorite`, null, { skipErrorToast: true })

      updateCommentInAll(commentId, (comment) => {
        comment.is_favorited = true
      })

      return { success: true }
    } catch {
      return { success: false, error: 'comment.error.favoriteFailed' }
    }
  }

  // 取消收藏评论
  async function unfavoriteComment(commentId: string) {
    try {
      await apiClient.delete(`/comments/${commentId}/favorite`, { skipErrorToast: true })

      updateCommentInAll(commentId, (comment) => {
        comment.is_favorited = false
      })

      return { success: true }
    } catch {
      return { success: false, error: 'comment.error.unfavoriteFailed' }
    }
  }

  // 举报评论
  async function reportComment(commentId: string, reason: string, description?: string) {
    try {
      await apiClient.post(
        `/comments/${commentId}/report`,
        { reason, description },
        { skipErrorToast: true }
      )

      return { success: true }
    } catch {
      return { success: false, error: 'comment.error.reportFailed' }
    }
  }

  // 辅助函数：在评论树中查找评论
  function findComment(commentList: Comment[], commentId: string): Comment | null {
    for (const comment of commentList) {
      if (comment.id === commentId) return comment
      if (comment.replies) {
        const found = findComment(comment.replies, commentId)
        if (found) return found
      }
    }
    return null
  }

  // 辅助函数：从评论树中移除评论
  function removeComment(commentList: Comment[], commentId: string): boolean {
    const index = commentList.findIndex((c) => c.id === commentId)
    if (index !== -1) {
      commentList.splice(index, 1)
      return true
    }
    for (const comment of commentList) {
      if (comment.replies && removeComment(comment.replies, commentId)) {
        comment.replies_count = Math.max(0, comment.replies_count - 1)
        return true
      }
    }
    return false
  }

  // 辅助函数：更新所有帖子中的某个评论
  function updateCommentInAll(commentId: string, updater: (comment: Comment) => void) {
    comments.value.forEach((postComments, postId) => {
      const comment = findComment(postComments, commentId)
      if (comment) {
        updater(comment)
        comments.value.set(postId, [...postComments])
      }
    })
  }

  // 清空某个帖子的评论缓存
  function clearPostComments(postId: string) {
    comments.value.delete(postId)
  }

  // 清空所有评论缓存
  function clearAllComments() {
    comments.value.clear()
  }

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
  }
})
