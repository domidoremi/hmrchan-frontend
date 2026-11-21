import { describe, expect, it, vi } from 'vitest'
import { authorService } from '@/api/authorService'
import type { AuthorResponse } from '@/api/authorService'
import {
  AUTHOR_AVATAR_FALLBACK,
  loadPublicAuthorAvatar,
  publicAuthorAvatar,
} from '../publicAuthorAvatar'

vi.mock('@/api/authorService', () => ({
  authorService: { getAuthor: vi.fn() },
}))

describe('public author portrait policy', () => {
  it('prefers a valid portrait from a verified public author source', () => {
    const portrait = 'https://pbs.twimg.com/profile_images/123/profile.jpg'
    expect(publicAuthorAvatar(portrait)).toBe(portrait)
    expect(publicAuthorAvatar('https://cdn.example.org/profile.webp')).toBe(
      'https://cdn.example.org/profile.webp'
    )
  })

  it('uses an already-sanitized same-origin portrait URL', () => {
    expect(publicAuthorAvatar('/snapshot-media/authors/profile.webp')).toBe(
      '/snapshot-media/authors/profile.webp'
    )
  })

  it('never accepts executable, credentialed, insecure, or brand-art source values', () => {
    expect(publicAuthorAvatar('javascript:alert(1)')).toBeUndefined()
    expect(publicAuthorAvatar('http://pbs.twimg.com/profile_images/x.jpg')).toBeUndefined()
    expect(publicAuthorAvatar('https://user:pass@cdn.example.org/avatar.jpg')).toBeUndefined()
    expect(publicAuthorAvatar(AUTHOR_AVATAR_FALLBACK)).toBeUndefined()
    expect(publicAuthorAvatar(null)).toBeUndefined()
  })

  it('resolves an absent portrait only from the matching public author ID', async () => {
    const id = '01a1b5a5-0c10-7d5d-9ba8-39318248b252'
    const portrait = 'https://pbs.twimg.com/profile_images/123/profile.jpg'
    vi.mocked(authorService.getAuthor).mockResolvedValue({
      id,
      avatar_url: portrait,
    } as AuthorResponse)

    await expect(loadPublicAuthorAvatar(id)).resolves.toBe(portrait)
    expect(authorService.getAuthor).toHaveBeenCalledWith(id, { skipErrorToast: true })
  })

  it('rejects a portrait returned for a different public author', async () => {
    vi.mocked(authorService.getAuthor).mockResolvedValue({
      id: '01a1b5a5-0c10-7d5d-9ba8-39318248b253',
      avatar_url: 'https://pbs.twimg.com/profile_images/123/other.jpg',
    } as AuthorResponse)

    await expect(
      loadPublicAuthorAvatar('01a1b5a5-0c10-7d5d-9ba8-39318248b254')
    ).resolves.toBeUndefined()
  })
})
