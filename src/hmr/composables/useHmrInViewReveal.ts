import { onBeforeUnmount, onMounted } from 'vue'

export function useHmrInViewReveal(rootSelector = '[data-hmr-reveal]') {
  let observer: IntersectionObserver | undefined
  let mutationObserver: MutationObserver | undefined
  const observedTargets = new WeakSet<Element>()

  function observeTargets(): void {
    const targets = [...document.querySelectorAll<HTMLElement>(rootSelector)]
    targets.forEach((target) => {
      if (!observedTargets.has(target)) {
        observedTargets.add(target)
        observer?.observe(target)
      }
    })
  }

  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-inview')
            observer?.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.2 }
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
