import { onBeforeUnmount, onMounted, provide, ref, watch, type Ref } from 'vue'
import { createResizeObserver } from '@/utils/modernAPIs'
import { chapterKey } from './chapterContext'
import { chapterPosition } from './chapterScene'
import { cancelHomeFrame, queueHomeFrame } from './homeFrame'
import { scrollHomeTo } from './useHomeScroll'
import { headerInset } from './homeChrome'

export function useChapterScene(
  root: Ref<HTMLElement | undefined>,
  stage: Ref<HTMLElement | undefined>,
  content: Ref<HTMLElement | undefined>
) {
  const enabled = ref(false),
    height = ref(0),
    progress = ref(0),
    travel = ref(0)
  let top = 0,
    overflow = 0,
    measureFrame = 0
  let resize: ResizeObserver | null = null
  let mutation: MutationObserver | undefined
  let motionTargets: HTMLElement[] = []
  const lifetime = new AbortController()
  const duration = () => Math.max(0, travel.value)
  function property(element: HTMLElement | null | undefined, name: string, value: string) {
    if (element && element.style.getPropertyValue(name) !== value)
      element.style.setProperty(name, value)
  }
  function measure() {
    if (measureFrame) cancelAnimationFrame(measureFrame)
    measureFrame = 0
    const element = root.value
    if (!element || !stage.value || !content.value) return
    const shell = element.closest('.journal-shell')
    const header = shell?.querySelector<HTMLElement>('.edition-header')
    const directory = shell?.querySelector<HTMLElement>('.editorial-contents')
    const mobile = shell?.querySelector('.mobile-navigation')?.getBoundingClientRect()
    top = headerInset(header)
    if (directory)
      top = Math.max(
        top,
        (Number.parseFloat(getComputedStyle(directory).top) || 0) + directory.offsetHeight
      )
    const bottom = mobile?.height ? Math.max(0, innerHeight - mobile.top) : 0
    const viewport = Math.max(1, innerHeight - top - bottom)
    // Keep media geometry stable while the header slides away or returns.
    height.value = Math.max(1, innerHeight - Math.max(top, headerInset(header, true)) - bottom)
    property(element, '--chapter-top', `${top}px`)
    property(element, '--chapter-height', `${height.value}px`)
    property(element, '--chapter-viewport', `${viewport}px`)
    property(element, '--chapter-bottom', `${bottom}px`)
    enabled.value = height.value >= 360 && document.body.dataset['motion'] === 'full'
    element.dataset['sceneEnhanced'] = String(enabled.value)
    element.dataset['scenePinned'] = String(enabled.value && duration() > 0)
    overflow = Math.max(0, content.value.offsetHeight - viewport)
    const inspector = content.value.querySelector<HTMLElement>('.archive-inspector')
    if (inspector) inspector.dataset['canPin'] = String(inspector.offsetHeight < height.value - 32)
    property(
      element,
      '--chapter-run',
      `${enabled.value && duration() > 0 ? duration() + overflow : 0}px`
    )
    const surface = content.value.parentElement
    motionTargets =
      surface && element.parentElement?.matches('.editorial-home.immersive-home')
        ? [surface]
        : Array.from(
            content.value.querySelectorAll(
              '.section-heading, .conversation-heading, .panel-heading, .next-desk-header, .month-poster'
            )
          )
    readPosition()?.()
  }
  function scheduleMeasure() {
    if (!measureFrame && !document.hidden) measureFrame = requestAnimationFrame(measure)
  }
  function readPosition() {
    const element = root.value
    if (!element || document.hidden) return
    const rect = element.getBoundingClientRect()
    const position = chapterPosition(top - rect.top, overflow, duration(), height.value)
    const threshold = 1 / height.value
    const state =
      rect.top >= innerHeight - 1 || rect.bottom <= top + 1
        ? 'outside'
        : position.enter < 1 - threshold
          ? 'entering'
          : position.leave > threshold
            ? 'leaving'
            : 'reading'
    return () => {
      const moving = enabled.value
      for (const target of motionTargets) {
        property(target, '--chapter-enter', String(moving ? position.enter : 1))
        property(target, '--chapter-leave', String(moving ? position.leave : 0))
      }
      property(
        content.value,
        '--chapter-shift',
        `${moving && duration() > 0 ? -position.shift : 0}px`
      )
      if (element.dataset['sceneState'] !== state) element.dataset['sceneState'] = state
      progress.value = position.progress
    }
  }
  function schedule() {
    if (!document.hidden) queueHomeFrame(readPosition)
  }
  function visibility() {
    if (document.hidden && root.value) root.value.dataset['sceneState'] = 'outside'
    else schedule()
  }
  function seek(value: number, smooth = false) {
    if (!enabled.value || !root.value) return
    scrollHomeTo(
      scrollY +
        root.value.getBoundingClientRect().top -
        top +
        overflow +
        Math.min(1, Math.max(0, value)) * duration(),
      smooth
    )
    schedule()
  }
  function focus(event: FocusEvent) {
    const target = event.target
    if (
      !enabled.value ||
      duration() <= 0 ||
      !root.value ||
      target === root.value ||
      !(target instanceof HTMLElement)
    )
      return
    const bounds = target.getBoundingClientRect()
    if (bounds.top >= top && bounds.bottom <= top + height.value) return
    const current = Math.max(0, Math.min(overflow, top - root.value.getBoundingClientRect().top))
    const delta = bounds.top < top ? bounds.top - top - 16 : bounds.bottom - top - height.value + 16
    scrollHomeTo(
      scrollY +
        root.value.getBoundingClientRect().top -
        top +
        Math.max(0, Math.min(overflow, current + delta))
    )
    if (stage.value) stage.value.scrollTop = 0
    schedule()
  }
  provide(chapterKey, { enabled, height, progress, travel, seek, overlay: stage })
  watch(travel, measure, { flush: 'post' })
  onMounted(() => {
    if (!root.value || !content.value) return
    resize = createResizeObserver(scheduleMeasure)
    if (resize) {
      resize.observe(content.value)
      const shell = root.value.closest('.journal-shell')
      shell
        ?.querySelectorAll('.edition-header, .editorial-contents, .mobile-navigation')
        .forEach((el) => resize!.observe(el))
    }
    if (typeof MutationObserver !== 'undefined') {
      mutation = new MutationObserver((changes) => {
        if (
          changes.some(({ addedNodes, removedNodes }) =>
            [...addedNodes, ...removedNodes].some((node) => node.nodeType === Node.ELEMENT_NODE)
          )
        )
          scheduleMeasure()
      })
      mutation.observe(content.value, { childList: true, subtree: true })
    }
    const options = { passive: true, signal: lifetime.signal }
    window.addEventListener('scroll', schedule, options)
    window.addEventListener('resize', measure, options)
    document.addEventListener('journalmotionchange', measure, options)
    document.addEventListener('journalchromechange', measure, options)
    document.addEventListener('visibilitychange', visibility, options)
    root.value.addEventListener('focusin', focus, { signal: lifetime.signal })
    root.value.addEventListener('load', scheduleMeasure, { capture: true, signal: lifetime.signal })
    measure()
  })
  onBeforeUnmount(() => {
    lifetime.abort()
    resize?.disconnect()
    mutation?.disconnect()
    cancelAnimationFrame(measureFrame)
    cancelHomeFrame(readPosition)
  })
}
