import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const profileMocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  getProfile: vi.fn(),
  getDeletionStatus: vi.fn(),
  getDataSummary: vi.fn(),
  validateUsername: vi.fn(),
  updateProfile: vi.fn(),
  exportData: vi.fn(),
  deleteAccount: vi.fn(),
  uploadAvatar: vi.fn(),
  ensureVerificationToken: vi.fn(),
  isVerificationCancelledError: vi.fn(() => false),
  refreshAvatarCache: vi.fn(),
  checkPasswordStrength: vi.fn(() => ({ level: 'good' })),
  buildPasswordToggleLabel: vi.fn(() => 'toggle password'),
  getPasswordStrengthClass: vi.fn(() => 'strength-good'),
  getPasswordStrengthScore: vi.fn(() => 3),
  isEmailChangeAllowed: vi.fn(() => true),
  isPasswordChangeAllowed: vi.fn(() => true),
  passwordsMatch: vi.fn((next: string, confirm: string) => next === confirm),
}))

const authStoreState = reactive({
  user: {
    identity_provider: 'local',
    avatar_url: '',
  },
  logout: vi.fn(),
  fetchCurrentUser: vi.fn(),
})

const toastStoreState = reactive({
  success: vi.fn(),
  error: vi.fn(),
})

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: profileMocks.push,
    replace: profileMocks.replace,
  }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/api', () => {
  class MockApiError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  return {
    ApiError: MockApiError,
    normalizeAvatarUrl: (url: string) => url,
    userService: {
      getProfile: profileMocks.getProfile,
      getDeletionStatus: profileMocks.getDeletionStatus,
      getDataSummary: profileMocks.getDataSummary,
      validateUsername: profileMocks.validateUsername,
      updateProfile: profileMocks.updateProfile,
      exportData: profileMocks.exportData,
      deleteAccount: profileMocks.deleteAccount,
      uploadAvatar: profileMocks.uploadAvatar,
    },
  }
})

vi.mock('@/stores', () => ({
  useAuthStore: () => authStoreState,
  useToastStore: () => toastStoreState,
}))

vi.mock('@/composables/useUserAvatar', () => ({
  refreshAvatarCache: profileMocks.refreshAvatarCache,
}))

vi.mock('@/utils/crypto', () => ({
  checkPasswordStrength: profileMocks.checkPasswordStrength,
}))

vi.mock('@/api/verificationBridge', () => ({
  ensureVerificationToken: profileMocks.ensureVerificationToken,
  isVerificationCancelledError: profileMocks.isVerificationCancelledError,
}))

vi.mock('@/views/profile-settings/profileSettingsModel', () => ({
  buildPasswordToggleLabel: profileMocks.buildPasswordToggleLabel,
  getPasswordStrengthClass: profileMocks.getPasswordStrengthClass,
  getPasswordStrengthScore: profileMocks.getPasswordStrengthScore,
  isEmailChangeAllowed: profileMocks.isEmailChangeAllowed,
  isPasswordChangeAllowed: profileMocks.isPasswordChangeAllowed,
  passwordsMatch: profileMocks.passwordsMatch,
}))

vi.mock('@/components/ui/Button.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'MockButton',
      props: ['type', 'disabled', 'variant', 'size', 'loading'],
      emits: ['click'],
      template:
        '<button :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    }),
  }
})

vi.mock('@/components/ui/Input.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'MockInput',
      props: ['modelValue', 'type', 'placeholder', 'disabled', 'readonly', 'error'],
      emits: ['update:modelValue'],
      template:
        '<input :value="modelValue" :type="type || \'text\'" :placeholder="placeholder" :disabled="disabled" :readonly="readonly" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    }),
  }
})

vi.mock('@/components/ui/Textarea.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'MockTextarea',
      props: ['modelValue', 'rows', 'maxlength', 'placeholder'],
      emits: ['update:modelValue'],
      template:
        '<textarea :value="modelValue" :rows="rows" :maxlength="maxlength" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    }),
  }
})

vi.mock('@/components/ui/StateIndicator.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'StateIndicator',
      props: ['variant', 'description'],
      emits: ['action'],
      template:
        '<div data-testid="state-indicator" :data-variant="variant" :data-description="description" />',
    }),
  }
})

vi.mock('@/components/ui/Skeleton.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'Skeleton',
      template: '<div data-testid="skeleton" />',
    }),
  }
})

vi.mock('@/components/animation/AnimatedIcon.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'AnimatedIcon',
      template: '<span data-stub="animated-icon" />',
    }),
  }
})

vi.mock('@/components/profile/ProfileSubPageHeader.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'ProfileSubPageHeader',
      props: ['title', 'subtitle', 'hint'],
      template:
        '<header><h1>{{ title }}</h1><p>{{ subtitle }}</p><p>{{ hint }}</p><slot name="actions" /></header>',
    }),
  }
})

vi.mock('@/components/profile/ProfileSecurityMfaSection.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'ProfileSecurityMfaSection',
      template: '<section data-testid="mfa-section" />',
    }),
  }
})

vi.mock('@/components/ui/Dialog.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'MockDialog',
      props: ['isOpen', 'title', 'description'],
      emits: ['update:isOpen'],
      template:
        '<div data-testid="dialog" :data-open="String(isOpen)"><slot /><slot name="footer" /></div>',
    }),
  }
})

vi.mock('@/components/layout/SettingsPanel.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'SettingsPanel',
      props: ['allowedCategories', 'compact', 'embedded', 'showHeader'],
      template:
        '<div data-testid="settings-panel" :data-categories="(allowedCategories || []).join(\',\')" />',
    }),
  }
})

vi.mock('@/components/ui/SketchDropUploader.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'SketchDropUploader',
      props: ['modelValue'],
      emits: ['update:modelValue', 'selected', 'error'],
      template: '<div data-testid="uploader" />',
    }),
  }
})

vi.mock('@/components/ui/ImageCropper.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'ImageCropper',
      props: ['imageSrc'],
      emits: ['crop', 'cancel'],
      template: '<div data-testid="image-cropper" :data-image-src="imageSrc" />',
    }),
  }
})

import ProfileSettingsPage from '../ProfileSettingsPage.vue'

function createWrapper() {
  return mount(ProfileSettingsPage, {
    global: {
      stubs: {
        teleport: true,
        transition: false,
        AsyncComponentWrapper: {
          props: ['isOpen', 'action', 'targetEmail', 'verificationToken', 'imageSrc'],
          template:
            '<div data-testid="async-component-wrapper" :data-open="String(isOpen)" :data-action="action" :data-target-email="targetEmail" :data-token="verificationToken" :data-image-src="imageSrc" />',
        },
      },
      mocks: {
        $t: (key: string) => key,
      },
    },
  })
}

const baseProfile = {
  username: 'domidoremi',
  full_name: 'Domi',
  bio: 'Hello world',
  email: 'domi@example.com',
  created_at: '2026-04-01T00:00:00.000Z',
  avatar_url: '',
  identity_provider: 'local',
}

describe('ProfileSettingsPage', () => {
  beforeEach(() => {
    profileMocks.push.mockReset()
    profileMocks.replace.mockReset()
    profileMocks.getProfile.mockReset()
    profileMocks.getDeletionStatus.mockReset()
    profileMocks.getDataSummary.mockReset()
    profileMocks.validateUsername.mockReset()
    profileMocks.updateProfile.mockReset()
    profileMocks.exportData.mockReset()
    profileMocks.deleteAccount.mockReset()
    profileMocks.uploadAvatar.mockReset()
    profileMocks.ensureVerificationToken.mockReset()
    profileMocks.isVerificationCancelledError.mockReset()
    profileMocks.isVerificationCancelledError.mockReturnValue(false)
    profileMocks.refreshAvatarCache.mockReset()
    profileMocks.checkPasswordStrength.mockReset()
    profileMocks.checkPasswordStrength.mockReturnValue({ level: 'good' })
    profileMocks.buildPasswordToggleLabel.mockReset()
    profileMocks.buildPasswordToggleLabel.mockReturnValue('toggle password')
    profileMocks.getPasswordStrengthClass.mockReset()
    profileMocks.getPasswordStrengthClass.mockReturnValue('strength-good')
    profileMocks.getPasswordStrengthScore.mockReset()
    profileMocks.getPasswordStrengthScore.mockReturnValue(3)
    profileMocks.isEmailChangeAllowed.mockReset()
    profileMocks.isEmailChangeAllowed.mockReturnValue(true)
    profileMocks.isPasswordChangeAllowed.mockReset()
    profileMocks.isPasswordChangeAllowed.mockReturnValue(true)
    profileMocks.passwordsMatch.mockReset()
    profileMocks.passwordsMatch.mockImplementation(
      (next: string, confirm: string) => next === confirm
    )

    toastStoreState.success.mockReset()
    toastStoreState.error.mockReset()
    authStoreState.logout.mockReset()
    authStoreState.fetchCurrentUser.mockReset()

    profileMocks.getProfile.mockResolvedValue({ ...baseProfile })
    profileMocks.getDeletionStatus.mockResolvedValue({
      is_deleted: false,
      can_restore: false,
      days_remaining: null,
    })
    profileMocks.getDataSummary.mockResolvedValue({
      username: 'domidoremi',
      email: 'domi@example.com',
      created_at: '2026-04-01T00:00:00.000Z',
      data_counts: {
        favorites: 2,
        comments: 3,
      },
    })
    profileMocks.validateUsername.mockReturnValue({ valid: true })
    profileMocks.updateProfile.mockResolvedValue({
      ...baseProfile,
      full_name: 'Updated Domi',
      bio: 'Updated bio',
    })
    profileMocks.ensureVerificationToken.mockResolvedValue('verify-token')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('loads profile dashboard, refreshes data, and switches embedded settings groups', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(profileMocks.getProfile).toHaveBeenCalledTimes(1)
    expect(profileMocks.getDeletionStatus).toHaveBeenCalledTimes(1)
    expect(profileMocks.getDataSummary).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Domi')
    expect(wrapper.text()).toContain('domi@example.com')
    expect(wrapper.text()).toContain('profile.dataSummaryTitle')

    await wrapper
      .findAll('.settings-group-switcher__item')
      .find((item) => item.text().includes('settings.categoryAppearance'))!
      .trigger('click')

    expect(wrapper.get('[data-testid="settings-panel"]').attributes('data-categories')).toBe(
      'appearance,experience'
    )
    expect(wrapper.text()).toContain('settings.appearanceLead')
    expect(wrapper.text()).toContain('settings.openStyleGallery')

    await wrapper
      .findAll('.settings-group-switcher__item')
      .find((item) => item.text().includes('settings.categoryPrivacy'))!
      .trigger('click')

    const panels = wrapper.findAll('[data-testid="settings-panel"]')
    expect(panels.at(-1)?.attributes('data-categories')).toBe('privacy')

    await wrapper.find('header button').trigger('click')
    await flushPromises()

    expect(profileMocks.getProfile).toHaveBeenCalledTimes(2)
    expect(profileMocks.getDeletionStatus).toHaveBeenCalledTimes(2)
    expect(profileMocks.getDataSummary).toHaveBeenCalledTimes(2)
  })

  it('opens the style gallery from the appearance callout', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const styleGalleryButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('settings.openStyleGallery'))

    expect(styleGalleryButton).toBeTruthy()

    await styleGalleryButton!.trigger('click')

    expect(profileMocks.push).toHaveBeenCalledWith('/style-gallery')
  })

  it('saves profile updates and opens email verification flow for email change', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const inputs = wrapper.findAll('input')
    await inputs[1].setValue('Updated Domi')
    await wrapper.find('textarea').setValue('Updated bio')
    await wrapper.get('form.settings-form').trigger('submit')
    await flushPromises()

    expect(profileMocks.updateProfile).toHaveBeenCalledWith({
      username: undefined,
      full_name: 'Updated Domi',
      bio: 'Updated bio',
    })
    expect(toastStoreState.success).toHaveBeenCalledWith('profile.updateSuccess')

    const forms = wrapper.findAll('form')
    const emailForm = forms[1]
    const emailInputs = emailForm.findAll('input')
    await emailInputs[0].setValue('new@example.com')
    await emailInputs[1].setValue('current-password')
    await emailForm.trigger('submit')
    await flushPromises()

    expect(profileMocks.ensureVerificationToken).toHaveBeenCalledWith('change_email', {
      password: 'current-password',
    })
    expect(toastStoreState.error).not.toHaveBeenCalled()
  })
})
