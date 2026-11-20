import { onBeforeUnmount, onMounted, provide, ref, watch, type Ref } from 'vue'
import { createResizeObserver } from '@/utils/modernAPIs'
import { chapterKey } from './chapterContext'
import { chapterPosition } from './chapterScene'
import { scrollHomeTo } from './useHomeScroll'

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
    frame = 0
  let resize: ResizeObserver | null = null
  let mutation: MutationObserver | undefined
  const lifetime = new AbortController()
  const styles = new Map<string, string>()
  const duration = () => Math.max(0, travel.value)
  function property(name: string, value: string) {
    if (styles.get(name) === value) return
    styles.set(name, value)
    root.value?.style.setProperty(name, value)
  }
  function measure() {
    const element = root.value
    if (!element || !stage.value || !content.value) return
    const shell = element.closest('.journal-shell')
    const header = shell?.querySelector<HTMLElement>('.edition-header')
    const directory = shell?.querySelector<HTMLElement>('.editorial-contents')
    const mobile = shell?.querySelector('.mobile-navigation')?.getBoundingClientRect()
    const headerStyle = header && getComputedStyle(header)
    top = (header?.offsetHeight ?? 0) + (Number.parseFloat(headerStyle?.top ?? '') || 0)
    if (directory)
      top = Math.max(
        top,
        (Number.parseFloat(getComputedStyle(directory).top) || 0) + directory.offsetHeight
      )
    const bottom = mobile?.height ? Math.max(0, innerHeight - mobile.top) : 0
    height.value = Math.max(1, innerHeight - top - bottom)
    property('--chapter-top', `${top}px`)
    property('--chapter-height', `${height.value}px`)
    property('--chapter-bottom', `${bottom}px`)
    enabled.value = height.value >= 360 && document.body.dataset['motion'] === 'full'
    element.dataset['sceneEnhanced'] = String(enabled.value)
    element.dataset['scenePinned'] = String(enabled.value && duration() > 0)
    overflow = Math.max(0, content.value.offsetHeight - height.value)
    const inspector = content.value.querySelector<HTMLElement>('.archive-inspector')
    if (inspector) inspector.dataset['canPin'] = String(inspector.offsetHeight < height.value - 32)
    property('--chapter-run', `${enabled.value && duration() > 0 ? duration() + overflow : 0}px`)
    update()
  }
  function update() {
    frame = 0
    const element = root.value
    if (!element || document.hidden) return
    const rect = element.getBoundingClientRect()
    const position = chapterPosition(top - rect.top, overflow, duration(), height.value)
    property('--chapter-enter', String(enabled.value ? position.enter : 1))
    property('--chapter-leave', String(enabled.value ? position.leave : 0))
    property('--chapter-progress', String(enabled.value ? position.progress : 0))
    property('--chapter-flow', String(enabled.value ? position.flow : 0.5))
    property('--chapter-shift', `${enabled.value && duration() > 0 ? -position.shift : 0}px`)
    const state =
      rect.top >= innerHeight || rect.bottom <= top
        ? 'outside'
        : position.enter < 1
          ? 'entering'
          : position.leave > 0
            ? 'leaving'
            : 'reading'
    if (element.dataset['sceneState'] !== state) element.dataset['sceneState'] = state
    progress.value = position.progress
  }
  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(update)
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
    resize = createResizeObserver(measure)
    if (resize) {
      resize.observe(content.value)
      const shell = root.value.closest('.journal-shell')
      shell
        ?.querySelectorAll('.edition-header, .editorial-contents, .mobile-navigation')
        .forEach((el) => resize!.observe(el))
    }
    if (typeof MutationObserver !== 'undefined') {
      mutation = new MutationObserver(measure)
      mutation.observe(content.value, { childList: true, subtree: true })
    }
    const options = { passive: true, signal: lifetime.signal }
    window.addEventListener('scroll', schedule, options)
    window.addEventListener('resize', measure, options)
    document.addEventListener('journalmotionchange', measure, options)
    document.addEventListener('visibilitychange', visibility, options)
    root.value.addEventListener('focusin', focus, { signal: lifetime.signal })
    root.value.addEventListener('load', measure, { capture: true, signal: lifetime.signal })
    measure()
  })
  onBeforeUnmount(() => {
    lifetime.abort()
    resize?.disconnect()
    mutation?.disconnect()
    cancelAnimationFrame(frame)
  })
}
