// @vitest-environment jsdom

import { createApp, nextTick, ref, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DiscussionCommentList from '../DiscussionCommentList.vue'

const { getCommentsMock } = vi.hoisted(() => ({
  getCommentsMock: vi.fn(),
}))

const authState = ref(true)

vi.mock('pinia', () => ({
  storeToRefs: (store: Record<string, unknown>) => store,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/stores', () => ({
  useAuthStore: () => ({
    isAuthenticated: authState,
  }),
}))

vi.mock('@/api', () => ({
  discussionService: {
    getComments: getCommentsMock,
  },
  ApiError: class MockApiError extends Error {
    status: number

    constructor(message: string, status = 500) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('../DiscussionCommentCard.vue', () => ({
  default: {
    name: 'DiscussionCommentCard',
    props: ['comment'],
    template: '<article class="discussion-comment-card-stub">{{ comment.id }}</article>',
  },
}))

vi.mock('../DiscussionCommentForm.vue', () => ({
  default: {
    name: 'DiscussionCommentForm',
    template: '<form class="discussion-comment-form-stub" />',
  },
}))

vi.mock('@/components/animation/AnimatedIcon.vue', () => ({
  default: {
    name: 'AnimatedIcon',
    template: '<span class="animated-icon-stub" />',
  },
}))

vi.mock('@/components/appearance/ControlButton.vue', () => ({
  default: {
    name: 'ControlButton',
    template: '<button class="control-button-stub"><slot /></button>',
  },
}))

vi.mock('@/components/ui/StateIndicator.vue', () => ({
  default: {
    name: 'StateIndicator',
    template: '<div class="state-indicator-stub" />',
  },
}))

vi.mock('@/components/ui/Select.vue', () => ({
  default: {
    name: 'Select',
    template: '<select class="select-stub"><slot /></select>',
  },
}))

async function flushUi() {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

let app: App<Element> | null = null
let host: HTMLDivElement | null = null

describe('DiscussionCommentList', () => {
  afterEach(() => {
    app?.unmount()
    host?.remove()
    app = null
    host = null
    authState.value = true
    getCommentsMock.mockReset()
  })

  it('renders the empty state after the initial fetch resolves with no comments', async () => {
    getCommentsMock.mockResolvedValue({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    host = document.createElement('div')
    document.body.appendChild(host)
    app = createApp(DiscussionCommentList, { discussionId: 'discussion-1' })
    app.config.globalProperties.$t = (key: string) => key
    app.mount(host)

    await flushUi()

    expect(getCommentsMock).toHaveBeenCalled()
    expect(host.querySelector('.empty-state')).not.toBeNull()
    expect(host.querySelector('.comments-list')).toBeNull()
  })

  it('renders the discussion comment list when comments are returned', async () => {
    getCommentsMock.mockResolvedValue({
      items: [
        {
          id: 'discussion-comment-1',
          content: 'hello',
          created_at: '2026-04-14T00:00:00Z',
          user: { id: 'u1', username: 'alice', avatar_url: null },
          is_pinned: false,
          replies: [],
        },
      ],
      next_cursor: null,
      has_more: false,
    })

    host = document.createElement('div')
    document.body.appendChild(host)
    app = createApp(DiscussionCommentList, { discussionId: 'discussion-2' })
    app.config.globalProperties.$t = (key: string) => key
    app.mount(host)

    await flushUi()

    expect(host.querySelector('.comments-list')).not.toBeNull()
    expect(host.querySelectorAll('.discussion-comment-card-stub')).toHaveLength(1)
    expect(host.querySelector('.comment-controls')).not.toBeNull()
  })
})
