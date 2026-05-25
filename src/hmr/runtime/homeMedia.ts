import type { HmrPost } from '@/api/hmrContent'

export function collectHomeMedia(posts: HmrPost[]): string[] {
  return posts
    .map((post) => post.mediaUrl)
    .filter((url): url is string => Boolean(url?.trim()))
    .slice(0, 4)
}
