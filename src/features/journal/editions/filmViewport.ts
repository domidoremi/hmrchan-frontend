// Keep the whole album readable before a vertical gesture becomes horizontal browsing.
export function createFilmViewport(track: HTMLElement) {
  const section = track.closest<HTMLElement>('.editorial-film')!
  const shell = track.closest('.journal-shell')
  const header = shell?.querySelector<HTMLElement>('.edition-header')
  const directory = shell?.querySelector<HTMLElement>('.editorial-contents')
  const mobileNavigation = shell?.querySelector<HTMLElement>('.mobile-navigation')
  const heading = section.querySelector<HTMLElement>('.film-heading')!
  const position = section.querySelector<HTMLElement>('.film-position')!

  function bounds() {
    const headerBottom = header?.getBoundingClientRect().bottom ?? 0
    const directoryBottom = directory
      ? (Number.parseFloat(getComputedStyle(directory).top) || headerBottom) +
        directory.getBoundingClientRect().height
      : 0
    const mobile = mobileNavigation?.getBoundingClientRect()
    return {
      top: Math.max(0, headerBottom, directoryBottom),
      bottom: mobile?.height ? Math.min(innerHeight, mobile.top) : innerHeight,
    }
  }
  function readable() {
    const { top, bottom } = bounds()
    return (
      heading.getBoundingClientRect().top >= top - 1 &&
      position.getBoundingClientRect().bottom <= bottom + 1
    )
  }
  function refresh() {
    const { top, bottom } = bounds()
    section.style.setProperty('--film-viewport-top', `${Math.ceil(top)}px`)
    section.style.setProperty('--film-viewport-bottom', `${Math.ceil(innerHeight - bottom)}px`)
  }
  function canBrowse(event: WheelEvent) {
    if (readable()) return true
    const { top, bottom } = bounds()
    const rect = section.getBoundingClientRect()
    // Small screens and enlarged text retain native page scrolling when the panel cannot fit.
    if (rect.height > bottom - top + 1) return false
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1
    const delta = event.deltaY * unit
    const distance = rect.top - top
    return delta > 0 ? distance > 0 && distance <= delta : distance < 0 && distance >= delta
  }
  function align() {
    if (readable()) return false
    window.scrollTo({
      top: window.scrollY + section.getBoundingClientRect().top - bounds().top,
      behavior: 'instant',
    })
    return true
  }
  return {
    refresh,
    canBrowse,
    align,
    chrome: [header, directory, mobileNavigation].filter((item): item is HTMLElement => !!item),
  }
}
