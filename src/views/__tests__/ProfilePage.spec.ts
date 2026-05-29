import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { HmrProfileSectionContent } from '@/api/hmrContent'
import type { HmrAsyncResource } from '@/hmr/types'
import ProfilePage from '@/views/ProfilePage.vue'

const mocks = vi.hoisted(() => ({
  loadProfileSectionContentResource: vi.fn(),
}))

vi.mock('@/api/hmrContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hmrContent')>()
  return {
    ...actual,
    seedCommunity: [],
    loadProfileSectionContentResource: mocks.loadProfileSectionContentResource,
  }
})

function makeProfileContent(
  overrides: Partial<HmrProfileSectionContent> = {}
): HmrProfileSectionContent {
  return {
    section: 'overview',
    title: '个人概览',
    summary: [
      {
        id: 'summary-1',
        title: 'Profile summary',
        excerpt: 'Account summary row',
        metric: 'Profile',
      },
    ],
    rows: [
      {
        id: 'row-1',
        title: 'Profile row',
        excerpt: 'Loaded profile row',
        metric: 'Ready',
      },
    ],
    ...overrides,
  }
}

function makeResource(data: HmrProfileSectionContent): HmrAsyncResource<HmrProfileSectionContent> {
  return {
    state: 'ready',
    data,
    source: 'api',
    error: null,
    paths: ['/profile'],
    updatedAt: '2026-05-28T00:00:00.000Z',
  }
}

async function mountProfilePage(section = 'overview') {
  const i18n = createI18n({
    legacy: false,
    locale: 'zh-CN',
    messages: {
      'zh-CN': {
        profile: {
          empty: '暂无个人内容',
          favorites: '收藏',
          history: '历史',
          inbox: '收件箱',
          overview: '概览',
          preferences: '偏好',
          security: '安全',
          sessionState: '会话状态',
        },
      },
    },
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profile', component: ProfilePage, props: { section: 'overview' } },
      { path: '/profile/:section', component: ProfilePage, props: true },
      { path: '/login', component: { template: '<div />' } },
      { path: '/settings', component: { template: '<div />' } },
    ],
  })
  const path = section === 'overview' ? '/profile' : `/profile/${section}`
  await router.push(path)
  await router.isReady()

  const wrapper = mount(ProfilePage, {
    props: { section },
    global: {
      plugins: [createPinia(), i18n, router],
      stubs: {
        HmrPageStateBlock: true,
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('ProfilePage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.loadProfileSectionContentResource.mockReset()
  })

  it('loads and renders the active profile section', async () => {
    mocks.loadProfileSectionContentResource.mockResolvedValue(
      makeResource(makeProfileContent({ title: '安全状态', section: 'security' }))
    )

    const wrapper = await mountProfilePage('security')

    expect(mocks.loadProfileSectionContentResource).toHaveBeenCalledExactlyOnceWith('security')
    expect(wrapper.text()).toContain('安全状态')
    expect(wrapper.text()).toContain('Profile row')
  })

  it('normalizes unknown profile sections to overview', async () => {
    mocks.loadProfileSectionContentResource.mockResolvedValue(makeResource(makeProfileContent()))

    await mountProfilePage('unknown')

    expect(mocks.loadProfileSectionContentResource).toHaveBeenCalledExactlyOnceWith('overview')
  })
})
