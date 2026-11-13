export function prepareDialogLinks(dialog) {
  for (const link of dialog.querySelectorAll('a[href]'))
    if (!link.hasAttribute('tabindex')) link.setAttribute('tabindex', '0')
}

export function trapDialogTab(dialog, event) {
  if (
    !dialog.open ||
    event.key !== 'Tab' ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    event.defaultPrevented
  )
    return
  const elements = [
    ...dialog.querySelectorAll(
      'a[href],button,input,select,textarea,[tabindex],[contenteditable="true"]'
    ),
  ].filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(':disabled') &&
      !element.closest('[inert]') &&
      element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== 'hidden'
  )
  if (!elements.length) {
    event.preventDefault()
    return
  }
  const index = elements.indexOf(dialog.ownerDocument.activeElement)
  if (index < 0 || (event.shiftKey ? index === 0 : index === elements.length - 1)) {
    event.preventDefault()
    elements[event.shiftKey ? elements.length - 1 : 0].focus()
  }
}
