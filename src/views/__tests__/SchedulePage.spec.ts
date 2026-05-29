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

async function mountSchedulePage() {
  const i18n = createI18n({
    legacy: false,
    locale: 'zh-CN',
    messages,
  })
  const wrapper = mount(SchedulePage, {
    global: {
      plugins: [i18n],
      stubs: {
        HmrPageStateBlock: true,
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
    const resource = makeResource()
    readPublicContentMock.mockResolvedValue(resource)
    loadScheduleContentResourceMock.mockResolvedValue(resource)
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
