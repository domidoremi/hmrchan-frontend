import { vi } from 'vitest'

export function prepareJournalDialogHost() {
  document.body.innerHTML =
    '<main id="main-content"></main><dialog id="app-dialog"><div class="dialog-head"><span class="eyebrow">MOMICHAN</span><button data-close>Close</button></div><div id="dialog-content"></div></dialog><div id="toast"></div>'
  const dialog = document.querySelector<HTMLDialogElement>('#app-dialog')!
  const content = document.querySelector<HTMLElement>('#dialog-content')!
  content.getAnimations = () => []
  dialog.showModal = vi.fn(() => {
    dialog.open = true
  })
  dialog.close = () => {
    dialog.open = false
    dialog.dispatchEvent(new Event('close'))
  }
  return { dialog, content }
}
