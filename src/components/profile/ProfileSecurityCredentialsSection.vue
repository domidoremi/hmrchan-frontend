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
              :type="showCurrentPassword ? 'text' : 'password'"
              class="input-with-icon"
              autocomplete="current-password"
              required
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="passwordToggleLabel(showCurrentPassword)"
              :aria-pressed="showCurrentPassword"
              @click="showCurrentPassword = !showCurrentPassword"
            >
              <AnimatedIcon
                v-if="showCurrentPassword"
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
              :type="showNewPassword ? 'text' : 'password'"
              class="input-with-icon"
              autocomplete="new-password"
              minlength="8"
              required
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="passwordToggleLabel(showNewPassword)"
              :aria-pressed="showNewPassword"
              @click="showNewPassword = !showNewPassword"
            >
              <AnimatedIcon
                v-if="showNewPassword"
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
              :type="showConfirmPassword ? 'text' : 'password'"
              class="input-with-icon"
              :error="Boolean(passwordForm.confirm_password && !passwordsMatch)"
              autocomplete="new-password"
              required
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="passwordToggleLabel(showConfirmPassword)"
              :aria-pressed="showConfirmPassword"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <AnimatedIcon
                v-if="showConfirmPassword"
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
        <p class="field-hint">{{ $t('profile.authSourceGoogleHint') }}</p>
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
              :type="showEmailPassword ? 'text' : 'password'"
              class="input-with-icon"
              autocomplete="current-password"
              required
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="passwordToggleLabel(showEmailPassword)"
              :aria-pressed="showEmailPassword"
              @click="showEmailPassword = !showEmailPassword"
            >
              <AnimatedIcon
                v-if="showEmailPassword"
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
      :is-open="showEmailVerify"
      :action="emailVerifyAction"
      :email="profile.email"
      :target-email="emailVerifyTarget"
      :password="emailVerifyPassword"
      :verification-token="emailVerificationToken"
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
  buildPasswordToggleLabel,
  getPasswordStrengthClass,
  getPasswordStrengthScore,
  isEmailChangeAllowed,
  isPasswordChangeAllowed,
  passwordsMatch as checkPasswordsMatch,
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

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const showEmailPassword = ref(false)
const isChangingPassword = ref(false)
const isChangingEmail = ref(false)

const passwordForm = ref({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

const emailForm = ref({
  new_email: '',
  password: '',
})

const showEmailVerify = ref(false)
const emailVerifyAction = ref('')
const emailVerificationToken = ref('')
type PendingAction = 'change_email' | 'change_password'
const pendingAction = ref<PendingAction | null>(null)

const normalizedIdentityProvider = computed(() => {
  const provider = props.profile.identity_provider ?? props.authUser?.identity_provider
  return provider?.trim().toLowerCase() || 'local'
})

const canUsePasswordFlow = computed(() => normalizedIdentityProvider.value === 'local')

const authSourceSummaryLabel = computed(() => {
  if (normalizedIdentityProvider.value === 'google') {
    return t('profile.authSourceGoogle')
  }
  if (normalizedIdentityProvider.value !== 'local') {
    return t('profile.authSourceThirdParty')
  }
  return t('profile.authSourceEmail')
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
const passwordStrengthText = computed(() => {
  const { level } = passwordStrengthResult.value
  return {
    weak: t('profile.passwordWeak'),
    fair: t('profile.passwordFair'),
    good: t('profile.passwordGood'),
    strong: t('profile.passwordStrong'),
  }[level]
})

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

const emailVerifyTarget = computed(() =>
  pendingAction.value === 'change_email' ? emailForm.value.new_email : undefined
)
const emailVerifyPassword = computed(() => {
  if (pendingAction.value === 'change_password') return passwordForm.value.current_password
  if (pendingAction.value === 'change_email') return emailForm.value.password
  return undefined
})
const emailVerifyNewPassword = computed(() =>
  pendingAction.value === 'change_password' ? passwordForm.value.new_password : undefined
)

function passwordToggleLabel(visible: boolean): string {
  return buildPasswordToggleLabel({
    visible,
    showLabel: t('common.show'),
    hideLabel: t('common.hide'),
    fieldLabel: t('auth.password'),
  })
}

async function changePassword() {
  if (isChangingPassword.value || !canUsePasswordFlow.value) return

  if (!passwordsMatch.value) {
    toastStore.error(t('profile.passwordMismatch'))
    return
  }
  if (passwordForm.value.new_password.length < 8) {
    toastStore.error(t('profile.passwordTooShort'))
    return
  }

  isChangingPassword.value = true
  try {
    emailVerificationToken.value = await ensureVerificationToken('change_password', {
      password: passwordForm.value.current_password,
    })
    pendingAction.value = 'change_password'
    emailVerifyAction.value = 'change_password'
    showEmailVerify.value = true
  } catch (err) {
    if (isVerificationCancelledError(err)) return
    toastStore.error(err instanceof ApiError ? err.message : t('common.error'))
  } finally {
    isChangingPassword.value = false
  }
}

async function handleChangeEmail() {
  if (!canChangeEmail.value || isChangingEmail.value) return

  isChangingEmail.value = true
  try {
    emailVerificationToken.value = await ensureVerificationToken('change_email', {
      password: emailForm.value.password,
    })
    pendingAction.value = 'change_email'
    emailVerifyAction.value = 'change_email'
    showEmailVerify.value = true
  } catch (err) {
    if (isVerificationCancelledError(err)) return
    toastStore.error(err instanceof ApiError ? err.message : t('common.error'))
  } finally {
    isChangingEmail.value = false
  }
}

function handleEmailVerifyClose() {
  showEmailVerify.value = false
  pendingAction.value = null
  emailVerifyAction.value = ''
  emailVerificationToken.value = ''
}

async function handleEmailVerified() {
  showEmailVerify.value = false

  if (pendingAction.value === 'change_email') {
    toastStore.success(t('email.changeEmailSuccess'))
    emailForm.value = { new_email: '', password: '' }
    emit('refreshed')
    await authStore.fetchCurrentUser()
  } else if (pendingAction.value === 'change_password') {
    toastStore.success(t('profile.passwordChanged'))
    passwordForm.value = {
      current_password: '',
      new_password: '',
      confirm_password: '',
    }
  }

  pendingAction.value = null
  emailVerifyAction.value = ''
  emailVerificationToken.value = ''
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
