/**
 * Session Management Composable
 * Handles device session operations with loading states and error handling
 */

import { ref, computed } from 'vue'
import { deviceService, type Device } from '@/api'
import { useToastStore } from '@/stores/toast'
import { useI18n } from 'vue-i18n'

export function useSessionManagement() {
  const { t } = useI18n()
  const toastStore = useToastStore()

  const sessions = ref<Device[]>([])
  const isLoading = ref(true)
  const isRevoking = ref(false)

  const otherSessionsCount = computed(() => sessions.value.filter((s) => !s.is_current).length)

  async function fetchSessions() {
    isLoading.value = true
    try {
      const response = await deviceService.getDevices()
      let devices = response.devices ?? []
      const hasCurrentDevice = devices.some((device) => device.is_current)

      if (!hasCurrentDevice) {
        try {
          const currentDevice = await deviceService.getCurrentDevice({ skipErrorToast: true })
          const currentIndex = devices.findIndex((device) => device.id === currentDevice.id)
          if (currentIndex >= 0) {
            devices[currentIndex] = { ...devices[currentIndex], ...currentDevice, is_current: true }
          } else {
            devices = [{ ...currentDevice, is_current: true }, ...devices]
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('[Devices] Failed to fetch current device:', error)
          }
        }
      }

      sessions.value = devices
    } catch {
      toastStore.error(t('devices.error.fetchFailed'))
    } finally {
      isLoading.value = false
    }
  }

  async function revokeSession(sessionId: number) {
    if (!confirm(t('devices.confirm.revoke'))) return

    try {
      await deviceService.revokeDevice(sessionId)
      toastStore.success(t('devices.success.revoked'))
      await fetchSessions()
    } catch {
      toastStore.error(t('devices.error.revokeFailed'))
    }
  }

  async function revokeAllOthers() {
    if (!confirm(t('devices.confirm.revokeAll'))) return

    isRevoking.value = true
    try {
      await deviceService.revokeAllDevices()
      toastStore.success(t('devices.success.revokedAll'))
      await fetchSessions()
    } catch {
      toastStore.error(t('devices.error.revokeAllFailed'))
    } finally {
      isRevoking.value = false
    }
  }

  async function toggleTrust(session: Device) {
    try {
      if (session.is_trusted) {
        await deviceService.untrustDevice(session.id)
      } else {
        await deviceService.trustDevice(session.id)
      }
      toastStore.success(
        session.is_trusted ? t('devices.success.untrusted') : t('devices.success.trusted')
      )
      await fetchSessions()
    } catch {
      toastStore.error(t('devices.error.trustFailed'))
    }
  }

  async function updateDeviceName(sessionId: number, deviceName: string) {
    if (!deviceName.trim()) {
      toastStore.error(t('devices.error.emptyName'))
      return false
    }

    try {
      await deviceService.updateDeviceName(sessionId, deviceName.trim())
      toastStore.success(t('devices.success.nameUpdated'))
      await fetchSessions()
      return true
    } catch {
      toastStore.error(t('devices.error.updateNameFailed'))
      return false
    }
  }

  return {
    sessions,
    isLoading,
    isRevoking,
    otherSessionsCount,
    fetchSessions,
    revokeSession,
    revokeAllOthers,
    toggleTrust,
    updateDeviceName,
  }
}
