export function installUI(runtime, environment) {
  const { document } = environment
  const paths = {
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    'arrow-up-right': '<path d="M6 18 18 6M6 6h12v12"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    'arrow-left': '<path d="M20 12H4m6-6-6 6 6 6"/>',
    'arrow-up': '<path d="M12 20V4m-6 6 6-6 6 6"/>',
    expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    list: '<path d="M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1"/>',
    sliders: '<path d="M4 21V13M4 7V3M12 21v-6M12 9V3M20 21v-3M20 12V3M1 10h6M9 12h6M17 15h6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    bookmark: '<path d="M6 4h12v17l-6-4-6 4z"/>',
    heart:
      '<path d="M20.5 5.5a5.1 5.1 0 0 0-7.2 0L12 6.8l-1.3-1.3a5.1 5.1 0 0 0-7.2 7.2L12 21l8.5-8.3a5.1 5.1 0 0 0 0-7.2Z"/>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-13 4h1m6 0h1m-8 3h1"/>',
    messages:
      '<path d="M21 11a8.1 8.1 0 0 1-8 8H7l-4 3V7a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5zM7 8h10M7 12h6"/>',
    home: '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',
    play: '<path d="m9 5 11 7-11 7z"/>',
    image:
      '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1"/><path d="m21 15-6-6L3 21"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
    pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 21h6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    x: '<path d="m6 6 12 12M6 18 18 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
    users:
      '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6m4 11v-3a6 6 0 0 0-3-5"/>',
    shield: '<path d="m12 2 8 3v6c0 6-8 11-8 11S4 17 4 11V5z"/><path d="m8 12 3 3 5-6"/>',
    flag: '<path d="M4 22V3c5-4 10 4 16 0v12c-6 4-11-4-16 0"/>',
    file: '<path d="M14 2H5v20h14V7zM14 2v6h5M8 12h8M8 16h6"/>',
    key: '<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-5-5 3-3m-1 5 3-3"/>',
    settings:
      '<path d="m9 3-1 3-3 1v4l2 1-2 2 2 4 3-1 2 3 4-2v-3l3-1v-4l-3-1V5l-4-2-2 2z"/><circle cx="12" cy="11" r="3"/>',
    refresh: '<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    filter:
      '<path d="M3 5h18M6 12h12M9 19h6"/><circle cx="8" cy="5" r="2"/><circle cx="16" cy="12" r="2"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    logout: '<path d="M9 3H3v18h6m7-14 5 5-5 5m-7-5h12"/>',
    trend: '<path d="m3 17 6-6 4 4 8-10m-6 0h6v6"/>',
    moon: '<path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    external: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
    headphones:
      '<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><rect x="3" y="12" width="4" height="9" rx="2"/><rect x="17" y="12" width="4" height="9" rx="2"/>',
    sparkle: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  }
  const icon = (name) =>
    `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.sparkle}</svg>`
  const hydrate = (root = document) =>
    root.querySelectorAll('[data-icon]').forEach((el) => (el.outerHTML = icon(el.dataset.icon)))
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c]
    )
  let toastTimer, toastAction
  const toastElement = document.querySelector('#toast')
  function expireToast() {
    clearTimeout(toastTimer)
    toastTimer = setTimeout(
      () => {
        if (toastElement.matches(':hover, :focus-within')) return
        toastElement.classList.remove('visible')
        toastElement.querySelector('button')?.setAttribute('tabindex', '-1')
      },
      toastAction ? 6500 : 3200
    )
  }
  function toast(message, action) {
    toastAction = action
    // A toast belongs to the active top layer so its action remains reachable.
    const dialog = document.querySelector('#app-dialog')
    ;(dialog.open ? dialog : document.body).append(toastElement)
    toastElement.innerHTML = `<span>${escape(message)}</span>${action ? `<button type="button" data-toast-action>${escape(action.label)}</button>` : ''}`
    toastElement.classList.add('visible')
    expireToast()
  }
  toastElement.addEventListener('click', (event) => {
    if (!event.target.closest('[data-toast-action]')) return
    const action = toastAction
    toastAction = null
    toastElement.classList.remove('visible')
    action?.run()
  })
  for (const name of ['pointerenter', 'focusin'])
    toastElement.addEventListener(name, () => clearTimeout(toastTimer))
  for (const name of ['pointerleave', 'focusout']) toastElement.addEventListener(name, expireToast)

  function focusSelector(element) {
    if (!element || element === document.body) return ''
    if (element.id) return `#${CSS.escape(element.id)}`
    const attrs = [
      'data-open',
      'data-collection',
      'data-gallery',
      'data-author',
      'data-event',
      'data-discussion',
      'data-save',
      'data-remind',
      'data-day',
      'data-category',
      'data-layout',
      'data-action',
      'data-menu-page',
      'name',
      'href',
    ]
    const attr = attrs.find((name) => element.hasAttribute(name))
    if (!attr) return ''
    const card = element.closest('[data-post]')
    const type = `${element.tagName.toLowerCase()}${element.classList[0] ? `.${CSS.escape(element.classList[0])}` : ''}`
    return `${card ? `[data-post="${CSS.escape(card.dataset.post)}"] ` : ''}${type}[${attr}="${CSS.escape(element.getAttribute(attr))}"]`
  }
  let dialogView,
    dialogTrail = [],
    returning = false,
    outsideFocus
  function dialogSnapshot() {
    const content = document.querySelector('#dialog-content')
    return {
      scroll: content.scrollTop,
      focus: focusSelector(document.activeElement),
      fields: [...content.querySelectorAll('input,textarea,select')].map((el, index) => ({
        index,
        value: el.value,
        checked: el.checked,
      })),
    }
  }
  function openDialog(content, className = '', view) {
    const el = document.querySelector('#app-dialog')
    const wasOpen = el.open
    document.dispatchEvent(new Event('dialogwillchange'))
    if (!wasOpen) {
      dialogTrail = []
      outsideFocus = document.activeElement
    } else if (!returning && view && dialogView?.render && view.key !== dialogView.key) {
      const earlier = dialogTrail.findIndex((entry) => entry.key === view.key)
      if (earlier >= 0) dialogTrail = dialogTrail.slice(0, earlier)
      else dialogTrail.push({ ...dialogView, snapshot: dialogSnapshot() })
      if (dialogTrail.length > 12) dialogTrail.shift()
    }
    dialogView = view
    runtime.Experience?.clearBook()
    runtime.Atelier?.clearDialogFlight(el, returning)
    el.className = className
    const body = document.querySelector('#dialog-content')
    body.getAnimations().forEach((animation) => animation.cancel())
    body.innerHTML = content
    body.scrollTop = 0
    let back = el.querySelector('[data-dialog-back]')
    if (!back) {
      back = document.createElement('button')
      back.className = 'dialog-back text-button'
      back.dataset.dialogBack = ''
      el.querySelector('.dialog-head').prepend(back)
    }
    const previous = dialogTrail.at(-1)
    back.hidden = !previous
    back.innerHTML = `${icon('arrow-left')}<span>返回${escape(previous?.label || '')}</span>`
    el.querySelector('.dialog-head .eyebrow').hidden = Boolean(previous)
    hydrate(el)
    document.body.classList.add('app-dialog-open')
    if (!wasOpen) el.showModal()
    if (toastElement.classList.contains('visible')) el.append(toastElement)
    if (wasOpen || !el.querySelector('[autofocus]')) {
      const heading = el.querySelector('#dialog-title')
      heading?.setAttribute('tabindex', '-1')
      heading?.focus({ preventScroll: true })
    }
    if (!returning) {
      runtime.SpatialMotion?.dialog(el)
      runtime.Atelier?.dialog(el)
    }
  }
  function backDialog() {
    const previous = dialogTrail.pop()
    if (!previous) return
    returning = true
    try {
      previous.render()
    } finally {
      returning = false
    }
    const content = document.querySelector('#dialog-content')
    const snapshot = previous.snapshot
    const fields = content.querySelectorAll('input,textarea,select')
    snapshot.fields.forEach(({ index, value, checked }) => {
      const field = fields[index]
      if (!field) return
      field.value = value
      field.checked = checked
      field.dispatchEvent(new Event('input', { bubbles: true }))
    })
    if (snapshot.focus) content.querySelector(snapshot.focus)?.focus({ preventScroll: true })
    content.scrollTop = snapshot.scroll
  }
  function closeDialog(immediate = false) {
    const el = document.querySelector('#app-dialog')
    if (!el.open) return
    document.dispatchEvent(new Event('dialogwillchange'))
    runtime.Experience?.clearBook()
    document.body.classList.remove('app-dialog-open')
    document.body.append(toastElement)
    if (runtime.Atelier?.closeDialog(el, immediate === true)) return
    el.close()
  }
  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(`momichan-journal:${key}`)) ?? fallback
    } catch {
      return fallback
    }
  }
  function save(key, value) {
    try {
      localStorage.setItem(`momichan-journal:${key}`, JSON.stringify(value))
    } catch {
      toast('暂时无法保存')
    }
  }
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-dialog-back]')) backDialog()
    if (event.target.closest('[data-close]')) closeDialog()
  })
  document.querySelector('#app-dialog')?.addEventListener('cancel', (event) => {
    event.preventDefault()
    closeDialog()
  })
  document.querySelector('#app-dialog')?.addEventListener('close', () => {
    const el = document.querySelector('#app-dialog')
    if (el.open) return
    document.body.classList.remove('app-dialog-open')
    document.body.append(toastElement)
    dialogTrail = []
    dialogView = null
    if (outsideFocus?.isConnected) outsideFocus.focus({ preventScroll: true })
  })
  document.querySelector('#app-dialog')?.addEventListener('click', (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    if (
      event.target === event.currentTarget &&
      (event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom)
    )
      closeDialog()
  })
  runtime.UI = {
    icon,
    hydrate,
    escape,
    toast,
    openDialog,
    closeDialog,
    read,
    save,
    focusSelector,
  }
  hydrate()
}
