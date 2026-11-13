import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installUI } from '../shared.js'

let runtime, dialog, body, lifetime
const content = (label, action = 'data-dialog-like="post"') =>
  `<h2 id="dialog-title">${label}</h2><button ${action}>Action</button>`
beforeEach(() => {
  document.body.innerHTML =
    '<button id="outside">Open</button><dialog id="app-dialog"><div class="dialog-head"><span class="eyebrow">MOMICHAN</span><button data-close>Close</button></div><div id="dialog-content"></div></dialog><div id="toast"></div>'
  lifetime = new AbortController()
  const scopedDocument = new Proxy(document, {
    get(target, key) {
      if (key === 'addEventListener')
        return (name, handler, options) =>
          target.addEventListener(name, handler, { ...options, signal: lifetime.signal })
      const value = Reflect.get(target, key, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  runtime = {
    SpatialMotion: { dialog: vi.fn() },
    Atelier: { dialog: vi.fn(), clearDialogFlight: vi.fn(), closeDialog: vi.fn() },
  }
  dialog = document.querySelector('dialog')
  body = document.querySelector('#dialog-content')
  body.getAnimations = () => []
  dialog.showModal = () => {
    dialog.open = true
  }
  dialog.close = () => {
    dialog.open = false
    dialog.dispatchEvent(new Event('close'))
  }
  installUI(runtime, { document: scopedDocument })
})
afterEach(() => {
  lifetime.abort()
  document.body.innerHTML = ''
  document.body.classList.remove('app-dialog-open')
})

describe('dialog refresh and navigation', () => {
  it('keeps reading position and action focus when the same post receives full content', () => {
    const view = { key: 'post:one', label: 'Details', render: vi.fn() }
    runtime.UI.openDialog(content('Preview'), 'detail-dialog', view)
    body.querySelector('button').focus()
    body.scrollTop = 185
    runtime.UI.openDialog(content('Full content'), 'detail-dialog', view)
    expect(body.scrollTop).toBe(185)
    expect(document.activeElement.getAttribute('data-dialog-like')).toBe('post')
    expect(runtime.SpatialMotion.dialog).toHaveBeenCalledTimes(1)
    expect(runtime.Atelier.dialog).toHaveBeenCalledTimes(1)
    expect(dialog.querySelector('[data-dialog-back]').hidden).toBe(true)
  })
  it('keeps focus on the persistent close button during refresh', () => {
    const view = { key: 'post:one' }
    runtime.UI.openDialog(content('Preview'), '', view)
    const close = dialog.querySelector('[data-close]')
    close.focus()
    runtime.UI.openDialog(content('Full'), '', view)
    expect(document.activeElement).toBe(close)
  })
  it('falls back to the heading if a refreshed action disappears', () => {
    const view = { key: 'post:one' }
    runtime.UI.openDialog(content('Preview'), '', view)
    body.querySelector('button').focus()
    runtime.UI.openDialog('<h2 id="dialog-title">Full</h2>', '', view)
    expect(document.activeElement.id).toBe('dialog-title')
  })
  it('restores search text, scroll and focus when returning from a detail view', () => {
    const search = {
      key: 'search',
      label: 'Search',
      render: () =>
        runtime.UI.openDialog(
          '<h2 id="dialog-title">Search</h2><input id="query"><button data-dialog-post="one">Result</button>',
          'search-dialog',
          search
        ),
    }
    document.querySelector('#outside').focus()
    search.render()
    body.querySelector('input').value = 'Changed query'
    body.querySelector('button').focus()
    body.scrollTop = 210
    runtime.UI.openDialog(content('Detail'), 'detail-dialog', { key: 'post:one', render: vi.fn() })
    expect(body.scrollTop).toBe(0)
    expect(document.activeElement.id).toBe('dialog-title')
    dialog.querySelector('[data-dialog-back]').click()
    expect(body.querySelector('input').value).toBe('Changed query')
    expect(body.scrollTop).toBe(210)
    expect(document.activeElement.dataset.dialogPost).toBe('one')
    runtime.UI.closeDialog()
    expect(document.activeElement.id).toBe('outside')
  })
  it('preserves the selected gallery control when changing images', () => {
    const view = { key: 'gallery' }
    runtime.UI.openDialog(content('First', 'data-real-gallery-step="1"'), 'gallery-dialog', view)
    body.querySelector('button').focus()
    runtime.UI.openDialog(content('Second', 'data-real-gallery-step="1"'), 'gallery-dialog', view)
    expect(document.activeElement.dataset.realGalleryStep).toBe('1')
    expect(runtime.SpatialMotion.dialog).toHaveBeenCalledTimes(1)
  })
})

describe('dialog keyboard boundaries', () => {
  function showActions() {
    runtime.UI.openDialog(
      '<h2 id="dialog-title">Details</h2><button id="action">Action</button><a id="detail" href="/post/one">Full detail</a><a id="skip" href="/post/two" tabindex="-1">Skip</a><button id="disabled" disabled>Disabled</button><button id="hidden" hidden>Hidden</button>',
      'detail-dialog',
      { key: 'post:one' }
    )
    for (const element of dialog.querySelectorAll('button,a'))
      element.getClientRects = () => (element.hidden ? [] : [{ width: 20, height: 20 }])
  }
  function tab(target, options = {}) {
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
      ...options,
    })
    target.dispatchEvent(event)
    return event
  }
  it('cycles from the final detail link while preserving skipped controls', () => {
    showActions()
    const detail = body.querySelector('#detail')
    expect(detail.getAttribute('tabindex')).toBe('0')
    expect(body.querySelector('#skip').getAttribute('tabindex')).toBe('-1')
    detail.focus()
    expect(tab(detail).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(dialog.querySelector('[data-close]'))
    expect(tab(document.activeElement, { shiftKey: true }).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(detail)
  })
  it('uses the current controls after a dialog refresh', () => {
    showActions()
    runtime.UI.openDialog(
      '<h2 id="dialog-title">Updated</h2><a id="new-detail" href="/post/one">Full detail</a>',
      'detail-dialog',
      { key: 'post:one' }
    )
    const detail = body.querySelector('#new-detail')
    detail.getClientRects = () => [{ width: 20, height: 20 }]
    detail.focus()
    tab(detail)
    expect(document.activeElement).toBe(dialog.querySelector('[data-close]'))
  })
  it('reaches the last action from a backwards Tab on the heading', () => {
    showActions()
    const heading = body.querySelector('#dialog-title')
    heading.focus()
    expect(tab(heading, { shiftKey: true }).defaultPrevented).toBe(true)
    expect(document.activeElement.id).toBe('detail')
  })
  it('keeps browser shortcuts and closed-dialog events available', () => {
    showActions()
    const detail = body.querySelector('#detail')
    detail.focus()
    expect(tab(detail, { ctrlKey: true }).defaultPrevented).toBe(false)
    expect(tab(detail, { altKey: true }).defaultPrevented).toBe(false)
    runtime.UI.closeDialog(true)
    expect(tab(detail).defaultPrevented).toBe(false)
  })
  it('removes the keyboard handler with the runtime', () => {
    showActions()
    const detail = body.querySelector('#detail')
    detail.focus()
    runtime.UI.dispose()
    expect(tab(detail).defaultPrevented).toBe(false)
  })
})
