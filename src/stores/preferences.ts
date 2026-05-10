import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type HmrAnimationIntensity = 'none' | 'subtle' | 'normal'

export interface HmrDeskPetPreferences {
  enabled: boolean
  autoHeroInteraction: boolean
}

export interface HmrPreferences {
  enableAnimations: boolean
  animationIntensity: HmrAnimationIntensity
  deskPet: HmrDeskPetPreferences
}

const PREFERENCES_STORAGE_KEY = 'hmr.preferences.v1'

const defaultPreferences: HmrPreferences = {
  enableAnimations: true,
  animationIntensity: 'subtle',
  deskPet: {
    enabled: true,
    autoHeroInteraction: true,
  },
}

function cloneDefaults(): HmrPreferences {
  return {
    enableAnimations: defaultPreferences.enableAnimations,
    animationIntensity: defaultPreferences.animationIntensity,
    deskPet: {
      enabled: defaultPreferences.deskPet.enabled,
      autoHeroInteraction: defaultPreferences.deskPet.autoHeroInteraction,
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeIntensity(value: unknown): HmrAnimationIntensity {
  return value === 'none' || value === 'normal' || value === 'subtle'
    ? value
    : defaultPreferences.animationIntensity
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeHmrPreferences(value: unknown): HmrPreferences {
  const next = cloneDefaults()
  if (!isRecord(value)) return next

  next.enableAnimations = normalizeBoolean(value.enableAnimations, next.enableAnimations)
  next.animationIntensity = normalizeIntensity(value.animationIntensity)

  if (isRecord(value.deskPet)) {
    next.deskPet.enabled = normalizeBoolean(value.deskPet.enabled, next.deskPet.enabled)
    next.deskPet.autoHeroInteraction = normalizeBoolean(
      value.deskPet.autoHeroInteraction,
      next.deskPet.autoHeroInteraction
    )
  }

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
  const animationsAllowed = computed(
    () => preferences.value.enableAnimations && preferences.value.animationIntensity !== 'none'
  )

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

  function setAnimationIntensity(intensity: HmrAnimationIntensity): void {
    preferences.value = {
      ...preferences.value,
      animationIntensity: normalizeIntensity(intensity),
    }
  }

  function setDeskPetEnabled(enabled: boolean): void {
    preferences.value = {
      ...preferences.value,
      deskPet: {
        ...preferences.value.deskPet,
        enabled,
      },
    }
  }

  function setAutoHeroInteraction(enabled: boolean): void {
    preferences.value = {
      ...preferences.value,
      deskPet: {
        ...preferences.value.deskPet,
        autoHeroInteraction: enabled,
      },
    }
  }

  watch(preferences, writeStoredPreferences, { deep: true })

  return {
    preferences,
    animationsAllowed,
    initializePreferences,
    replacePreferences,
    setAnimationsEnabled,
    setAnimationIntensity,
    setDeskPetEnabled,
    setAutoHeroInteraction,
  }
})
