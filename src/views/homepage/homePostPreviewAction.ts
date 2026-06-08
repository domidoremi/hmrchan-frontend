import type { PostListItem } from '@/api'
import { getContractResourceId } from '@/utils/contractResourceId'
import {
  isHomeFallbackPost,
  normalizeText,
  resolvePostIdFromLink,
  resolvePreviewablePostLink,
} from '@/views/homepage/homeModel'

export type HomePostPreviewAction =
  | {
      kind: 'navigate'
      target: string
    }
  | {
      kind: 'preview'
      postId: string
    }

export type HomePostDetailAction =
  | {
      kind: 'navigate'
      target: string
    }
  | {
      kind: 'detail'
      postId: string
      target: string
      navigationContextPosts: PostListItem[]
    }

export function resolveHomePostPreviewAction(
  post: Pick<PostListItem, 'id' | 'post_url'> | null | undefined
): HomePostPreviewAction {
  if (isHomeFallbackPost(post)) {
    return {
      kind: 'navigate',
      target: '/explore',
    }
  }

  const detailLink = resolvePreviewablePostLink(post?.post_url, post?.id)
  const resolvedPostId = resolvePostIdFromLink(detailLink) || normalizeText(post?.id)

  if (!resolvedPostId || !resolvePostIdFromLink(detailLink)) {
    return {
      kind: 'navigate',
      target: detailLink,
    }
  }

  return {
    kind: 'preview',
    postId: resolvedPostId,
  }
}

export function resolveHomePostDetailAction({
  postId,
  previewPost,
  sourcePosts,
}: {
  postId: string
  previewPost: PostListItem | null | undefined
  sourcePosts: PostListItem[]
}): HomePostDetailAction {
  if (isHomeFallbackPost({ id: postId })) {
    return {
      kind: 'navigate',
      target: '/explore',
    }
  }

  const detailPostId = getContractResourceId(postId)
  if (!detailPostId) {
    return {
      kind: 'navigate',
      target: '/explore',
    }
  }

  const navigationContextPosts =
    previewPost?.id === postId
      ? [previewPost, ...sourcePosts.filter((item) => item.id !== postId)]
      : sourcePosts

  return {
    kind: 'detail',
    postId,
    target: `/post/${detailPostId}`,
    navigationContextPosts,
  }
}
