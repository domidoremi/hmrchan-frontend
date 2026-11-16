import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AuthMfaStep from '../AuthMfaStep.vue'

const state = vi.hoisted(() => ({
  isLoading: { value: false, __v_isRef: true },
  completeMfaLogin: vi.fn(),
  beginWebAuthnLogin: vi.fn(),
  finishWebAuthnLogin: vi.fn(),
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => state }))
vi.mock('pinia', () => ({ storeToRefs: () => ({ isLoading: state.isLoading }) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/utils/webauthn', () => ({
  isWebAuthnSupported: () => true,
  getWebAuthnAssertion: vi.fn(),
  serializePublicKeyCredential: vi.fn(),
}))
enableAutoUnmount(afterEach)
const methods = ['backup_code', 'totp', 'webauthn']
const global = { mocks: { $t: (key: string) => key } }
function mountMfa(options = methods) {
  return mount(AuthMfaStep, {
    props: { pendingMfaLoginToken: 'fixture-token', methods: options },
    global,
    attachTo: document.body,
  })
}
function selected(wrapper: VueWrapper) {
  return wrapper.get<HTMLButtonElement>('[role="tab"][aria-selected="true"]')
}
async function press(key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  document.activeElement?.dispatchEvent(event)
  await nextTick()
  return event
}
describe('MFA method keyboard and accessible relationships', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.isLoading.value = false
  })
  afterEach(() => document.body.replaceChildren())

  it('names the tab list and connects one selected tab to its visible panel', () => {
    const wrapper = mountMfa()
    const list = wrapper.get('[role="tablist"]')
    expect(document.getElementById(list.attributes('aria-labelledby'))?.textContent).toBe(
      'auth.mfa.title'
    )
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs).toHaveLength(3)
    expect(tabs.map((tab) => tab.attributes('aria-selected'))).toEqual(['false', 'true', 'false'])
    expect(tabs.map((tab) => tab.attributes('tabindex'))).toEqual(['-1', '0', '-1'])
    expect(tabs.map((tab) => tab.attributes('aria-pressed'))).toEqual([
      undefined,
      undefined,
      undefined,
    ])
    const panel = wrapper.get('[role="tabpanel"]')
    expect(tabs.map((tab) => tab.attributes('aria-controls'))).toEqual(
      Array(3).fill(panel.attributes('id'))
    )
    expect(panel.attributes('aria-labelledby')).toBe(selected(wrapper).attributes('id'))
  })

  it('moves focus and selection with arrows, wraps, and supports Home and End', async () => {
    const wrapper = mountMfa()
    selected(wrapper).element.focus()
    for (const [key, label] of [
      ['ArrowRight', 'profile.mfaMethodWebauthn'],
      ['ArrowRight', 'profile.mfaMethodBackupCode'],
      ['ArrowLeft', 'profile.mfaMethodWebauthn'],
      ['Home', 'profile.mfaMethodBackupCode'],
      ['End', 'profile.mfaMethodWebauthn'],
    ]) {
      const event = await press(key!)
      expect(event.defaultPrevented).toBe(true)
      expect(selected(wrapper).text()).toBe(label)
      expect(document.activeElement).toBe(selected(wrapper).element)
      expect(wrapper.findAll('[role="tab"][tabindex="0"]')).toHaveLength(1)
      expect(wrapper.get('[role="tabpanel"]').attributes('aria-labelledby')).toBe(
        selected(wrapper).attributes('id')
      )
    }
    expect(wrapper.find('input').exists()).toBe(false)
    expect(state.beginWebAuthnLogin).not.toHaveBeenCalled()
    expect(state.completeMfaLogin).not.toHaveBeenCalled()
  })

  it.each(['ArrowUp', 'ArrowDown', 'Tab', 'x'])(
    'leaves %s to native keyboard behavior',
    async (key) => {
      const wrapper = mountMfa()
      const active = selected(wrapper)
      active.element.focus()
      expect((await press(key)).defaultPrevented).toBe(false)
      expect(document.activeElement).toBe(active.element)
      expect(selected(wrapper).element).toBe(active.element)
    }
  )

  it('keeps pointer selection and code input labels synchronized', async () => {
    const wrapper = mountMfa()
    await wrapper.findAll('[role="tab"]')[0]!.trigger('click')
    expect(selected(wrapper).text()).toBe('profile.mfaMethodBackupCode')
    expect(wrapper.get('input').attributes('inputmode')).toBe('text')
    expect(wrapper.get('label').attributes('for')).toBe(wrapper.get('input').attributes('id'))
  })

  it('does not switch methods or dispatch another verification while pending', async () => {
    let complete!: (result: { status: 'error'; error: string }) => void
    state.completeMfaLogin.mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve
      })
    )
    const wrapper = mountMfa()
    selected(wrapper).element.focus()
    await wrapper.get('input').setValue('123456')
    await wrapper.get('.action-group button').trigger('click')
    expect((await press('ArrowRight')).defaultPrevented).toBe(false)
    expect(selected(wrapper).text()).toBe('profile.mfaMethodTotp')
    expect(
      wrapper.findAll('[role="tab"]').map((tab) => tab.attributes('disabled') !== undefined)
    ).toEqual([true, true, true])
    expect(state.completeMfaLogin).toHaveBeenCalledOnce()
    expect(state.beginWebAuthnLogin).not.toHaveBeenCalled()
    complete({ status: 'error', error: 'auth.error.twoFactorInvalid' })
    await flushPromises()
    expect(selected(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('restores focus to an available tab when the focused method is removed', async () => {
    const wrapper = mountMfa()
    selected(wrapper).element.focus()
    await wrapper.setProps({ methods: ['backup_code', 'webauthn'] })
    await nextTick()
    expect(selected(wrapper).text()).toBe('profile.mfaMethodBackupCode')
    expect(document.activeElement).toBe(selected(wrapper).element)
  })

  it('does not steal focus outside the MFA step during a method update', async () => {
    const wrapper = mountMfa()
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    await wrapper.setProps({ methods: ['backup_code', 'webauthn'] })
    await nextTick()
    expect(document.activeElement).toBe(outside)
    expect(selected(wrapper).text()).toBe('profile.mfaMethodBackupCode')
  })

  it('moves focus into the remaining method when the tab list disappears', async () => {
    const wrapper = mountMfa()
    selected(wrapper).element.focus()
    await wrapper.setProps({ methods: ['totp'] })
    await nextTick()
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('input').element)
  })

  it('uses the shared keyboard behavior in a right-to-left tab list', async () => {
    const wrapper = mountMfa()
    wrapper.get<HTMLElement>('[role="tablist"]').element.style.direction = 'rtl'
    selected(wrapper).element.focus()
    await press('ArrowLeft')
    expect(selected(wrapper).text()).toBe('profile.mfaMethodWebauthn')
    expect(document.activeElement).toBe(selected(wrapper).element)
    expect(wrapper.get('[role="tabpanel"]').attributes('tabindex')).toBe('0')
    await press('ArrowRight')
    expect(selected(wrapper).text()).toBe('profile.mfaMethodTotp')
    expect(wrapper.get('[role="tabpanel"]').attributes('tabindex')).toBe('-1')
  })

  it('does not expose tabpanel semantics when only one method exists', () => {
    const wrapper = mountMfa(['totp'])
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
    expect(wrapper.find('[role="tabpanel"]').exists()).toBe(false)
    expect(wrapper.get('.auth-form').attributes('aria-labelledby')).toBeUndefined()
    expect(wrapper.get('input').attributes('inputmode')).toBe('numeric')
  })

  it('keeps two mounted instances independently labelled', () => {
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            'div',
            [0, 1].map((key) => h(AuthMfaStep, { key, pendingMfaLoginToken: 'fixture', methods }))
          ),
      }),
      { global, attachTo: document.body }
    )
    const ids = wrapper.findAll('[id]').map((node) => node.attributes('id'))
    expect(new Set(ids).size).toBe(ids.length)
    for (const node of wrapper.findAll('[aria-labelledby], [aria-controls]')) {
      const target = node.attributes('aria-labelledby') || node.attributes('aria-controls')
      expect(wrapper.findAll(`[id="${target}"]`)).toHaveLength(1)
    }
  })

  it('announces current errors and associates them with the code field', async () => {
    const wrapper = mountMfa()
    await wrapper.setProps({ errorMessage: 'Current verification failed' })
    const error = wrapper.get('[role="alert"]')
    expect(error.text()).toBe('Current verification failed')
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('input').attributes('aria-describedby')?.split(' ')).toContain(
      error.attributes('id')
    )
    await wrapper.setProps({ errorMessage: '' })
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('input').attributes('aria-invalid')).toBeUndefined()
  })
})
