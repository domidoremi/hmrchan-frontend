import { createResizeObserver } from '@/utils/modernAPIs'

// Read all layout geometry before writing styles for the current frame.
export function installViewportMotion({ listen, frame, fullMotion }) {
  let tilted = null
  let pointerPending = false
  let pointerX = 0
  let pointerY = 0
  let scrollPending = false
  let position = 0
  let scenes = []
  const progress = document.querySelector('.reading-progress')
  const top = document.querySelector('.back-to-top')
  function resetTilt() {
    tilted?.style.removeProperty('--tilt-x')
    tilted?.style.removeProperty('--tilt-y')
    tilted = null
  }
  listen(
    document,
    'pointermove',
    (event) => {
      if (!fullMotion() || document.hidden || event.pointerType === 'touch') return
      const target = event.target.closest?.('[data-tilt]')
      if (target !== tilted) {
        resetTilt()
        tilted = target
      }
      if (!target) return
      pointerX = event.clientX
      pointerY = event.clientY
      if (pointerPending) return
      pointerPending = true
      frame(() => {
        pointerPending = false
        if (!tilted?.isConnected || !fullMotion()) return
        const box = tilted.getBoundingClientRect()
        if (!box.width || !box.height) return
        const x = Math.max(-0.5, Math.min(0.5, (pointerY - box.top) / box.height - 0.5))
        const y = Math.max(-0.5, Math.min(0.5, (pointerX - box.left) / box.width - 0.5))
        tilted.style.setProperty('--tilt-x', `${x * -9}deg`)
        tilted.style.setProperty('--tilt-y', `${y * 11}deg`)
      })
    },
    { passive: true }
  )
  listen(document, 'pointerout', (event) => {
    if (tilted && !(event.relatedTarget instanceof Node && tilted.contains(event.relatedTarget)))
      resetTilt()
  })
  listen(window, 'blur', resetTilt)
  listen(document, 'journalmotionchange', () => {
    if (!fullMotion()) resetTilt()
  })
  function schedule() {
    if (scrollPending || document.hidden) return
    scrollPending = true
    frame(() => {
      scrollPending = false
      const y = scrollY
      position = y
      const height = y > 0 ? document.documentElement.scrollHeight - innerHeight : 0
      const measurements =
        fullMotion() && y > 0
          ? scenes
              .filter((scene) => scene.isConnected)
              .map((scene) => ({ scene, box: scene.getBoundingClientRect() }))
          : []
      progress?.style.setProperty(
        '--progress',
        String(height > 0 ? Math.min(1, Math.max(0, y / height)) : 0)
      )
      if (top && top.hidden !== y < 700) top.hidden = y < 700
      for (const { scene, box } of measurements) {
        if (box.top > innerHeight || box.bottom < 0) continue
        scene.style.setProperty(
          '--scroll-depth',
          String(Math.min(1, Math.max(0, (innerHeight - box.top) / (innerHeight + box.height))))
        )
      }
    })
  }
  const resizeObserver = createResizeObserver(() => {
    // Resize notifications arrive after layout, including restored scroll positions.
    position = scrollY
    if (position > 0) schedule()
  })
  resizeObserver?.observe(document.documentElement)
  listen(window, 'scroll', schedule, { passive: true })
  listen(window, 'resize', schedule, { passive: true })
  listen(document, 'visibilitychange', () => {
    document.body.classList.toggle('journal-suspended', document.hidden)
    if (document.hidden) resetTilt()
    else schedule()
  })
  return {
    refresh() {
      scenes = [...document.querySelectorAll('[data-depth-scene]')]
      // Reading scrollY here would flush layout after every content mutation.
      if (position > 0) schedule()
    },
    dispose() {
      resizeObserver?.disconnect()
      resetTilt()
      document.body.classList.remove('journal-suspended')
    },
  }
}
