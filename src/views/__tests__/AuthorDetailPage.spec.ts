import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthorDetailPage from '../AuthorDetailPage.vue'

const mocks = vi.hoisted(() => ({ author: vi.fn(), posts: vi.fn() }))
const route = reactive({
  name: 'author-detail',
  params: { id: 'author-one' },
  path: '/author/author-one',
})
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push: vi.fn() }),
  RouterLink: { template: '<a><slot /></a>' },
}))
vi.mock('vue-i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-i18n')>()),
  useI18n: () => ({ t: (key: string) => key }),
}))
vi.mock('@/api', () => ({
  authorService: { getAuthor: mocks.author, listAuthorPosts: mocks.posts },
  ApiError: class extends Error {},
}))
vi.mock('@/utils/cache', () => ({
  authorCache: { getAuthor: vi.fn(), setAuthor: vi.fn() },
  getPublicSnapshot: vi.fn(),
  setPublicSnapshot: vi.fn(),
}))
vi.mock('@/utils/pageMeta', () => ({ applyPageMeta: vi.fn() }))
const setup = () =>
  mount(AuthorDetailPage, {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        Avatar: true,
        Skeleton: true,
        StateIndicator: true,
        PostCard: {
          props: ['post'],
          template: '<article class="test-post">{{ post.title }}</article>',
        },
        Button: { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' },
      },
    },
  })
beforeEach(() => {
  vi.clearAllMocks()
  route.name = 'author-detail'
  route.params.id = 'author-one'
  mocks.author.mockResolvedValue({
    id: 'author-one',
    username: 'reader',
    display_name: 'Author',
    bio: 'Current biography',
    post_count: 3,
  })
  mocks.posts.mockResolvedValueOnce({
    items: [{ id: 'post-one', title: 'First item' }],
    next_cursor: 'cursor-two',
    has_more: true,
  })
})

describe('author detail pagination', () => {
  it('ignores ids belonging to other routes while the author page is cached', async () => {
    const wrapper = setup()
    await flushPromises()
    mocks.author.mockClear()
    mocks.posts.mockClear()
    route.name = 'post-detail'
    route.params.id = 'post-two'
    await flushPromises()
    expect(mocks.author).not.toHaveBeenCalled()
    expect(mocks.posts).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('shows backend copy and loads the next cursor without duplicating earlier posts', async () => {
    mocks.posts.mockResolvedValueOnce({
      items: [
        { id: 'post-one', title: 'First item' },
        { id: 'post-two', title: 'Second item' },
      ],
      next_cursor: null,
      has_more: false,
    })
    const wrapper = setup()
    await flushPromises()
    expect(wrapper.text()).toContain('Current biography')
    await wrapper.get('.author-load-more button').trigger('click')
    await flushPromises()
    expect(mocks.posts).toHaveBeenLastCalledWith(
      'author-one',
      { cursor: 'cursor-two', limit: 24 },
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
    expect(wrapper.findAll('.test-post')).toHaveLength(2)
    expect(wrapper.find('.author-load-more').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps loaded content and the cursor available after a failed request', async () => {
    mocks.posts.mockRejectedValueOnce(new Error('offline'))
    const wrapper = setup()
    await flushPromises()
    await wrapper.get('.author-load-more button').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('common.error')
    expect(wrapper.findAll('.test-post')).toHaveLength(1)
    expect(wrapper.get('.author-load-more button').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })
})
