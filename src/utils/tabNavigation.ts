export function handleTabListKeydown(event: KeyboardEvent): void {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  const list = event.currentTarget
  const source = event.target
  if (!(list instanceof HTMLElement) || !(source instanceof HTMLElement)) return
  const current = source.closest<HTMLElement>('[role="tab"]')
  const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]')).filter(
    (tab) => !tab.disabled && tab.getAttribute('aria-disabled') !== 'true'
  )
  const index = current ? tabs.indexOf(current as HTMLButtonElement) : -1
  if (index < 0 || !tabs.length) return
  const direction = getComputedStyle(list).direction === 'rtl' ? -1 : 1
  const delta = (event.key === 'ArrowRight' ? 1 : -1) * direction
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (index + delta + tabs.length) % tabs.length
  event.preventDefault()
  tabs[next]?.focus({ preventScroll: true })
  tabs[next]?.click()
}
