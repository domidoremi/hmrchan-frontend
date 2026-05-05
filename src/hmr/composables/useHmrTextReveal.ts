import { nextTick, onBeforeUnmount, onMounted } from 'vue'

export function useHmrTextReveal(selector = '[data-hmr-text-reveal]') {
  let mutationObserver: MutationObserver | undefined

  function wrapRevealChildren(element: HTMLElement): void {
    if (element.dataset.hmrTextWrapped === 'true') return

    const nodes = [...element.childNodes].filter((node) => {
      return node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim())
    })
    if (nodes.length === 0) return

    const fragment = document.createDocumentFragment()
    nodes.forEach((node) => {
      const mask = document.createElement('span')
      const inner = document.createElement('span')
      mask.className = 'hmr-reveal-mask'
      inner.className = 'hmr-reveal-inner'
      inner.append(node)
      mask.append(inner)
      fragment.append(mask)
    })
    element.append(fragment)
    element.dataset.hmrTextWrapped = 'true'
  }

  function prepareText(): void {
    document.querySelectorAll<HTMLElement>(selector).forEach((element, index) => {
      if (element.classList.contains('hmr-text-ready')) return
      wrapRevealChildren(element)
      element.style.setProperty('--hmr-reveal-delay', `${index * 80}ms`)
      element.classList.add('hmr-text-ready')
    })
  }

  onMounted(async () => {
    await nextTick()
    prepareText()
    mutationObserver = new MutationObserver(prepareText)
    mutationObserver.observe(document.body, { childList: true, subtree: true })
  })

  onBeforeUnmount(() => {
    mutationObserver?.disconnect()
  })
}
