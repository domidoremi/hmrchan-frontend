import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'

import type { HmrAuthor } from '@/api/hmrContent'
import type { HmrAsyncResource } from '@/hmr/types'
import i18n from '@/i18n'
import AuthorDetailPage from '@/views/AuthorDetailPage.vue'

const AUTHOR_ID = '018f5f3a-01a2-7c3d-8e4f-0123456789ad'

const mocks = vi.hoisted(() => ({
  loadAuthorDetailContentResource: vi.fn(),
  readPublicContent: vi.fn(),
}))

vi.mock('@/api/hmrContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hmrContent')>()
  return {
    ...actual,
    loadAuthorDetailContentResource: mocks.loadAuthorDetailContentResource,
  }
})

vi.mock('@/utils/cache/publicContentCache', () => ({
  readPublicContent: mocks.readPublicContent,
}))

function makeResource(
  data: HmrAuthor,
  error: HmrAsyncResource<HmrAuthor>['error'] = null
): HmrAsyncResource<HmrAuthor> {
  return {
    state: 'ready',
    data,
    source: error ? 'local' : 'api',
    error,
    paths: [`/authors/${AUTHOR_ID}`],
    updatedAt: '2026-07-26T00:00:00.000Z',
  }
}

async function mountAuthorDetail() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/author/:id', component: AuthorDetailPage },
      { path: '/explore', component: { template: '<div />' } },
    ],
  })
  await router.push(`/author/${AUTHOR_ID}`)
  await router.isReady()

  const wrapper = mount(AuthorDetailPage, {
    global: { plugins: [router, i18n] },
  })
  await flushPromises()
  return wrapper
}

describe('AuthorDetailPage', () => {
  beforeEach(() => {
    mocks.loadAuthorDetailContentResource.mockReset()
    mocks.readPublicContent.mockReset()
  })

  it('loads and renders a public creator profile from the author route', async () => {
    mocks.readPublicContent.mockResolvedValue(
      makeResource({
        id: AUTHOR_ID,
        name: 'Momi Creator',
        bio: 'Creator biography.',
        avatarUrl: '/api/v1/media/creator/avatar',
      })
    )

    const wrapper = await mountAuthorDetail()

    expect(mocks.readPublicContent).toHaveBeenCalledWith({
      key: `hmr:author-detail:${AUTHOR_ID}`,
      scope: 'author-detail',
      strategy: 'stale-while-revalidate',
      loader: expect.any(Function),
    })
    const loader = mocks.readPublicContent.mock.calls[0]?.[0]?.loader as () => Promise<unknown>
    await loader()
    expect(mocks.loadAuthorDetailContentResource).toHaveBeenCalledExactlyOnceWith(AUTHOR_ID)
    expect(wrapper.find('.author-detail-page').exists()).toBe(true)
    expect(wrapper.text()).toContain('Momi Creator')
    expect(wrapper.text()).toContain('Creator biography.')
    expect(wrapper.get('.hmr-detail-cover-media img').attributes('loading')).toBe('eager')
    expect(wrapper.get('.hmr-detail-cover-media img').attributes('fetchpriority')).toBe('high')
  })

  it('renders a non-retryable empty state for a missing creator', async () => {
    mocks.readPublicContent.mockResolvedValue(
      makeResource(
        { id: AUTHOR_ID, name: '', bio: '' },
        {
          kind: 'not-found',
          message: 'Not found',
          path: `/authors/${AUTHOR_ID}`,
          status: 404,
        }
      )
    )

    const wrapper = await mountAuthorDetail()

    expect(
      wrapper.get('[data-hmr-page-state-block="true"]').attributes('data-hmr-page-state')
    ).toBe('empty')
    expect(wrapper.text()).toContain('Creator not found')
    expect(wrapper.find('.hmr-status-button').exists()).toBe(false)
  })
})
