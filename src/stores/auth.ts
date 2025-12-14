/**
 * Auth Store - 认证状态管理
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { User } from '@/types'

export const useAuthStore = defineStore(
  'auth',
  () => {
    const user = ref<User | null>(null)
    const token = ref<string | null>(null)
    const isLoading = ref(false)

    const isAuthenticated = computed(() => !!user.value && !!token.value)

    async function login(email: string, password: string) {
      isLoading.value = true
      try {
        // TODO: Implement actual API call
        const response = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        })

        if (!response.ok) {
          throw new Error('Login failed')
        }

        const data = await response.json()
        user.value = data.user
        token.value = data.access_token
        return { success: true }
      } catch (error) {
        return { success: false, error }
      } finally {
        isLoading.value = false
      }
    }

    async function register(username: string, email: string, password: string) {
      isLoading.value = true
      try {
        const response = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        })

        if (!response.ok) {
          throw new Error('Registration failed')
        }

        return { success: true }
      } catch (error) {
        return { success: false, error }
      } finally {
        isLoading.value = false
      }
    }

    function logout() {
      user.value = null
      token.value = null
    }

    return {
      user,
      token,
      isLoading,
      isAuthenticated,
      login,
      register,
      logout,
    }
  },
  {
    persist: {
      pick: ['user', 'token'],
    },
  },
)
