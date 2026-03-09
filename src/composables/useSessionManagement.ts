/**
 * Session Management Composable
 * Handles device session operations with loading states and error handling
 */

import { ref, computed, getCurrentScope, onScopeDispose } from 'vue'
import { deviceService, type Device } from '@/api'
import { useToastStore } from '@/stores/toast'
import { useI18n } from 'vue-i18n'
import { isVerificationCancelledError } from '@/api/verificationBridge'

/**
 * 按设备指纹去重，保留每个物理设备最近活跃的会话
 * 没有 fingerprint 的会话保持原样
 */
function deduplicateByDevice(devices: Device[]): Device[] {
  const byFingerprint = new Map<string, Device>()
  const noFingerprint: Device[] = []

  for (const device of devices) {
    const fp = device.fingerprint
    if (!fp) {
      noFingerprint.push(device)
      continue
    }

    const existing = byFingerprint.get(fp)
    if (!existing) {
      byFingerprint.set(fp, device)
      continue
    }

    // 保留 is_current 的会话，否则保留最近活跃的
    if (device.is_current) {
      byFingerprint.set(fp, device)
    } else if (!existing.is_current) {
      const existingTime = existing.last_active_at ?? existing.last_used_at ?? ''
      const deviceTime = device.last_active_at ?? device.last_used_at ?? ''
      if (deviceTime > existingTime) {
        byFingerprint.set(fp, device)
      }
    }
  }

  return [...byFingerprint.values(), ...noFingerprint]
}

export function useSessionManagement() {
  const { t } = useI18n()
  const toastStore = useToastStore()

  const sessions = ref<Device[]>([])
  const isLoading = ref(true)
  const isRevoking = ref(false)
  let sessionsController: AbortController | null = null
  let sessionsRequestToken = 0

  const otherSessionsCount = computed(() => sessions.value.filter((s) => !s.is_current).length)

  function abortFetchSessions() {
    sessionsController?.abort()
    sessionsController = null
  }

  async function fetchSessions() {
    abortFetchSessions()
    const controller = new AbortController()
    sessionsController = controller
    const requestToken = ++sessionsRequestToken
    isLoading.value = true
    try {
      const response = await deviceService.getDevices({
        signal: controller.signal,
        skipErrorToast: true,
      })
      if (controller.signal.aborted || requestToken !== sessionsRequestToken) return
      let devices = response.devices ?? []
      const hasCurrentDevice = devices.some((device) => device.is_current)

      if (!hasCurrentDevice) {
        try {
          const currentDevice = await deviceService.getCurrentDevice({
            signal: controller.signal,
            skipErrorToast: true,
          })
          if (controller.signal.aborted || requestToken !== sessionsRequestToken) return
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

      sessions.value = deduplicateByDevice(devices)
    } catch {
      if (controller.signal.aborted || requestToken !== sessionsRequestToken) return
      toastStore.error(t('devices.error.fetchFailed'))
    } finally {
      if (requestToken === sessionsRequestToken) {
        isLoading.value = false
        if (sessionsController === controller) {
          sessionsController = null
        }
      }
    }
  }

  async function revokeSession(sessionId: number) {
    if (!confirm(t('devices.confirm.revoke'))) return

    try {
      await deviceService.revokeDevice(sessionId)
      toastStore.success(t('devices.success.revoked'))
      await fetchSessions()
    } catch (error) {
      if (isVerificationCancelledError(error)) return
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
    } catch (error) {
      if (isVerificationCancelledError(error)) return
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

  if (getCurrentScope()) {
    onScopeDispose(() => {
      abortFetchSessions()
    })
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
