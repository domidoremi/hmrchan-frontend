import type { HmrAuthIntent } from '@/hmr/types'

export function startGoogleAuth(intent: HmrAuthIntent, returnTo = '/profile'): void {
  if (typeof window === 'undefined') return

  const params = new URLSearchParams({
    intent,
    return_to: returnTo,
  })
  window.location.href = `/api/v1/auth/google/start?${params.toString()}`
}
