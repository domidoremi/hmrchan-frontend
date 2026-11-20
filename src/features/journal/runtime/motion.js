export const motionTiming = Object.freeze({
  reveal: 680,
  feedback: 440,
  dialog: 540,
  reader: 640,
  cover: 1100,
  scene: 1450,
  layout: 620,
  page: 420,
  ease: 'cubic-bezier(.18,.75,.22,1)',
})

export function createMotionPreference({ read, save, changed, signal }) {
  const system = window.matchMedia('(prefers-reduced-motion: reduce)')
  const stored = read('presentation-motion', '')
  let choice = stored === 'full' || stored === 'reduced' ? stored : 'auto'
  const get = () => (choice === 'auto' ? (system.matches ? 'reduced' : 'full') : choice)
  const sync = () => {
    document.body.dataset.motion = get()
    document.body.dataset.motionPreference = choice
    changed(get())
    document.dispatchEvent(new CustomEvent('journalmotionchange', { detail: get() }))
  }
  const set = (value) => {
    choice = value === 'full' || value === 'reduced' ? value : 'auto'
    save('presentation-motion', choice)
    sync()
  }
  system.addEventListener('change', sync, { signal })
  document.addEventListener('journalmotionrequest', (event) => set(event.detail), { signal })
  window.addEventListener(
    'storage',
    (event) => {
      if (event.key !== 'momichan-journal:presentation-motion') return
      const value = read('presentation-motion', 'auto')
      choice = value === 'full' || value === 'reduced' ? value : 'auto'
      sync()
    },
    { signal }
  )
  sync()
  return { get, set, choice: () => choice }
}
