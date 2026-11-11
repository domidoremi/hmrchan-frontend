const formatters = new Map<string, Intl.DateTimeFormat>()

// Use calendar dates only; legacy author-written metadata stays unchanged.
export function journalDateLabel(value: string, locale: string, compact = false): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value
  const year = Number(match[1]),
    month = Number(match[2]),
    day = Number(match[3])
  // Taipei noon preserves the calendar day independently of the host time zone.
  const date = new Date(Date.UTC(year, month - 1, day, 4))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return value
  const key = `${locale}:${compact ? 'compact' : 'full'}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      timeZone: 'Asia/Taipei',
      ...(compact
        ? { month: 'short', day: 'numeric' }
        : { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }),
    })
    formatters.set(key, formatter)
  }
  return formatter.format(date)
}
