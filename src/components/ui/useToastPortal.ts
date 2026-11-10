import { onBeforeUnmount, onMounted, shallowRef } from 'vue'

export function useToastPortal() {
  const portalTarget = shallowRef<HTMLElement | string>('body')
  const openedDialogs: HTMLDialogElement[] = []
  function syncPortal(event?: Event) {
    // Native dialogs enter the top layer in opening order, independent of DOM order.
    const opened = event?.target
    if (opened instanceof HTMLDialogElement && opened.open) {
      const index = openedDialogs.indexOf(opened)
      if (index !== -1) openedDialogs.splice(index, 1)
      openedDialogs.push(opened)
    }
    for (let index = openedDialogs.length - 1; index >= 0; index--) {
      const dialog = openedDialogs[index]
      if (!dialog?.open || !dialog.isConnected) openedDialogs.splice(index, 1)
    }
    portalTarget.value =
      openedDialogs.at(-1) ??
      document.activeElement?.closest<HTMLDialogElement>('dialog[open]') ??
      [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1) ??
      document.body
  }
  function onDialogChange(event: Event) {
    if (event.target instanceof HTMLDialogElement) syncPortal(event)
  }
  onMounted(() => {
    syncPortal()
    document.addEventListener('toggle', onDialogChange, true)
    document.addEventListener('close', onDialogChange, true)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('toggle', onDialogChange, true)
    document.removeEventListener('close', onDialogChange, true)
  })
  return { portalTarget, syncPortal }
}
