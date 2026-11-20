import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import { createResizeObserver, createVisibilityObserver } from '@/utils/modernAPIs'
import { cameraPose, cameraTrack } from './cameraTrack'
import type { HomeSpace } from './homeSpace'

export function useHomeSpace(
  canvas: Ref<HTMLCanvasElement | null>,
  host: Ref<HTMLElement | null>,
  images: () => readonly string[]
) {
  const lifetime = new AbortController()
  let home: HTMLElement | null = null
  let space: HomeSpace | undefined
  let resize: ResizeObserver | null = null
  let observer: MutationObserver | undefined
  let visibility: IntersectionObserver | undefined
  let visible = false
  let running = false
  let unavailable = false
  let pending = false
  let frame = 0
  let measureFrame = 0
  let phase = 0
  let time = 0
  let lastFrame = 0
  let lastPhase = NaN
  let origin = 0
  let end = 0
  let stops: number[] = []

  function paint(now: number) {
    frame = 0
    if (!space || !running) return
    const elapsed = lastFrame ? now - lastFrame : 0
    if (phase !== lastPhase || elapsed >= 33) {
      if (phase !== lastPhase && home) {
        const { turn, approach } = cameraPose(phase)
        home.style.setProperty('--space-turn', turn.toFixed(4))
        home.style.setProperty('--space-approach', approach.toFixed(4))
      }
      time += Math.min(elapsed, 64) / 1000
      lastFrame = now
      lastPhase = phase
      space.render(phase, time)
    }
    frame = requestAnimationFrame(paint)
  }

  function run() {
    const active = Boolean(
      space && visible && !document.hidden && !document.querySelector('dialog[open]')
    )
    if (running === active) return
    running = active
    lastFrame = 0
    lastPhase = NaN
    if (active) frame = requestAnimationFrame(paint)
    else cancelAnimationFrame(frame)
  }

  function publishPosition() {
    if (!space || !visible || document.hidden) return
    phase = cameraTrack(window.scrollY - origin, end, stops)
  }

  function measure() {
    measureFrame = 0
    const field = canvas.value?.parentElement
    if (!home || !field || !space) return
    const width = field.clientWidth
    const height = field.clientHeight
    origin = home.getBoundingClientRect().top + window.scrollY
    end = Math.max(0, home.offsetHeight - height)
    const sections = Array.from(home.querySelectorAll<HTMLElement>('.immersive-chapter'))
    let previous = 0
    stops = sections.slice(1).flatMap((section) => {
      const top = section.getBoundingClientRect().top + window.scrollY - origin
      if (top - previous < height * 0.55 || end - top < height * 0.35) return []
      previous = top
      return [top]
    })
    if (width && height) space.resize(width, height)
    publishPosition()
  }

  function scheduleMeasure() {
    if (space && !measureFrame) measureFrame = requestAnimationFrame(measure)
  }

  function palette() {
    if (!home || !space) return
    space.palette(getComputedStyle(home), document.documentElement.dataset['preset'] ?? '')
  }

  function dispose() {
    space?.dispose()
    space = undefined
    delete home?.dataset['spaceWorld']
    home?.style.removeProperty('--space-turn')
    home?.style.removeProperty('--space-approach')
    run()
  }

  const enabled = () => document.body.dataset['motion'] === 'full' && window.innerHeight >= 440
  async function sync() {
    if (!enabled()) {
      dispose()
      return
    }
    if (!canvas.value || !visible || unavailable || pending || space || document.hidden) return
    pending = true
    try {
      const { createHomeSpace } = await import('./homeSpace')
      if (!enabled() || lifetime.signal.aborted || !canvas.value || !home || unavailable) return
      space = createHomeSpace(canvas.value, home.classList.contains('next-home'))
      if (!space) {
        unavailable = true
        return
      }
      palette()
      space.images(images())
      measure()
      home.dataset['spaceWorld'] = 'true'
      run()
    } catch {
      unavailable = true
      dispose()
    } finally {
      pending = false
    }
  }

  function resizeWorld() {
    scheduleMeasure()
    void sync()
  }

  function contextLost(event: Event) {
    event.preventDefault()
    unavailable = true
    dispose()
  }

  function contextRestored() {
    unavailable = false
    void sync()
  }

  watch(images, (sources) => space?.images(sources))
  onMounted(() => {
    home = host.value?.parentElement ?? null
    if (!home || !canvas.value) return
    const options = { passive: true, signal: lifetime.signal }
    window.addEventListener('scroll', publishPosition, options)
    window.addEventListener('resize', resizeWorld, options)
    document.addEventListener('journalmotionchange', sync, options)
    document.addEventListener(
      'visibilitychange',
      () => {
        publishPosition()
        run()
        void sync()
      },
      options
    )
    canvas.value.addEventListener('webglcontextlost', contextLost, { signal: lifetime.signal })
    canvas.value.addEventListener('webglcontextrestored', contextRestored, options)
    resize = createResizeObserver(scheduleMeasure)
    resize?.observe(home)
    observer = new MutationObserver((changes) => {
      if (changes.some((change) => change.target === document.documentElement)) palette()
      if (changes.some((change) => change.type === 'childList')) scheduleMeasure()
      run()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-preset', 'data-color-mode'],
    })
    observer.observe(home, { childList: true, subtree: true })
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['open'] })
    if ('IntersectionObserver' in window) {
      visibility = createVisibilityObserver(([entry]) => {
        visible = Boolean(entry?.isIntersecting)
        publishPosition()
        run()
        void sync()
      })
      visibility.observe(canvas.value)
    } else {
      visible = true
      void sync()
    }
  })
  onBeforeUnmount(() => {
    lifetime.abort()
    resize?.disconnect()
    observer?.disconnect()
    visibility?.disconnect()
    cancelAnimationFrame(measureFrame)
    dispose()
  })
}
