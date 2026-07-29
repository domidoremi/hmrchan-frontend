export function initFrameGuard(): void {
  if (window.self === window.top) {
    document.documentElement.style.removeProperty('display')
    return
  }

  window.dispatchEvent(
    new CustomEvent('security:tamper-suspected', {
      detail: {
        signal: 'iframe-context',
        timestamp: Date.now(),
      },
    })
  )

  if (document.body) {
    nukeBody()
  } else {
    document.addEventListener('DOMContentLoaded', nukeBody, { once: true })
  }
}

function nukeBody(): void {
  document.body.innerHTML = ''
  document.body.style.pointerEvents = 'none'
  document.body.style.userSelect = 'none'
}
