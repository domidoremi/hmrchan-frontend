import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import EditorialSchedule from '../editions/EditorialSchedule.vue'
import ArchiveSchedule from '../editions/ArchiveSchedule.vue'
import JournalEventCard from '../JournalEventCard.vue'
import { journalDateLabel } from '../localizedDate'
import type { JournalEvent } from '../models'
import { createJournalTestI18n, type JournalTestLocale } from './journalTestI18n'

const wrappers: VueWrapper[] = []
const event: JournalEvent = {
  id: 'calendar-event',
  title: '作者原活動「夏」',
  date: '2026-11-14',
  day: 14,
  month: 11,
  week: '作者の曜日表記',
  time: '全天',
  allDay: true,
  venue: '作者原会場',
  type: '作者自訂類別',
  tone: 'purple',
  description: '作者原説明',
  url: null,
}
const props = {
  events: [event],
  month: '2026-11',
  selectedDay: '14',
  reminders: new Set([event.id]),
  savedOnly: false,
  loading: false,
  view: 'month',
}
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

describe.each([
  ['Journal', EditorialSchedule],
  ['Archive', ArchiveSchedule],
] as const)('%s calendar language', (_, component) => {
  it('updates four languages in place without changing the date, reminder, author content or focus', async () => {
    const i18n = createJournalTestI18n('en')
    const wrapper = mount(component, {
      attachTo: document.body,
      props,
      global: { plugins: [i18n], stubs: { JournalIcon: true } },
    })
    wrappers.push(wrapper)
    const previous = wrapper.get<HTMLButtonElement>('.journal-month-prev')
    const day = wrapper.get('[data-day="14"]')
    const reminder = wrapper.get('[data-remind="calendar-event"]')
    previous.element.focus()
    for (const language of ['en', 'ja', 'zh-CN', 'zh-TW'] as JournalTestLocale[]) {
      i18n.global.locale.value = language
      await nextTick()
      expect(wrapper.get('.journal-month-prev').element).toBe(previous.element)
      expect(document.activeElement).toBe(previous.element)
      expect(previous.attributes('aria-label')).toBe(i18n.global.t('schedule.prevMonth'))
      expect(wrapper.get('.journal-month-next').attributes('aria-label')).toBe(
        i18n.global.t('schedule.nextMonth')
      )
      expect(wrapper.get('[data-day="14"]').element).toBe(day.element)
      expect(day.attributes('aria-pressed')).toBe('true')
      expect(day.attributes('aria-label')).toBe(
        i18n.global.t('journal.calendar.dayLabel', {
          date: journalDateLabel(event.date, language),
          count: 1,
        })
      )
      expect(reminder.attributes('aria-pressed')).toBe('true')
      expect(reminder.attributes('aria-label')).toBe(
        i18n.global.t('journal.actions.removeReminderNamed', { title: event.title })
      )
      expect(wrapper.text()).toContain(event.title)
      expect(wrapper.text()).toContain(event.venue)
      expect(wrapper.text()).toContain(i18n.global.t('journal.calendar.taipeiTime'))
      expect(wrapper.text()).toContain(i18n.global.t('schedule.allDay'))
      expect(wrapper.emitted('change')).toBeUndefined()
    }
  })

  it('keeps leap-month days and month navigation independent of interface language', async () => {
    const i18n = createJournalTestI18n('ja')
    const wrapper = mount(component, {
      props: { ...props, month: '2024-02', events: [], selectedDay: 'all' },
      global: { plugins: [i18n], stubs: { JournalIcon: true } },
    })
    wrappers.push(wrapper)
    expect(wrapper.findAll('[data-day]')).toHaveLength(29)
    expect(wrapper.get('[data-day="29"]').attributes('aria-label')).toContain(
      journalDateLabel('2024-02-29', 'ja')
    )
    await wrapper.get('.journal-month-prev').trigger('click')
    await wrapper.get('.journal-month-next').trigger('click')
    expect(wrapper.emitted('change')).toEqual([
      ['month', '2024-01'],
      ['month', '2024-03'],
    ])
    const weekdays = component === ArchiveSchedule ? ['月', '火', '水', '木', '金', '土', '日'] : []
    expect(wrapper.findAll('.calendar-weekdays span').map((node) => node.text())).toEqual(weekdays)
  })
})

it('translates an existing event card without replacing its reminder control or author metadata', async () => {
  const i18n = createJournalTestI18n('en')
  const wrapper = mount(JournalEventCard, {
    attachTo: document.body,
    props: { event, saved: false },
    global: { plugins: [i18n], stubs: { JournalIcon: true } },
  })
  wrappers.push(wrapper)
  const reminder = wrapper.get<HTMLButtonElement>('[data-remind]')
  reminder.element.focus()
  i18n.global.locale.value = 'ja'
  await nextTick()
  expect(wrapper.get('[data-remind]').element).toBe(reminder.element)
  expect(document.activeElement).toBe(reminder.element)
  expect(reminder.attributes('aria-label')).toBe(
    i18n.global.t('journal.actions.remindNamed', { title: event.title })
  )
  expect(wrapper.get('.event-date small').text()).toBe(journalDateLabel(event.date, 'ja', true))
  expect(wrapper.text()).toContain(event.title)
  expect(wrapper.text()).toContain(event.type)
  expect(wrapper.text()).toContain(event.venue)
  expect(wrapper.text()).toContain(i18n.global.t('schedule.allDay'))
  await wrapper.setProps({ saved: true })
  expect(reminder.text()).toBe(i18n.global.t('journal.actions.reminded'))
  expect(reminder.attributes('aria-label')).toBe(
    i18n.global.t('journal.actions.removeReminderNamed', { title: event.title })
  )
})
