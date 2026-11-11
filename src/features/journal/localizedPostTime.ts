import { formatRelativeTime } from '@/utils/date'
import type { JournalPost } from './models'

function isServerTimestamp(value: string): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:[Zz]|[+-]\d{2}:\d{2})?$/.exec(
      value
    )
  if (!match) return false
  const year = Number(match[1]),
    month = Number(match[2]),
    day = Number(match[3])
  const calendar = new Date(0)
  calendar.setUTCFullYear(year, month - 1, day)
  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day
  )
    return false
  const timestamp = /[Zz]$|[+-]\d{2}:\d{2}$/.test(value) ? value : value + 'Z'
  return Number.isFinite(new Date(timestamp).getTime())
}

export function journalPostTimeLabel(
  post: Pick<JournalPost, 'time' | 'publishedAt'>,
  translate: Parameters<typeof formatRelativeTime>[1],
  locale: string
): string {
  // The caller reads the reactive locale; the shared formatter uses document.lang.
  void locale
  const timestamp = post.publishedAt?.trim()
  if (!post.time || !timestamp || !isServerTimestamp(timestamp)) return post.time
  return formatRelativeTime(timestamp, translate)
}
