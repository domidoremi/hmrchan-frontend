import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/ui/Button.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'MockButton',
      props: ['type', 'variant', 'fullWidth', 'icon', 'loading', 'disabled'],
      emits: ['click'],
      template:
        '<button type="button" class="mock-button" :data-variant="variant" :data-full-width="String(fullWidth)" :data-loading="String(loading)" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    }),
  }
})

import AuthDivider from '../AuthDivider.vue'
import AuthEntryShell from '../AuthEntryShell.vue'
import AuthProviderButton from '../AuthProviderButton.vue'
import AuthTabNav from '../AuthTabNav.vue'

describe('auth shell primitives', () => {
  it('renders AuthDivider with the supplied label', () => {
    const wrapper = mount(AuthDivider, {
      props: { label: 'Continue with' },
    })

    expect(wrapper.attributes('role')).toBe('presentation')
    expect(wrapper.attributes('aria-label')).toBe('Continue with')
    expect(wrapper.find('.auth-divider__label').text()).toBe('Continue with')
  })

  it('renders AuthProviderButton and emits click', async () => {
    const wrapper = mount(AuthProviderButton, {
      props: {
        action: 'google',
        label: 'Continue with Google',
        hint: 'Fastest option',
        loading: true,
        disabled: false,
      },
    })

    const button = wrapper.get('.mock-button')
    expect(button.text()).toBe('Continue with Google')
    expect(button.attributes('data-variant')).toBe('ghost')
    expect(button.attributes('data-full-width')).toBe('')
    expect(button.attributes('data-loading')).toBe('true')
    expect(wrapper.find('.auth-provider__hint').text()).toBe('Fastest option')

    await button.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('builds AuthTabNav login/register targets and active state', () => {
    const wrapper = mount(AuthTabNav, {
      props: {
        activeTab: 'register',
        redirectTo: '/favorites',
        ariaLabel: 'Auth tabs',
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a class="router-link" :data-to="JSON.stringify(to)"><slot /></a>',
          },
        },
      },
    })

    const links = wrapper.findAll('.router-link')
    expect(wrapper.attributes('aria-label')).toBe('Auth tabs')
    expect(links).toHaveLength(2)
    expect(links[0]?.attributes('data-to')).toContain('"path":"/login"')
    expect(links[0]?.attributes('data-to')).toContain('"redirect":"/favorites"')
    expect(links[1]?.classes()).toContain('auth-tab-nav__item--active')
    expect(links[1]?.attributes('aria-current')).toBe('page')
  })

  it('renders AuthEntryShell copy, back action, tabs, footer, and layout modifiers', async () => {
    const wrapper = mount(AuthEntryShell, {
      props: {
        title: 'Welcome back',
        subtitle: 'Sign in to continue',
        activeTab: 'login',
        redirectTo: '/profile',
        tabAriaLabel: 'Primary auth tabs',
        wide: true,
        split: true,
      },
      slots: {
        eyebrow: '<span class="eyebrow">Member area</span>',
        default: '<form class="body-form">Body</form>',
        footer: '<div class="footer-slot">Footer</div>',
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          ArrowLeft: { template: '<span data-testid="arrow-left" />' },
          AuthTabNav: {
            props: ['activeTab', 'redirectTo', 'ariaLabel'],
            template:
              '<div class="tab-nav-stub" :data-active-tab="activeTab" :data-redirect-to="redirectTo" :data-aria-label="ariaLabel" />',
          },
        },
      },
    })

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['auth-shell', 'auth-shell--wide', 'auth-shell--split'])
    )
    expect(wrapper.find('.eyebrow').text()).toBe('Member area')
    expect(wrapper.find('.auth-title').text()).toBe('Welcome back')
    expect(wrapper.find('.auth-subtitle').text()).toBe('Sign in to continue')
    expect(wrapper.get('.tab-nav-stub').attributes('data-active-tab')).toBe('login')
    expect(wrapper.get('.tab-nav-stub').attributes('data-redirect-to')).toBe('/profile')
    expect(wrapper.get('.tab-nav-stub').attributes('data-aria-label')).toBe('Primary auth tabs')
    expect(wrapper.find('.body-form').exists()).toBe(true)
    expect(wrapper.find('.footer-slot').exists()).toBe(true)

    await wrapper.get('.auth-shell__back').trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
  })
})
