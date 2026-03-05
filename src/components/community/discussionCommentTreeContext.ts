import type { InjectionKey } from 'vue'
import type { DiscussionComment } from '@/api'

export interface DiscussionCommentTreeContext {
  onDeleted: (commentId: string) => void
  onReplySubmitted: (payload: { parentId: string; comment: DiscussionComment }) => void
  onPinnedUpdated: () => void
  onLikeUpdated: (payload: { commentId: string; isLiked: boolean; likeCount: number }) => void
  onRepliesLoaded: (payload: {
    commentId: string
    replies: DiscussionComment[]
    append: boolean
  }) => void
  onPinUpdated: (payload: { commentId: string; isPinned: boolean }) => void
  onFeatureUpdated: (payload: { commentId: string; isFeatured: boolean }) => void
}

export const discussionCommentTreeContextKey: InjectionKey<DiscussionCommentTreeContext> = Symbol(
  'discussion-comment-tree-context'
)
