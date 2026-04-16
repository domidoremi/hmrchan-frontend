import { computed, readonly, ref, watch, type WatchStopHandle } from 'vue'
import type { AuthUser } from '@/stores/auth'

type AuthStoreModule = typeof import('@/stores/auth')
type AuthStore = ReturnType<AuthStoreModule['useAuthStore']>

const surfaceUser = ref<AuthUser | null>(null)
const surfaceInitialized = ref(false)
const surfaceBootstrapping = ref(false)
const surfaceIsAuthenticated = computed(() => Boolean(surfaceUser.value))

let authStorePromise: Promise<AuthStore> | null = null
let stopSurfaceSync: WatchStopHandle | null = null
let disposeAuthListener: (() => void) | null = null

function syncSurfaceFromStore(store: AuthStore): void {
  stopSurfaceSync?.()
  stopSurfaceSync = watch(
    () => ({
      user: store.user,
      isInitialized: store.isInitialized,
    }),
    ({ user, isInitialized }) => {
      surfaceUser.value = user
      surfaceInitialized.value = isInitialized
    },
    { immediate: true }
  )

  if (!disposeAuthListener) {
    disposeAuthListener = store.setupAuthListener()
  }
}

async function loadAuthStore(): Promise<AuthStore> {
  if (!authStorePromise) {
    authStorePromise = import('@/stores/auth').then(({ useAuthStore }) => {
      const store = useAuthStore()
      syncSurfaceFromStore(store)
      return store
    })
  }

  return authStorePromise
}

export function useAuthSurface() {
  return {
    user: readonly(surfaceUser),
    isAuthenticated: readonly(surfaceIsAuthenticated),
    isInitialized: readonly(surfaceInitialized),
    isBootstrapping: readonly(surfaceBootstrapping),
  }
}

export async function ensureAuthStoreLoaded(
  options: { initialize?: boolean } = {}
): Promise<AuthStore> {
  const store = await loadAuthStore()

  if (options.initialize && !store.isInitialized) {
    surfaceBootstrapping.value = true
    try {
      await store.ensureAuthInitialized()
    } finally {
      surfaceBootstrapping.value = false
      surfaceInitialized.value = store.isInitialized
      surfaceUser.value = store.user
    }
  }

  return store
}

export async function logoutFromAuthSurface(): Promise<void> {
  const store = await ensureAuthStoreLoaded()
  await store.logout()
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopSurfaceSync?.()
    stopSurfaceSync = null
    disposeAuthListener?.()
    disposeAuthListener = null
    authStorePromise = null
    surfaceUser.value = null
    surfaceInitialized.value = false
    surfaceBootstrapping.value = false
  })
}
