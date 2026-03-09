import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores'

export interface PreferredPageSizeOptions {
  fallback?: number
  min?: number
  max?: number
  mobileCap?: number
  mobileBreakpoint?: number
}

export function resolvePreferredPageSize(
  rawValue: number | null | undefined,
  options: PreferredPageSizeOptions = {}
) {
  const { fallback = 20, min = 1, max = 100 } = options
  const normalized = Number.isFinite(rawValue) ? Math.round(rawValue as number) : fallback
  return Math.min(max, Math.max(min, normalized))
}

export function usePreferredPageSize(options: PreferredPageSizeOptions = {}) {
  const settingsStore = useSettingsStore()
  const { settings } = storeToRefs(settingsStore)
  const { mobileCap, mobileBreakpoint = 768, fallback = 20, min = 1, max = 100 } = options

  return computed(() => {
    const isMobile =
      typeof window !== 'undefined' &&
      Number.isFinite(window.innerWidth) &&
      window.innerWidth < mobileBreakpoint

    const effectiveMax = isMobile && typeof mobileCap === 'number' ? Math.min(max, mobileCap) : max
    return resolvePreferredPageSize(settings.value.postsPerPage, {
      fallback,
      min,
      max: effectiveMax,
    })
  })
}
