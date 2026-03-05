import type { InjectionKey } from 'vue'

export interface CommentTreeContext {
  onDeleted: (commentId: string) => void
  onReplySubmitted: (parentId: string) => void
}

export const commentTreeContextKey: InjectionKey<CommentTreeContext> =
  Symbol('comment-tree-context')
