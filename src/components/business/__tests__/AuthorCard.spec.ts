import { afterEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick, vaporInteropPlugin, type App } from 'vue'
import AuthorCard, { type AuthorCardAuthor } from '../AuthorCard.vue'

function createAuthor(overrides: Partial<AuthorCardAuthor> = {}): AuthorCardAuthor {
  return {
    id: 'author-1',
    platform: 'youtube',
    username: 'test-author',
    display_name: 'Test Author',
    avatar_url: 'https://example.com/avatar.jpg',
    follower_count: 15200,
    post_count: 84,
    is_verified: true,
    name: 'Test Author',
    description: 'Author description',
    ...overrides,
  }
}

const mountedApps: Array<{ app: App; host: HTMLDivElement }> = []

function mountAuthorCard(author: AuthorCardAuthor) {
  const emitted: string[] = []
  const host = document.createElement('div')
  document.body.appendChild(host)

  const app = createApp(
    defineComponent({
      setup() {
        const handleClick = (authorId: string) => {
          emitted.push(authorId)
        }

        return () =>
          h(AuthorCard, {
            author,
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

describe('AuthorCard', () => {
  it('emits the author id when clicked', () => {
    const { emitted, host } = mountAuthorCard(createAuthor())

    host.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(emitted).toEqual(['author-1'])
  })

  it('falls back to the initial when avatar loading fails', async () => {
    const { host } = mountAuthorCard(createAuthor())

    const img = host.querySelector('img')

    expect(img).not.toBeNull()

    img?.dispatchEvent(new Event('error'))
    await nextTick()

    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('.author-avatar--fallback')?.textContent?.trim()).toBe('T')
  })
})
