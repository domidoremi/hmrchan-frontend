import {
  computed,
  onBeforeUnmount,
  onMounted,
  provide,
  watch,
  type InjectionKey,
  type ShallowRef,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores'
import { scheduleService } from '@/api/scheduleService'
import { eventModel, type JournalEvent } from './models'
import { journalDateLabel } from './localizedDate'
import { journalEventTimeLabel } from './localizedEventTime'
import type { JournalRuntime } from './runtime'

export const journalEventsKey: InjectionKey<ReturnType<typeof useJournalEvents>> =
  Symbol('journal-events')
export function useJournalEvents(runtime: ShallowRef<JournalRuntime | null>) {
  const { locale, t } = useI18n({ useScope: 'global' })
  const auth = useAuthStore(),
    events = new Map<string, JournalEvent>()
  const key = computed(() => `momichan-journal:reminders:${auth.user?.id ?? 'guest'}`)
  const lifetime = new AbortController()
  let version = 0
  const ui = () => runtime.value!.UI
  let notificationState = { loading: false, failed: false, count: 0 }
  function notificationSummary() {
    return notificationState.loading
      ? t('common.loading')
      : notificationState.failed
        ? t('journal.calendar.partialLoad')
        : notificationState.count
          ? t('journal.calendar.eventCount', { count: notificationState.count })
          : t('journal.states.noEvents')
  }
  function reminders(): Set<string> {
    try {
      const values: unknown = JSON.parse(localStorage.getItem(key.value) || '[]')
      return new Set(
        Array.isArray(values) ? values.filter((id): id is string => typeof id === 'string') : []
      )
    } catch {
      return new Set()
    }
  }
  function remember(items: JournalEvent[]) {
    for (const item of items) events.set(item.id, item)
    while (events.size > 300) events.delete(events.keys().next().value!)
  }
  function openEvent(id: string) {
    const item = events.get(id)
    if (!item) return
    const esc = ui().escape,
      saved = reminders().has(id)
    const url = item.url && /^https?:\/\//i.test(item.url) ? item.url : null
    ui().openDialog(
      `<span class="badge badge-${esc(item.tone)}">${esc(item.type)}</span><h2 id="dialog-title" style="margin-top:14px">${esc(item.title)}</h2><p class="dialog-copy"><span class="event-date" data-date="${esc(item.date)}">${esc(journalDateLabel(item.date, locale.value))}</span><br><span class="event-time">${esc(journalEventTimeLabel(item, t))}</span> · <span class="event-timezone">${esc(t('journal.calendar.taipeiTime'))}</span><br>${esc(item.venue)}</p><p class="dialog-copy">${esc(item.description).replace(/\n/g, '<br>')}</p><div class="dialog-actions"><button class="button button-outline" data-close>${esc(t('common.close'))}</button>${url ? `<a class="text-button" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span class="event-details-label">${esc(t('schedule.viewDetail'))}</span> ${ui().icon('arrow-up-right')}</a>` : ''}<button class="button button-dark event-dialog-remind" data-remind="${esc(id)}" aria-pressed="${saved}" aria-label="${esc(t(saved ? 'journal.actions.removeReminderNamed' : 'journal.actions.remindNamed', { title: item.title }))}">${ui().icon(saved ? 'check' : 'bell')}<span class="event-remind-label">${esc(t(saved ? 'journal.actions.reminded' : 'journal.actions.remind'))}</span></button></div>`,
      'event-dialog',
      { key: `event:${id}`, labelKey: 'nav.schedule', render: () => openEvent(id) }
    )
  }
  function toggle(id: string) {
    if (!events.has(id)) return
    const selected = reminders()
    if (selected.has(id)) selected.delete(id)
    else selected.add(id)
    try {
      localStorage.setItem(key.value, JSON.stringify([...selected]))
      document.dispatchEvent(new Event('journalreminderschange'))
      for (const button of document.querySelectorAll<HTMLElement>('[data-remind]')) {
        const saved = selected.has(button.dataset['remind']!)
        button.classList.toggle('is-set', saved)
        button.setAttribute('aria-pressed', String(saved))
        button.innerHTML = `${ui().icon(saved ? 'check' : 'bell')}${button.classList.contains('remind') ? '' : `<span class="event-remind-label">${ui().escape(t(saved ? 'journal.actions.reminded' : 'journal.actions.remind'))}</span>`}`
      }
      refreshLocalizedControls()
      ui().toast(t(selected.has(id) ? 'journal.actions.reminded' : 'journal.toast.reminderRemoved'))
    } catch {
      ui().toast(t('journal.toast.saveFailed'))
    }
  }
  async function notifications() {
    const ids = [...reminders()]
    const owner = key.value
    const render = (loading = false, failed = false) => {
      const list = ids
        .filter((id) => reminders().has(id))
        .flatMap((id) => (events.has(id) ? [events.get(id)!] : []))
      const esc = ui().escape
      notificationState = { loading, failed, count: list.length }
      ui().openDialog(
        `<h2 id="dialog-title">${esc(t('journal.nav.savedSchedule'))}</h2><p class="dialog-copy notification-summary">${esc(notificationSummary())}</p>${list.map((item) => `<button class="search-result" data-event="${esc(item.id)}">${ui().icon('calendar')}<span>${esc(item.title)}<small><span class="notification-date" data-date="${esc(item.date)}">${esc(journalDateLabel(item.date, locale.value, true))}</span> · <span class="notification-time" data-event-time="${esc(item.id)}">${esc(journalEventTimeLabel(item, t))}</span> · <span class="notification-timezone">${esc(t('journal.calendar.taipeiTime'))}</span></small></span>${ui().icon('chevron')}</button>`).join('')}<div class="dialog-actions">${failed ? `<button class="button button-outline" data-action="notifications">${esc(t('common.retry'))}</button>` : ''}<button class="button button-dark" data-action="goto-schedule"><span class="all-events-label">${esc(t('journal.calendar.allEvents'))}</span> ${ui().icon('arrow')}</button></div>`,
        'notifications-dialog',
        {
          key: 'notifications',
          labelKey: 'journal.nav.savedSchedule',
          render: () => {
            void notifications()
          },
        }
      )
    }
    const missing = ids.filter((id) => !events.has(id))
    render(Boolean(missing.length))
    const request = version
    let failed = false
    for (let index = 0; index < missing.length; index += 3) {
      const loaded = await Promise.allSettled(
        missing
          .slice(index, index + 3)
          .map((id) =>
            scheduleService.getById(id, { signal: lifetime.signal, skipErrorToast: true })
          )
      )
      if (owner !== key.value || request !== version || lifetime.signal.aborted) return
      for (const value of loaded) {
        if (value.status === 'fulfilled') remember([eventModel(value.value)])
        else failed = true
      }
    }
    if (missing.length && request === version) render(false, failed)
  }
  function refreshLocalizedControls() {
    const root = document.querySelector('#app-dialog[open]')
    if (!root) return
    if (root.classList.contains('event-dialog')) {
      const close = root.querySelector('.dialog-actions [data-close]')
      if (close) close.textContent = t('common.close')
      const details = root.querySelector('.event-details-label')
      if (details) details.textContent = t('schedule.viewDetail')
      const timezone = root.querySelector('.event-timezone')
      if (timezone) timezone.textContent = t('journal.calendar.taipeiTime')
      const date = root.querySelector<HTMLElement>('.event-date')
      if (date) date.textContent = journalDateLabel(date.dataset['date']!, locale.value)
      const button = root.querySelector<HTMLElement>('.event-dialog-remind')
      if (button) {
        const saved = button.getAttribute('aria-pressed') === 'true'
        const label = button.querySelector('.event-remind-label')
        if (label)
          label.textContent = t(saved ? 'journal.actions.reminded' : 'journal.actions.remind')
        const item = events.get(button.dataset['remind']!)
        if (item) {
          const time = root.querySelector('.event-time')
          if (time) time.textContent = journalEventTimeLabel(item, t)
          button.setAttribute(
            'aria-label',
            t(saved ? 'journal.actions.removeReminderNamed' : 'journal.actions.remindNamed', {
              title: item.title,
            })
          )
        }
      }
    }
    if (root.classList.contains('notifications-dialog')) {
      const heading = root.querySelector('#dialog-title')
      if (heading) heading.textContent = t('journal.nav.savedSchedule')
      const summary = root.querySelector('.notification-summary')
      if (summary) summary.textContent = notificationSummary()
      const retry = root.querySelector('[data-action="notifications"]')
      if (retry) retry.textContent = t('common.retry')
      const all = root.querySelector('.all-events-label')
      if (all) all.textContent = t('journal.calendar.allEvents')
      for (const node of root.querySelectorAll('.notification-timezone'))
        node.textContent = t('journal.calendar.taipeiTime')
      for (const node of root.querySelectorAll<HTMLElement>('.notification-date'))
        node.textContent = journalDateLabel(node.dataset['date']!, locale.value, true)
      for (const node of root.querySelectorAll<HTMLElement>('.notification-time')) {
        const item = events.get(node.dataset['eventTime']!)
        if (item) node.textContent = journalEventTimeLabel(item, t)
      }
    }
  }
  watch(locale, refreshLocalizedControls, { flush: 'post' })
  onMounted(() => {
    document.addEventListener('dialogwillchange', () => version++, { signal: lifetime.signal })
    document.addEventListener(
      'journalnotifications',
      () => {
        void notifications()
      },
      { signal: lifetime.signal }
    )
    document.addEventListener(
      'click',
      (event) => {
        const target =
          event.target instanceof Element
            ? event.target.closest<HTMLElement>('[data-event],[data-remind]')
            : null
        if (target?.dataset['event']) openEvent(target.dataset['event'])
        if (target?.dataset['remind']) toggle(target.dataset['remind'])
      },
      { signal: lifetime.signal }
    )
  })
  onBeforeUnmount(() => lifetime.abort())
  const controller = { remember }
  provide(journalEventsKey, controller)
  return controller
}
