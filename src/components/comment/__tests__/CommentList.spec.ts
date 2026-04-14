// @vitest-environment jsdom

import { createApp, nextTick, reactive, ref, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CommentList from '../CommentList.vue'

const { fetchCommentsMock } = vi.hoisted(() => ({
  fetchCommentsMock: vi.fn(),
}))

const authState = ref(true)
const commentState = reactive({
  isLoading: true,
  comments: [] as Array<{ id: string; replies?: Array<unknown> }>,
})

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
  useCommentsStore: () => ({
    get isLoading() {
      return commentState.isLoading
    },
    getCommentsByPostId: () => commentState.comments,
    getCommentsCount: () =>
      commentState.comments.reduce(
        (total, comment) => total + 1 + (comment.replies?.length ?? 0),
        0
      ),
    fetchComments: fetchCommentsMock,
  }),
}))

vi.mock('../CommentCard.vue', () => ({
  default: {
    name: 'CommentCard',
    props: ['comment'],
    template: '<article class="comment-card-stub">{{ comment.id }}</article>',
  },
}))

vi.mock('../CommentForm.vue', () => ({
  default: {
    name: 'CommentForm',
    emits: ['submitted'],
    template: `
      <form class="comment-form-stub">
        <button
          type="button"
          class="comment-form-submit-stub"
          @click="$emit('submitted')"
        >
          submit
        </button>
      </form>
    `,
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

vi.mock('@/components/appearance/ControlGroup.vue', () => ({
  default: {
    name: 'ControlGroup',
    template: '<div class="control-group-stub"><slot /></div>',
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

describe('CommentList', () => {
  afterEach(() => {
    app?.unmount()
    host?.remove()
    app = null
    host = null
    authState.value = true
    commentState.isLoading = true
    commentState.comments = []
    fetchCommentsMock.mockReset()
  })

  it('renders the empty state after the initial fetch resolves with no comments', async () => {
    fetchCommentsMock.mockImplementation(async () => {
      commentState.isLoading = false
      commentState.comments = []
      return { success: true, data: [] }
    })

    host = document.createElement('div')
    document.body.appendChild(host)
    app = createApp(CommentList, { postId: 'post-1' })
    app.mount(host)

    await flushUi()

    expect(fetchCommentsMock).toHaveBeenCalledWith('post-1', 'popular', expect.any(Object))
    expect(host.querySelector('.empty-state')).not.toBeNull()
    expect(host.querySelector('.comments-list')).toBeNull()
  })

  it('renders the threaded list and sort controls when comments are returned', async () => {
    fetchCommentsMock.mockImplementation(async () => {
      commentState.isLoading = false
      commentState.comments = [
        { id: 'comment-1' },
        { id: 'comment-2', replies: [{ id: 'reply-1' }] },
      ]
      return { success: true, data: commentState.comments }
    })

    host = document.createElement('div')
    document.body.appendChild(host)
    app = createApp(CommentList, { postId: 'post-2' })
    app.mount(host)

    await flushUi()

    expect(host.querySelector('.comments-list')).not.toBeNull()
    expect(host.querySelectorAll('.comment-card-stub')).toHaveLength(2)
    expect(host.querySelector('.comment-sort')).not.toBeNull()
    expect(host.textContent).toContain('3')
  })

  it('reflects the refreshed store state after a successful top-level comment submit', async () => {
    fetchCommentsMock.mockImplementation(async () => {
      commentState.isLoading = false
      commentState.comments = [{ id: 'comment-1' }]
      return { success: true, data: commentState.comments }
    })

    host = document.createElement('div')
    document.body.appendChild(host)
    app = createApp(CommentList, { postId: 'post-3' })
    app.mount(host)

    await flushUi()

    commentState.comments = [{ id: 'comment-new' }, { id: 'comment-1' }]
    ;(host.querySelector('.comment-form-submit-stub') as HTMLButtonElement).click()
    await flushUi()

    const renderedIds = Array.from(host.querySelectorAll('.comment-card-stub')).map((node) =>
      node.textContent?.trim()
    )
    expect(renderedIds).toEqual(['comment-new', 'comment-1'])
    expect(host.textContent).toContain('2')
  })
})
