import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type HmrPreferences = Record<string, never>

const PREFERENCES_STORAGE_KEY = 'hmr.preferences.v1'

const defaultPreferences: HmrPreferences = {}

function cloneDefaults(): HmrPreferences {
  return { ...defaultPreferences }
}

export function normalizeHmrPreferences(value: unknown): HmrPreferences {
  void value
  return cloneDefaults()
}

function readStoredPreferences(): HmrPreferences {
  if (typeof window === 'undefined') return cloneDefaults()

  const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY)
  if (!raw) return cloneDefaults()

  try {
    return normalizeHmrPreferences(JSON.parse(raw))
  } catch {
    return cloneDefaults()
  }
}

function writeStoredPreferences(preferences: HmrPreferences): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
}

export const usePreferencesStore = defineStore('preferences', () => {
  const preferences = ref<HmrPreferences>(readStoredPreferences())
  const hasInitialized = ref(false)

  function initializePreferences(): void {
    if (hasInitialized.value) return
    hasInitialized.value = true
    preferences.value = readStoredPreferences()
  }

  function replacePreferences(nextPreferences: HmrPreferences): void {
    preferences.value = normalizeHmrPreferences(nextPreferences)
  }

  watch(preferences, writeStoredPreferences, { deep: true })

  return {
    preferences,
    initializePreferences,
    replacePreferences,
  }
})
