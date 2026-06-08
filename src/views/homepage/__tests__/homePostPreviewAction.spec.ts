import { describe, expect, it } from 'vitest'
import { resolveHomePostDetailAction, resolveHomePostPreviewAction } from '../homePostPreviewAction'

describe('resolveHomePostPreviewAction', () => {
  const previewablePostId = '0195fe30-6f9d-7f31-9e6f-c9a5c478a301'

  it('routes generated fallback posts to explore instead of opening preview state', () => {
    expect(
      resolveHomePostPreviewAction({
        id: '__home_fallback__story-1',
        post_url: '/post/story-1',
      })
    ).toEqual({
      kind: 'navigate',
      target: '/explore',
    })
  })

  it('opens preview state for posts with a valid detail link', () => {
    expect(
      resolveHomePostPreviewAction({
        id: previewablePostId,
        post_url: `/post/${previewablePostId}`,
      })
    ).toEqual({
      kind: 'preview',
      postId: previewablePostId,
    })
  })

  it('routes legacy post slugs to explore because they are not contract resource ids', () => {
    expect(
      resolveHomePostPreviewAction({
        id: 'story-1',
        post_url: '/post/story-1',
      })
    ).toEqual({
      kind: 'navigate',
      target: '/explore',
    })
  })

  it('navigates directly when a post has no previewable detail route', () => {
    expect(
      resolveHomePostPreviewAction({
        id: '',
        post_url: '/explore?tag=story',
      })
    ).toEqual({
      kind: 'navigate',
      target: '/explore?tag=story',
    })
  })
})

describe('resolveHomePostDetailAction', () => {
  const previewablePostId = '0195fe30-6f9d-7f31-9e6f-c9a5c478a301'
  const secondPostId = '0196a7b2-c4d0-7a3e-b9f1-5e2d4a6c8b0e'
  const previewPost = {
    id: previewablePostId,
    post_url: `/post/${previewablePostId}`,
    title: 'Preview post',
  }
  const sourcePosts = [
    {
      id: previewablePostId,
      post_url: `/post/${previewablePostId}`,
      title: 'Source duplicate',
    },
    {
      id: secondPostId,
      post_url: `/post/${secondPostId}`,
      title: 'Second source post',
    },
  ]

  it('routes generated fallback ids to explore', () => {
    expect(
      resolveHomePostDetailAction({
        postId: '__home_fallback__story-1',
        previewPost: null,
        sourcePosts,
      })
    ).toEqual({
      kind: 'navigate',
      target: '/explore',
    })
  })

  it('routes legacy post slugs to explore because they are not contract resource ids', () => {
    expect(
      resolveHomePostDetailAction({
        postId: 'story-1',
        previewPost: null,
        sourcePosts,
      })
    ).toEqual({
      kind: 'navigate',
      target: '/explore',
    })
  })

  it('builds detail navigation with preview summary first when it matches the opened post', () => {
    expect(
      resolveHomePostDetailAction({
        postId: previewablePostId,
        previewPost,
        sourcePosts,
      })
    ).toEqual({
      kind: 'detail',
      postId: previewablePostId,
      target: `/post/${previewablePostId}`,
      navigationContextPosts: [previewPost, sourcePosts[1]],
    })
  })

  it('uses source posts unchanged when the preview summary does not match the opened post', () => {
    expect(
      resolveHomePostDetailAction({
        postId: secondPostId,
        previewPost,
        sourcePosts,
      })
    ).toEqual({
      kind: 'detail',
      postId: secondPostId,
      target: `/post/${secondPostId}`,
      navigationContextPosts: sourcePosts,
    })
  })
})
