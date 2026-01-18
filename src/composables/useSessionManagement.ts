/**
 * Session Management Composable
 * Handles device session operations with loading states and error handling
 */

import { ref, computed } from 'vue'
import { sessionService, type Session } from '@/api'
import { useToastStore } from '@/stores/toast'
import { useI18n } from 'vue-i18n'

export function useSessionManagement() {
  const { t } = useI18n()
  const toastStore = useToastStore()

  const sessions = ref<Session[]>([])
  const isLoading = ref(true)
  const isRevoking = ref(false)

  const otherSessionsCount = computed(() => sessions.value.filter((s) => !s.is_current).length)

  async function fetchSessions() {
    isLoading.value = true
    try {
      const response = await sessionService.getSessions()
      sessions.value = response.sessions
    } catch {
      toastStore.error(t('devices.error.fetchFailed'))
    } finally {
      isLoading.value = false
    }
  }

  async function revokeSession(sessionId: string) {
    if (!confirm(t('devices.confirm.revoke'))) return

    try {
      await sessionService.revokeSession(sessionId)
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
      await sessionService.revokeAllOtherSessions()
      toastStore.success(t('devices.success.revokedAll'))
      await fetchSessions()
    } catch {
      toastStore.error(t('devices.error.revokeAllFailed'))
    } finally {
      isRevoking.value = false
    }
  }

  async function toggleTrust(session: Session) {
    try {
      await sessionService.trustSession(session.id, !session.is_trusted)
      toastStore.success(
        session.is_trusted ? t('devices.success.untrusted') : t('devices.success.trusted')
      )
      await fetchSessions()
    } catch {
      toastStore.error(t('devices.error.trustFailed'))
    }
  }

  async function updateDeviceName(sessionId: string, deviceName: string) {
    if (!deviceName.trim()) {
      toastStore.error(t('devices.error.emptyName'))
      return false
    }

    try {
      await sessionService.updateDeviceName(sessionId, deviceName.trim())
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
