import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('vue', async () => await import('vue/dist/vue.runtime-with-vapor.esm-browser.js'))
import { createApp, defineComponent, h, nextTick, vaporInteropPlugin, type App } from 'vue'
import type { PostListItem } from '@/api'

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()

  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  }
})

import PostCard from '../PostCard.vue'

function createPost(overrides: Partial<PostListItem> = {}): PostListItem {
  return {
    id: 'post-1',
    platform: 'youtube',
    title: 'Post title',
    description: 'Post description',
    thumbnail_url: null,
    view_count: 0,
    like_count: 0,
    comment_count: 0,
    media_count: 0,
    author_name: 'Test Author',
    author_avatar_url: 'https://example.com/avatar.jpg',
    tags: [],
    ...overrides,
  }
}

const mountedApps: Array<{ app: App; host: HTMLDivElement }> = []

function mountPostCard(post: PostListItem) {
  const emitted: Array<[string, string | null]> = []
  const host = document.createElement('div')
  document.body.appendChild(host)

  const app = createApp(
    defineComponent({
      setup() {
        const handleClick = (postId: string, thumbnailSrc: string | null) => {
          emitted.push([postId, thumbnailSrc])
        }

        return () =>
          h(PostCard, {
            post,
            onClick: handleClick,
          })
      },
    })
  )

  app.use(vaporInteropPlugin)
  app.mount(host)
  mountedApps.push({ app, host })

  return { emitted, host }
}

afterEach(() => {
  while (mountedApps.length > 0) {
    const entry = mountedApps.pop()
    entry?.app.unmount()
    entry?.host.remove()
  }
})

describe('PostCard', () => {
  it('emits the post id and thumbnail source when clicked', () => {
    const { emitted, host } = mountPostCard(createPost())

    host.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(emitted).toEqual([['post-1', null]])
  })

  it('falls back to the shared avatar fallback when author image loading fails', async () => {
    const { host } = mountPostCard(createPost())

    const img = host.querySelector('.post-author-avatar img')

    expect(img).not.toBeNull()

    img?.dispatchEvent(new Event('error'))
    await nextTick()

    expect(host.querySelector('.post-author-avatar img')).toBeNull()
    expect(host.querySelector('.post-author-avatar .ui-avatar__fallback')).not.toBeNull()
  })
})
