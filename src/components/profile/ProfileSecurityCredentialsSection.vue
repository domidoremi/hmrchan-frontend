<template>
  <div class="profile-security-credentials" data-testid="profile-security-credentials">
    <section class="settings-section glass-surface--editorial password-section">
      <div class="settings-section-head">
        <div class="settings-section-icon settings-section-icon--warning">
          <AnimatedIcon name="sparkle" :fallback-icon="Shield" size="sm" />
        </div>
        <div>
          <h2 class="settings-section-title">{{ $t('profile.changePassword') }}</h2>
          <p class="settings-section-desc">{{ $t('profile.passwordHint') }}</p>
        </div>
      </div>

      <form v-if="canUsePasswordFlow" @submit.prevent="changePassword">
        <input
          type="text"
          :value="profile.username"
          autocomplete="username"
          class="sr-only"
          tabindex="-1"
          aria-hidden="true"
          :aria-label="$t('profile.username')"
          readonly
        />

        <div class="form-group">
          <label for="security-current-password">
            <AnimatedIcon name="sparkle" :fallback-icon="Key" size="sm" />
            {{ $t('profile.currentPassword') }}
          </label>
          <div class="input-wrapper">
            <Input
              id="security-current-password"
              v-model="passwordForm.current_password"
              :type="resolveCredentialPasswordInputType(passwordVisibility.currentPassword)"
              class="input-with-icon"
              autocomplete="current-password"
              required
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="passwordToggleLabel(passwordVisibility.currentPassword)"
              :aria-pressed="passwordVisibility.currentPassword"
              @click="togglePasswordVisibility('currentPassword')"
            >
              <AnimatedIcon
                v-if="passwordVisibility.currentPassword"
                name="explore"
                :fallback-icon="EyeOff"
                size="sm"
              />
              <AnimatedIcon v-else name="explore" :fallback-icon="Eye" size="sm" />
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="security-new-password">
            <AnimatedIcon name="sparkle" :fallback-icon="Lock" size="sm" />
            {{ $t('profile.newPassword') }}
          </label>
          <div class="input-wrapper">
            <Input
              id="security-new-password"
              v-model="passwordForm.new_password"
              :type="resolveCredentialPasswordInputType(passwordVisibility.newPassword)"
              class="input-with-icon"
              autocomplete="new-password"
              minlength="8"
              required
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="passwordToggleLabel(passwordVisibility.newPassword)"
              :aria-pressed="passwordVisibility.newPassword"
              @click="togglePasswordVisibility('newPassword')"
            >
              <AnimatedIcon
                v-if="passwordVisibility.newPassword"
                name="explore"
                :fallback-icon="EyeOff"
                size="sm"
              />
              <AnimatedIcon v-else name="explore" :fallback-icon="Eye" size="sm" />
            </button>
          </div>
          <div v-if="passwordForm.new_password" class="password-strength">
            <div class="strength-bar">
              <div
                class="strength-fill"
                :class="passwordStrengthClass"
                :style="{ width: `${passwordStrength * 25}%` }"
              />
            </div>
            <span class="strength-text" :class="passwordStrengthClass">
              {{ passwordStrengthText }}
            </span>
          </div>
        </div>

        <div class="form-group">
          <label for="security-confirm-password">
            <AnimatedIcon name="sparkle" :fallback-icon="CheckCircle" size="sm" />
            {{ $t('profile.confirmPassword') }}
          </label>
          <div class="input-wrapper">
            <Input
              id="security-confirm-password"
              v-model="passwordForm.confirm_password"
              :type="resolveCredentialPasswordInputType(passwordVisibility.confirmPassword)"
              class="input-with-icon"
              :error="Boolean(passwordForm.confirm_password && !passwordsMatch)"
              autocomplete="new-password"
              required
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="passwordToggleLabel(passwordVisibility.confirmPassword)"
              :aria-pressed="passwordVisibility.confirmPassword"
              @click="togglePasswordVisibility('confirmPassword')"
            >
              <AnimatedIcon
                v-if="passwordVisibility.confirmPassword"
                name="explore"
                :fallback-icon="EyeOff"
                size="sm"
              />
              <AnimatedIcon v-else name="explore" :fallback-icon="Eye" size="sm" />
            </button>
          </div>
          <p v-if="passwordForm.confirm_password && !passwordsMatch" class="field-error">
            {{ $t('profile.passwordMismatch') }}
          </p>
        </div>

        <div class="form-actions">
          <Button
            type="submit"
            variant="secondary"
            :disabled="isChangingPassword || !canChangePassword"
          >
            <span v-if="isChangingPassword" class="spinner spinner-sm" />
            <AnimatedIcon v-else name="sparkle" :fallback-icon="Shield" size="sm" />
            {{ $t('profile.changePassword') }}
          </Button>
        </div>
      </form>

      <div v-else class="provider-managed-note">
        <p class="two-factor-status-label">{{ $t('profile.loginMethodCurrentLabel') }}</p>
        <p class="two-factor-status-value">{{ authSourceSummaryLabel }}</p>
        <p class="field-hint">{{ authSourceSummaryHint }}</p>
      </div>
    </section>

    <section id="email" class="settings-section glass-surface--editorial email-section">
      <div class="settings-section-head">
        <div class="settings-section-icon">
          <AnimatedIcon name="explore" :fallback-icon="Mail" size="sm" />
        </div>
        <div>
          <h2 class="settings-section-title">{{ $t('email.changeEmailTitle') }}</h2>
          <p class="settings-section-desc">{{ $t('email.changeEmailHint') }}</p>
        </div>
      </div>

      <div class="form-group">
        <label for="security-current-email">
          <AnimatedIcon name="explore" :fallback-icon="Mail" size="sm" />
          {{ $t('email.currentEmail') }}
        </label>
        <div class="input-wrapper input-readonly">
          <Input
            id="security-current-email"
            :model-value="profile.email"
            type="email"
            class="input-with-icon"
            autocomplete="email"
            disabled
            readonly
          />
          <AnimatedIcon name="sparkle" :fallback-icon="Lock" size="sm" class="input-icon-right" />
        </div>
      </div>

      <form @submit.prevent="handleChangeEmail">
        <div class="form-group">
          <label for="security-new-email">
            <AnimatedIcon name="explore" :fallback-icon="Mail" size="sm" />
            {{ $t('email.newEmail') }}
          </label>
          <div class="input-wrapper">
            <Input
              id="security-new-email"
              v-model="emailForm.new_email"
              type="email"
              class="input-with-icon"
              :placeholder="$t('email.newEmailPlaceholder')"
              autocomplete="email"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label for="security-email-password">
            <AnimatedIcon name="sparkle" :fallback-icon="Key" size="sm" />
            {{ $t('email.confirmWithPassword') }}
          </label>
          <div class="input-wrapper">
            <Input
              id="security-email-password"
              v-model="emailForm.password"
              :type="resolveCredentialPasswordInputType(passwordVisibility.emailPassword)"
              class="input-with-icon"
              autocomplete="current-password"
              required
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="passwordToggleLabel(passwordVisibility.emailPassword)"
              :aria-pressed="passwordVisibility.emailPassword"
              @click="togglePasswordVisibility('emailPassword')"
            >
              <AnimatedIcon
                v-if="passwordVisibility.emailPassword"
                name="explore"
                :fallback-icon="EyeOff"
                size="sm"
              />
              <AnimatedIcon v-else name="explore" :fallback-icon="Eye" size="sm" />
            </button>
          </div>
          <p class="field-hint">{{ $t('email.changeEmailVerifyHint') }}</p>
        </div>

        <div class="form-actions">
          <Button type="submit" variant="secondary" :disabled="isChangingEmail || !canChangeEmail">
            <span v-if="isChangingEmail" class="spinner spinner-sm" />
            <AnimatedIcon v-else name="explore" :fallback-icon="Mail" size="sm" />
            {{ $t('email.changeEmailButton') }}
          </Button>
        </div>
      </form>
    </section>

    <EmailVerifyDialog
      :is-open="credentialVerificationDialog.isOpen"
      :action="credentialVerificationDialog.action"
      :email="profile.email"
      :target-email="emailVerifyTarget"
      :password="emailVerifyPassword"
      :verification-token="credentialVerificationDialog.verificationToken"
      :new-password="emailVerifyNewPassword"
      @close="handleEmailVerifyClose"
      @verified="handleEmailVerified"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckCircle, Eye, EyeOff, Key, Lock, Mail, Shield } from '@lucide/vue'
import { ApiError, type UserProfile } from '@/api'
import { ensureVerificationToken, isVerificationCancelledError } from '@/api/verificationBridge'
import { useAuthStore, useToastStore } from '@/stores'
import { checkPasswordStrength } from '@/utils/crypto'
import {
  buildCredentialVerificationPayload,
  buildCredentialVerificationDialogState,
  buildClosedCredentialVerificationDialogState,
  buildPasswordToggleLabel,
  canUsePasswordCredentialsFlow,
  createCredentialEmailForm,
  createCredentialPasswordForm,
  createCredentialPasswordVisibilityState,
  getPasswordStrengthClass,
  getPasswordStrengthScore,
  getPasswordStrengthTextKey,
  isEmailChangeAllowed,
  isPasswordChangeAllowed,
  passwordsMatch as checkPasswordsMatch,
  type CredentialVerificationDialogState,
  type CredentialPasswordVisibilityField,
  resolveCredentialPasswordInputType,
  resolveEmailChangeSubmitBlocker,
  resolveCredentialVerificationSuccessOutcome,
  resolvePasswordChangeSubmitErrorKey,
  resolvePasswordChangeSubmitBlocker,
  resolveAuthSourceSummaryHintKey,
  resolveAuthSourceSummaryLabel,
  resolveIdentityProvider,
  toggleCredentialPasswordVisibility,
} from '@/views/profile-settings/profileSettingsModel'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'

defineOptions({ name: 'ProfileSecurityCredentialsSection' })

const props = defineProps<{
  profile: UserProfile
  authUser?: { identity_provider?: string | null } | null
}>()

const emit = defineEmits<{
  refreshed: []
}>()

const EmailVerifyDialog = defineAsyncComponent(
  () => import('@/components/ui/EmailVerifyDialog.vue')
)

const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()

const isChangingPassword = ref(false)
const isChangingEmail = ref(false)

const passwordVisibility = ref(createCredentialPasswordVisibilityState())
const passwordForm = ref(createCredentialPasswordForm())

const emailForm = ref(createCredentialEmailForm())

const credentialVerificationDialog = ref(buildClosedCredentialVerificationDialogState())

function applyCredentialVerificationDialogState(state: CredentialVerificationDialogState) {
  credentialVerificationDialog.value = state
}

const normalizedIdentityProvider = computed(() => {
  return resolveIdentityProvider({
    profileProvider: props.profile.identity_provider,
    authProvider: props.authUser?.identity_provider,
  })
})

const canUsePasswordFlow = computed(() =>
  canUsePasswordCredentialsFlow(normalizedIdentityProvider.value)
)

const authSourceSummaryLabel = computed(() => {
  return resolveAuthSourceSummaryLabel({
    provider: normalizedIdentityProvider.value,
    googleLabel: t('profile.authSourceGoogle'),
    thirdPartyLabel: t('profile.authSourceThirdParty'),
    emailLabel: t('profile.authSourceEmail'),
    thirdPartyProviderLabel: props.authUser?.identity_provider,
  })
})

const authSourceSummaryHint = computed(() => {
  return t(resolveAuthSourceSummaryHintKey(normalizedIdentityProvider.value))
})

const canChangeEmail = computed(() =>
  isEmailChangeAllowed({
    currentEmail: props.profile.email,
    nextEmail: emailForm.value.new_email,
    password: emailForm.value.password,
  })
)

const passwordStrengthResult = computed(() =>
  checkPasswordStrength(passwordForm.value.new_password)
)
const passwordStrength = computed(() =>
  getPasswordStrengthScore(passwordStrengthResult.value.level)
)
const passwordStrengthClass = computed(() =>
  getPasswordStrengthClass(passwordStrengthResult.value.level)
)
const passwordStrengthText = computed(() =>
  t(getPasswordStrengthTextKey(passwordStrengthResult.value.level))
)

const passwordsMatch = computed(() =>
  checkPasswordsMatch(passwordForm.value.new_password, passwordForm.value.confirm_password)
)

const canChangePassword = computed(() =>
  isPasswordChangeAllowed({
    currentPassword: passwordForm.value.current_password,
    nextPassword: passwordForm.value.new_password,
    confirmPassword: passwordForm.value.confirm_password,
  })
)

const credentialVerificationPayload = computed(() =>
  buildCredentialVerificationPayload({
    pendingAction: credentialVerificationDialog.value.pendingAction,
    nextEmail: emailForm.value.new_email,
    emailPassword: emailForm.value.password,
    currentPassword: passwordForm.value.current_password,
    nextPassword: passwordForm.value.new_password,
  })
)

const emailVerifyTarget = computed(() => credentialVerificationPayload.value.targetEmail)
const emailVerifyPassword = computed(() => credentialVerificationPayload.value.password)
const emailVerifyNewPassword = computed(() => credentialVerificationPayload.value.newPassword)

function passwordToggleLabel(visible: boolean): string {
  return buildPasswordToggleLabel({
    visible,
    showLabel: t('common.show'),
    hideLabel: t('common.hide'),
    fieldLabel: t('auth.password'),
  })
}

function togglePasswordVisibility(field: CredentialPasswordVisibilityField) {
  passwordVisibility.value = toggleCredentialPasswordVisibility(passwordVisibility.value, field)
}

async function changePassword() {
  const blocker = resolvePasswordChangeSubmitBlocker({
    isChangingPassword: isChangingPassword.value,
    canUsePasswordFlow: canUsePasswordFlow.value,
    nextPassword: passwordForm.value.new_password,
    passwordsMatch: passwordsMatch.value,
  })

  const blockerErrorKey = resolvePasswordChangeSubmitErrorKey(blocker)
  if (blockerErrorKey) {
    toastStore.error(t(blockerErrorKey))
    return
  }
  if (blocker) {
    return
  }

  isChangingPassword.value = true
  try {
    const verificationToken = await ensureVerificationToken('change_password', {
      password: passwordForm.value.current_password,
    })
    applyCredentialVerificationDialogState(
      buildCredentialVerificationDialogState({
        action: 'change_password',
        verificationToken,
      })
    )
  } catch (err) {
    if (isVerificationCancelledError(err)) return
    toastStore.error(err instanceof ApiError ? err.message : t('common.error'))
  } finally {
    isChangingPassword.value = false
  }
}

async function handleChangeEmail() {
  const blocker = resolveEmailChangeSubmitBlocker({
    isChangingEmail: isChangingEmail.value,
    canChangeEmail: canChangeEmail.value,
  })
  if (blocker) return

  isChangingEmail.value = true
  try {
    const verificationToken = await ensureVerificationToken('change_email', {
      password: emailForm.value.password,
    })
    applyCredentialVerificationDialogState(
      buildCredentialVerificationDialogState({
        action: 'change_email',
        verificationToken,
      })
    )
  } catch (err) {
    if (isVerificationCancelledError(err)) return
    toastStore.error(err instanceof ApiError ? err.message : t('common.error'))
  } finally {
    isChangingEmail.value = false
  }
}

function handleEmailVerifyClose() {
  applyCredentialVerificationDialogState(buildClosedCredentialVerificationDialogState())
}

async function handleEmailVerified() {
  const pendingAction = credentialVerificationDialog.value.pendingAction
  credentialVerificationDialog.value = {
    ...credentialVerificationDialog.value,
    isOpen: false,
  }
  const outcome = resolveCredentialVerificationSuccessOutcome(pendingAction)

  if (outcome.successMessageKey) {
    toastStore.success(t(outcome.successMessageKey))
  }
  if (outcome.resetEmailForm) {
    emailForm.value = createCredentialEmailForm()
    emit('refreshed')
  }
  if (outcome.refreshProfile) {
    await authStore.fetchCurrentUser()
  }
  if (outcome.resetPasswordForm) {
    passwordForm.value = createCredentialPasswordForm()
  }

  applyCredentialVerificationDialogState(buildClosedCredentialVerificationDialogState())
}
</script>

<style scoped>
.profile-security-credentials {
  display: grid;
  gap: clamp(1rem, 2vw, 1.25rem);
}

.provider-managed-note {
  display: grid;
  gap: 0.35rem;
  padding: clamp(0.875rem, 2vw, 1rem);
  border-radius: var(--profile-section-radius);
  border: 1px solid var(--ui-compat-border);
  background: var(--ui-compat-surface-interactive);
}
</style>
