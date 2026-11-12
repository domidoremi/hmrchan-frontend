import { watch, type Ref, type WatchSource } from 'vue'

export function useBrowseFilterFocus(
  filters: WatchSource<unknown>,
  searchInput: Readonly<Ref<HTMLInputElement | undefined>>
) {
  let trigger: HTMLElement | undefined

  // Check focus before DOM updates, while the original control is still connected.
  watch(filters, () => {
    if (trigger && trigger.ownerDocument.activeElement !== trigger) trigger = undefined
  })
  // Restore focus only after the filter update removes that control.
  watch(
    filters,
    () => {
      if (!trigger || trigger.isConnected) return
      const ownerDocument = trigger.ownerDocument
      trigger = undefined
      if (ownerDocument.activeElement === ownerDocument.body && searchInput.value?.isConnected) {
        searchInput.value.focus()
      }
    },
    { flush: 'post' }
  )

  return (event: MouseEvent) => {
    const control = event.currentTarget
    trigger =
      control instanceof HTMLElement && control.ownerDocument.activeElement === control
        ? control
        : undefined
  }
}
