import type { InjectionKey } from 'vue'
import type { DiscussionComment } from '@/api'

export interface DiscussionCommentTreeContext {
  onDeleted: (commentId: string) => void
  onReplySubmitted: (payload: { parentId: string; comment: DiscussionComment }) => void
  onLikeUpdated: (payload: { commentId: string; isLiked: boolean; likeCount: number }) => void
  onRepliesLoaded: (payload: {
    commentId: string
    replies: DiscussionComment[]
    append: boolean
  }) => void
}

export const discussionCommentTreeContextKey: InjectionKey<DiscussionCommentTreeContext> = Symbol(
  'discussion-comment-tree-context'
)
