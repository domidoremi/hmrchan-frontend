import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import { followHomeChapter } from './homeAnchor'
import { verticalWheelDelta } from './wheelRegion'

export function useHomeChapterSettle(home: Ref<HTMLElement | undefined>) {
  const lifetime = new AbortController()
  let intent = false
  let touching = false
  let previous = 0
  let direction = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let stopFollowing: (() => void) | undefined

  function nativeInput() {
    clearTimeout(timer)
    intent = true
    previous = scrollY
    direction = 0
  }

  function settle() {
    clearTimeout(timer)
    if (!intent || touching || !direction) return
    intent = false
    if (
      document.hidden ||
      document.querySelector('dialog[open], .home-contents-menu[open]') ||
      window.getSelection()?.isCollapsed === false
    )
      return
    const chapters = home.value?.querySelectorAll<HTMLElement>(':scope > .immersive-chapter') ?? []
    for (const chapter of chapters) {
      const top = Number.parseFloat(chapter.style.getPropertyValue('--chapter-top')) || 0
      const height = Number.parseFloat(
        chapter.style.getPropertyValue('--chapter-viewport') ||
          chapter.style.getPropertyValue('--chapter-height')
      )
      if (height < 360 || !Number.isFinite(height)) continue
      const rect = chapter.getBoundingClientRect()
      const edge = direction > 0 ? rect.top - top : top + height - rect.bottom
      if (edge <= 2 || edge > height * 0.6) continue
      stopFollowing?.()
      stopFollowing = followHomeChapter(chapter, direction < 0)
      break
    }
  }

  function scroll() {
    if (scrollY !== previous) direction = Math.sign(scrollY - previous)
    previous = scrollY
    clearTimeout(timer)
    if (intent && !touching) timer = setTimeout(settle, 220)
  }

  function isControl(event: Event) {
    return (
      event.target instanceof Element &&
      Boolean(
        event.target.closest(
          'dialog, input, textarea, select, [contenteditable="true"], [data-wheel-native]'
        )
      )
    )
  }

  onMounted(() => {
    previous = scrollY
    const options = { passive: true, signal: lifetime.signal }
    window.addEventListener('scroll', scroll, options)
    window.addEventListener('scrollend', settle, options)
    window.addEventListener(
      'touchstart',
      (event) => {
        if (isControl(event)) return
        touching = true
        nativeInput()
      },
      options
    )
    window.addEventListener(
      'touchend',
      () => {
        touching = false
        if (intent) timer = setTimeout(settle, 220)
      },
      options
    )
    window.addEventListener(
      'touchcancel',
      () => {
        touching = false
        intent = false
      },
      options
    )
    window.addEventListener(
      'keydown',
      (event) => {
        if (
          isControl(event) ||
          event.defaultPrevented ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' '].includes(event.key)) nativeInput()
        else intent = false
      },
      options
    )
    window.addEventListener(
      'pointerdown',
      (event) => {
        if (event.clientX >= document.documentElement.clientWidth) nativeInput()
        else intent = false
      },
      options
    )
    window.addEventListener(
      'wheel',
      (event) => {
        if (!(event.target instanceof Node) || home.value?.contains(event.target)) return
        if (verticalWheelDelta(event)) nativeInput()
      },
      options
    )
  })
  onBeforeUnmount(() => {
    lifetime.abort()
    clearTimeout(timer)
    stopFollowing?.()
  })
  return nativeInput
}
