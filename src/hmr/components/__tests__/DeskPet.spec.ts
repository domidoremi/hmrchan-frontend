import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent } from 'vue'

import DeskPet from '@/hmr/components/DeskPet.vue'
import DeskPetHost from '@/hmr/components/DeskPetHost.vue'
import { usePreferencesStore } from '@/stores/preferences'

function installMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes('max-width') ? false : matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

async function mountHost(path = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'hmr-home', component: defineComponent({ template: '<main />' }) },
      {
        path: '/explore',
        name: 'hmr-explore',
        component: defineComponent({ template: '<main />' }),
      },
    ],
  })
  router.push(path)
  await router.isReady()

  return mount(DeskPetHost, {
    attachTo: document.body,
    global: {
      plugins: [router],
      stubs: {
        Teleport: true,
      },
    },
  })
}

describe('DeskPet', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML =
      '<a class="hmr-cta hero-btn" data-desk-pet-anchor="hero-cta" style="position:absolute;left:200px;top:200px;width:120px;height:40px"></a>'
    window.localStorage.clear()
    window.sessionStorage.clear()
    setActivePinia(createPinia())
    installMatchMedia(false)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
  })

  it('advances atlas frames with a timer', async () => {
    const wrapper = mount(DeskPet, { props: { state: 'waving' } })

    expect(wrapper.attributes('style')).toContain('--hmr-desk-pet-frame: 0')
    vi.advanceTimersByTime(170)
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('style')).toContain('--hmr-desk-pet-frame: 1')
  })

  it('auto shows on the home hero and can be persistently closed', async () => {
    const wrapper = await mountHost('/')

    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="desk-pet-host"]').exists()).toBe(true)

    await wrapper.find('.hmr-desk-pet-close').trigger('click')
    const store = usePreferencesStore()
    expect(store.preferences.deskPet.enabled).toBe(false)
    expect(wrapper.find('[data-testid="desk-pet-host"]').exists()).toBe(false)
  })

  it('does not auto show when reduced motion disables animated entry', async () => {
    installMatchMedia(true)
    const wrapper = await mountHost('/')

    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(DeskPet).props('staticMode')).toBe(true)
  })
})
