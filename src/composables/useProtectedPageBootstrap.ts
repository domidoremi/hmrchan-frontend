export type ProtectedPageSecurityLevel = 'authenticated' | 'sensitive'

type ProtectedPageAuthStore = {
  isAuthenticated: boolean
  ensureAuthInitialized: () => Promise<void>
  ensureFreshAuthz: (securityLevel?: ProtectedPageSecurityLevel) => Promise<boolean>
}

export async function ensureProtectedPageReady(
  authStore: ProtectedPageAuthStore,
  securityLevel: ProtectedPageSecurityLevel = 'authenticated'
): Promise<boolean> {
  await authStore.ensureAuthInitialized()

  if (!authStore.isAuthenticated) {
    return false
  }

  return authStore.ensureFreshAuthz(securityLevel)
}
