import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

vi.mock('@/components/ClientChallengeDialog.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: {
    name: 'ClientChallengeDialog',
    template: '<aside data-testid="client-challenge-dialog" />',
  },
}))

async function importAppAndBridge() {
  const bridge = await import('@/api/clientChallengeBridge')
  const { default: App } = await import('@/App.vue')
  return { App, bridge }
}

function mountApp(App: object) {
  return mount(App, {
    global: {
      stubs: {
        RouterView: {
          template: '<main data-testid="router-view" />',
        },
      },
    },
  })
}

describe('App', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('renders the route outlet without the client challenge dialog by default', async () => {
    const { App } = await importAppAndBridge()
    const wrapper = mountApp(App)

    await flushPromises()

    expect(wrapper.get('[data-testid="router-view"]').element).toBeDefined()
    expect(wrapper.find('[data-testid="client-challenge-dialog"]').exists()).toBe(false)
  })

  it('mounts and removes the client challenge dialog from bridge state', async () => {
    const { App, bridge } = await importAppAndBridge()
    const wrapper = mountApp(App)

    await flushPromises()
    const pending = bridge.requestClientChallenge('site-key-1')
    await nextTick()
    await flushPromises()

    expect(wrapper.get('[data-testid="client-challenge-dialog"]').element).toBeDefined()

    bridge.dismissClientChallenge()
    await pending
    await nextTick()

    expect(wrapper.find('[data-testid="client-challenge-dialog"]').exists()).toBe(false)
  })
})
