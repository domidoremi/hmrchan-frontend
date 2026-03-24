interface ScrollLockSnapshot {
  bodyOverflow: string
  bodyPosition: string
  bodyTop: string
  bodyLeft: string
  bodyRight: string
  bodyWidth: string
  bodyPaddingRight: string
  bodyOverscrollBehavior: string
  htmlOverflow: string
  htmlOverscrollBehavior: string
  scrollY: number
}

let lockCount = 0
let snapshot: ScrollLockSnapshot | null = null

function getScrollY(): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
}

export function lockBodyScroll(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const body = document.body
  const html = document.documentElement

  if (lockCount === 0) {
    const clientWidth = html.clientWidth
    const scrollbarWidth = clientWidth > 0 ? Math.max(0, window.innerWidth - clientWidth) : 0

    snapshot = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyPaddingRight: body.style.paddingRight,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      htmlOverflow: html.style.overflow,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
      scrollY: getScrollY(),
    }

    html.style.overflow = 'hidden'
    html.style.overscrollBehavior = 'none'
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${snapshot.scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overscrollBehavior = 'none'
    body.style.paddingRight =
      scrollbarWidth > 0
        ? `calc(${snapshot.bodyPaddingRight || '0px'} + ${scrollbarWidth}px)`
        : snapshot.bodyPaddingRight
  }

  lockCount += 1
}

export function unlockBodyScroll(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  lockCount = Math.max(0, lockCount - 1)
  if (lockCount !== 0 || !snapshot) return

  const body = document.body
  const html = document.documentElement
  const restoreScrollY = snapshot.scrollY

  body.style.overflow = snapshot.bodyOverflow
  body.style.position = snapshot.bodyPosition
  body.style.top = snapshot.bodyTop
  body.style.left = snapshot.bodyLeft
  body.style.right = snapshot.bodyRight
  body.style.width = snapshot.bodyWidth
  body.style.paddingRight = snapshot.bodyPaddingRight
  body.style.overscrollBehavior = snapshot.bodyOverscrollBehavior
  html.style.overflow = snapshot.htmlOverflow
  html.style.overscrollBehavior = snapshot.htmlOverscrollBehavior

  snapshot = null
  window.scrollTo(0, restoreScrollY)
}
