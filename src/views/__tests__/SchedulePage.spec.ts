import { flushPromises, shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError } from '@/api'

import SchedulePage from '../SchedulePage.vue'

const scheduleApi = vi.hoisted(() => ({
  calendar: vi.fn(),
  getById: vi.fn(),
}))

const toastStore = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
      locale: ref('en'),
    }),
  }
})

vi.mock('@/api/scheduleService', () => ({
  scheduleService: scheduleApi,
}))

vi.mock('@/stores/schedule', () => ({
  useScheduleStore: () => ({
    markVisited: vi.fn(),
  }),
}))

vi.mock('@/stores', () => ({
  useToastStore: () => toastStore,
}))

vi.mock('@/fallbacks/scheduleFallback', () => ({
  getFallbackScheduleById: vi.fn(() => null),
  getFallbackScheduleCalendar: vi.fn(() => []),
}))

vi.mock('@/fallbacks/publicPageFallback', () => ({
  isServiceUnavailableError: vi.fn(() => false),
  resolvePublicFallbackReason: vi.fn(() => null),
}))

vi.mock('@/utils/cache', () => ({
  getPublicSnapshot: vi.fn(() => Promise.resolve(undefined)),
  setPublicSnapshot: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/utils/pageMeta', () => ({
  applyPageMeta: vi.fn(),
}))

vi.mock('@/components/ui/StateIndicator.vue', () => ({
  default: {
    name: 'StateIndicator',
    template: '<div data-testid="state-indicator" />',
  },
}))

async function mountSchedule(path = '/schedule/event-1') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/schedule',
        name: 'schedule',
        component: SchedulePage,
      },
      {
        path: '/schedule/:id',
        name: 'schedule-detail',
        component: SchedulePage,
      },
    ],
  })

  await router.push(path)
  await router.isReady()

  const wrapper = shallowMount(SchedulePage, {
    global: {
      plugins: [router],
      mocks: {
        $t: (key: string) => key,
      },
    },
  })

  await flushPromises()
  return { wrapper, router }
}

describe('SchedulePage', () => {
  beforeEach(() => {
    const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const futureEnd = new Date(futureStart.getTime() + 90 * 60 * 1000)

    scheduleApi.calendar.mockReset()
    scheduleApi.getById.mockReset()
    toastStore.success.mockReset()
    toastStore.error.mockReset()

    scheduleApi.calendar.mockResolvedValue([
      {
        id: 'event-1',
        title: 'Morning live',
        start: futureStart.toISOString(),
        end: futureEnd.toISOString(),
        allDay: false,
        category: 'live',
        venue: 'Tokyo Dome City Hall',
        description: 'Live recording session',
      },
    ])

    scheduleApi.getById.mockResolvedValue({
      id: 'event-1',
      title: 'Morning live',
      description: 'Line one\nLine two',
      category: 'live',
      start_date: futureStart.toISOString(),
      end_date: futureEnd.toISOString(),
      is_all_day: false,
      venue: 'Tokyo Dome City Hall',
      venue_address: '1-3-61 Koraku, Tokyo',
      event_url: 'https://example.com/event',
      ticket_url: 'https://example.com/ticket',
      source_url: 'https://example.com/source',
      source_platform: 'Official',
      is_published: true,
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-02T00:00:00Z',
      author: {
        id: 'author-1',
        display_name: 'Michi Team',
      },
    })
  })

  it('renders a route-driven detail rail on the schedule detail route', async () => {
    const { wrapper } = await mountSchedule()

    expect(wrapper.find('.schedule-detail-shell').exists()).toBe(true)
    expect(wrapper.find('.schedule-detail-article__title').text()).toContain('Morning live')
    expect(wrapper.text()).toContain('schedule.detail.aboutTitle')
    expect(wrapper.find('.detail-links').exists()).toBe(true)
    expect(wrapper.find('[data-testid=\"state-indicator\"]').exists()).toBe(false)
  })

  it('shows the agenda and planner shells together on the main schedule route', async () => {
    const { wrapper } = await mountSchedule('/schedule')

    expect(wrapper.find('.schedule-overview').exists()).toBe(true)
    expect(wrapper.find('.agenda-shell').exists()).toBe(true)
    expect(wrapper.find('.planner-shell').exists()).toBe(true)
    expect(wrapper.findAll('.agenda-spotlight')).toHaveLength(3)
    expect(wrapper.find('.agenda-events-list').exists()).toBe(true)
  })

  it('returns to /schedule when the detail rail is closed', async () => {
    const { wrapper, router } = await mountSchedule()

    await wrapper.find('.schedule-detail-shell__close').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('schedule')
  })

  it('keeps a stable detail shell and avoids toast noise for missing detail routes', async () => {
    scheduleApi.getById.mockRejectedValueOnce(new ApiError('not found', 404, 'NOT_FOUND'))

    const { wrapper } = await mountSchedule('/schedule/missing-event')

    expect(wrapper.find('.schedule-detail-shell').exists()).toBe(true)
    expect(wrapper.find('.schedule-detail-state').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'StateIndicator' }).exists()).toBe(true)
    expect(toastStore.error).not.toHaveBeenCalled()
  })

  it('ignores foreign route params outside the schedule detail route', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/post/:id',
          name: 'post-detail',
          component: SchedulePage,
        },
      ],
    })

    await router.push('/post/event-1')
    await router.isReady()

    shallowMount(SchedulePage, {
      global: {
        plugins: [router],
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    await flushPromises()

    expect(scheduleApi.getById).not.toHaveBeenCalled()
  })
})
