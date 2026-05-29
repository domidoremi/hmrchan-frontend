import type { HmrAuthIntent } from '@/hmr/types'
import { resolvePostAuthRedirectTarget } from '@/router/authTargets'

export function startGoogleAuth(intent: HmrAuthIntent, returnTo = '/profile'): void {
  if (typeof window === 'undefined') return

  const params = new URLSearchParams({
    intent,
    return_to: resolvePostAuthRedirectTarget(returnTo),
  })
  window.location.href = `/api/v1/auth/google/start?${params.toString()}`
}
