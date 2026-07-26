import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'

import type { HmrScheduleDetailContent } from '@/api/hmrContent'
import type { HmrAsyncResource } from '@/hmr/types'
import i18n, { applyLocale } from '@/i18n'
import ScheduleDetailPage from '@/views/ScheduleDetailPage.vue'

const SCHEDULE_ID = '018f5f3a-01a2-7c3d-8e4f-0123456789ae'

const mocks = vi.hoisted(() => ({
  loadScheduleDetailContentResource: vi.fn(),
  readPublicContent: vi.fn(),
}))

vi.mock('@/api/hmrContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hmrContent')>()
  return {
    ...actual,
    loadScheduleDetailContentResource: mocks.loadScheduleDetailContentResource,
  }
})

vi.mock('@/utils/cache/publicContentCache', () => ({
  readPublicContent: mocks.readPublicContent,
}))

function makeResource(
  data: HmrScheduleDetailContent,
  error: HmrAsyncResource<HmrScheduleDetailContent>['error'] = null
): HmrAsyncResource<HmrScheduleDetailContent> {
  return {
    state: 'ready',
    data,
    source: error ? 'local' : 'api',
    error,
    paths: [`/schedules/${SCHEDULE_ID}`],
    updatedAt: '2026-07-26T00:00:00.000Z',
  }
}

async function mountScheduleDetail() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/schedule/:id', component: ScheduleDetailPage },
      { path: '/schedule', component: { template: '<div />' } },
      { path: '/author/:id', component: { template: '<div />' } },
    ],
  })
  await router.push(`/schedule/${SCHEDULE_ID}`)
  await router.isReady()

  const wrapper = mount(ScheduleDetailPage, {
    global: { plugins: [router, i18n] },
  })
  await flushPromises()
  return wrapper
}

describe('ScheduleDetailPage', () => {
  beforeEach(() => {
    applyLocale('zh-CN')
    mocks.loadScheduleDetailContentResource.mockReset()
    mocks.readPublicContent.mockReset()
  })

  it('loads and renders a public schedule detail', async () => {
    mocks.readPublicContent.mockResolvedValue(
      makeResource({
        id: SCHEDULE_ID,
        title: 'Momi Live Window',
        description: 'A public schedule detail.',
        category: 'live',
        startAt: '2026-07-26T12:00:00Z',
        endAt: '2026-07-26T13:30:00Z',
        isAllDay: false,
        venue: 'Signal Hall',
        eventUrl: 'https://events.example.test/momi-live',
        author: {
          id: '018f5f3a-01a2-7c3d-8e4f-0123456789ad',
          name: 'Momi Creator',
        },
        viewState: 'available',
      })
    )

    const wrapper = await mountScheduleDetail()

    expect(mocks.readPublicContent).toHaveBeenCalledWith({
      key: `hmr:schedule-detail:${SCHEDULE_ID}`,
      scope: 'schedule-detail',
      strategy: 'stale-while-revalidate',
      loader: expect.any(Function),
    })
    const loader = mocks.readPublicContent.mock.calls[0]?.[0]?.loader as () => Promise<unknown>
    await loader()
    expect(mocks.loadScheduleDetailContentResource).toHaveBeenCalledExactlyOnceWith(SCHEDULE_ID)
    expect(wrapper.find('.schedule-detail-page').exists()).toBe(true)
    expect(wrapper.text()).toContain('Momi Live Window')
    expect(wrapper.text()).toContain('Signal Hall')
    expect(wrapper.get('a[href="https://events.example.test/momi-live"]').attributes('rel')).toBe(
      'noopener noreferrer'
    )
  })

  it('renders a non-retryable empty state for a missing schedule', async () => {
    mocks.readPublicContent.mockResolvedValue(
      makeResource(
        {
          id: SCHEDULE_ID,
          title: '',
          description: '',
          category: '',
          startAt: '',
          isAllDay: false,
          viewState: 'not-found',
        },
        {
          kind: 'not-found',
          message: 'Not found',
          path: `/schedules/${SCHEDULE_ID}`,
          status: 404,
        }
      )
    )

    const wrapper = await mountScheduleDetail()

    expect(
      wrapper.get('[data-hmr-page-state-block="true"]').attributes('data-hmr-page-state')
    ).toBe('empty')
    expect(wrapper.text()).toContain('日程不存在')
    expect(wrapper.find('.hmr-status-button').exists()).toBe(false)
  })
})
