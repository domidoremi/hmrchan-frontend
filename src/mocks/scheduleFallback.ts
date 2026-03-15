import type {
  ScheduleCalendarItem,
  ScheduleCategory,
  ScheduleResponse,
} from '@/api/scheduleService'
import { getFallbackAuthorById } from './authorsFallback'
import { createPublicFallbackId, daysAgo, daysFromNow, hoursAgo } from './publicPageFallback'

function fallbackAuthor(authorId: string): ScheduleResponse['author'] {
  const author = getFallbackAuthorById(authorId)
  if (!author) return null

  return {
    id: author.id,
    username: author.username,
    display_name: author.display_name ?? author.name ?? author.username,
    avatar_url: author.avatar_url ?? null,
  }
}

function eventDetail(item: ScheduleResponse): ScheduleResponse {
  return item
}

export const SCHEDULE_FALLBACK_DETAILS: ScheduleResponse[] = [
  eventDetail({
    id: createPublicFallbackId('schedule', 'editorial-live-room'),
    title: '编辑直播室：把首页层叠感收回到稳定的栏目节奏',
    description:
      '一场围绕首页节奏与回退态的公开直播。\n\n▼看点\n- 为什么滚动动效要做减法\n- 如何让 CTA 更内聚\n- 精选区怎样保留栏目感\n\n▼提醒\n直播回放将在次日整理为图文摘要。',
    category: 'live',
    start_date: daysFromNow(1, 20, 0),
    end_date: daysFromNow(1, 21, 15),
    is_all_day: false,
    venue: 'Momi Live Room',
    venue_address: 'Online · Streaming',
    event_url: 'https://example.com/events/editorial-live-room',
    ticket_url: 'https://example.com/events/editorial-live-room/tickets',
    author: fallbackAuthor('fallback-author-kana'),
    source_url: 'https://example.com/events/editorial-live-room/source',
    source_platform: 'editorial',
    color: '#ef4444',
    is_published: true,
    created_at: daysAgo(10),
    updated_at: hoursAgo(6),
  }),
  eventDetail({
    id: createPublicFallbackId('schedule', 'soft-cover-review'),
    title: '封面审稿会：把探索页排成更轻的杂志栏目',
    description:
      '一次更偏静态设计的栏目审稿。\n\n▼讨论范围\n- 探索页的瀑布流节奏\n- 作者卡的统一语言\n- 深色模式下的可读性。',
    category: 'media',
    start_date: daysFromNow(3, 19, 30),
    end_date: daysFromNow(3, 20, 30),
    is_all_day: false,
    venue: 'Editorial Review Board',
    venue_address: 'Online · Members Session',
    event_url: 'https://example.com/events/soft-cover-review',
    author: fallbackAuthor('fallback-author-airi'),
    source_url: 'https://example.com/events/soft-cover-review/source',
    source_platform: 'magazine',
    color: '#06b6d4',
    is_published: true,
    created_at: daysAgo(8),
    updated_at: hoursAgo(12),
  }),
  eventDetail({
    id: createPublicFallbackId('schedule', 'creator-birthday-note'),
    title: 'Mika Studio 生日栏目：一天的桌面、卡片与暖色封面',
    description:
      '全天开放的轻量生日企划。\n\n▼栏目内容\n- 生日贺图合集\n- 作者灵感便签\n- 精选桌面拼贴。',
    category: 'birth',
    start_date: daysFromNow(5, 9, 0),
    end_date: daysFromNow(5, 21, 0),
    is_all_day: true,
    venue: 'Front Page Special',
    venue_address: null,
    event_url: 'https://example.com/events/mika-birthday-note',
    author: fallbackAuthor('fallback-author-mika'),
    source_url: 'https://example.com/events/mika-birthday-note/source',
    source_platform: 'community',
    color: '#f59e0b',
    is_published: true,
    created_at: daysAgo(6),
    updated_at: hoursAgo(18),
  }),
  eventDetail({
    id: createPublicFallbackId('schedule', 'footer-bridge-lab'),
    title: '页脚过桥实验室：让最后一屏自然谢幕',
    description:
      '聚焦 footer 与上一屏背景衔接的工作坊。\n\n▼工作坊目标\n- 消除切换抽搐\n- 统一背景基底\n- 减少重复信息。',
    category: 'other',
    start_date: daysFromNow(7, 18, 0),
    end_date: daysFromNow(7, 19, 0),
    is_all_day: false,
    venue: 'UI Bridge Lab',
    venue_address: 'Online Workshop',
    event_url: 'https://example.com/events/footer-bridge-lab',
    ticket_url: 'https://example.com/events/footer-bridge-lab/tickets',
    author: fallbackAuthor('fallback-author-rin'),
    source_url: 'https://example.com/events/footer-bridge-lab/source',
    source_platform: 'workshop',
    color: '#22c55e',
    is_published: true,
    created_at: daysAgo(5),
    updated_at: hoursAgo(8),
  }),
  eventDetail({
    id: createPublicFallbackId('schedule', 'community-editors-pick'),
    title: '社区编辑精选发布：把热帖也做成有封面感的栏目入口',
    description: '本周社区的精选整理会在这里统一发布。',
    category: 'media',
    start_date: daysFromNow(9, 11, 0),
    end_date: daysFromNow(9, 11, 45),
    is_all_day: false,
    venue: 'Community Desk',
    venue_address: 'Online Bulletin',
    event_url: 'https://example.com/events/community-editors-pick',
    author: fallbackAuthor('fallback-author-momo'),
    source_url: 'https://example.com/events/community-editors-pick/source',
    source_platform: 'community',
    color: '#06b6d4',
    is_published: true,
    created_at: daysAgo(4),
    updated_at: hoursAgo(5),
  }),
  eventDetail({
    id: createPublicFallbackId('schedule', 'authors-column-clinic'),
    title: '作者栏目门诊：头像墙之外，如何讲清创作者的风格',
    description: '针对作者页与作者详情页的结构优化进行集中讨论。',
    category: 'other',
    start_date: daysFromNow(12, 20, 0),
    end_date: daysFromNow(12, 21, 0),
    is_all_day: false,
    venue: 'Author Clinic',
    venue_address: 'Online Roundtable',
    event_url: 'https://example.com/events/authors-column-clinic',
    author: fallbackAuthor('fallback-author-haru'),
    source_url: 'https://example.com/events/authors-column-clinic/source',
    source_platform: 'authors',
    color: '#22c55e',
    is_published: true,
    created_at: daysAgo(3),
    updated_at: hoursAgo(3),
  }),
  eventDetail({
    id: createPublicFallbackId('schedule', 'contrast-audit-night'),
    title: '暗色模式可读性巡检夜：灰按钮与白字的修正清单',
    description: '集中处理深色模式下状态、边界和可读性的巡检事项。',
    category: 'live',
    start_date: daysFromNow(15, 21, 0),
    end_date: daysFromNow(15, 22, 0),
    is_all_day: false,
    venue: 'Contrast Audit Session',
    venue_address: 'Live QA Stream',
    event_url: 'https://example.com/events/contrast-audit-night',
    author: fallbackAuthor('fallback-author-emi'),
    source_url: 'https://example.com/events/contrast-audit-night/source',
    source_platform: 'qa',
    color: '#ef4444',
    is_published: true,
    created_at: daysAgo(2),
    updated_at: hoursAgo(2),
  }),
  eventDetail({
    id: createPublicFallbackId('schedule', 'soft-grid-open-day'),
    title: 'Soft Grid Open Day：探索页与推荐区统一卡片语言',
    description: '一次开放日形式的轻量分享，展示统一卡片系统的推演过程。',
    category: 'birth',
    start_date: daysFromNow(18, 10, 0),
    end_date: daysFromNow(18, 18, 0),
    is_all_day: true,
    venue: 'Open Studio',
    venue_address: 'Online Showcase',
    event_url: 'https://example.com/events/soft-grid-open-day',
    author: fallbackAuthor('fallback-author-airi'),
    source_url: 'https://example.com/events/soft-grid-open-day/source',
    source_platform: 'showcase',
    color: '#f59e0b',
    is_published: true,
    created_at: daysAgo(1),
    updated_at: hoursAgo(1),
  }),
]

export const SCHEDULE_FALLBACK_EVENTS: ScheduleCalendarItem[] = SCHEDULE_FALLBACK_DETAILS.map(
  (item) => ({
    id: item.id,
    title: item.title,
    start: item.start_date,
    end: item.end_date ?? null,
    allDay: item.is_all_day,
    category: item.category,
    color: item.color ?? null,
    url: item.event_url ?? item.source_url ?? null,
    venue: item.venue ?? null,
    description: item.description ?? null,
  })
)

function overlapsRange(item: ScheduleCalendarItem, start?: string, end?: string): boolean {
  const rangeStart = start ? Date.parse(start) : Number.NEGATIVE_INFINITY
  const rangeEnd = end ? Date.parse(end) : Number.POSITIVE_INFINITY
  const itemStart = Date.parse(item.start)
  const itemEnd = Date.parse(item.end ?? item.start)

  return itemEnd >= rangeStart && itemStart <= rangeEnd
}

export function getFallbackScheduleCalendar(
  params: {
    start?: string
    end?: string
    category?: ScheduleCategory
  } = {}
): ScheduleCalendarItem[] {
  return SCHEDULE_FALLBACK_EVENTS.filter((item) => {
    if (params.category && item.category !== params.category) return false
    return overlapsRange(item, params.start, params.end)
  }).sort((left, right) => {
    const leftTime = Date.parse(left.start) || 0
    const rightTime = Date.parse(right.start) || 0
    return leftTime - rightTime
  })
}

export function getFallbackScheduleById(scheduleId: string): ScheduleResponse | null {
  return SCHEDULE_FALLBACK_DETAILS.find((item) => item.id === scheduleId) ?? null
}
