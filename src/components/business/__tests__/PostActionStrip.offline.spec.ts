import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import { favoriteService } from '@/api'
import { useAuthStore, useToastStore } from '@/stores'
import PostActionStrip from '../PostActionStrip.vue'

const enqueue = vi.hoisted(() => vi.fn())
vi.mock('@/utils/cache/offlineQueue', () => ({ addOfflineAction: enqueue }))
enableAutoUnmount(afterEach)
const POST_ID = '01890f47-6a35-7cc4-8a2d-7f5b56c9e001'

async function setup() {
  const pinia = createPinia()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  await router.push('/')
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: {
      en: {
        common: { error: 'Could not save' },
        post: { favorite: 'Favorite', unfavorite: 'Unfavorite', offlineQueued: 'Queued for sync' },
      },
    },
  })
  const wrapper = mount(PostActionStrip, {
    props: { postId: POST_ID, showShare: false },
    global: { plugins: [pinia, router, i18n], stubs: { AnimatedIcon: true } },
  })
  const auth = useAuthStore(pinia)
  auth.user = { id: 'owner-a', username: 'owner', email: 'owner@example.test', created_at: '' }
  const toast = useToastStore(pinia)
  const info = vi.spyOn(toast, 'info')
  const error = vi.spyOn(toast, 'error')
  await flushPromises()
  return { wrapper, auth, info, error }
}

describe('PostActionStrip durable queue confirmation', () => {
  beforeEach(() => {
    enqueue.mockReset()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    vi.spyOn(favoriteService, 'check').mockResolvedValue({ is_favorited: false })
    vi.spyOn(favoriteService, 'create').mockRejectedValue(new TypeError('Offline'))
  })
  afterEach(() => vi.restoreAllMocks())

  it('shows queued success only after durable enqueue resolves', async () => {
    let commit: (id: string) => void = () => {}
    enqueue.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          commit = resolve
        })
    )
    const { wrapper, info, error } = await setup()
    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(enqueue).toHaveBeenCalledWith('favorite', POST_ID, 'owner-a'))
    expect(info).not.toHaveBeenCalled()
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    commit('action-1')
    await flushPromises()
    expect(info).toHaveBeenCalledWith('Queued for sync')
    expect(error).not.toHaveBeenCalled()
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
  })

  it('handles enqueue failure without a success toast or an unhandled rejection', async () => {
    enqueue.mockRejectedValue(new DOMException('Storage full', 'QuotaExceededError'))
    const { wrapper, info, error } = await setup()
    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(error).toHaveBeenCalledWith('Could not save'))
    expect(info).not.toHaveBeenCalled()
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('false')
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
  })

  it('never queues a failed request under the account that replaced its owner', async () => {
    let fail: (error: Error) => void = () => {}
    vi.mocked(favoriteService.create).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          fail = reject
        })
    )
    const { wrapper, auth, info } = await setup()
    await wrapper.get('button').trigger('click')
    auth.user = { id: 'owner-b', username: 'other', email: 'other@example.test', created_at: '' }
    fail(new Error('Offline'))
    await flushPromises()
    expect(enqueue).not.toHaveBeenCalled()
    expect(info).not.toHaveBeenCalled()
  })
})
