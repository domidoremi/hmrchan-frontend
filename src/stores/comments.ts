/**
 * Comments Store - 评论状态管理
 */

import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Comment, CommentFormData } from '@/types'
import { sanitizeComment, validateComment, commentRateLimiter } from '@/utils/security'

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
      // TODO: 实际 API 调用
      const response = await fetch(`/api/v1/posts/${postId}/comments?sort=${sort}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch comments')
      }

      const data = await response.json()
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
        remainingSeconds: remaining
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
      const response = await fetch(`/api/v1/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: sanitizedContent,
          parent_id: formData.parent_id || null,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'comment.error.unauthorized' }
        }
        throw new Error('Failed to add comment')
      }

      const newComment = await response.json()

      // 记录速率限制
      commentRateLimiter.record()

      // 更新本地状态
      const postComments = comments.value.get(postId) || []
      if (formData.parent_id) {
        // 回复 - 添加到父评论的 replies 中
        const parentComment = findComment(postComments, formData.parent_id)
        if (parentComment) {
          parentComment.replies = parentComment.replies || []
          parentComment.replies.push(newComment)
          parentComment.replies_count++
        }
      } else {
        // 顶级评论
        postComments.unshift(newComment)
      }
      comments.value.set(postId, [...postComments])

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
      const response = await fetch(`/api/v1/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to delete comment')
      }

      // 更新本地状态
      const postComments = comments.value.get(postId) || []
      removeComment(postComments, commentId)
      comments.value.set(postId, [...postComments])

      return { success: true }
    } catch {
      return { success: false, error: 'comment.error.deleteFailed' }
    }
  }

  // 点赞评论
  async function likeComment(commentId: string) {
    try {
      const response = await fetch(`/api/v1/comments/${commentId}/like`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'comment.error.unauthorized' }
        }
        throw new Error('Failed to like comment')
      }

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
      const response = await fetch(`/api/v1/comments/${commentId}/like`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to unlike comment')
      }

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
      const response = await fetch(`/api/v1/comments/${commentId}/favorite`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'comment.error.unauthorized' }
        }
        throw new Error('Failed to favorite comment')
      }

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
      const response = await fetch(`/api/v1/comments/${commentId}/favorite`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to unfavorite comment')
      }

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
      const response = await fetch(`/api/v1/comments/${commentId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason, description }),
      })

      if (!response.ok) {
        throw new Error('Failed to report comment')
      }

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
