import { motionTiming } from './motion.js'

export function installReaderMotion({ animate, fullMotion, listen }) {
  const sessions = new Map()
  const layers = new Set()
  const closing = new Map()
  let captured
  const finished = (animation) => animation?.finished.catch(() => {}) ?? Promise.resolve()
  const sourceImage = (opener) =>
    opener?.querySelector('img') ||
    opener
      ?.closest('.post-card, .film-frame, .cover-sheet, .search-result')
      ?.querySelector('img') ||
    opener?.closest('.spatial-cover')?.querySelector('.cover-sheet.is-current img') ||
    opener
      ?.closest('.idol-feature')
      ?.querySelector('.idol-photo-take:not([inert]) .idol-photo-subject img') ||
    opener?.closest('.archive-inspector')?.querySelector('.preview-media img')
  function capture(event) {
    const opener = event.target.closest?.(
      '[data-open], [data-dialog-post], [data-select-post], [data-dialog-gallery], [data-preview-open]'
    )
    const image = sourceImage(opener)
    captured =
      image?.naturalWidth && image.isConnected
        ? { image, bounds: image.getBoundingClientRect(), at: performance.now() }
        : undefined
  }
  listen(document, 'click', capture, { capture: true })
  listen(
    document,
    'keydown',
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') capture(event)
    },
    { capture: true }
  )

  function fit(image, bounds, width, height) {
    const style = getComputedStyle(image)
    const factor =
      style.objectFit === 'contain'
        ? Math.min(bounds.width / width, bounds.height / height)
        : Math.max(bounds.width / width, bounds.height / height)
    const fittedWidth = width * factor,
      fittedHeight = height * factor
    const [horizontal = '50%', vertical = '50%'] = style.objectPosition.split(/\s+/)
    const position = (value, remaining) => {
      if (['center', 'left', 'top', 'right', 'bottom'].includes(value))
        return (
          remaining * (value === 'center' ? 0.5 : value === 'right' || value === 'bottom' ? 1 : 0)
        )
      return value.endsWith('%') ? (remaining * parseFloat(value)) / 100 : parseFloat(value) || 0
    }
    return {
      width: fittedWidth,
      height: fittedHeight,
      left: position(horizontal, bounds.width - fittedWidth),
      top: position(vertical, bounds.height - fittedHeight),
    }
  }
  function radius(image) {
    const style = getComputedStyle(image)
    if (style.borderRadius !== '0px') return style.borderRadius
    const clip = image.closest('.journal-image')
    return clip ? getComputedStyle(clip).borderRadius : style.borderRadius
  }
  function fly(image, from, to, dialog, targetImage, fromState = {}) {
    if (
      !fullMotion() ||
      !image ||
      !from?.width ||
      !from.height ||
      !to?.width ||
      !to.height ||
      typeof HTMLElement.prototype.showPopover !== 'function'
    )
      return null
    const width = image.naturalWidth || targetImage.naturalWidth
    const height = image.naturalHeight || targetImage.naturalHeight
    if (!width || !height) return null
    const first = fromState.image || fit(image, from, width, height)
    const last = fit(targetImage, to, width, height)
    const portal = document.createElement('div')
    portal.className = 'reader-transition-layer'
    portal.setAttribute('aria-hidden', 'true')
    portal.setAttribute('popover', 'manual')
    portal.dataset.motionLayer = 'reader'
    const node = document.createElement('div')
    node.className = 'reader-flight'
    node.style.cssText = `left:${to.left}px;top:${to.top}px;width:${to.width}px;height:${to.height}px`
    const picture = image.cloneNode()
    picture.className = 'reader-flight-image'
    picture.alt = ''
    picture.removeAttribute('id')
    picture.removeAttribute('loading')
    picture.removeAttribute('srcset')
    picture.removeAttribute('sizes')
    picture.src = image.currentSrc || image.src
    picture.style.cssText = `left:${last.left}px;top:${last.top}px;width:${last.width}px;height:${last.height}px`
    node.append(picture)
    portal.append(node)
    dialog.append(portal)
    portal.showPopover()
    let animation, crop
    const cleanup = () => {
      animation?.cancel()
      crop?.cancel()
      portal.remove()
      layers.delete(cleanup)
    }
    layers.add(cleanup)
    animation = animate(
      node,
      [
        {
          translate: `${from.left - to.left}px ${from.top - to.top}px`,
          scale: `${from.width / to.width} ${from.height / to.height}`,
          borderRadius: fromState.radius || radius(image),
          backgroundColor: fromState.background || getComputedStyle(image).backgroundColor,
        },
        {
          translate: '0px 0px',
          scale: '1 1',
          borderRadius: radius(targetImage),
          backgroundColor: getComputedStyle(targetImage).backgroundColor,
        },
      ],
      { id: 'image-morph', duration: motionTiming.reader, fill: 'both' }
    )
    if (!animation) {
      cleanup()
      return null
    }
    const interpolate = (a, b, progress) => a + (b - a) * progress
    // Counter-scale the photograph as the crop box changes, preserving its proportions.
    const keyframes = Array.from({ length: 25 }, (_, index) => {
      const progress = index / 24
      const x = interpolate(from.width / to.width, 1, progress)
      const y = interpolate(from.height / to.height, 1, progress)
      const fittedWidth = interpolate(first.width, last.width, progress)
      const fittedHeight = interpolate(first.height, last.height, progress)
      const left = interpolate(first.left, last.left, progress) / x - last.left
      const top = interpolate(first.top, last.top, progress) / y - last.top
      return {
        offset: progress,
        transform: `translate(${left}px,${top}px) scale(${fittedWidth / (last.width * x)},${fittedHeight / (last.height * y)})`,
      }
    })
    crop = animate(picture, keyframes, {
      id: 'image-crop',
      duration: motionTiming.reader,
      fill: 'both',
    })
    Promise.all([animation.ready, crop?.ready])
      .then(() => {
        if (portal.isConnected && crop && animation.startTime !== null)
          crop.startTime = animation.startTime
      })
      .catch(() => {})
    finished(animation).finally(cleanup)
    return { animation, node, picture, cancel: cleanup }
  }
  let previewFlight
  function stopPreview() {
    if (!previewFlight) return
    previewFlight.flight.cancel()
    previewFlight.target.style.removeProperty('visibility')
    previewFlight = undefined
  }
  function preview(source, target) {
    stopPreview()
    if (!fullMotion() || !source?.naturalWidth || !target || document.querySelector('dialog[open]'))
      return
    const from = source.getBoundingClientRect()
    const to = target.getBoundingClientRect()
    const visible = (rect) =>
      rect.top < innerHeight && rect.bottom > 0 && rect.left < innerWidth && rect.right > 0
    if (!visible(from) || !visible(to)) return
    const flight = fly(source, from, to, document.body, target)
    if (!flight) return
    target.style.visibility = 'hidden'
    previewFlight = { flight, target }
    finished(flight.animation).finally(() => {
      if (previewFlight?.flight === flight) stopPreview()
    })
  }
  listen(window, 'scroll', stopPreview, { capture: true, passive: true })
  listen(window, 'resize', stopPreview, { passive: true })
  function clearDialogFlight(dialog) {
    closing.delete(dialog)
    const session = sessions.get(dialog)
    sessions.delete(dialog)
    session?.transition?.cancel()
    session?.image?.style.removeProperty('visibility')
  }
  function dialog(dialog) {
    stopPreview()
    const origin = captured
    captured = undefined
    const image = dialog.querySelector('.detail-photo')
    if (!image || !origin || performance.now() - origin.at > 1500 || !fullMotion()) return
    const session = { source: origin.image, image, transition: null, closing: false }
    sessions.set(dialog, session)
    const begin = () => {
      if (
        sessions.get(dialog) !== session ||
        session.closing ||
        session.suspended ||
        !dialog.open ||
        !fullMotion()
      )
        return
      const bounds = session.image.getBoundingClientRect()
      session.transition = fly(origin.image, origin.bounds, bounds, dialog, session.image)
      if (!session.transition) return
      session.image.style.visibility = 'hidden'
      finished(session.transition.animation).finally(() => {
        if (!session.closing) session.image?.style.removeProperty('visibility')
      })
    }
    const bounds = image.getBoundingClientRect()
    if (bounds.width && bounds.height) begin()
    else
      image
        .decode()
        .catch(() => {})
        .then(begin)
  }
  function refreshDialog(dialog) {
    const session = sessions.get(dialog)
    if (!session || session.closing) return
    const image = dialog.querySelector('.detail-photo')
    if (!image) {
      clearDialogFlight(dialog)
      return
    }
    session.image = image
    if (session.transition?.node.isConnected) image.style.visibility = 'hidden'
  }
  function closeDialog(dialog, immediate, onClosed) {
    const close = () => {
      dialog.close()
      if (!dialog.open) onClosed?.()
    }
    if (closing.has(dialog)) {
      if (immediate) {
        clearDialogFlight(dialog)
        close()
      }
      return true
    }
    const session = sessions.get(dialog)
    if (immediate || !fullMotion()) {
      clearDialogFlight(dialog)
      close()
      return true
    }
    if (session) session.closing = true
    const token = {}
    closing.set(dialog, token)
    let reverse
    const from = session?.transition?.node.isConnected
      ? session.transition.node.getBoundingClientRect()
      : session?.image?.getBoundingClientRect()
    const fromState = {}
    if (session?.transition?.node.isConnected) {
      const picture = session.transition.picture.getBoundingClientRect()
      const style = getComputedStyle(session.transition.node)
      fromState.image = {
        width: picture.width,
        height: picture.height,
        left: picture.left - from.left,
        top: picture.top - from.top,
      }
      fromState.radius = style.borderRadius
      fromState.background = style.backgroundColor
    }
    session?.transition?.cancel()
    if (session?.source.isConnected) {
      const to = session.source.getBoundingClientRect()
      if (to.bottom > 0 && to.top < innerHeight && to.right > 0 && to.left < innerWidth)
        reverse = fly(session.image, from, to, dialog, session.source, fromState)
      if (reverse) session.image.style.visibility = 'hidden'
    }
    if (session) session.transition = reverse
    const body = dialog.querySelector('#dialog-content')
    const current = getComputedStyle(body)
    const fade = animate(
      body,
      [
        { opacity: current.opacity, transform: current.transform },
        { opacity: 0, transform: 'translateY(.75rem) scale(.99)' },
      ],
      { id: 'dialog', duration: reverse ? motionTiming.reader : 240, fill: 'both' }
    )
    Promise.all([finished(fade), finished(reverse?.animation)]).finally(() => {
      if (closing.get(dialog) !== token) return
      clearDialogFlight(dialog)
      fade?.cancel()
      if (dialog.open) close()
    })
    return true
  }
  function cancel() {
    stopPreview()
    captured = undefined
    for (const cleanup of [...layers]) cleanup()
    for (const session of sessions.values()) {
      session.suspended = true
      session.image?.style.removeProperty('visibility')
    }
  }
  const appDialog = document.querySelector('#app-dialog')
  if (appDialog)
    listen(appDialog, 'close', () => {
      if (!appDialog.open) clearDialogFlight(appDialog)
    })
  listen(window, 'pagehide', cancel)
  return {
    preview,
    stopPreview,
    dialog,
    refreshDialog,
    clearDialogFlight,
    closeDialog,
    cancel,
    dispose() {
      cancel()
      sessions.clear()
      closing.clear()
    },
  }
}
