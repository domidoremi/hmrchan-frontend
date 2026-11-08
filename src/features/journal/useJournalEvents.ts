import {
  computed,
  onBeforeUnmount,
  onMounted,
  provide,
  type InjectionKey,
  type ShallowRef,
} from 'vue'
import { useAuthStore } from '@/stores'
import { scheduleService } from '@/api/scheduleService'
import { eventModel, type JournalEvent } from './models'
import type { JournalRuntime } from './runtime'

export const journalEventsKey: InjectionKey<ReturnType<typeof useJournalEvents>> =
  Symbol('journal-events')
export function useJournalEvents(runtime: ShallowRef<JournalRuntime | null>) {
  const auth = useAuthStore(),
    events = new Map<string, JournalEvent>()
  const key = computed(() => `momichan-journal:reminders:${auth.user?.id ?? 'guest'}`)
  const lifetime = new AbortController()
  let version = 0
  const ui = () => runtime.value!.UI
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
      `<span class="badge badge-${esc(item.tone)}">${esc(item.type)}</span><h2 id="dialog-title" style="margin-top:14px">${esc(item.title)}</h2><p class="dialog-copy">${esc(item.date.slice(0, 4))} 年 ${item.month} 月 ${item.day} 日（${esc(item.week)}）<br>${esc(item.time)} · 台北时间<br>${esc(item.venue)}</p><p class="dialog-copy">${esc(item.description).replace(/\n/g, '<br>')}</p><div class="dialog-actions"><button class="button button-outline" data-close>关闭</button>${url ? `<a class="text-button" href="${esc(url)}" target="_blank" rel="noopener noreferrer">活动详情 ${ui().icon('arrow-up-right')}</a>` : ''}<button class="button button-dark event-dialog-remind" data-remind="${esc(id)}" aria-pressed="${saved}">${ui().icon(saved ? 'check' : 'bell')}${saved ? '已记下' : '记下'}</button></div>`,
      'event-dialog',
      { key: `event:${id}`, label: '日程', render: () => openEvent(id) }
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
        button.innerHTML = `${ui().icon(saved ? 'check' : 'bell')}${button.classList.contains('remind') ? '' : saved ? '已记下' : '记下'}`
      }
      ui().toast(selected.has(id) ? '已记下' : '已移除')
    } catch {
      ui().toast('暂时未能保存，请重试')
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
      ui().openDialog(
        `<h2 id="dialog-title">已记下的日程</h2><p class="dialog-copy">${loading ? '加载中…' : failed ? '部分日程暂时无法加载' : list.length ? `${list.length} 项活动` : '暂无日程'}</p>${list.map((item) => `<button class="search-result" data-event="${esc(item.id)}">${ui().icon('calendar')}<span>${esc(item.title)}<small>${item.month} 月 ${item.day} 日 · ${esc(item.time)} · 台北时间</small></span>${ui().icon('chevron')}</button>`).join('')}<div class="dialog-actions">${failed ? '<button class="button button-outline" data-action="notifications">重试</button>' : ''}<button class="button button-dark" data-action="goto-schedule">全部日程 ${ui().icon('arrow')}</button></div>`,
        'notifications-dialog',
        {
          key: 'notifications',
          label: '已记下',
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
