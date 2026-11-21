import { createResizeObserver } from '@/utils/modernAPIs'

// Read all layout geometry before writing styles for the current frame.
export function installViewportMotion({ listen, frame, scrollFrame, fullMotion }) {
  let tilted = null
  let pointerPending = false
  let pointerX = 0
  let pointerY = 0
  let magnetic = null
  let magnetX = 0,
    magnetY = 0,
    magnetPending = false
  let scrollPending = false
  let position = 0
  let scenes = []
  const progress = document.querySelector('.reading-progress')
  const top = document.querySelector('.back-to-top')
  function resetTilt() {
    tilted?.style.removeProperty('--tilt-x')
    tilted?.style.removeProperty('--tilt-y')
    tilted?.style.removeProperty('--light-x')
    tilted?.style.removeProperty('--light-y')
    tilted = null
    magnetic?.style.removeProperty('--magnet-x')
    magnetic?.style.removeProperty('--magnet-y')
    magnetic = null
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
        tilted.style.setProperty('--light-x', `${(y + 0.5) * 100}%`)
        tilted.style.setProperty('--light-y', `${(x + 0.5) * 100}%`)
      })
    },
    { passive: true }
  )
  listen(
    document,
    'pointermove',
    (event) => {
      if (!fullMotion() || document.hidden || event.pointerType === 'touch') return
      const target = event.target.closest?.('[data-magnet]')
      if (target !== magnetic) {
        magnetic?.style.removeProperty('--magnet-x')
        magnetic?.style.removeProperty('--magnet-y')
        magnetic = target
      }
      if (!target) return
      magnetX = event.clientX
      magnetY = event.clientY
      if (magnetPending) return
      magnetPending = true
      frame(() => {
        magnetPending = false
        if (!magnetic?.isConnected || !fullMotion() || document.hidden) return
        const box = magnetic.getBoundingClientRect()
        if (!box.width || !box.height) return
        const x = Math.max(-0.5, Math.min(0.5, (magnetX - box.left) / box.width - 0.5))
        const y = Math.max(-0.5, Math.min(0.5, (magnetY - box.top) / box.height - 0.5))
        magnetic.style.setProperty('--magnet-x', `${x * 12}px`)
        magnetic.style.setProperty('--magnet-y', `${y * 8}px`)
      })
    },
    { passive: true }
  )
  listen(document, 'pointerout', (event) => {
    if (tilted && !(event.relatedTarget instanceof Node && tilted.contains(event.relatedTarget)))
      resetTilt()
    else if (
      magnetic &&
      !(event.relatedTarget instanceof Node && magnetic.contains(event.relatedTarget))
    ) {
      magnetic.style.removeProperty('--magnet-x')
      magnetic.style.removeProperty('--magnet-y')
      magnetic = null
    }
  })
  listen(window, 'blur', resetTilt)
  listen(document, 'journalmotionchange', () => {
    if (!fullMotion()) {
      resetTilt()
      for (const scene of scenes) scene.style.removeProperty('--scroll-depth')
    } else schedule()
  })
  function readScroll() {
    scrollPending = false
    if (document.hidden) return
    const y = scrollY
    position = y
    const viewportHeight = innerHeight
    const height = y > 0 ? document.documentElement.scrollHeight - viewportHeight : 0
    const measurements =
      fullMotion() && y > 0
        ? scenes
            .filter((scene) => scene.isConnected)
            .map((scene) => ({ scene, box: scene.getBoundingClientRect() }))
        : []
    const fraction = String(height > 0 ? Math.min(1, Math.max(0, y / height)) : 0)
    return () => {
      if (progress && progress.style.getPropertyValue('--progress') !== fraction)
        progress.style.setProperty('--progress', fraction)
      if (top && top.hidden !== y < 700) top.hidden = y < 700
      for (const { scene, box } of measurements) {
        if (box.top > viewportHeight || box.bottom < 0) continue
        const depth = Math.min(
          1,
          Math.max(0, (viewportHeight - box.top) / (viewportHeight + box.height))
        ).toFixed(3)
        if (scene.style.getPropertyValue('--scroll-depth') !== depth)
          scene.style.setProperty('--scroll-depth', depth)
      }
    }
  }
  function schedule() {
    if (scrollPending || document.hidden) return
    scrollPending = true
    if (scrollFrame) scrollFrame.queue(readScroll)
    else frame(() => readScroll()?.())
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
    suspend() {
      pointerPending = false
      magnetPending = false
      scrollPending = false
      scrollFrame?.cancel(readScroll)
      resetTilt()
    },
    dispose() {
      resizeObserver?.disconnect()
      scrollFrame?.cancel(readScroll)
      resetTilt()
      document.body.classList.remove('journal-suspended')
    },
  }
}
