import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const profileHeaderMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    back: profileHeaderMocks.back,
    push: profileHeaderMocks.push,
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
  it('renders header copy and routes back/profile from default actions', async () => {
    profileHeaderMocks.back.mockReset()
    profileHeaderMocks.push.mockReset()

    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('nav.profile')
    expect(wrapper.text()).toContain('Account settings')
    expect(wrapper.text()).toContain('Manage the visible profile details')
    expect(wrapper.text()).toContain('Changes apply immediately')

    await wrapper.get('.back-btn').trigger('click')
    expect(profileHeaderMocks.back).toHaveBeenCalledTimes(1)

    await wrapper.get('.mock-button').trigger('click')
    expect(profileHeaderMocks.push).toHaveBeenCalledWith('/profile')
  })

  it('renders custom action slot content instead of the default profile button', () => {
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
