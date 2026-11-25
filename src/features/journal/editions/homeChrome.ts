export function headerInset(header: HTMLElement | null | undefined, reserve = false) {
  if (!header || (!reserve && header.dataset['collapsed'] === 'true')) return 0
  return (
    (header.offsetHeight || header.getBoundingClientRect().height) +
    (Number.parseFloat(getComputedStyle(header).top) || 0)
  )
}
