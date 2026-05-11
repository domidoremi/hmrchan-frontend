import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

export interface HmrPreferences {
  enableAnimations: boolean
}

const PREFERENCES_STORAGE_KEY = 'hmr.preferences.v1'

const defaultPreferences: HmrPreferences = {
  enableAnimations: true,
}

function cloneDefaults(): HmrPreferences {
  return {
    enableAnimations: defaultPreferences.enableAnimations,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeHmrPreferences(value: unknown): HmrPreferences {
  const next = cloneDefaults()
  if (!isRecord(value)) return next

  next.enableAnimations = normalizeBoolean(value.enableAnimations, next.enableAnimations)

  return next
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
  const animationsAllowed = computed(() => preferences.value.enableAnimations)

  function initializePreferences(): void {
    if (hasInitialized.value) return
    hasInitialized.value = true
    preferences.value = readStoredPreferences()
  }

  function replacePreferences(nextPreferences: HmrPreferences): void {
    preferences.value = normalizeHmrPreferences(nextPreferences)
  }

  function setAnimationsEnabled(enabled: boolean): void {
    preferences.value = {
      ...preferences.value,
      enableAnimations: enabled,
    }
  }

  watch(preferences, writeStoredPreferences, { deep: true })

  return {
    preferences,
    animationsAllowed,
    initializePreferences,
    replacePreferences,
    setAnimationsEnabled,
  }
})
