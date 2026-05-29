import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadSupportContentResource, submitContactResource } from '@/api/hmrContent'
import { useHmrContactForm } from '@/hmr/composables/useHmrContactForm'
import type { HmrAsyncResource } from '@/hmr/types'
import { readPublicContent } from '@/utils/cache/publicContentCache'

vi.mock('@/api/hmrContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hmrContent')>()
  return {
    ...actual,
    loadSupportContentResource: vi.fn(),
    submitContactResource: vi.fn(),
  }
})

vi.mock('@/utils/cache/publicContentCache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/cache/publicContentCache')>()
  return {
    ...actual,
    readPublicContent: vi.fn(),
  }
})

const loadSupportContentResourceMock = vi.mocked(loadSupportContentResource)
const submitContactResourceMock = vi.mocked(submitContactResource)
const readPublicContentMock = vi.mocked(readPublicContent)

function makeResource<T>(data: T, error: HmrAsyncResource<T>['error'] = null): HmrAsyncResource<T> {
  return {
    state: 'ready',
    data,
    source: 'api',
    error,
    paths: ['/contact/send'],
    updatedAt: '2026-05-28T00:00:00.000Z',
  }
}

describe('useHmrContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads support content through the public content resource', async () => {
    const supportResource = makeResource({
      faqs: [{ id: 'faq', title: 'FAQ', excerpt: 'Answer', metric: '01' }],
      flows: [{ id: 'flow', title: 'Flow', excerpt: 'Step', metric: 'Brief' }],
    })
    readPublicContentMock.mockResolvedValueOnce(supportResource)
    loadSupportContentResourceMock.mockResolvedValueOnce(supportResource)
    const contact = useHmrContactForm()

    await contact.refreshSupport()

    expect(readPublicContentMock).toHaveBeenCalledWith({
      key: 'hmr:support',
      scope: 'support',
      loader: loadSupportContentResourceMock,
    })
    expect(contact.support.value).toBe(supportResource.data)
    expect(contact.supportPageState.value).toBe('ready')
  })

  it('submits form fields and marks successful delivery', async () => {
    submitContactResourceMock.mockResolvedValueOnce(
      makeResource({ delivered: true, endpoint: '/contact/send' })
    )
    const contact = useHmrContactForm()
    contact.form.name = 'Momi'
    contact.form.email = 'momi@example.com'
    contact.form.message = 'Hello'
    contact.form.topic = '反馈'

    await expect(contact.submit()).resolves.toEqual({ delivered: true })

    expect(submitContactResourceMock).toHaveBeenCalledExactlyOnceWith({
      name: 'Momi',
      email: 'momi@example.com',
      message: 'Hello',
      topic: '反馈',
    })
    expect(contact.sent.value).toBe(true)
    expect(contact.submitting.value).toBe(false)
    expect(contact.submitError.value).toBe('')
  })

  it('runs the delivered callback only after successful delivery', async () => {
    const onDelivered = vi.fn(async () => undefined)
    submitContactResourceMock.mockResolvedValueOnce(
      makeResource({ delivered: true, endpoint: '/contact/send' })
    )
    const contact = useHmrContactForm({ onDelivered })

    await expect(contact.submit()).resolves.toEqual({ delivered: true })

    expect(onDelivered).toHaveBeenCalledOnce()
  })

  it('keeps the user on the page when delivery fails', async () => {
    const onDelivered = vi.fn()
    submitContactResourceMock.mockResolvedValueOnce(
      makeResource(
        { delivered: false, endpoint: '/contact/send' },
        { kind: 'server', message: '提交入口暂不可用。', path: '/contact/send' }
      )
    )
    const contact = useHmrContactForm({ onDelivered })

    await expect(contact.submit()).resolves.toEqual({ delivered: false })

    expect(contact.sent.value).toBe(false)
    expect(contact.submitError.value).toBe('提交入口暂不可用。')
    expect(contact.submitting.value).toBe(false)
    expect(onDelivered).not.toHaveBeenCalled()
  })
})
