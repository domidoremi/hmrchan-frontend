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
