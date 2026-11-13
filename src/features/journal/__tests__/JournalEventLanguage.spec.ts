import { defineComponent, h, nextTick, reactive, shallowRef } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createJournalRuntime, type JournalRuntime } from '../runtime'
import { useJournalEvents } from '../useJournalEvents'
import type { JournalEvent } from '../models'
import { createJournalTestI18n } from './journalTestI18n'
import { prepareJournalDialogHost } from './journalDialogHost'
import { journalDateLabel } from '../localizedDate'

const mocks = vi.hoisted(() => ({
  auth: { user: { id: 'owner' }, isAuthenticated: true },
  getById: vi.fn(),
}))
vi.mock('@/stores', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/api/scheduleService', () => ({ scheduleService: { getById: mocks.getById } }))
vi.mock('../models', () => ({ eventModel: (event: JournalEvent) => event }))
vi.mock('@/utils/modernAPIs', () => ({
  createVisibilityObserver: () => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }),
}))
vi.mock('../runtime/viewport-motion.js', () => ({
  installViewportMotion: () => ({ refresh: vi.fn(), dispose: vi.fn() }),
}))
vi.mock('../runtime/layout-motion.js', () => ({
  createLayoutMotion: () => ({ layout: vi.fn(), cancel: vi.fn() }),
}))
vi.mock('../runtime/motion.js', () => ({
  createMotionPreference: ({ changed }: { changed(value: string): void }) => {
    changed('reduced')
    return { set: vi.fn() }
  },
  motionTiming: {},
}))

const id = '019ab001-0000-7000-8000-000000000001'
const item = (): JournalEvent => ({
  id,
  title: '作者原活動「夏」',
  day: 11,
  month: 11,
  date: '2026-11-11',
  week: '三',
  time: '20:00',
  venue: '作者原会場 <&>',
  type: '作者自訂類別',
  tone: 'purple',
  description: '作者原説明 <&>',
  url: 'https://example.com/event',
})
let runtime: JournalRuntime
let wrapper: VueWrapper
let events: ReturnType<typeof useJournalEvents>
let i18n: ReturnType<typeof createJournalTestI18n>
let values: string
beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth = reactive({ user: { id: 'owner' }, isAuthenticated: true })
  mocks.getById.mockResolvedValue(item())
  values = '[]'
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => values)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation((_key, value) => {
    values = value
  })
  prepareJournalDialogHost()
  i18n = createJournalTestI18n('en')
  runtime = createJournalRuntime(vi.fn(), {
    translate: (key, named) => i18n.global.t(key, named ?? {}),
  })
  vi.spyOn(runtime.UI, 'toast').mockImplementation(() => undefined)
  vi.spyOn(runtime.UI, 'openDialog')
  wrapper = mount(
    defineComponent({
      setup() {
        events = useJournalEvents(shallowRef(runtime))
        return () => h('div')
      },
    }),
    { global: { plugins: [i18n] } }
  )
})
afterEach(() => {
  wrapper.unmount()
  runtime.dispose()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})
function openEvent(value: JournalEvent = item()) {
  events.remember([value])
  const button = document.createElement('button')
  button.dataset['event'] = id
  document.body.append(button)
  button.click()
}

describe('event dialog language', () => {
  it('refreshes the all-day time without replacing the dialog or losing reminder focus', async () => {
    openEvent({ ...item(), allDay: true, time: '全天' })
    const time = document.querySelector('.event-time')!
    const reminder = document.querySelector<HTMLButtonElement>('.event-dialog-remind')!
    reminder.focus()
    const renders = vi.mocked(runtime.UI.openDialog).mock.calls.length
    expect(time.textContent).toBe(i18n.global.t('schedule.allDay'))
    i18n.global.locale.value = 'ja'
    await nextTick()
    expect(document.querySelector('.event-time')).toBe(time)
    expect(time.textContent).toBe(i18n.global.t('schedule.allDay'))
    expect(document.activeElement).toBe(reminder)
    expect(vi.mocked(runtime.UI.openDialog).mock.calls).toHaveLength(renders)
    expect(document.querySelector('.event-date')!.textContent).toBe(
      journalDateLabel(item().date, 'ja')
    )
  })

  it('keeps author data, reminder values and focus while translating actions', async () => {
    openEvent()
    const button = document.querySelector<HTMLButtonElement>('.event-dialog-remind')!
    const heading = document.querySelector('#dialog-title')!
    button.focus()
    const renders = vi.mocked(runtime.UI.openDialog).mock.calls.length
    i18n.global.locale.value = 'ja'
    await nextTick()
    expect(document.querySelector('.event-dialog-remind')).toBe(button)
    expect(document.activeElement).toBe(button)
    expect(vi.mocked(runtime.UI.openDialog).mock.calls).toHaveLength(renders)
    expect(heading.textContent).toBe(item().title)
    expect(document.querySelector('#dialog-content')!.textContent).toContain(item().venue)
    expect(document.querySelector('#dialog-content')!.textContent).toContain(item().description)
    expect(document.querySelector('.badge')!.textContent).toBe(item().type)
    expect(document.querySelector('.event-date')!.textContent).toBe(
      journalDateLabel(item().date, 'ja')
    )
    expect(button.getAttribute('aria-label')).toBe(
      i18n.global.t('journal.actions.remindNamed', { title: item().title })
    )
    button.click()
    expect(JSON.parse(values)).toEqual([id])
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.getAttribute('aria-label')).toBe(
      i18n.global.t('journal.actions.removeReminderNamed', { title: item().title })
    )
    expect(runtime.UI.toast).toHaveBeenCalledWith(i18n.global.t('journal.actions.reminded'))
    const announcements = vi.mocked(runtime.UI.toast).mock.calls.length
    i18n.global.locale.value = 'zh-TW'
    await nextTick()
    expect(vi.mocked(runtime.UI.toast).mock.calls).toHaveLength(announcements)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.querySelector('.event-remind-label')!.textContent).toBe(
      i18n.global.t('journal.actions.reminded')
    )
    expect(mocks.getById).not.toHaveBeenCalled()
  })

  it('keeps a pending saved-events request alive without rebuilding its dialog on locale change', async () => {
    values = JSON.stringify([id])
    let finish!: (value: unknown) => void
    mocks.getById.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    document.dispatchEvent(new Event('journalnotifications'))
    const summary = document.querySelector('.notification-summary')!
    const signal = mocks.getById.mock.calls[0]![1].signal as AbortSignal
    const renders = vi.mocked(runtime.UI.openDialog).mock.calls.length
    i18n.global.locale.value = 'ja'
    await nextTick()
    expect(document.querySelector('.notification-summary')).toBe(summary)
    expect(summary.textContent).toBe(i18n.global.t('common.loading'))
    expect(vi.mocked(runtime.UI.openDialog).mock.calls).toHaveLength(renders)
    expect(mocks.getById).toHaveBeenCalledOnce()
    expect(signal.aborted).toBe(false)
    finish(item())
    await flushPromises()
    expect(document.querySelector('.notification-summary')!.textContent).toBe(
      i18n.global.t('journal.calendar.eventCount', { count: 1 })
    )
    expect(document.querySelector('.search-result')!.textContent).toContain(item().title)
    expect(document.querySelector('.notification-timezone')!.textContent).toBe(
      i18n.global.t('journal.calendar.taipeiTime')
    )
    expect(document.querySelector('.notification-date')!.textContent).toBe(
      journalDateLabel(item().date, 'ja', true)
    )
  })

  it('retains the owner guard when language changes during a saved-events load', async () => {
    values = JSON.stringify([id])
    let finish!: (value: unknown) => void
    mocks.getById.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    document.dispatchEvent(new Event('journalnotifications'))
    mocks.auth.user.id = 'another-owner'
    i18n.global.locale.value = 'ja'
    await nextTick()
    finish(item())
    await flushPromises()
    expect(document.querySelector('.search-result')).toBeNull()
    expect(mocks.getById).toHaveBeenCalledOnce()
  })

  it('uses current failure copy and leaves reminder state intact when persistence fails', async () => {
    openEvent()
    i18n.global.locale.value = 'ja'
    await nextTick()
    vi.mocked(localStorage.setItem).mockImplementationOnce(() => {
      throw new Error('denied')
    })
    const button = document.querySelector<HTMLButtonElement>('.event-dialog-remind')!
    button.click()
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(values).toBe('[]')
    expect(runtime.UI.toast).toHaveBeenCalledWith(i18n.global.t('journal.toast.saveFailed'))
  })
})
