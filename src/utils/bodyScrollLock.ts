let lockCount = 0
let originalOverflow: string | null = null

export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return
  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow
  }
  lockCount += 1
  document.body.style.overflow = 'hidden'
}

export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.body.style.overflow = originalOverflow ?? ''
    originalOverflow = null
  }
}
