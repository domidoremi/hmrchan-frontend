import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'

import type { HmrScheduleContent } from '@/api/hmrContent'
import { loadScheduleContentResource } from '@/api/hmrContent'
import type { HmrAsyncResource } from '@/hmr/types'
import SchedulePage from '@/views/SchedulePage.vue'
import { readPublicContent } from '@/utils/cache/publicContentCache'

vi.mock('@/api/hmrContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hmrContent')>()
  return {
    ...actual,
    loadScheduleContentResource: vi.fn(),
  }
})

vi.mock('@/utils/cache/publicContentCache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/cache/publicContentCache')>()
  return {
    ...actual,
    readPublicContent: vi.fn(),
  }
})

const loadScheduleContentResourceMock = vi.mocked(loadScheduleContentResource)
const readPublicContentMock = vi.mocked(readPublicContent)

const messages = {
  'zh-CN': {
    community: {
      title: '社区',
    },
    explore: {
      loadMore: '重新加载',
    },
    schedule: {
      all: '全部',
      arrangement: '安排',
      clue: '提交线索',
      date: '日期',
      dateTitle: '日历',
      eyebrow: '日程',
      emptyDay: '当天暂无',
      itemCount: '项',
      month: '本月',
      nextMonth: '后一月',
      nextWindow: '近期',
      noItems: '暂无',
      performance: '演出',
      previousMonth: '前一月',
      related: '相关内容',
      selected: '选中',
      title: '日程',
      today: '今天',
      upcoming: '即将开始',
      week: '本周',
      weekTitle: '一周',
      overviewLabel: '日程概览',
      previewTitle: '当前显示公开预览',
      previewEmptyBody: '日程结构保持可用，可重新加载公开排期。',
      previewErrorBody: '公开排期暂不可用，预览日程保持可浏览。',
      previewLiveTitle: '直播窗口排期',
      previewPlanningTitle: '选题与物料确认',
      previewReleaseTitle: '内容发布窗口',
      previewCommunityTitle: '社区回应整理',
      previewItemBody: '公开接口恢复后会在当前时间表中更新。',
      filterLabel: '日程筛选',
      datePickerLabel: '选择日期',
    },
  },
  'en-US': {
    community: {
      title: 'Community',
    },
    explore: {
      loadMore: 'Reload',
    },
    schedule: {
      all: 'All',
      arrangement: 'Item',
      clue: 'Add lead',
      date: 'Date',
      dateTitle: 'Calendar',
      eyebrow: 'Schedule',
      emptyDay: 'No events',
      itemCount: 'items',
      month: 'Month',
      nextMonth: 'Next month',
      nextWindow: 'Next',
      noItems: 'None',
      performance: 'Live',
      previousMonth: 'Previous month',
      related: 'Related',
      selected: 'Selected',
      title: 'Schedule',
      today: 'Today',
      upcoming: 'Upcoming',
      week: 'Week',
      weekTitle: 'This week',
      overviewLabel: 'Schedule overview',
      previewTitle: 'Public preview',
      previewEmptyBody: 'The schedule remains available. Reload public events.',
      previewErrorBody: 'Public events are unavailable. The preview remains available.',
      previewLiveTitle: 'Live window schedule',
      previewPlanningTitle: 'Topic and asset planning',
      previewReleaseTitle: 'Content release window',
      previewCommunityTitle: 'Community response review',
      previewItemBody: 'This timeline updates in place when the public API recovers.',
      filterLabel: 'Schedule filters',
      datePickerLabel: 'Choose a date',
    },
  },
}

function makeContent(): HmrScheduleContent {
  return {
    items: [
      {
        id: 'live',
        title: 'Live stage',
        phase: '直播',
        time: '20:30',
        description: 'Performance slot',
      },
      {
        id: 'release',
        title: 'June release',
        phase: '发布',
        time: '2026-06-02T12:00:00.000Z',
        description: 'Release window',
      },
    ],
    calendar: [],
    highlights: [],
  }
}

function makeResource(data = makeContent()): HmrAsyncResource<HmrScheduleContent> {
  return {
    state: 'ready',
    data,
    source: 'api',
    error: null,
    paths: ['/schedules'],
    updatedAt: '2026-05-28T00:00:00.000Z',
  }
}

async function mountSchedulePage(resource = makeResource(), locale: 'zh-CN' | 'en-US' = 'zh-CN') {
  const i18n = createI18n({
    legacy: false,
    locale,
    messages,
  })
  readPublicContentMock.mockResolvedValue(resource)
  loadScheduleContentResourceMock.mockResolvedValue(resource)
  const wrapper = mount(SchedulePage, {
    global: {
      plugins: [i18n],
      stubs: {
        RouterLink: true,
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('SchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders schedule events from the public content resource', async () => {
    const wrapper = await mountSchedulePage()

    expect(wrapper.find('.schedule-page').exists()).toBe(true)
    expect(wrapper.text()).toContain('Live stage')
    expect(wrapper.text()).toContain('Performance slot')
    expect(readPublicContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'hmr:schedule',
        scope: 'schedule',
        strategy: 'network-first',
      })
    )
  })

  it('falls back to a preview schedule when the public content is empty', async () => {
    const wrapper = await mountSchedulePage(
      makeResource({ items: [], calendar: [], highlights: [] })
    )

    expect(wrapper.text()).toContain('直播窗口排期')
    expect(wrapper.find('.hmr-schedule-empty').exists()).toBe(false)
    expect(
      wrapper.get('[data-hmr-page-state-block="true"]').attributes('data-hmr-page-state')
    ).toBe('empty')
  })

  it('keeps preview schedules retryable', async () => {
    const resource = makeResource({ items: [], calendar: [], highlights: [] })
    const wrapper = await mountSchedulePage(resource)
    const state = wrapper.get('[data-hmr-page-state-block="true"]')

    await state.get('button').trigger('click')
    await flushPromises()
    expect(readPublicContentMock).toHaveBeenCalledTimes(2)
  })

  it('preserves configured local preview times', async () => {
    const wrapper = await mountSchedulePage(
      makeResource({ items: [], calendar: [], highlights: [] })
    )
    const liveEvent = wrapper
      .findAll('.hmr-schedule-event')
      .find((item) => item.text().includes('直播窗口排期'))

    expect(liveEvent?.text()).toContain('20:30')
  })

  it('renders preview schedules in the active locale', async () => {
    const wrapper = await mountSchedulePage(
      makeResource({ items: [], calendar: [], highlights: [] }),
      'en-US'
    )

    expect(wrapper.text()).toContain('Public preview')
    expect(wrapper.text()).toContain('Live window schedule')
    expect(wrapper.text()).not.toContain('当前显示公开预览')
    expect(wrapper.get('.hmr-schedule-filter-row').attributes('aria-label')).toBe(
      'Schedule filters'
    )
    expect(wrapper.get('.hmr-schedule-date-strip').attributes('aria-label')).toBe('Choose a date')
  })

  it('switches to the month grid from filter controls', async () => {
    const wrapper = await mountSchedulePage()
    const monthButton = wrapper
      .findAll('.hmr-schedule-filter')
      .find((button) => button.text() === '本月')

    await monthButton?.trigger('click')

    expect(wrapper.find('.hmr-schedule-month-grid').exists()).toBe(true)
    expect(wrapper.findAll('.hmr-schedule-month-cell')).toHaveLength(42)
  })
})
