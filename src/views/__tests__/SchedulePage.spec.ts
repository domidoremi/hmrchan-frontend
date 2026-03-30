import { flushPromises, shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

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

vi.mock('@/utils/pageMeta', () => ({
  applyPageMeta: vi.fn(),
}))

vi.mock('@/utils/runtimeHost', () => ({
  shouldExposeFallbackPreviewNotice: vi.fn(() => false),
  getPreferredPreviewLocale: vi.fn(() => null),
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
    scheduleApi.calendar.mockReset()
    scheduleApi.getById.mockReset()
    toastStore.success.mockReset()
    toastStore.error.mockReset()

    scheduleApi.calendar.mockResolvedValue([
      {
        id: 'event-1',
        title: 'Morning live',
        start: '2026-03-30T10:00:00Z',
        end: '2026-03-30T11:30:00Z',
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
      start_date: '2026-03-30T10:00:00Z',
      end_date: '2026-03-30T11:30:00Z',
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
    expect(wrapper.find('.schedule-detail-note').exists()).toBe(true)
  })

  it('returns to /schedule when the detail rail is closed', async () => {
    const { wrapper, router } = await mountSchedule()

    await wrapper.find('.schedule-detail-shell__close').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('schedule')
  })
})
