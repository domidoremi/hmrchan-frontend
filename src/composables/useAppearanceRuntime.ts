import { computed, ref, watch, watchEffect, type MaybeRefOrGetter, toValue } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useThemeStore, useSettingsStore } from '@/stores'
import { DEFAULT_APPEARANCE_PRESET, resolveSceneRole } from '@/config/appearance'
import { applyAppearancePreset } from '@/services/appearanceLoader'

function resolveTextureProfile(level: 'off' | 'subtle' | 'rich') {
  if (level === 'off') {
    return {
      opacity: '0',
      grainOpacity: '0',
      backdropStrength: '0',
    }
  }

  if (level === 'rich') {
    return {
      opacity: '0.18',
      grainOpacity: '0.12',
      backdropStrength: '1',
    }
  }

  return {
    opacity: '0.08',
    grainOpacity: '0.05',
    backdropStrength: '0.72',
  }
}

export function useAppearanceRuntime(
  routeSource: MaybeRefOrGetter<{ name?: unknown; path?: string }>
) {
  const { locale } = useI18n()
  const themeStore = useThemeStore()
  const settingsStore = useSettingsStore()
  const { resolvedColorMode } = storeToRefs(themeStore)
  const { settings, motionMode } = storeToRefs(settingsStore)

  const activePreset = ref(settings.value.appearancePreset ?? DEFAULT_APPEARANCE_PRESET)

  const routeSceneRole = computed(() => resolveSceneRole(toValue(routeSource)))

  watch(
    () => [settings.value.appearancePreset, resolvedColorMode.value] as const,
    async ([preset, colorMode]) => {
      const applied = await applyAppearancePreset(preset, colorMode)
      if (applied) {
        activePreset.value = preset
      }
    },
    { immediate: true }
  )

  watchEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    const textureProfile = resolveTextureProfile(settings.value.textureLevel)

    root.setAttribute('data-preset', activePreset.value)
    root.setAttribute('data-color-mode', resolvedColorMode.value)
    root.setAttribute('data-density', settings.value.densityMode)
    root.setAttribute('data-motion', motionMode.value)
    root.setAttribute('data-contrast', settings.value.contrastMode)
    root.setAttribute('data-locale', locale.value)
    root.setAttribute('data-scene-role', routeSceneRole.value)

    root.style.setProperty('--appearance-texture-opacity', textureProfile.opacity)
    root.style.setProperty('--appearance-texture-grain-opacity', textureProfile.grainOpacity)
    root.style.setProperty('--appearance-backdrop-strength', textureProfile.backdropStrength)
  })

  return {
    activePreset,
    routeSceneRole,
    resolvedColorMode,
    motionMode,
  }
}
