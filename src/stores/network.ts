import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 全局网络状态 Store
 * 用于跟踪在线/离线状态，并在需要的地方统一使用。
 */
export const useNetworkStore = defineStore('network', () => {
  const isOnline = ref<boolean>(typeof window === 'undefined' ? true : navigator.onLine)
  const lastChangeAt = ref<Date | null>(null)

  let initialized = false

  function init() {
    if (initialized || typeof window === 'undefined') return
    initialized = true

    const update = () => {
      isOnline.value = navigator.onLine
      lastChangeAt.value = new Date()
    }

    update()

    window.addEventListener('online', update)
    window.addEventListener('offline', update)
  }

  return {
    isOnline,
    lastChangeAt,
    init,
  }
})
