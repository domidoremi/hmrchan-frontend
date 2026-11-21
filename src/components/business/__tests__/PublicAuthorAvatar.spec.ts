import { createApp, defineComponent, h, nextTick, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authorService } from '@/api/authorService'
import type { AuthorResponse } from '@/api/authorService'
import PublicAuthorAvatar from '../PublicAuthorAvatar.vue'

vi.mock('@/api/authorService', () => ({
  authorService: { getAuthor: vi.fn() },
}))

const mounted: Array<{ app: App; host: HTMLElement }> = []

function renderPortrait(props: Record<string, unknown> = {}) {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp(defineComponent(() => () => h(PublicAuthorAvatar, { size: 48, ...props })))
  app.mount(host)
  mounted.push({ app, host })
  return host
}

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.app.unmount()
    entry.host.remove()
  }
})

describe('PublicAuthorAvatar', () => {
  it('uses the identity portrait and falls back after a failed request', async () => {
    const portrait = 'https://pbs.twimg.com/profile_images/123/profile.jpg'
    const host = renderPortrait({ src: portrait, authorId: 'author-identity', alt: 'Author name' })
    const image = host.querySelector('img')!

    expect(image.src).toBe(portrait)
    expect(image.alt).toBe('Author name')
    image.dispatchEvent(new Event('error'))
    await nextTick()

    expect(host.querySelector('img')?.getAttribute('src')).toBe('/journal/mascot.webp')
  })

  it('uses the mascot only when no usable portrait is supplied', () => {
    expect(renderPortrait().querySelector('img')?.getAttribute('src')).toBe('/journal/mascot.webp')
  })

  it('loads the exact public author portrait without showing the mascot while pending', async () => {
    const id = '01a1b5a5-0c10-7d5d-9ba8-39318248b252'
    const portrait = 'https://pbs.twimg.com/profile_images/123/profile.jpg'
    vi.mocked(authorService.getAuthor).mockResolvedValue({
      id,
      avatar_url: portrait,
    } as AuthorResponse)
    const host = renderPortrait({ authorId: id, alt: 'Author name' })

    expect(host.querySelector('img')?.getAttribute('src')).toBeNull()
    expect(host.querySelector('img')?.alt).toBe('')
    expect(authorService.getAuthor).toHaveBeenCalledWith(id, { skipErrorToast: true })
    await vi.waitFor(() => expect(host.querySelector('img')?.getAttribute('src')).toBe(portrait))
    expect(host.querySelector('img')?.alt).toBe('Author name')
    expect(authorService.getAuthor).toHaveBeenCalledWith(id, { skipErrorToast: true })
  })
})
