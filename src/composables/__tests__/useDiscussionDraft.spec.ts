import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  decodeDiscussionDraft,
  useDiscussionDraft,
  type DiscussionDraft,
} from '../useDiscussionDraft'
import { resetPrivateSessionState } from '@/services/privateSessionState'

const mounted: Array<ReturnType<typeof mount>> = []
function setup(owner = ref<string | undefined>('alice')) {
  const fields = {
    title: ref(''),
    content: ref(''),
    tagInput: ref(''),
    tags: ref<string[]>([]),
    selectedPosts: ref<DiscussionDraft['selectedPosts']>([]),
    category: ref<DiscussionDraft['category']>('general'),
  }
  let draft!: ReturnType<typeof useDiscussionDraft>
  mounted.push(
    mount(
      defineComponent({
        setup() {
          draft = useDiscussionDraft(() => owner.value, fields)
          return () => null
        },
      })
    )
  )
  return {
    fields,
    owner,
    get draft() {
      return draft
    },
  }
}
beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})
afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('discussion drafts', () => {
  it('saves the final edit on pagehide and restores all form fields', () => {
    const first = setup()
    first.fields.title.value = 'Title'
    first.fields.content.value = 'A draft with enough content.'
    first.fields.tags.value = ['live']
    first.fields.category.value = 'sharing'
    first.fields.selectedPosts.value = [{ id: 'post-1', title: 'Referenced item' }]
    window.dispatchEvent(new Event('pagehide'))
    expect(first.draft.status.value).toBe('saved')
    const second = setup()
    expect(second.fields.title.value).toBe('Title')
    expect(second.fields.tags.value).toEqual(['live'])
    expect(second.fields.category.value).toBe('sharing')
    expect(second.fields.selectedPosts.value[0]?.id).toBe('post-1')
  })
  it('keeps drafts isolated when the account changes', () => {
    const state = setup()
    state.fields.title.value = 'Alice draft'
    state.owner.value = 'bob'
    expect(state.fields.title.value).toBe('')
    state.fields.title.value = 'Bob draft'
    state.owner.value = 'alice'
    expect(state.fields.title.value).toBe('Alice draft')
    resetPrivateSessionState()
    expect(state.fields.title.value).toBe('')
    expect(state.draft.canUndo.value).toBe(false)
  })
  it('clears and restores reactive arrays without cloning errors', () => {
    const state = setup()
    state.fields.title.value = 'Draft'
    state.fields.tags.value.push('tour')
    state.draft.clear()
    expect(state.draft.hasDraft.value).toBe(false)
    expect(state.draft.canUndo.value).toBe(true)
    state.draft.restore()
    expect(state.fields.tags.value).toEqual(['tour'])
    expect(state.draft.status.value).toBe('saved')
    state.draft.discard()
    expect(localStorage.getItem('momichan:discussion-draft:v1:alice')).toBeNull()
    expect(state.draft.canUndo.value).toBe(false)
  })
  it('does not overwrite new input with an earlier cleared draft', () => {
    const state = setup()
    state.fields.title.value = 'First'
    state.draft.clear()
    state.fields.title.value = 'New'
    state.draft.restore()
    expect(state.fields.title.value).toBe('New')
  })
  it('reports storage failure while retaining the unsaved text', () => {
    const state = setup()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    state.fields.content.value = 'Still here'
    vi.advanceTimersByTime(400)
    expect(state.draft.status.value).toBe('failed')
    expect(state.fields.content.value).toBe('Still here')
  })
  it('ignores malformed, expired, and oversized records', () => {
    expect(decodeDiscussionDraft('{')).toBeNull()
    expect(decodeDiscussionDraft('x'.repeat(60001))).toBeNull()
    expect(
      decodeDiscussionDraft(
        JSON.stringify({ version: 1, savedAt: 1, title: 'old', content: 'old' })
      )
    ).toBeNull()
  })
})
