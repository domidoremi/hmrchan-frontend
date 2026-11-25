import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'

export function useCollapsingHeader(
  header: Ref<HTMLElement | undefined>,
  enabled: Readonly<Ref<boolean>>,
  locked: Readonly<Ref<boolean>>
) {
  const lifetime = new AbortController()
  let previous = 0
  let distance = 0
  let frame = 0

  function collapse(value: boolean) {
    const element = header.value
    if (!element || (element.dataset['collapsed'] === 'true') === value) return
    element.dataset['collapsed'] = String(value)
    document.dispatchEvent(new Event('journalchromechange'))
  }

  function update() {
    frame = 0
    const y = Math.max(0, scrollY)
    const delta = y - previous
    previous = y
    const element = header.value
    const keyboardFocus =
      document.activeElement?.matches(':focus-visible') && element?.contains(document.activeElement)
    if (!enabled.value || locked.value || keyboardFocus || document.querySelector('dialog[open]')) {
      distance = 0
      collapse(false)
      return
    }
    if (y <= (element?.offsetHeight ?? 0)) {
      distance = 0
      collapse(false)
      return
    }
    distance = Math.sign(delta) === Math.sign(distance) ? distance + delta : delta
    if (Math.abs(distance) < 12) return
    collapse(distance > 0)
    distance = 0
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update)
  }

  watch([enabled, locked], () => {
    previous = Math.max(0, scrollY)
    distance = 0
    collapse(false)
  })
  onMounted(() => {
    previous = Math.max(0, scrollY)
    window.addEventListener('scroll', schedule, { passive: true, signal: lifetime.signal })
    header.value?.addEventListener('focusin', () => collapse(false), { signal: lifetime.signal })
  })
  onBeforeUnmount(() => {
    lifetime.abort()
    cancelAnimationFrame(frame)
  })
}
