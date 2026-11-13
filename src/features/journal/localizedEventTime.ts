import type { JournalEvent } from './models'

export function journalEventTimeLabel(
  event: Pick<JournalEvent, 'time' | 'allDay'>,
  translate: (key: string) => string
): string {
  return event.allDay ? translate('schedule.allDay') : event.time
}
