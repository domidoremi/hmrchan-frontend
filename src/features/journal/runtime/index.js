import { installUI } from './shared.js'
import { createVisibilityObserver } from '@/utils/modernAPIs'

export function createJournalRuntime(navigate) {
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
  installUI(runtime, { document: scopedDocument })
  let motion = runtime.UI.read('presentation-motion', 'full') === 'reduced' ? 'reduced' : 'full'
  function setMotion(value) {
    motion = value === 'reduced' ? 'reduced' : 'full'
    document.body.dataset.motion = motion
    runtime.UI.save('presentation-motion', motion)
    if (motion === 'reduced') animations.forEach((animation) => animation.finish())
    document.dispatchEvent(new CustomEvent('journalmotionchange', { detail: motion }))
  }
  document.body.dataset.motion = motion
  listen(document, 'journalmotionrequest', (event) => setMotion(event.detail))
  function animate(element, keyframes, options = {}) {
    if (!element || motion !== 'full' || lifetime.signal.aborted) return
    const animation = element.animate(keyframes, {
      duration: 780,
      easing: 'cubic-bezier(.18,.75,.22,1)',
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
              filter: 'blur(3px)',
            },
            {
              opacity: 1,
              transform: 'perspective(1200px) translateY(0) rotateX(0deg)',
              filter: 'blur(0)',
            },
          ],
          { delay: Math.min(index * 65, 260) }
        )
      })
    },
    { threshold: 0.08 }
  )
  function mount(root = document) {
    runtime.UI.hydrate(root)
    observeReveals(root)
  }
  function observeReveals(root = document) {
    root
      .querySelectorAll(
        '[data-reveal], .journal-legacy :is(.page-hero-shell, .sub-header, .author-card, .discover-section, .post-shell, .profile-group, .settings-section, .security-command, .security-workspace, .discussion-card, .about-link-group)'
      )
      .forEach((element) => {
        if (observed.has(element)) return
        observed.add(element)
        observer.observe(element)
      })
  }
  let pendingMount = false
  const contentObserver = new MutationObserver((records) => {
    if (
      pendingMount ||
      !records.some((record) => [...record.addedNodes].some((node) => node.nodeType === 1))
    )
      return
    pendingMount = true
    frame(() => {
      pendingMount = false
      observeReveals()
    })
  })
  const pageRoot = document.querySelector('#main-content')
  if (pageRoot) contentObserver.observe(pageRoot, { childList: true, subtree: true })
  let tilted = null,
    pointerFrame = false,
    pointerX = 0,
    pointerY = 0
  listen(
    document,
    'pointermove',
    (event) => {
      if (motion !== 'full' || event.pointerType === 'touch') return
      const target = event.target.closest?.('[data-tilt]')
      if (target !== tilted) {
        tilted?.style.setProperty('--tilt-x', '0deg')
        tilted?.style.setProperty('--tilt-y', '0deg')
        tilted = target
      }
      if (!target) return
      pointerX = event.clientX
      pointerY = event.clientY
      if (pointerFrame) return
      pointerFrame = true
      frame(() => {
        pointerFrame = false
        if (target !== tilted || !target.isConnected) return
        const box = target.getBoundingClientRect()
        target.style.setProperty(
          '--tilt-x',
          String(((pointerY - box.top) / box.height - 0.5) * -9) + 'deg'
        )
        target.style.setProperty(
          '--tilt-y',
          String(((pointerX - box.left) / box.width - 0.5) * 11) + 'deg'
        )
      })
    },
    { passive: true }
  )
  listen(document, 'pointerout', (event) => {
    if (!tilted || (event.relatedTarget instanceof Node && tilted.contains(event.relatedTarget)))
      return
    tilted.style.setProperty('--tilt-x', '0deg')
    tilted.style.setProperty('--tilt-y', '0deg')
    tilted = null
  })
  listen(document, 'click', (event) => {
    const zoom = event.target.closest?.('[data-gallery-zoom]')
    if (zoom) {
      const gallery = document.querySelector('#app-dialog')
      const enabled = gallery.classList.toggle('gallery-zoomed')
      zoom.setAttribute('aria-pressed', String(enabled))
      zoom.setAttribute('aria-label', enabled ? '缩小图片' : '放大图片')
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
  let scrollFrame = false
  listen(
    window,
    'scroll',
    () => {
      if (scrollFrame) return
      scrollFrame = true
      frame(() => {
        scrollFrame = false
        const height = document.documentElement.scrollHeight - innerHeight
        document
          .querySelector('.reading-progress')
          ?.style.setProperty('--progress', String(height ? scrollY / height : 0))
        const top = document.querySelector('.back-to-top')
        if (top) top.hidden = scrollY < 700
        if (motion === 'full')
          document.querySelectorAll('[data-depth-scene]').forEach((scene) => {
            const box = scene.getBoundingClientRect()
            if (box.top > innerHeight || box.bottom < 0) return
            scene.style.setProperty(
              '--scroll-depth',
              String(Math.min(1, Math.max(0, (innerHeight - box.top) / (innerHeight + box.height))))
            )
          })
      })
    },
    { passive: true }
  )
  runtime.Experience = {
    savedFeedback(button) {
      animate(
        button,
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.24) rotate(-8deg)', offset: 0.35 },
          { transform: 'scale(1)' },
        ],
        { duration: 440 }
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
        { duration: 600 }
      )
    },
    layout(root, update) {
      const before = new Map(
        [...root.querySelectorAll('[data-post]')].map((el) => [
          el.dataset.post,
          el.getBoundingClientRect(),
        ])
      )
      Promise.resolve(update()).then(() =>
        frame(() => {
          root.querySelectorAll('[data-post]').forEach((element) => {
            const previous = before.get(element.dataset.post)
            if (!previous) return
            const next = element.getBoundingClientRect()
            if (!next.width || !next.height) return
            animate(
              element,
              [
                {
                  transformOrigin: '0 0',
                  transform:
                    'translate(' +
                    (previous.x - next.x) +
                    'px,' +
                    (previous.y - next.y) +
                    'px) scale(' +
                    previous.width / next.width +
                    ',' +
                    previous.height / next.height +
                    ')',
                },
                { transformOrigin: '0 0', transform: 'translate(0,0) scale(1)' },
              ],
              { duration: 720 }
            )
          })
        })
      )
    },
  }
  runtime.mount = mount
  runtime.getMotion = () => motion
  runtime.setMotion = setMotion
  runtime.transition = () => {
    runtime.UI.closeDialog(true)
    animate(
      document.querySelector('.journal-page, .journal-legacy'),
      [
        { opacity: 0.2, transform: 'translateY(18px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 550 }
    )
  }
  runtime.dispose = () => {
    lifetime.abort()
    observer.disconnect()
    contentObserver.disconnect()
    frames.forEach(cancelAnimationFrame)
    animations.forEach((animation) => animation.cancel())
    runtime.UI.closeDialog(true)
  }
  mount()
  return runtime
}
