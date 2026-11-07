import type { LocationQuery } from 'vue-router'

export const feedLayouts = ['grid', 'wall', 'list'] as const
export const feedSources = ['latest', 'youtube', 'tiktok', 'instagram', 'x'] as const
export type FeedLayout = (typeof feedLayouts)[number]
export type FeedSource = (typeof feedSources)[number]

export function queryChoice<T extends string>(
  value: unknown,
  choices: readonly T[],
  fallback: T
): T {
  return typeof value === 'string' && choices.includes(value as T) ? (value as T) : fallback
}

export function readBrowseState(query: LocationQuery) {
  return {
    source: queryChoice(query['source'], feedSources, 'latest'),
    layout: queryChoice(query['layout'], feedLayouts, 'grid'),
    sort: queryChoice(query['sort'], ['latest', 'popular'] as const, 'latest'),
    q: typeof query['q'] === 'string' ? query['q'].slice(0, 160) : '',
  }
}

export function parseLocalDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number) as [number, number, number]
  if (year < 1970 || year > 2100) return null
  const date = new Date(year, month - 1, day, 12)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null
}

export function readScheduleState(query: LocationQuery, now = new Date()) {
  const month = typeof query['month'] === 'string' ? parseLocalDate(`${query['month']}-01`) : null
  const date = parseLocalDate(query['date'])
  return {
    year: (month ?? date ?? now).getFullYear(),
    month: (month ?? date ?? now).getMonth(),
    date,
    view: queryChoice(query['view'], ['day', 'week', 'month'] as const, 'week'),
    category: queryChoice(
      query['category'],
      ['all', 'live', 'media', 'birth', 'other'] as const,
      'all'
    ),
  }
}
