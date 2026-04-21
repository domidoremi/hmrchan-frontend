import { computed, ref, watch, watchEffect, type MaybeRefOrGetter, toValue } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useThemeStore, useSettingsStore } from '@/stores'
import { DEFAULT_APPEARANCE_PRESET, resolveSceneRole } from '@/config/appearance'
import { applyAppearancePreset } from '@/services/appearanceLoader'

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

    root.setAttribute('data-preset', activePreset.value)
    root.setAttribute('data-color-mode', resolvedColorMode.value)
    root.setAttribute('data-motion', motionMode.value)
    root.setAttribute('data-locale', locale.value)
    root.setAttribute('data-scene-role', routeSceneRole.value)
  })

  return {
    activePreset,
    routeSceneRole,
    resolvedColorMode,
    motionMode,
  }
}
