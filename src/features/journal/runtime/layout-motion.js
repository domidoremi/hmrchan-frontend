import { motionTiming } from './motion.js'

export function createLayoutMotion({ animate, frame, fullMotion, signal }) {
  const requests = new WeakMap()
  const active = new Set()
  let generation = 0
  function cancel() {
    generation++
    for (const animation of active) animation.cancel()
    active.clear()
  }
  signal.addEventListener('abort', cancel, { once: true })

  async function layout(root, update) {
    if (signal.aborted) return
    const previousRequest = requests.get(root)
    const request = { generation, animations: new Set() }
    requests.set(root, request)
    const enabled = fullMotion() && root.isConnected
    const before = new Map()
    if (enabled)
      for (const element of root.querySelectorAll('[data-post]'))
        before.set(element.dataset.post, element.getBoundingClientRect())
    for (const animation of previousRequest?.animations || []) animation.cancel()
    await update()
    const current = () =>
      !signal.aborted &&
      root.isConnected &&
      fullMotion() &&
      generation === request.generation &&
      requests.get(root) === request
    if (!enabled || !current()) return
    frame(() => {
      if (!current()) return
      const changes = []
      for (const element of root.querySelectorAll('[data-post]')) {
        const previous = before.get(element.dataset.post)
        if (!previous?.width || !previous.height) continue
        const next = element.getBoundingClientRect()
        if (!next.width || !next.height) continue
        if (
          previous.x === next.x &&
          previous.y === next.y &&
          previous.width === next.width &&
          previous.height === next.height
        )
          continue
        changes.push({ element, previous, next })
      }
      for (const { element, previous, next } of changes) {
        const animation = animate(
          element,
          [
            {
              transformOrigin: '0 0',
              transform: `translate(${previous.x - next.x}px,${previous.y - next.y}px) scale(${previous.width / next.width},${previous.height / next.height})`,
            },
            { transformOrigin: '0 0', transform: 'translate(0,0) scale(1)' },
          ],
          { duration: motionTiming.layout }
        )
        if (!animation) continue
        request.animations.add(animation)
        active.add(animation)
        animation.finished
          .catch(() => {})
          .finally(() => {
            request.animations.delete(animation)
            active.delete(animation)
          })
      }
    })
  }
  return { layout, cancel }
}
