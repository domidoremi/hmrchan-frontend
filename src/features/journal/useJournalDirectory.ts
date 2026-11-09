import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

export function useJournalDirectory() {
  const menuOpen = ref(false)
  const menuButton = ref<HTMLButtonElement | null>(null)
  const directory = ref<HTMLElement | null>(null)
  let desktop: MediaQueryList | undefined

  function closeMenu(restoreFocus = false) {
    if (!menuOpen.value) return
    menuOpen.value = false
    if (restoreFocus) menuButton.value?.focus({ preventScroll: true })
  }
  function escapeMenu(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !menuOpen.value) return
    event.preventDefault()
    closeMenu(true)
  }
  function leaveMenu(event: Event) {
    const target = event.target
    if (!(target instanceof Node)) return
    if (directory.value?.contains(target) || menuButton.value?.contains(target)) return
    closeMenu()
  }
  function resizeMenu() {
    if (desktop?.matches) closeMenu()
  }
  watch(
    menuOpen,
    (open) => {
      document.body.classList.toggle('journal-directory-open', open)
      directory.value?.toggleAttribute('inert', !open)
    },
    { flush: 'sync' }
  )
  onMounted(() => {
    desktop = window.matchMedia('(min-width: 801px)')
    desktop.addEventListener('change', resizeMenu)
    document.addEventListener('keydown', escapeMenu)
    document.addEventListener('focusin', leaveMenu)
    document.addEventListener('pointerdown', leaveMenu)
  })
  onBeforeUnmount(() => {
    desktop?.removeEventListener('change', resizeMenu)
    document.removeEventListener('keydown', escapeMenu)
    document.removeEventListener('focusin', leaveMenu)
    document.removeEventListener('pointerdown', leaveMenu)
    document.body.classList.remove('journal-directory-open')
  })
  return { menuOpen, menuButton, directory }
}
