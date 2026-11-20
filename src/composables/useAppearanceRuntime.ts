import { computed, watchEffect, type MaybeRefOrGetter, toValue } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useThemeStore, useSettingsStore } from '@/stores'
import { normalizeAppearancePreset, resolveSceneRole } from '@/config/appearance'
import { designEdition } from '@/config/designEdition'
import { useAppearanceColorSync } from './useAppearanceColorSync'

export function useAppearanceRuntime(
  routeSource: MaybeRefOrGetter<{ name?: unknown; path?: string }>
) {
  const { locale } = useI18n()
  const themeStore = useThemeStore()
  const settingsStore = useSettingsStore()
  const { resolvedColorMode } = storeToRefs(themeStore)
  const { settings, motionMode } = storeToRefs(settingsStore)

  const activePreset = computed(() => normalizeAppearancePreset(settings.value.appearancePreset))

  const routeSceneRole = computed(() => resolveSceneRole(toValue(routeSource)))

  useAppearanceColorSync([activePreset, resolvedColorMode])

  watchEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement

    root.setAttribute('data-edition', designEdition)
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
