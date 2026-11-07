import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DiscussionComposer from '../DiscussionComposer.vue'

const mocks = vi.hoisted(() => ({ create: vi.fn(), success: vi.fn(), error: vi.fn() }))
const auth = reactive({ user: { id: 'alice' } })
vi.mock('@/api', () => ({
  discussionService: { create: mocks.create },
  searchService: { searchPosts: vi.fn() },
}))
vi.mock('@/stores', () => ({
  useAuthStore: () => auth,
  useToastStore: () => ({ success: mocks.success, error: mocks.error }),
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/utils/app-update/updateBlockers', () => ({ useUpdateBlocker: vi.fn() }))
const wrappers: Array<ReturnType<typeof mount>> = []
const makeWrapper = () => {
  const wrapper = mount(DiscussionComposer, {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        Input: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        Textarea: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        Button: { template: '<button class="submit-draft"><slot /></button>' },
        PlainTextToolbar: true,
        ThumbnailImage: true,
      },
    },
  })
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => {
  localStorage.clear()
  auth.user = { id: 'alice' }
  vi.clearAllMocks()
})
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
})
describe('discussion publishing with a saved draft', () => {
  it('retains edits made while an earlier version is publishing', async () => {
    let resolve!: (value: unknown) => void
    mocks.create.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    const wrapper = makeWrapper()
    await wrapper.find('input').setValue('Original title')
    await wrapper.find('textarea').setValue('This draft has enough content.')
    await wrapper.find('.submit-draft').trigger('click')
    await wrapper.find('input').setValue('A new version')
    resolve({ id: 'discussion-1' })
    await flushPromises()
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('A new version')
    expect(wrapper.emitted('created')).toHaveLength(1)
  })
  it('clears only the successfully submitted draft', async () => {
    mocks.create.mockResolvedValue({ id: 'discussion-1' })
    const wrapper = makeWrapper()
    await wrapper.find('input').setValue('Ready to publish')
    await wrapper.find('textarea').setValue('A complete discussion body.')
    await wrapper.find('.submit-draft').trigger('click')
    await flushPromises()
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
    expect(localStorage.getItem('momichan:discussion-draft:v1:alice')).toBeNull()
  })
  it('retains the draft when publishing fails', async () => {
    mocks.create.mockRejectedValue(new Error('offline'))
    const wrapper = makeWrapper()
    await wrapper.find('input').setValue('Still a draft')
    await wrapper.find('textarea').setValue('This content should remain.')
    await wrapper.find('.submit-draft').trigger('click')
    await flushPromises()
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Still a draft')
    expect(mocks.error).toHaveBeenCalled()
  })
})
