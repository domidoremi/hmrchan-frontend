import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AppearancePresetPicker from '../AppearancePresetPicker.vue'

vi.mock('pinia', async () => {
  const actual = await vi.importActual<typeof import('pinia')>('pinia')
  const vue = await vi.importActual<typeof import('vue')>('vue')

  return {
    ...actual,
    storeToRefs: (store: Record<string, unknown>) => {
      const refs: Record<string, unknown> = {}
      for (const key of Object.keys(store)) {
        if (typeof store[key] === 'function') continue
        refs[key] = vue.toRef(store, key)
      }
      return refs
    },
  }
})

const pickerMocks = vi.hoisted(() => ({
  applyAppearancePreset: vi.fn(),
  toastError: vi.fn(),
}))

const settingsStoreState = reactive({
  settings: reactive({
    appearancePreset: 'minimal-editorial',
  }),
  setAppearancePreset: vi.fn(),
})

const themeStoreState = reactive({
  resolvedTheme: 'dark',
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/stores', () => ({
  useSettingsStore: () => settingsStoreState,
  useThemeStore: () => themeStoreState,
  useToastStore: () => ({
    error: pickerMocks.toastError,
  }),
}))

vi.mock('@/config/appearance', () => ({
  getAppearancePresetSpecs: () => [{ preset: 'minimal-editorial' }, { preset: 'material-calm' }],
}))

vi.mock('@/services/appearanceLoader', () => ({
  applyAppearancePreset: pickerMocks.applyAppearancePreset,
}))

vi.mock('@/utils/modernAPIs', () => ({
  createVisibilityObserver: vi.fn((callback: IntersectionObserverCallback) => {
    const observer = {
      observe: vi.fn((target: Element) => {
        callback([{ target, isIntersecting: true } as IntersectionObserverEntry], observer)
      }),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }
    return observer
  }),
}))

describe('AppearancePresetPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    settingsStoreState.settings.appearancePreset = 'minimal-editorial'
    pickerMocks.applyAppearancePreset.mockResolvedValue(true)
  })

  it('reveals preset previews through the shared visibility observer', async () => {
    const wrapper = mount(AppearancePresetPicker)

    await flushPromises()

    expect(wrapper.findAll('.appearance-preset-card--revealed')).toHaveLength(2)
  })

  it('applies a different preset with the resolved theme', async () => {
    const wrapper = mount(AppearancePresetPicker)

    await wrapper.find('[data-preset="material-calm"]').trigger('click')
    await flushPromises()

    expect(pickerMocks.applyAppearancePreset).toHaveBeenCalledWith('material-calm', 'dark')
    expect(settingsStoreState.setAppearancePreset).toHaveBeenCalledWith('material-calm')
    expect(pickerMocks.toastError).not.toHaveBeenCalled()
  })

  it('reports runtime failures without mutating the selected preset', async () => {
    pickerMocks.applyAppearancePreset.mockResolvedValueOnce(false)
    const wrapper = mount(AppearancePresetPicker)

    await wrapper.find('[data-preset="material-calm"]').trigger('click')
    await flushPromises()

    expect(settingsStoreState.setAppearancePreset).not.toHaveBeenCalled()
    expect(pickerMocks.toastError).toHaveBeenCalledWith('settings.appearanceRuntimeFailed')
  })

  it('skips applying the active preset', async () => {
    const wrapper = mount(AppearancePresetPicker)

    await wrapper.find('[data-preset="minimal-editorial"]').trigger('click')
    await flushPromises()

    expect(pickerMocks.applyAppearancePreset).not.toHaveBeenCalled()
    expect(settingsStoreState.setAppearancePreset).not.toHaveBeenCalled()
  })
})
