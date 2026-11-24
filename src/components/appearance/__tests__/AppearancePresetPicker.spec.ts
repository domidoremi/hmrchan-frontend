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

const settingsStoreState = reactive({
  settings: reactive({
    appearancePreset: 'apple-native',
  }),
  setAppearancePreset: vi.fn(),
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/stores', () => ({
  useSettingsStore: () => settingsStoreState,
}))

vi.mock('@/config/appearance', () => ({
  getAppearancePresetSpecs: () => [{ preset: 'apple-native' }, { preset: 'material-expressive' }],
}))

describe('AppearancePresetPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    settingsStoreState.settings.appearancePreset = 'apple-native'
  })

  it('presents the available themes with selected state', () => {
    const wrapper = mount(AppearancePresetPicker)
    expect(wrapper.findAll('button')).toHaveLength(2)
    expect(wrapper.find('[data-preset="apple-native"]').attributes('aria-pressed')).toBe('true')
  })

  it('applies a different preset without waiting for another network request', async () => {
    const wrapper = mount(AppearancePresetPicker)
    await wrapper.find('[data-preset="material-expressive"]').trigger('click')
    await flushPromises()
    expect(settingsStoreState.setAppearancePreset).toHaveBeenCalledWith('material-expressive')
  })
})
