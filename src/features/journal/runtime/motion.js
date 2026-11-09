export const motionTiming = Object.freeze({
  reveal: 560,
  feedback: 400,
  dialog: 480,
  layout: 620,
  page: 420,
  ease: 'cubic-bezier(.18,.75,.22,1)',
})

export function createMotionPreference({ read, save, changed, signal }) {
  const system = window.matchMedia('(prefers-reduced-motion: reduce)')
  const stored = read('presentation-motion', '')
  let choice = stored === 'full' || stored === 'reduced' ? stored : null
  const get = () => choice ?? (system.matches ? 'reduced' : 'full')
  const sync = () => {
    document.body.dataset.motion = get()
    changed(get())
    document.dispatchEvent(new CustomEvent('journalmotionchange', { detail: get() }))
  }
  const set = (value) => {
    choice = value === 'reduced' ? 'reduced' : 'full'
    save('presentation-motion', choice)
    sync()
  }
  system.addEventListener('change', sync, { signal })
  document.addEventListener('journalmotionrequest', (event) => set(event.detail), { signal })
  sync()
  return { get, set }
}
