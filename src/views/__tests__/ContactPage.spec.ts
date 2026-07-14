import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import ContactPage from '@/views/ContactPage.vue'
import { loadSupportContentResource, submitContactResource } from '@/api/hmrContent'
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

async function mountContactPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/contact', component: ContactPage },
      { path: '/thank-you', component: { template: '<div>thanks</div>' } },
    ],
  })
  await router.push('/contact')
  await router.isReady()

  const wrapper = mount(ContactPage, {
    global: {
      plugins: [createPinia(), router],
      stubs: {
        RouterLink: true,
      },
    },
  })
  await flushPromises()

  return { router, wrapper }
}

async function fillRequiredFields(
  wrapper: Awaited<ReturnType<typeof mountContactPage>>['wrapper']
) {
  const inputs = wrapper.findAll('input')
  await inputs[0]?.setValue('Momi')
  await inputs[1]?.setValue('momi@example.com')
  await wrapper.find('textarea').setValue('Hello')
}

describe('ContactPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    const supportResource = makeResource({
      faqs: [{ id: 'faq', title: 'FAQ', excerpt: 'Answer', metric: '01' }],
      flows: [{ id: 'flow', title: 'Flow', excerpt: 'Step', metric: 'Brief' }],
    })
    readPublicContentMock.mockResolvedValue(supportResource)
    loadSupportContentResourceMock.mockResolvedValue(supportResource)
  })

  it('navigates to thank-you after a delivered contact submission', async () => {
    submitContactResourceMock.mockResolvedValueOnce(
      makeResource({ delivered: true, endpoint: '/contact/send' })
    )
    const { router, wrapper } = await mountContactPage()

    await fillRequiredFields(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/thank-you')
    expect(submitContactResourceMock).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('renders submit errors without leaving the contact page', async () => {
    submitContactResourceMock.mockResolvedValueOnce(
      makeResource(
        { delivered: false, endpoint: '/contact/send' },
        { kind: 'server', message: '提交入口暂不可用。', path: '/contact/send' }
      )
    )
    const { router, wrapper } = await mountContactPage()

    await fillRequiredFields(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/contact')
    expect(wrapper.text()).toContain('提交入口暂不可用。')
    wrapper.unmount()
  })
})
