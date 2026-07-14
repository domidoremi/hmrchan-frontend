import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import i18n from '@/i18n'
import { ApiError, preferencesService, type UserPreferences } from '@/api'
import { useAuthStore, useSettingsStore, useToastStore } from '@/stores'
import { createAuthSessionOperation, type AuthSessionOperation } from './authSessionScope'

const isLoadingPreferences = ref(false)
const isSavingPreferences = ref(false)
const hasLoadedPreferences = ref(false)

let loadedUserId: string | null = null
let lastSyncedSnapshot = ''
let syncTimer: ReturnType<typeof setTimeout> | null = null
let suspendRemoteSync = false
let installed = false
let operationGeneration = 0

function clearSyncTimer() {
  if (syncTimer === null) return
  clearTimeout(syncTimer)
  syncTimer = null
}

function serializePreferences(preferences: UserPreferences): string {
  return JSON.stringify({
    show_hero_section:
      typeof preferences.show_hero_section === 'boolean' ? preferences.show_hero_section : null,
    enable_animations:
      typeof preferences.enable_animations === 'boolean' ? preferences.enable_animations : null,
    posts_per_page:
      typeof preferences.posts_per_page === 'number' ? preferences.posts_per_page : null,
    cookie_consent:
      preferences.cookie_consent === null || typeof preferences.cookie_consent === 'boolean'
        ? preferences.cookie_consent
        : null,
    analytics_enabled:
      typeof preferences.analytics_enabled === 'boolean' ? preferences.analytics_enabled : null,
    performance_cookies_enabled:
      typeof preferences.performance_cookies_enabled === 'boolean'
        ? preferences.performance_cookies_enabled
        : null,
    functional_cookies_enabled:
      typeof preferences.functional_cookies_enabled === 'boolean'
        ? preferences.functional_cookies_enabled
        : null,
    data_collection:
      typeof preferences.data_collection === 'boolean' ? preferences.data_collection : null,
    personalized_content:
      typeof preferences.personalized_content === 'boolean'
        ? preferences.personalized_content
        : null,
  })
}

export function usePreferencesSyncService() {
  const authStore = useAuthStore()
  const settingsStore = useSettingsStore()
  const toastStore = useToastStore()

  const { isAuthenticated, user } = storeToRefs(authStore)
  const currentUserId = computed(() => user.value?.id ?? null)
  const localSnapshot = computed(() => serializePreferences(settingsStore.exportPreferences()))

  function beginOperation(userId: string): {
    generation: number
    operation: AuthSessionOperation
  } {
    return {
      generation: ++operationGeneration,
      operation: createAuthSessionOperation(userId),
    }
  }

  function isOperationCurrent(
    userId: string,
    generation: number,
    operation: AuthSessionOperation
  ): boolean {
    return (
      generation === operationGeneration &&
      operation.isCurrent() &&
      isAuthenticated.value &&
      currentUserId.value === userId
    )
  }

  function resetSyncState() {
    operationGeneration += 1
    clearSyncTimer()
    loadedUserId = null
    lastSyncedSnapshot = ''
    hasLoadedPreferences.value = false
    isLoadingPreferences.value = false
    isSavingPreferences.value = false
  }

  async function loadPreferences(options: { force?: boolean; silent?: boolean } = {}) {
    const { force = false, silent = false } = options
    const userId = currentUserId.value
    if (!isAuthenticated.value || !userId) {
      resetSyncState()
      return
    }

    if (!force && hasLoadedPreferences.value && loadedUserId === userId) {
      return
    }

    isLoadingPreferences.value = true
    const { generation, operation } = beginOperation(userId)
    if (!operation.isCurrent()) {
      operation.dispose()
      resetSyncState()
      return
    }

    try {
      const remotePreferences = await preferencesService.get({ signal: operation.signal })
      if (!isOperationCurrent(userId, generation, operation)) return
      suspendRemoteSync = true
      settingsStore.applyPreferences(remotePreferences)
      lastSyncedSnapshot = serializePreferences(settingsStore.exportPreferences())
      loadedUserId = userId
      hasLoadedPreferences.value = true
    } catch (error) {
      if (
        isOperationCurrent(userId, generation, operation) &&
        !(error instanceof ApiError && [401, 403].includes(error.status)) &&
        !silent
      ) {
        toastStore.error(i18n.global.t('settings.preferencesLoadFailed'))
      }
    } finally {
      if (isOperationCurrent(userId, generation, operation)) {
        suspendRemoteSync = false
        isLoadingPreferences.value = false
      }
      operation.dispose()
    }
  }

  async function pushPreferences() {
    const userId = currentUserId.value
    if (
      !isAuthenticated.value ||
      !userId ||
      loadedUserId !== userId ||
      !hasLoadedPreferences.value
    ) {
      return
    }

    const payload = settingsStore.exportPreferences()
    const snapshot = serializePreferences(payload)
    if (snapshot === lastSyncedSnapshot) {
      return
    }

    isSavingPreferences.value = true
    const { generation, operation } = beginOperation(userId)
    if (!operation.isCurrent()) {
      operation.dispose()
      return
    }

    try {
      const remotePreferences = await preferencesService.update(payload, {
        signal: operation.signal,
      })
      if (!isOperationCurrent(userId, generation, operation)) return
      suspendRemoteSync = true
      settingsStore.applyPreferences(remotePreferences)
      lastSyncedSnapshot = serializePreferences(settingsStore.exportPreferences())
    } catch (error) {
      if (
        isOperationCurrent(userId, generation, operation) &&
        !(error instanceof ApiError && [401, 403].includes(error.status))
      ) {
        toastStore.error(i18n.global.t('settings.preferencesSaveFailed'))
      }
    } finally {
      if (isOperationCurrent(userId, generation, operation)) {
        suspendRemoteSync = false
        isSavingPreferences.value = false
      }
      operation.dispose()
    }
  }

  async function replacePreferences() {
    const userId = currentUserId.value
    if (
      !isAuthenticated.value ||
      !userId ||
      loadedUserId !== userId ||
      !hasLoadedPreferences.value
    ) {
      return
    }

    clearSyncTimer()
    isSavingPreferences.value = true
    const { generation, operation } = beginOperation(userId)
    if (!operation.isCurrent()) {
      operation.dispose()
      return
    }

    try {
      const remotePreferences = await preferencesService.replace(
        settingsStore.exportPreferences(),
        {
          signal: operation.signal,
        }
      )
      if (!isOperationCurrent(userId, generation, operation)) return
      suspendRemoteSync = true
      settingsStore.applyPreferences(remotePreferences)
      lastSyncedSnapshot = serializePreferences(settingsStore.exportPreferences())
    } catch (error) {
      if (!isOperationCurrent(userId, generation, operation)) return
      if (!(error instanceof ApiError && [401, 403].includes(error.status))) {
        toastStore.error(i18n.global.t('settings.preferencesSaveFailed'))
      }
      throw error
    } finally {
      if (isOperationCurrent(userId, generation, operation)) {
        suspendRemoteSync = false
        isSavingPreferences.value = false
      }
      operation.dispose()
    }
  }

  async function resetPreferences() {
    const userId = currentUserId.value
    if (!isAuthenticated.value || !userId) {
      settingsStore.resetSettings()
      return
    }

    clearSyncTimer()
    isSavingPreferences.value = true
    const { generation, operation } = beginOperation(userId)
    if (!operation.isCurrent()) {
      operation.dispose()
      return
    }

    try {
      await preferencesService.reset({ signal: operation.signal })
      if (!isOperationCurrent(userId, generation, operation)) return
      suspendRemoteSync = true
      settingsStore.resetSettings()
      lastSyncedSnapshot = serializePreferences(settingsStore.exportPreferences())
      loadedUserId = userId
      hasLoadedPreferences.value = true
    } catch (error) {
      if (!isOperationCurrent(userId, generation, operation)) return
      if (!(error instanceof ApiError && [401, 403].includes(error.status))) {
        toastStore.error(i18n.global.t('settings.preferencesSaveFailed'))
      }
      throw error
    } finally {
      if (isOperationCurrent(userId, generation, operation)) {
        suspendRemoteSync = false
        isSavingPreferences.value = false
      }
      operation.dispose()
    }
  }

  if (!installed) {
    installed = true

    watch(
      [isAuthenticated, currentUserId],
      ([authenticated, userId]) => {
        if (!authenticated || !userId) {
          resetSyncState()
          return
        }

        if (loadedUserId !== userId || !hasLoadedPreferences.value) {
          void loadPreferences({ force: true, silent: true })
        }
      },
      { immediate: true }
    )

    watch(localSnapshot, (snapshot) => {
      if (suspendRemoteSync) return
      if (!isAuthenticated.value || !hasLoadedPreferences.value) return
      if (!currentUserId.value || loadedUserId !== currentUserId.value) return
      if (snapshot === lastSyncedSnapshot) return

      clearSyncTimer()
      syncTimer = setTimeout(() => {
        void pushPreferences()
      }, 500)
    })
  }

  return {
    hasLoadedPreferences,
    isLoadingPreferences,
    isSavingPreferences,
    loadPreferences,
    resetPreferences,
    pushPreferences,
    replacePreferences,
  }
}
