import { beforeEach, describe, expect, it, vi } from 'vitest'
import { commentService } from '../commentService'
import { apiClient } from '../client'

vi.mock('../client', () => ({ apiClient: { post: vi.fn() } }))

describe('single comment image upload', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns the only uploaded image and sends one multipart file', async () => {
    const file = new File(['image'], 'comment.png', { type: 'image/png' })
    const image = { id: 'image-id', url: '/images/comment.png' }
    vi.mocked(apiClient.post).mockResolvedValue({ images: [image] })

    await expect(commentService.uploadImage(file)).resolves.toEqual(image)
    expect(apiClient.post).toHaveBeenCalledTimes(1)
    const [path, body] = vi.mocked(apiClient.post).mock.calls[0]!
    expect(path).toBe('/comment-images')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).getAll('files')).toEqual([file])
  })

  it.each([
    { label: 'empty', images: [] },
    { label: 'multiple', images: [{ id: 'one' }, { id: 'two' }] },
  ])('rejects a $label single-file result', async ({ images }) => {
    vi.mocked(apiClient.post).mockResolvedValue({ images })
    await expect(commentService.uploadImage(new File(['image'], 'comment.png'))).rejects.toThrow(
      'Expected one uploaded image'
    )
  })
})
