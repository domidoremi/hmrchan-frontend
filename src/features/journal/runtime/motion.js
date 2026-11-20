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
  const normalize = (value) => (value === 'auto' || value === 'reduced' ? value : 'full')
  let choice = normalize(read('presentation-motion', 'full'))
  const get = () => (choice === 'auto' ? (system.matches ? 'reduced' : 'full') : choice)
  const sync = () => {
    document.body.dataset.motion = get()
    document.body.dataset.motionPreference = choice
    changed(get())
    document.dispatchEvent(new CustomEvent('journalmotionchange', { detail: get() }))
  }
  const set = (value) => {
    choice = normalize(value)
    save('presentation-motion', choice)
    sync()
  }
  system.addEventListener('change', sync, { signal })
  document.addEventListener('journalmotionrequest', (event) => set(event.detail), { signal })
  window.addEventListener(
    'storage',
    (event) => {
      if (event.key !== 'momichan-journal:presentation-motion') return
      choice = normalize(read('presentation-motion', 'full'))
      sync()
    },
    { signal }
  )
  sync()
  return { get, set, choice: () => choice }
}
