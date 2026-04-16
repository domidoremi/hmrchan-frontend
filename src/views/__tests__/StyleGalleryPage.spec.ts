import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const galleryMocks = vi.hoisted(() => ({
  applyAppearancePreset: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))

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
    appearancePreset: 'minimal-editorial',
  }),
  setAppearancePreset: vi.fn(),
})

const themeStoreState = reactive({
  resolvedTheme: 'dark',
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.preset ? `${key}:${params.preset}` : key,
  }),
}))

vi.mock('@/stores', () => ({
  useSettingsStore: () => settingsStoreState,
  useThemeStore: () => themeStoreState,
  useToastStore: () => ({
    success: galleryMocks.success,
    error: galleryMocks.error,
  }),
}))

vi.mock('@/config/appearance', () => ({
  getAppearancePresetSpecs: () => [
    {
      preset: 'minimal-editorial',
      galleryTitle: 'Editorial Quiet',
      gallerySummary: 'Quiet reading.',
      signatureKeywords: ['editorial', 'paper'],
      surfaceStyle: 'Paper panels',
      motionStyle: 'Precise motion',
      densityStyle: 'Breathable spacing',
      heroStyle: 'Type-led hero',
      influences: ['docs/极简主义.txt'],
      lightMood: 'Quiet daylight',
      darkMood: 'Quiet night',
      mobileMood: 'Calm mobile',
    },
    {
      preset: 'material-calm',
      galleryTitle: 'Tonal Structure',
      gallerySummary: 'Layered clarity.',
      signatureKeywords: ['tonal', 'order'],
      surfaceStyle: 'Tonal containers',
      motionStyle: 'Short transitions',
      densityStyle: 'Structured spacing',
      heroStyle: 'Block hero',
      influences: ['docs/Material Design.txt'],
      lightMood: 'Tonal daylight',
      darkMood: 'Tonal night',
      mobileMood: 'Ordered mobile',
    },
  ],
}))

vi.mock('@/services/appearanceLoader', () => ({
  applyAppearancePreset: galleryMocks.applyAppearancePreset,
}))

import StyleGalleryPage from '../StyleGalleryPage.vue'

function createWrapper() {
  return mount(StyleGalleryPage, {
    global: {
      mocks: {
        $t: (key: string, params?: Record<string, string>) =>
          params?.preset ? `${key}:${params.preset}` : key,
      },
      stubs: {
        RouterLink: {
          props: ['to'],
          template: "<a :href=\"typeof to === 'string' ? to : '#'\"><slot /></a>",
        },
        AnimatedIcon: {
          template: '<span data-stub="animated-icon" />',
        },
        ControlButton: {
          props: ['tag', 'to', 'disabled', 'pressed', 'size'],
          emits: ['click'],
          template: `
            <button
              type="button"
              :disabled="disabled"
              :data-to="typeof to === 'string' ? to : ''"
              :data-pressed="String(pressed)"
              @click="$emit('click', $event)"
            >
              <slot name="start" />
              <slot />
              <slot name="end" />
            </button>
          `,
        },
        PageMetaChip: {
          template: '<span><slot /></span>',
        },
      },
    },
  })
}

describe('StyleGalleryPage', () => {
  beforeEach(() => {
    galleryMocks.applyAppearancePreset.mockReset()
    galleryMocks.applyAppearancePreset.mockResolvedValue(true)
    galleryMocks.success.mockReset()
    galleryMocks.error.mockReset()
    settingsStoreState.setAppearancePreset.mockReset()
    settingsStoreState.settings.appearancePreset = 'minimal-editorial'
    themeStoreState.resolvedTheme = 'dark'
  })

  it('renders the gallery cards and current state copy', () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('styleGallery.title')
    expect(wrapper.text()).toContain('Editorial Quiet')
    expect(wrapper.text()).toContain('Tonal Structure')
    expect(wrapper.text()).toContain('styleGallery.currentPreset')
    expect(wrapper.text()).toContain('styleGallery.currentMode')
  })

  it('applies a preset and reports success', async () => {
    const wrapper = createWrapper()
    const button = wrapper
      .findAll('button')
      .find((candidate) => candidate.text().includes('styleGallery.applyPreset'))

    expect(button).toBeTruthy()

    await button!.trigger('click')
    await flushPromises()

    expect(galleryMocks.applyAppearancePreset).toHaveBeenCalledWith('material-calm', 'dark')
    expect(settingsStoreState.setAppearancePreset).toHaveBeenCalledWith('material-calm')
    expect(galleryMocks.success).toHaveBeenCalledWith(
      'styleGallery.presetApplied:settings.presets.material-calm'
    )
  })

  it('reports runtime failure when the preset bundle fails to load', async () => {
    galleryMocks.applyAppearancePreset.mockResolvedValueOnce(false)
    const wrapper = createWrapper()
    const button = wrapper
      .findAll('button')
      .find((candidate) => candidate.text().includes('styleGallery.applyPreset'))

    expect(button).toBeTruthy()

    await button!.trigger('click')
    await flushPromises()

    expect(galleryMocks.error).toHaveBeenCalledWith('settings.appearanceRuntimeFailed')
  })
})
