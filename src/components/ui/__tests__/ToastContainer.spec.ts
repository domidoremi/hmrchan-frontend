import { createApp, nextTick, type App } from 'vue'
import { createPinia, disposePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToastStore } from '@/stores/toast'

vi.mock('@/stores', async () => ({
  useToastStore: (await import('@/stores/toast')).useToastStore,
  useThemeStore: () => ({ resolvedTheme: { value: 'light', __v_isRef: true } }),
  useSettingsStore: () => ({
    settings: { value: { appearancePreset: 'minimal-editorial' }, __v_isRef: true },
    motionMode: { value: 'full', __v_isRef: true },
  }),
}))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, unknown>) => (values ? key + ':' + values.count : key),
  }),
}))
import ToastContainer from '../ToastContainer.vue'

let app: App, pinia: ReturnType<typeof createPinia>, store: ReturnType<typeof useToastStore>
let outside: HTMLButtonElement, host: HTMLDivElement
const settle = async () => {
  await nextTick()
  await nextTick()
}
const find = <T extends Element = HTMLElement>(selector: string) => {
  const node = document.querySelector<T>(selector)
  if (!node) throw new Error('Missing ' + selector)
  return node
}
beforeEach(() => {
  vi.useFakeTimers()
  pinia = createPinia()
  store = useToastStore(pinia)
  outside = document.createElement('button')
  outside.id = 'original-action'
  outside.textContent = 'Save'
  outside.getClientRects = () => [{ width: 80, height: 44 }] as unknown as DOMRectList
  host = document.createElement('div')
  document.body.append(outside, host)
  outside.focus()
  app = createApp(ToastContainer)
  app.use(pinia).mount(host)
})
afterEach(() => {
  app.unmount()
  disposePinia(pinia)
  host.remove()
  outside.remove()
  document.querySelectorAll('dialog[data-toast-test]').forEach((node) => node.remove())
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('toast presenter', () => {
  it('announces results without moving focus or making ordinary success an alert', async () => {
    store.success('Saved')
    await settle()
    expect(document.activeElement).toBe(outside)
    expect(find('[role=status]').textContent).toBe('Saved')
    expect(find('[role=alert]').textContent).toBe('')
    expect(find('.toast-card__close').getAttribute('aria-label')).toBe('toast.close')
  })
  it('keeps focus on an action past the original duration, then restores it on Escape', async () => {
    const run = vi.fn()
    store.info('Undo available', 1000, { action: { label: 'Undo', onClick: run } })
    await settle()
    find<HTMLButtonElement>('.toast-card__action').focus()
    vi.advanceTimersByTime(5000)
    await settle()
    expect(store.toasts).toHaveLength(1)
    find('.toast-card__action').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    await settle()
    expect(store.toasts).toHaveLength(0)
    expect(document.activeElement).toBe(outside)
    expect(run).not.toHaveBeenCalled()
  })
  it('renders one message at a time and preserves queued reading time', async () => {
    store.info('First', 1000)
    store.info('Second', 1000)
    await settle()
    expect(document.querySelectorAll('.toast-card')).toHaveLength(1)
    expect(find('.toast-card__queue').textContent).toBe('toast.queued:1')
    vi.advanceTimersByTime(1000)
    await settle()
    expect(find('.toast-card__message').textContent).toBe('Second')
    vi.advanceTimersByTime(999)
    await settle()
    expect(store.toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    await settle()
    expect(store.toasts).toHaveLength(0)
  })
  it('keeps page controls clear through scrolling without changing focus or the queue', async () => {
    const headingAction = document.createElement('button')
    let headingTop = 96.5
    headingAction.getBoundingClientRect = () => new DOMRect(240, headingTop, 122, 38)
    outside.getBoundingClientRect = () => new DOMRect(315, 885.5, 26, 26)
    const originalRect = HTMLElement.prototype.getBoundingClientRect
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      if (this.classList.contains('toast-viewport')) {
        const top = this.classList.contains('toast-viewport--bottom') ? 922 : 80
        const shift = Number.parseFloat(this.style.getPropertyValue('--toast-shift')) || 0
        return new DOMRect(12, top + shift, 356, 62)
      }
      return originalRect.call(this)
    })
    document.body.append(headingAction)
    try {
      store.info('First', 0)
      store.info('Second', 0)
      await settle()
      await settle()
      const viewport = find('.toast-viewport')
      const queuedIds = store.toasts.map((toast) => toast.id)
      expect(viewport.getBoundingClientRect().top).toBeGreaterThan(
        headingAction.getBoundingClientRect().bottom
      )
      expect(document.activeElement).toBe(outside)
      headingTop = 270
      window.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(20)
      await settle()
      expect(viewport.getBoundingClientRect().top).toBe(80)
      expect(store.toasts.map((toast) => toast.id)).toEqual(queuedIds)
      expect(document.activeElement).toBe(outside)
    } finally {
      headingAction.remove()
    }
  })
  it('uses the narrow clear space in a dense phone calendar without covering controls', async () => {
    vi.stubGlobal('innerHeight', 1000)
    const bounds = [
      new DOMRect(234, 96.5, 128, 38),
      new DOMRect(18, 177, 28, 40),
      new DOMRect(18, 236, 28, 40),
      new DOMRect(312, 345, 49, 78),
      new DOMRect(19, 423, 342, 390),
      new DOMRect(39, 921.5, 126, 23.8),
    ]
    const controls = bounds.map((rect) => {
      const button = document.createElement('button')
      button.getBoundingClientRect = () => rect
      document.body.append(button)
      return button
    })
    outside.getBoundingClientRect = () => new DOMRect(315, 885.5, 26, 26)
    const originalRect = HTMLElement.prototype.getBoundingClientRect
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      if (this.classList.contains('toast-viewport')) {
        const top = this.classList.contains('toast-viewport--bottom') ? 922 : 80
        const shift = Number.parseFloat(this.style.getPropertyValue('--toast-shift')) || 0
        return new DOMRect(12, top + shift, 356, 62)
      }
      return originalRect.call(this)
    })
    try {
      store.info('Saved', 0)
      await settle()
      await settle()
      const viewport = find('.toast-viewport')
      const rect = viewport.getBoundingClientRect()
      expect(rect.top).toBeGreaterThanOrEqual(813 + 4)
      expect(rect.bottom).toBeLessThanOrEqual(885.5 - 4)
      expect(document.activeElement).toBe(outside)
      window.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(20)
      await settle()
      expect(viewport.getBoundingClientRect().top).toBe(rect.top)
      expect(store.toasts).toHaveLength(1)
    } finally {
      controls.forEach((control) => control.remove())
      vi.unstubAllGlobals()
    }
  })
  it('keeps a collapsed notification available without consuming the remaining time', async () => {
    store.info('Long message', 1000)
    await settle()
    find<HTMLButtonElement>('.toast-card__collapse').click()
    await settle()
    expect(find('.toast-card__collapse').getAttribute('aria-expanded')).toBe('false')
    vi.advanceTimersByTime(5000)
    expect(store.toasts).toHaveLength(1)
    find<HTMLButtonElement>('.toast-card__collapse').click()
    await settle()
    expect(find('.toast-card__collapse').getAttribute('aria-expanded')).toBe('true')
    vi.advanceTimersByTime(1000)
    await settle()
    expect(store.toasts).toHaveLength(0)
  })
  it('waits for an asynchronous action and prevents duplicate execution', async () => {
    let finish: () => void = () => {}
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    store.info('Undo', 1000, { action: { label: 'Undo', onClick: action } })
    await settle()
    find<HTMLButtonElement>('.toast-card__action').focus()
    find<HTMLButtonElement>('.toast-card__action').click()
    await settle()
    find<HTMLButtonElement>('.toast-card__action').click()
    vi.advanceTimersByTime(2000)
    expect(action).toHaveBeenCalledTimes(1)
    expect(store.toasts).toHaveLength(1)
    finish()
    await settle()
    expect(store.toasts).toHaveLength(0)
    expect(document.activeElement).toBe(outside)
  })
  it.each(['resolve', 'reject'] as const)(
    'ignores a removed notification action that later %ss',
    async (outcome) => {
      let finishOld: () => void = () => {}
      let finishCurrent: () => void = () => {}
      const oldAction = () =>
        new Promise<void>((resolve, reject) => {
          finishOld = outcome === 'resolve' ? resolve : () => reject(new Error('Old failure'))
        })
      const currentAction = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finishCurrent = resolve
          })
      )
      store.info('Old operation', 0, { action: { label: 'Old', onClick: oldAction } })
      await settle()
      find<HTMLButtonElement>('.toast-card__action').click()
      await settle()
      store.clear()
      store.info('Current operation', 0, { action: { label: 'Current', onClick: currentAction } })
      await settle()
      find<HTMLButtonElement>('.toast-card__action').focus()
      find<HTMLButtonElement>('.toast-card__action').click()
      await settle()
      finishOld()
      await settle()
      expect(find<HTMLButtonElement>('.toast-card__action').disabled).toBe(true)
      expect(document.activeElement).toBe(find('.toast-card__action'))
      expect(find('[role=alert]').textContent).toBe('')
      expect(find('.toast-card__body').textContent).not.toContain('toast.actionFailed')
      find<HTMLButtonElement>('.toast-card__action').click()
      expect(currentAction).toHaveBeenCalledTimes(1)
      finishCurrent()
      await settle()
      expect(store.toasts).toHaveLength(0)
    }
  )
  it('keeps a failed action available for retry with a visible explanation', async () => {
    const action = vi.fn().mockRejectedValue(new Error('Controlled failure'))
    store.info('Retry', 1000, { action: { label: 'Retry', onClick: action } })
    await settle()
    find<HTMLButtonElement>('.toast-card__action').click()
    await settle()
    expect(store.toasts).toHaveLength(1)
    expect(find('.toast-card__body').textContent).toContain('toast.actionFailed')
    expect(find('[role=alert]').textContent).toBe('toast.actionFailed')
    expect(find<HTMLButtonElement>('.toast-card__action').disabled).toBe(false)
  })
  it('moves feedback into the open native dialog and back on close', async () => {
    const dialog = document.createElement('dialog')
    dialog.dataset.toastTest = ''
    document.body.append(dialog)
    store.info('Stay available', 0)
    await settle()
    dialog.open = true
    dialog.dispatchEvent(new Event('toggle'))
    await settle()
    expect(dialog.querySelector('.toast-viewport')).not.toBeNull()
    dialog.open = false
    dialog.dispatchEvent(new Event('close'))
    await settle()
    expect(dialog.querySelector('.toast-viewport')).toBeNull()
    expect(find('.toast-viewport').parentElement).toBe(document.body)
  })
  it('keeps new feedback in the most recently opened dialog regardless of DOM order', async () => {
    const first = document.createElement('dialog')
    const second = document.createElement('dialog')
    first.dataset.toastTest = second.dataset.toastTest = ''
    document.body.append(second, first)
    for (const dialog of [first, second]) {
      dialog.open = true
      dialog.dispatchEvent(new Event('toggle'))
      await settle()
    }
    store.info('Latest modal', 0)
    await settle()
    expect(second.querySelector('.toast-viewport')).not.toBeNull()
    second.open = false
    second.dispatchEvent(new Event('close'))
    await settle()
    expect(first.querySelector('.toast-viewport')).not.toBeNull()
  })
  it('mounts an existing message in the already open dialog', async () => {
    const dialog = document.createElement('dialog')
    dialog.dataset.toastTest = ''
    dialog.open = true
    document.body.append(dialog)
    store.error('Check this')
    await settle()
    expect(dialog.querySelector('.toast-viewport')).not.toBeNull()
    expect(find('[role=alert]').textContent).toBe('Check this')
  })
  it('pauses while another window has focus and continues with the remaining time', async () => {
    store.info('Read after returning', 1000)
    await settle()
    vi.advanceTimersByTime(300)
    window.dispatchEvent(new Event('blur'))
    vi.advanceTimersByTime(5000)
    expect(store.toasts).toHaveLength(1)
    window.dispatchEvent(new Event('focus'))
    vi.advanceTimersByTime(699)
    expect(store.toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    await settle()
    expect(store.toasts).toHaveLength(0)
  })
  it('reacts to document visibility and stops consuming time when unmounted', async () => {
    store.info('Read me', 1000)
    await settle()
    vi.advanceTimersByTime(300)
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(2000)
    expect(store.toasts).toHaveLength(1)
    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(699)
    expect(store.toasts).toHaveLength(1)
    app.unmount()
    vi.advanceTimersByTime(10000)
    expect(store.toasts).toHaveLength(1)
  })
})
