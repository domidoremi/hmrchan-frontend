export function createChunkReloadGuard(target: Window) {
  let leaving = false
  const onLeaving = () => {
    leaving = true
  }
  const onResume = () => {
    leaving = false
  }
  const resumeEvents = ['pageshow', 'pointerdown', 'keydown'] as const

  function usesCurrentContext(element: HTMLAnchorElement | HTMLFormElement) {
    const context =
      element.target || target.document.querySelector<HTMLBaseElement>('base[target]')?.target
    return !context || context.toLowerCase() === '_self'
  }
  function onLinkClick(event: MouseEvent) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return
    const link = event
      .composedPath()
      .find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement)
    if (!link || !link.hasAttribute('href') || link.hasAttribute('download')) return
    if (!usesCurrentContext(link)) return
    const destination = new URL(link.href, target.location.href)
    if (!['http:', 'https:'].includes(destination.protocol)) return
    const current = new URL(target.location.href)
    if (
      destination.hash &&
      destination.origin === current.origin &&
      destination.pathname === current.pathname &&
      destination.search === current.search
    )
      return
    onLeaving()
  }
  function onSubmit(event: SubmitEvent) {
    if (event.defaultPrevented) return
    const form = event.target
    if (!(form instanceof HTMLFormElement) || !usesCurrentContext(form)) return
    if (form.method.toLowerCase() === 'dialog') return
    onLeaving()
  }

  // Observe default navigation after the application's handlers have run.
  target.addEventListener('click', onLinkClick)
  target.addEventListener('submit', onSubmit)
  target.addEventListener('pagehide', onLeaving)
  for (const name of resumeEvents) target.addEventListener(name, onResume, true)

  return {
    canReload: () => !leaving,
    dispose() {
      target.removeEventListener('click', onLinkClick)
      target.removeEventListener('submit', onSubmit)
      target.removeEventListener('pagehide', onLeaving)
      for (const name of resumeEvents) target.removeEventListener(name, onResume, true)
    },
  }
}
