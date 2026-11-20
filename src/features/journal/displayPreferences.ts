export type JournalTextSize = 'standard' | 'large'
export type JournalDensity = 'standard' | 'compact'

const keys = {
  textSize: 'momichan-journal:text-size',
  density: 'momichan-journal:archive-density',
} as const

type PreferenceKey = keyof typeof keys

export function readDisplayPreference(key: 'textSize'): JournalTextSize
export function readDisplayPreference(key: 'density'): JournalDensity
export function readDisplayPreference(key: PreferenceKey) {
  try {
    const value = localStorage.getItem(keys[key])
    return key === 'textSize'
      ? value === 'large'
        ? 'large'
        : 'standard'
      : value === 'compact'
        ? 'compact'
        : 'standard'
  } catch {
    return 'standard'
  }
}

function applyPreference(key: PreferenceKey, value: string) {
  if (key === 'textSize') {
    document.body.dataset['textSize'] = value
    document.body.classList.toggle('reading-large', value === 'large')
  } else document.body.dataset['archiveDensity'] = value
}

export function setDisplayPreference(key: 'textSize', value: JournalTextSize): void
export function setDisplayPreference(key: 'density', value: JournalDensity): void
export function setDisplayPreference(key: PreferenceKey, value: string) {
  applyPreference(key, value)
  try {
    localStorage.setItem(keys[key], value)
  } catch {
    // The selected preference still applies for this visit.
  }
  document.dispatchEvent(new Event('journaldisplaychange'))
}

export function installDisplayPreferences(signal: AbortSignal) {
  applyPreference('textSize', readDisplayPreference('textSize'))
  applyPreference('density', readDisplayPreference('density'))
  window.addEventListener(
    'storage',
    (event) => {
      if (event.key === keys.textSize)
        applyPreference('textSize', readDisplayPreference('textSize'))
      else if (event.key === keys.density)
        applyPreference('density', readDisplayPreference('density'))
      else return
      document.dispatchEvent(new Event('journaldisplaychange'))
    },
    { signal }
  )
}
