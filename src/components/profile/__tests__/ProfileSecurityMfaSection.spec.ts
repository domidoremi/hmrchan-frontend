import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const testState = vi.hoisted(() => ({
  twoFactorService: {
    getStatus: vi.fn(),
    updateWebAuthnCredential: vi.fn(),
    deleteWebAuthnCredential: vi.fn(),
    setup: vi.fn(),
    verify: vi.fn(),
    disable: vi.fn(),
    regenerateBackupCodes: vi.fn(),
    beginWebAuthnRegistration: vi.fn(),
    finishWebAuthnRegistration: vi.fn(),
  },
  toastStore: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: { value: 'en' },
  }),
}))

vi.mock('@/api', () => ({
  twoFactorService: testState.twoFactorService,
  ApiError: class ApiError extends Error {},
}))

vi.mock('@/stores', () => ({
  useToastStore: () => testState.toastStore,
}))

vi.mock('@/utils/webauthn', () => ({
  createWebAuthnCredential: vi.fn(),
  isWebAuthnSupported: vi.fn(() => true),
  serializePublicKeyCredential: vi.fn(),
}))

vi.mock('@/components/animation/AnimatedIcon.vue', () => ({
  default: defineComponent({ name: 'AnimatedIcon', template: '<span data-testid="icon" />' }),
}))

import ProfileSecurityMfaSection from '../ProfileSecurityMfaSection.vue'

const passkeyCredential = {
  id: 'credential-1',
  device_name: 'Laptop',
  created_at: '2026-04-20T00:00:00.000Z',
  last_used_at: '2026-04-20T01:00:00.000Z',
  transports: ['internal', 'usb'],
  discoverable: true,
  backup_eligible: true,
  backup_state: false,
  authenticator_attachment: 'platform',
}

function statusResponse(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    totp_enabled: false,
    totp_pending_setup: false,
    has_backup_codes: false,
    methods: ['webauthn'],
    webauthn_credentials: [passkeyCredential],
    ...overrides,
  }
}

function mountSection() {
  return mount(ProfileSecurityMfaSection, {
    props: {
      profile: null,
      authUser: null,
    },
    global: {
      mocks: {
        $t: (key: string) => key,
      },
      stubs: {
        Button: defineComponent({
          name: 'UiButtonStub',
          props: ['disabled', 'loading', 'size', 'type', 'variant'],
          emits: ['click'],
          template:
            '<button :disabled="disabled || loading" type="button" @click="$emit(\'click\')"><slot /></button>',
        }),
        Input: defineComponent({
          name: 'UiInputStub',
          props: ['modelValue', 'value', 'type', 'placeholder', 'ariaLabel'],
          emits: ['update:modelValue', 'input'],
          template:
            '<input :value="modelValue ?? value" @input="$emit(\'update:modelValue\', $event.target.value); $emit(\'input\', $event)" />',
        }),
      },
    },
  })
}

describe('ProfileSecurityMfaSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    testState.twoFactorService.getStatus.mockResolvedValue(statusResponse())
    testState.twoFactorService.updateWebAuthnCredential.mockResolvedValue(passkeyCredential)
    testState.twoFactorService.deleteWebAuthnCredential.mockResolvedValue({ success: true })
    testState.toastStore.success.mockReset()
    testState.toastStore.error.mockReset()
    testState.toastStore.warning.mockReset()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('renders passkey metadata from 2FA status', async () => {
    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.text()).toContain('Laptop')
    expect(wrapper.text()).toContain('profile.passkeyDiscoverable')
    expect(wrapper.text()).toContain('common.yes')
    expect(wrapper.text()).toContain('profile.passkeyAttachmentPlatform')
    expect(wrapper.text()).toContain('internal, usb')
  })

  it('renames and deletes passkeys then refreshes status', async () => {
    const wrapper = mountSection()
    await flushPromises()

    const renameInput = wrapper.find('.passkey-rename-input')
    expect(renameInput.exists()).toBe(true)
    await renameInput.setValue('Work laptop')

    const saveButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('common.save'))
    expect(saveButton).toBeDefined()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(testState.twoFactorService.updateWebAuthnCredential).toHaveBeenCalledWith(
      'credential-1',
      'Work laptop'
    )

    const deleteButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('common.delete'))
    expect(deleteButton).toBeDefined()
    await deleteButton!.trigger('click')
    await flushPromises()

    expect(testState.twoFactorService.deleteWebAuthnCredential).toHaveBeenCalledWith('credential-1')
    expect(testState.twoFactorService.getStatus).toHaveBeenCalledTimes(4)
  })
})
