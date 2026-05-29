import { onBeforeUnmount, onMounted } from 'vue'

export function useHmrInViewReveal(rootSelector = '[data-hmr-reveal]') {
  let observer: IntersectionObserver | undefined
  let mutationObserver: MutationObserver | undefined
  const observedTargets = new WeakSet<Element>()

  function markInView(target: Element): void {
    target.classList.add('is-inview')
  }

  function observeTargets(): void {
    const targets = [...document.querySelectorAll<HTMLElement>(rootSelector)]
    targets.forEach((target) => {
      if (!observedTargets.has(target)) {
        observedTargets.add(target)
        if (observer) {
          observer.observe(target)
        } else {
          markInView(target)
        }
      }
    })
  }

  onMounted(() => {
    if (typeof window.IntersectionObserver !== 'function') {
      observeTargets()
      mutationObserver = new MutationObserver(observeTargets)
      mutationObserver.observe(document.body, { childList: true, subtree: true })
      return
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            markInView(entry.target)
            observer?.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 }
    )

    observeTargets()
    mutationObserver = new MutationObserver(observeTargets)
    mutationObserver.observe(document.body, { childList: true, subtree: true })
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    mutationObserver?.disconnect()
  })
}
