import { defineStore } from 'pinia'
import { services } from '@/api/services'
import type { UUID } from '@/types'

export const useUsersStore = defineStore('users', () => {
  async function getStats(userId: UUID) {
    return services.users.getStats(userId)
  }

  async function updateUser(userId: UUID, data: { full_name?: string; email?: string }) {
    return services.users.updateUser(userId, data)
  }

  async function resetPassword(
    userId: UUID,
    data: { current_password: string; new_password: string },
  ) {
    return services.users.resetPassword(userId, data)
  }

  async function deleteAccount(userId: UUID, password: string) {
    return services.users.deleteAccount(userId, password)
  }

  return {
    getStats,
    updateUser,
    resetPassword,
    deleteAccount,
  }
})
