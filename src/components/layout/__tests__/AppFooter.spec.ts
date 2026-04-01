import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { describe, expect, it, vi } from 'vitest'
import AppFooter from '../AppFooter.vue'

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

const themeStoreState = reactive({
  resolvedTheme: 'light',
})

const settingsStoreState = reactive({
  settings: {
    appearancePreset: 'minimal-editorial',
  },
})

vi.mock('@/stores', () => ({
  useThemeStore: () => themeStoreState,
  useSettingsStore: () => settingsStoreState,
}))

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      app: {
        name: 'MomiChan',
      },
      common: {
        footerNav: 'Footer navigation',
      },
      nav: {
        explore: 'Explore',
        authors: 'Authors',
        schedule: 'Schedule',
        community: 'Community',
        contact: 'Contact',
        about: 'About',
      },
      home: {
        hero: {
          primaryAction: 'Start Exploring',
        },
      },
      footer: {
        desc: 'Editorial footer description',
        note: 'Updated daily',
        rights: 'All rights reserved',
        columns: {
          discover: 'Discover',
          community: 'Community',
        },
      },
    },
  },
})

function createWrapper(variant?: 'default' | 'home') {
  return mount(AppFooter, {
    props: variant ? { variant } : {},
    global: {
      plugins: [i18n],
      stubs: {
        RouterLink: {
          props: ['to'],
          template: "<a :href=\"typeof to === 'string' ? to : '/'\"><slot /></a>",
        },
        AnimatedIcon: {
          template: '<span aria-hidden="true" />',
        },
      },
    },
  })
}

describe('AppFooter', () => {
  it('does not render the removed tagline in the default footer', () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('MomiChan')
    expect(wrapper.text()).not.toContain('tagline')
    expect(wrapper.find('.footer-marquee').exists()).toBe(false)
    expect(wrapper.find('.brand-logo__tagline').exists()).toBe(false)
  })

  it('renders the home variant marquee and home actions', () => {
    const wrapper = createWrapper('home')

    expect(wrapper.find('.footer--home').exists()).toBe(true)
    expect(wrapper.find('.footer-marquee').exists()).toBe(true)
    expect(wrapper.text()).toContain('Start Exploring')
    expect(wrapper.text()).toContain('Contact')
  })

  it('binds the home variant shell to homepage surface tokens', () => {
    const wrapper = createWrapper('home')
    const style = wrapper.find('.footer-shell').attributes('style')

    expect(style).toContain(
      '--footer-shell-bg: var(--home-panel-bg-soft, var(--ui-compat-surface-elevated, var(--chrome-surface-bg)));'
    )
    expect(style).toContain(
      '--footer-shell-border: var(--home-panel-border, var(--ui-compat-shell-border, var(--chrome-surface-border)));'
    )
  })

  it('links GitHub to the repository instead of the bare host', () => {
    const wrapper = createWrapper()

    expect(wrapper.find('a[href="https://github.com/domidoremi/hmrchan-frontend"]').exists()).toBe(
      true
    )
  })
})
