import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiClient, ApiError } from '@/api/client'

export interface AuthUser {
  id: string
  username: string
  email?: string
  avatar_url?: string
  full_name?: string
  roles?: string[]
}

interface SessionSummary {
  authenticated?: boolean
  user?: AuthUser
  session_expires_at?: string | null
}

interface RegisterResponse {
  user?: AuthUser
  message?: string
}

function normalizeError(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'auth.error'
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const sessionExpiresAt = ref<string | null>(null)
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => Boolean(user.value))
  const displayName = computed(() => user.value?.full_name || user.value?.username || 'HMRChan')
  const avatarUrl = computed(() => user.value?.avatar_url)

  function applySession(summary: SessionSummary | null): void {
    if (!summary?.authenticated || !summary.user) {
      user.value = null
      sessionExpiresAt.value = null
      return
    }

    user.value = summary.user
    sessionExpiresAt.value = summary.session_expires_at ?? null
  }

  async function resolveSession(): Promise<void> {
    if (isInitialized.value) return
    isLoading.value = true
    error.value = null

    try {
      const summary = await apiClient.post<SessionSummary>('/auth/session:resolve', {})
      applySession(summary)
    } catch {
      applySession(null)
    } finally {
      isLoading.value = false
      isInitialized.value = true
    }
  }

  async function login(username: string, password: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const summary = await apiClient.post<SessionSummary>('/auth/login', {
        username,
        email: username.includes('@') ? username : undefined,
        password,
      })
      applySession(summary)
      isInitialized.value = true
      return isAuthenticated.value
    } catch (loginError) {
      error.value = normalizeError(loginError)
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function register(username: string, email: string, password: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      await apiClient.post<RegisterResponse>('/auth/register', {
        username,
        email,
        password,
        verification_code: '000000',
      })
      return true
    } catch (registerError) {
      error.value = normalizeError(registerError)
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      await apiClient.post('/auth/logout', {})
    } catch {
      // Local session state should still be cleared when the facade is unavailable.
    } finally {
      applySession(null)
      isInitialized.value = true
      isLoading.value = false
    }
  }

  async function refreshMe(): Promise<void> {
    try {
      user.value = await apiClient.get<AuthUser>('/auth/me')
    } catch {
      applySession(null)
    }
  }

  return {
    user,
    sessionExpiresAt,
    isLoading,
    isInitialized,
    error,
    isAuthenticated,
    displayName,
    avatarUrl,
    resolveSession,
    login,
    register,
    logout,
    refreshMe,
  }
})
