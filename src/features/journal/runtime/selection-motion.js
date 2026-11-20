export function installSelectionMotion({ animate, frame, listen, fullMotion }) {
  const indicators = new Set()
  let pending = false
  function refresh() {
    if (pending || document.hidden) return
    pending = true
    frame(() => {
      pending = false
      const readings = []
      for (const group of document.querySelectorAll('[data-indicator]')) {
        const selected = group.querySelector(
          ':scope > [aria-current="page"], :scope > [aria-pressed="true"], :scope > .active'
        )
        if (!selected) continue
        const box = group.getBoundingClientRect()
        const target = selected.getBoundingClientRect()
        if (!box.width || !box.height || !target.width) continue
        const indicator = group.querySelector(':scope > .nav-indicator')
        readings.push({
          group,
          box,
          target,
          indicator,
          previous: indicator?.getBoundingClientRect(),
        })
      }
      for (const { group, box, target, indicator: existing, previous } of readings) {
        const indicator = existing || document.createElement('span')
        if (!existing) {
          indicator.className = 'nav-indicator'
          indicator.setAttribute('aria-hidden', 'true')
          group.prepend(indicator)
          indicators.add(indicator)
        }
        const x = target.left - box.left,
          y = target.top - box.top
        indicator.style.width = `${target.width}px`
        indicator.style.height = `${target.height}px`
        indicator.style.transform = `translate(${x}px,${y}px)`
        if (
          previous?.width &&
          fullMotion() &&
          (Math.abs(previous.left - target.left) > 0.5 ||
            Math.abs(previous.top - target.top) > 0.5 ||
            Math.abs(previous.width - target.width) > 0.5)
        ) {
          animate(
            indicator,
            [
              {
                transform: `translate(${previous.left - box.left}px,${previous.top - box.top}px) scale(${previous.width / target.width},${previous.height / target.height})`,
                transformOrigin: '0 0',
              },
              { transform: `translate(${x}px,${y}px) scale(1,1)`, transformOrigin: '0 0' },
            ],
            { id: 'selection', duration: 500 }
          )
        }
      }
      for (const indicator of indicators) if (!indicator.isConnected) indicators.delete(indicator)
    })
  }
  listen(window, 'resize', refresh, { passive: true })
  listen(document, 'journaldisplaychange', refresh)
  listen(document, 'journalmotionchange', refresh)
  listen(document, 'visibilitychange', () => {
    if (!document.hidden) refresh()
  })
  return {
    refresh,
    suspend() {
      pending = false
    },
    dispose() {
      for (const indicator of indicators) indicator.remove()
      indicators.clear()
    },
  }
}
