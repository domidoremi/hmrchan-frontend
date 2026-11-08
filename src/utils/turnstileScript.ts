const SCRIPT_SELECTOR = 'script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]'
const SCRIPT_TIMEOUT_MS = 20000
let loading: Promise<void> | null = null

export function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (loading) return loading

  loading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR)
    const script = existing ?? document.createElement('script')
    const finish = (error?: Error) => {
      clearTimeout(timeout)
      clearInterval(poll)
      script.removeEventListener('error', onError)
      if (error) {
        script.remove()
        reject(error)
      } else {
        resolve()
      }
    }
    const onError = () => finish(new Error('Failed to load Turnstile script'))
    const timeout = window.setTimeout(
      () => finish(new Error('Turnstile script API is unavailable')),
      SCRIPT_TIMEOUT_MS
    )
    // Polling also covers an existing script whose load event has already fired.
    const poll = window.setInterval(() => {
      if (window.turnstile) finish()
    }, 50)
    script.addEventListener('error', onError, { once: true })
    if (!existing) {
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
  }).finally(() => {
    loading = null
  })
  return loading
}
