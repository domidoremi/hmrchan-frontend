export interface GoogleAuthEnv {
  GOOGLE_AUTH_ENABLED?: string
}

export function isEnabledEnvValue(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export function isGoogleAuthEnabled(env: GoogleAuthEnv): boolean {
  return isEnabledEnvValue(env.GOOGLE_AUTH_ENABLED)
}
