import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const profileHeaderMocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  route: {
    query: {} as Record<string, unknown>,
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => profileHeaderMocks.route,
  useRouter: () => ({
    push: profileHeaderMocks.push,
    replace: profileHeaderMocks.replace,
    back: profileHeaderMocks.back,
  }),
}))

vi.mock('@/components/appearance/ControlButton.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'MockControlButton',
      emits: ['click'],
      template:
        '<button type="button" class="mock-control-button" @click="$emit(\'click\', $event)"><slot name="start" /><slot /></button>',
    }),
  }
})

vi.mock('@/components/ui/Button.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'MockButton',
      emits: ['click'],
      template:
        '<button type="button" class="mock-button" @click="$emit(\'click\', $event)"><slot /></button>',
    }),
  }
})

import ProfileSubPageHeader from '../ProfileSubPageHeader.vue'

function createWrapper() {
  return mount(ProfileSubPageHeader, {
    props: {
      title: 'Account settings',
      subtitle: 'Manage the visible profile details',
      hint: 'Changes apply immediately',
    },
    global: {
      mocks: {
        $t: (key: string) => key,
      },
      stubs: {
        ArrowLeft: {
          template: '<span data-testid="arrow-left" />',
        },
        User: {
          template: '<span data-testid="user-icon" />',
        },
      },
    },
  })
}

describe('ProfileSubPageHeader', () => {
  it('uses router.back when the app has a prior in-app history entry', async () => {
    profileHeaderMocks.push.mockReset()
    profileHeaderMocks.replace.mockReset()
    profileHeaderMocks.back.mockReset()
    profileHeaderMocks.route.query = {
      returnTo: '/search?q=momo#results',
    }
    window.history.replaceState({ back: '/search?q=momo#results' }, '', '/profile/settings')

    const wrapper = createWrapper()

    await wrapper.get('.back-btn').trigger('click')

    expect(profileHeaderMocks.back).toHaveBeenCalledTimes(1)
    expect(profileHeaderMocks.replace).not.toHaveBeenCalled()

    await wrapper.get('.mock-button').trigger('click')
    expect(profileHeaderMocks.push).toHaveBeenCalledWith('/profile')
  })

  it('falls back to replace(returnTo) when there is no known in-app history entry', async () => {
    profileHeaderMocks.push.mockReset()
    profileHeaderMocks.replace.mockReset()
    profileHeaderMocks.back.mockReset()
    profileHeaderMocks.route.query = {
      returnTo: '/search?q=momo#results',
    }
    window.history.replaceState({}, '', '/profile/settings')

    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('nav.profile')
    expect(wrapper.text()).toContain('Account settings')
    expect(wrapper.text()).toContain('Manage the visible profile details')
    expect(wrapper.text()).toContain('Changes apply immediately')

    await wrapper.get('.back-btn').trigger('click')
    expect(profileHeaderMocks.replace).toHaveBeenCalledWith('/search?q=momo#results')
    expect(profileHeaderMocks.back).not.toHaveBeenCalled()

    await wrapper.get('.mock-button').trigger('click')
    expect(profileHeaderMocks.push).toHaveBeenCalledWith('/profile')
  })

  it('falls back to /profile when returnTo is missing or invalid', async () => {
    profileHeaderMocks.push.mockReset()
    profileHeaderMocks.replace.mockReset()
    profileHeaderMocks.back.mockReset()
    profileHeaderMocks.route.query = {
      returnTo: 'https://example.com/phish',
    }
    window.history.replaceState({}, '', '/profile/settings')

    const wrapper = createWrapper()

    await wrapper.get('.back-btn').trigger('click')

    expect(profileHeaderMocks.replace).toHaveBeenCalledWith('/profile')
  })

  it('renders custom action slot content instead of the default profile button', () => {
    profileHeaderMocks.route.query = {}
    const wrapper = mount(ProfileSubPageHeader, {
      props: {
        title: 'Security',
      },
      slots: {
        actions: '<button type="button" class="custom-action">Open security center</button>',
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          ArrowLeft: true,
          User: true,
        },
      },
    })

    expect(wrapper.find('.custom-action').exists()).toBe(true)
    expect(wrapper.find('.mock-button').exists()).toBe(false)
  })
})
