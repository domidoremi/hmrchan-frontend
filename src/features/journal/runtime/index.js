import { installUI } from './shared.js'
import { createMotionPreference, motionTiming } from './motion.js'
import { installViewportMotion } from './viewport-motion.js'
import { createLayoutMotion } from './layout-motion.js'
import { createVisibilityObserver } from '@/utils/modernAPIs'

export function createJournalRuntime(navigate, options = {}) {
  const { translate } = options
  const lifetime = new AbortController()
  const animations = new Set()
  const observed = new WeakSet()
  const frames = new Set()
  const listen = (target, name, callback, options = {}) =>
    target.addEventListener(name, callback, { ...options, signal: lifetime.signal })
  const frame = (callback) => {
    const id = requestAnimationFrame(() => {
      frames.delete(id)
      if (!lifetime.signal.aborted) callback()
    })
    frames.add(id)
  }
  const scopedDocument = new Proxy(document, {
    get(target, key) {
      if (key === 'addEventListener')
        return (name, callback, options) => listen(target, name, callback, options)
      const value = Reflect.get(target, key, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  const runtime = {}
  installUI(runtime, { document: scopedDocument, feedback: options.feedback, translate })
  const zoomLabel = (enabled) =>
    translate?.(enabled ? 'common.zoomOut' : 'common.zoomIn') ?? (enabled ? 'Zoom Out' : 'Zoom In')
  runtime.refreshLocalizedControls = () => {
    if (lifetime.signal.aborted) return
    runtime.UI.refreshBackLabel()
    const zoom = document.querySelector('#app-dialog[open] [data-gallery-zoom]')
    if (zoom)
      zoom.setAttribute('aria-label', zoomLabel(zoom.getAttribute('aria-pressed') === 'true'))
  }
  let motion = 'full'
  const layoutMotion = createLayoutMotion({
    animate,
    frame,
    fullMotion: () => motion === 'full',
    signal: lifetime.signal,
  })
  const preference = createMotionPreference({
    read: runtime.UI.read,
    save: runtime.UI.save,
    signal: lifetime.signal,
    changed(value) {
      motion = value
      if (value === 'reduced') {
        animations.forEach((animation) => animation.finish())
        layoutMotion.cancel()
      }
    },
  })
  const viewport = installViewportMotion({ listen, frame, fullMotion: () => motion === 'full' })
  function animate(element, keyframes, options = {}) {
    if (!element || motion !== 'full' || lifetime.signal.aborted) return
    const animation = element.animate(keyframes, {
      duration: motionTiming.reveal,
      easing: motionTiming.ease,
      ...options,
    })
    animations.add(animation)
    animation.finished.catch(() => {}).finally(() => animations.delete(animation))
    return animation
  }
  const observer = createVisibilityObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (!entry.isIntersecting) return
        observer.unobserve(entry.target)
        animate(
          entry.target,
          [
            {
              opacity: 0.15,
              transform: 'perspective(1200px) translateY(54px) rotateX(5deg)',
            },
            {
              opacity: 1,
              transform: 'perspective(1200px) translateY(0) rotateX(0deg)',
            },
          ],
          { delay: Math.min(index * 65, 260) }
        )
      })
    },
    { threshold: 0.08 }
  )
  function mount(root = document) {
    if (lifetime.signal.aborted) return
    runtime.UI.hydrate(root)
    observeReveals(root)
    viewport.refresh()
  }
  const revealSelector =
    '[data-reveal], .journal-legacy :is(.page-hero-shell, .sub-header, .author-card, .discover-section, .post-shell, .profile-group, .settings-section, .security-command, .security-workspace, .discussion-card, .about-link-group)'
  function observeReveals(root = document) {
    const elements = [...root.querySelectorAll(revealSelector)]
    if (root instanceof Element && root.matches(revealSelector)) elements.unshift(root)
    for (const element of elements) {
      if (observed.has(element)) continue
      observed.add(element)
      observer.observe(element)
    }
  }
  const pendingRoots = new Set()
  let pendingMount = false
  const contentObserver = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) if (node instanceof Element) pendingRoots.add(node)
      for (const node of record.removedNodes) {
        if (!(node instanceof Element)) continue
        observer.unobserve(node)
        node.querySelectorAll(revealSelector).forEach((element) => observer.unobserve(element))
      }
    }
    if (pendingMount || !pendingRoots.size) return
    pendingMount = true
    frame(() => {
      pendingMount = false
      for (const root of pendingRoots) if (root.isConnected) observeReveals(root)
      pendingRoots.clear()
      viewport.refresh()
    })
  })
  const pageRoot = document.querySelector('#main-content')
  if (pageRoot) contentObserver.observe(pageRoot, { childList: true, subtree: true })
  listen(document, 'click', (event) => {
    const zoom = event.target.closest?.('[data-gallery-zoom]')
    if (zoom) {
      const gallery = document.querySelector('#app-dialog')
      const enabled = gallery.classList.toggle('gallery-zoomed')
      zoom.setAttribute('aria-pressed', String(enabled))
      zoom.setAttribute('aria-label', zoomLabel(enabled))
    }
    const target = event.target.closest?.('[data-action]')
    if (!target) return
    const action = target.dataset.action
    if (action === 'search') document.dispatchEvent(new Event('journalsearch'))
    if (action === 'notifications') document.dispatchEvent(new Event('journalnotifications'))
    if (action === 'goto-schedule') {
      runtime.UI.closeDialog(true)
      navigate('/schedule')
    }
    if (action === 'top')
      window.scrollTo({ top: 0, behavior: motion === 'full' ? 'smooth' : 'instant' })
  })
  listen(document, 'keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      document.dispatchEvent(new Event('journalsearch'))
    }
  })
  runtime.Experience = {
    savedFeedback(button) {
      animate(
        button,
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.24) rotate(-8deg)', offset: 0.35 },
          { transform: 'scale(1)' },
        ],
        { duration: motionTiming.feedback }
      )
    },
  }
  runtime.SpatialMotion = {
    dialog(element) {
      animate(
        element.querySelector('#dialog-content'),
        [
          {
            opacity: 0.15,
            transform: 'perspective(1300px) translateY(30px) rotateX(-5deg) scale(.97)',
          },
          { opacity: 1, transform: 'perspective(1300px) translateY(0) rotateX(0deg) scale(1)' },
        ],
        { duration: motionTiming.dialog }
      )
    },
    layout: layoutMotion.layout,
  }
  runtime.mount = mount
  runtime.getMotion = () => motion
  runtime.setMotion = preference.set
  runtime.transition = () => {
    if (lifetime.signal.aborted) return
    runtime.UI.closeDialog(true)
    animate(
      document.querySelector('.journal-page, .journal-legacy'),
      [
        { opacity: 0.2, transform: 'translateY(18px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: motionTiming.page }
    )
  }
  runtime.dispose = () => {
    if (lifetime.signal.aborted) return
    lifetime.abort()
    observer.disconnect()
    contentObserver.disconnect()
    viewport.dispose()
    pendingRoots.clear()
    frames.forEach(cancelAnimationFrame)
    animations.forEach((animation) => animation.cancel())
    runtime.UI.closeDialog(true)
    runtime.UI.dispose()
  }
  mount()
  return runtime
}
