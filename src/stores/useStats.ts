import { defineStore } from 'pinia'
import { services } from '@/api/services'

export const useStatsStore = defineStore('stats', () => {
  async function getPlatformStats() {
    return services.stats.getPlatformStats()
  }

  return {
    getPlatformStats,
  }
})
