<template>
  <div class="security-mfa-panel">
    <section class="settings-section glass-surface--editorial two-factor-section">
      <div class="settings-section-head">
        <div class="settings-section-icon settings-section-icon--success">
          <AnimatedIcon name="sparkle" :fallback-icon="Shield" size="sm" />
        </div>
        <div>
          <h2 class="settings-section-title">{{ $t('profile.loginMethodTitle') }}</h2>
          <p class="settings-section-desc">{{ $t('profile.loginMethodHint') }}</p>
        </div>
      </div>

      <div class="two-factor-status-card">
        <div class="two-factor-status-copy">
          <p class="two-factor-status-label">{{ $t('profile.loginMethodCurrentLabel') }}</p>
          <p class="two-factor-status-value">{{ authSourceSummaryLabel }}</p>
          <p class="field-hint">{{ authSourceSummaryHint }}</p>
        </div>

        <div class="two-factor-actions">
          <Button
            v-if="!status?.totp_enabled"
            type="button"
            variant="secondary"
            :loading="isSettingUpTotp"
            @click="handleSetupTotp"
          >
            {{ $t('profile.twoFactorSetupAction') }}
          </Button>
          <Button
            type="button"
            variant="ghost"
            :loading="isRegisteringPasskey"
            @click="handleRegisterPasskey"
          >
            {{ $t('profile.passkeyAddAction') }}
          </Button>
        </div>
      </div>

      <div class="account-meta-grid auth-method-meta-grid">
        <div class="account-meta-item">
          <span class="account-meta-label">{{ $t('profile.authSourceLabel') }}</span>
          <span class="account-meta-value">{{ authSourceSummaryLabel }}</span>
        </div>
        <div class="account-meta-item">
          <span class="account-meta-label">{{ $t('profile.identityProviderLabel') }}</span>
          <span class="account-meta-value">{{ primaryIdentityProviderLabel }}</span>
        </div>
        <div class="account-meta-item">
          <span class="account-meta-label">{{ $t('profile.linkedProvidersLabel') }}</span>
          <span class="account-meta-value">{{ linkedProvidersLabel }}</span>
        </div>
        <div class="account-meta-item">
          <span class="account-meta-label">{{ $t('profile.twoFactorSummaryLabel') }}</span>
          <span class="account-meta-value">{{ localizedMethodSummary }}</span>
        </div>
      </div>
    </section>

    <section class="settings-section glass-surface--editorial two-factor-section">
      <div class="settings-section-head">
        <div class="settings-section-icon settings-section-icon--success">
          <AnimatedIcon name="sparkle" :fallback-icon="Shield" size="sm" />
        </div>
        <div>
          <h2 class="settings-section-title">{{ $t('profile.twoFactorTitle') }}</h2>
          <p class="settings-section-desc">{{ $t('profile.twoFactorHint') }}</p>
        </div>
      </div>

      <p v-if="statusError" class="field-error">{{ statusError }}</p>

      <div class="two-factor-status-card">
        <div class="two-factor-status-copy">
          <p class="two-factor-status-label">{{ $t('profile.twoFactorStatusLabel') }}</p>
          <p class="two-factor-status-value">{{ mfaStatusLabel }}</p>
          <p class="field-hint">{{ mfaStatusHint }}</p>
        </div>

        <div class="two-factor-actions">
          <Button
            v-if="!status?.totp_enabled"
            type="button"
            variant="secondary"
            :loading="isSettingUpTotp"
            @click="handleSetupTotp"
          >
            {{ $t('profile.twoFactorSetupAction') }}
          </Button>
          <Button
            type="button"
            variant="ghost"
            :loading="isRegisteringPasskey"
            @click="handleRegisterPasskey"
          >
            {{ $t('profile.passkeyAddAction') }}
          </Button>
          <Button
            v-if="status?.enabled"
            type="button"
            variant="ghost"
            :loading="isRefreshingStatus"
            @click="fetchStatus"
          >
            {{ $t('common.refresh') }}
          </Button>
        </div>
      </div>

      <div v-if="status?.methods?.length" class="method-chip-row">
        <span v-for="method in localizedMethodList" :key="method" class="method-chip">
          {{ method }}
        </span>
      </div>

      <div v-if="showTotpSetup && totpSetup" class="two-factor-setup">
        <div class="two-factor-setup-qr">
          <div class="two-factor-secret-card">
            <span class="two-factor-secret-label">{{
              $t('profile.twoFactorSetupInstructions')
            }}</span>
            <span class="two-factor-secret-value">{{ totpSetup.secret }}</span>
            <div class="two-factor-actions two-factor-actions--stacked">
              <Button type="button" variant="ghost" size="sm" @click="copySecret">
                {{ $t('profile.twoFactorCopySecret') }}
              </Button>
              <Button type="button" variant="ghost" size="sm" @click="copyOtpAuthUrl">
                {{ $t('profile.twoFactorCopyOtpAuthUrl') }}
              </Button>
            </div>
          </div>
        </div>

        <div class="two-factor-setup-details">
          <div class="two-factor-secret-card">
            <span class="two-factor-secret-label">{{ $t('profile.twoFactorManualCode') }}</span>
            <span class="two-factor-secret-value two-factor-secret-value--wrap">
              {{ totpSetup.otpauth_url }}
            </span>
          </div>

          <form class="auth-form" @submit.prevent="handleVerifyTotpSetup">
            <div class="form-group">
              <label for="totp-setup-code">{{ $t('profile.twoFactorVerifyCodeLabel') }}</label>
              <Input
                id="totp-setup-code"
                v-model="totpVerificationCode"
                type="text"
                inputmode="numeric"
                maxlength="8"
                :placeholder="$t('auth.twoFactorCodePlaceholder')"
                autocomplete="one-time-code"
              />
            </div>

            <div class="two-factor-actions">
              <Button type="submit" :loading="isVerifyingTotp">
                {{ $t('profile.twoFactorConfirmSetup') }}
              </Button>
              <Button type="button" variant="ghost" @click="cancelTotpSetup">
                {{ $t('common.cancel') }}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div v-if="backupCodes.length" class="two-factor-backup-box two-factor-backup-box--saved">
        <div class="two-factor-backup-header">
          <div>
            <h3>{{ $t('profile.twoFactorBackupCodesTitle') }}</h3>
            <p class="field-hint">{{ $t('profile.twoFactorBackupCodesHint') }}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" @click="copyBackupCodes">
            {{ $t('profile.twoFactorCopyBackupCodes') }}
          </Button>
        </div>

        <div class="two-factor-backup-grid">
          <span v-for="code in backupCodes" :key="code" class="two-factor-backup-code">
            {{ code }}
          </span>
        </div>
      </div>

      <div class="passkey-section">
        <div class="passkey-section__header">
          <div>
            <p class="two-factor-status-label">{{ $t('profile.passkeyTitle') }}</p>
            <p class="field-hint">{{ $t('profile.passkeyHint') }}</p>
          </div>

          <div class="two-factor-actions">
            <Input
              v-model="passkeyDeviceName"
              class="passkey-device-input"
              type="text"
              :placeholder="$t('profile.passkeyDeviceNamePlaceholder')"
            />
            <Button
              type="button"
              variant="secondary"
              :loading="isRegisteringPasskey"
              @click="handleRegisterPasskey"
            >
              {{ $t('profile.passkeyAddAction') }}
            </Button>
          </div>
        </div>

        <div v-if="status?.webauthn_credentials?.length" class="passkey-list">
          <article
            v-for="credential in status.webauthn_credentials"
            :key="credential.id"
            class="passkey-item"
          >
            <strong class="passkey-item__name">
              {{ credential.device_name || $t('profile.passkeyUnnamed') }}
            </strong>
            <span class="passkey-item__meta">
              {{ $t('profile.passkeyCreatedAt') }}: {{ formatDateTime(credential.created_at) }}
            </span>
            <span class="passkey-item__meta">
              {{ $t('profile.passkeyLastUsed') }}: {{ formatDateTime(credential.last_used_at) }}
            </span>
          </article>
        </div>
        <p v-else class="field-hint">{{ $t('profile.passkeyEmpty') }}</p>
      </div>

      <div v-if="status?.enabled" class="two-factor-management-grid">
        <form class="two-factor-form-card" @submit.prevent="handleRegenerateBackupCodes">
          <div class="two-factor-form-card__copy">
            <p class="two-factor-status-label">{{ $t('profile.twoFactorRegenerateAction') }}</p>
            <p class="field-hint">{{ $t('profile.twoFactorRegenerateHint') }}</p>
          </div>

          <div class="form-group">
            <label for="regenerate-code">{{ $t('profile.twoFactorVerifyCodeLabel') }}</label>
            <Input
              id="regenerate-code"
              v-model="recoveryCode"
              type="text"
              inputmode="text"
              :placeholder="$t('auth.twoFactorCodePlaceholder')"
            />
          </div>

          <div class="form-group">
            <label for="regenerate-password">{{ $t('auth.password') }}</label>
            <Input
              id="regenerate-password"
              v-model="recoveryPassword"
              type="password"
              :placeholder="$t('auth.passwordPlaceholder')"
              autocomplete="current-password"
            />
          </div>

          <Button type="submit" :loading="isRegeneratingBackupCodes" :disabled="!canSubmitRecovery">
            {{ $t('profile.twoFactorRegenerateAction') }}
          </Button>
        </form>

        <form class="two-factor-form-card" @submit.prevent="handleDisableMfa">
          <div class="two-factor-form-card__copy">
            <p class="two-factor-status-label">{{ $t('profile.twoFactorDisableAction') }}</p>
            <p class="field-hint">{{ $t('profile.twoFactorDisableHint') }}</p>
          </div>

          <div class="form-group">
            <label for="disable-code">{{ $t('profile.twoFactorVerifyCodeLabel') }}</label>
            <Input
              id="disable-code"
              v-model="disableCode"
              type="text"
              inputmode="text"
              :placeholder="$t('auth.twoFactorCodePlaceholder')"
            />
          </div>

          <div class="form-group">
            <label for="disable-password">{{ $t('auth.password') }}</label>
            <Input
              id="disable-password"
              v-model="disablePassword"
              type="password"
              :placeholder="$t('auth.passwordPlaceholder')"
              autocomplete="current-password"
            />
          </div>

          <Button
            type="submit"
            variant="danger"
            :loading="isDisablingMfa"
            :disabled="!canDisableMfa"
          >
            {{ $t('profile.twoFactorDisableAction') }}
          </Button>
        </form>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Shield } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import { type UserProfile, type UserResponse, twoFactorService, ApiError } from '@/api'
import { useToastStore } from '@/stores'
import {
  createWebAuthnCredential,
  isWebAuthnSupported,
  serializePublicKeyCredential,
} from '@/utils/webauthn'

const props = withDefaults(
  defineProps<{
    profile: UserProfile | null
    authUser?: UserResponse | null
  }>(),
  {
    authUser: null,
  }
)

const { t, locale } = useI18n()
const toastStore = useToastStore()

const status = ref<Awaited<ReturnType<typeof twoFactorService.getStatus>> | null>(null)
const statusError = ref('')
const isRefreshingStatus = ref(false)
const isSettingUpTotp = ref(false)
const isVerifyingTotp = ref(false)
const isRegisteringPasskey = ref(false)
const isRegeneratingBackupCodes = ref(false)
const isDisablingMfa = ref(false)

const totpSetup = ref<Awaited<ReturnType<typeof twoFactorService.setup>> | null>(null)
const showTotpSetup = ref(false)
const totpVerificationCode = ref('')
const backupCodes = ref<string[]>([])
const disableCode = ref('')
const disablePassword = ref('')
const recoveryCode = ref('')
const recoveryPassword = ref('')
const passkeyDeviceName = ref('')

const normalizedIdentityProvider = computed(() => {
  const provider = props.profile?.identity_provider ?? props.authUser?.identity_provider
  return provider?.trim().toLowerCase() || 'local'
})

const authSourceSummaryLabel = computed(() => {
  if (normalizedIdentityProvider.value === 'google') {
    return t('profile.authSourceGoogle')
  }

  if (normalizedIdentityProvider.value !== 'local') {
    return t('profile.authSourceThirdParty')
  }

  return t('profile.authSourceEmail')
})

const authSourceSummaryHint = computed(() => {
  if (normalizedIdentityProvider.value === 'google') {
    return t('profile.authSourceGoogleHint')
  }

  if (normalizedIdentityProvider.value !== 'local') {
    return t('profile.authSourceThirdPartyHint')
  }

  return t('profile.authSourceEmailHint')
})

const primaryIdentityProviderLabel = computed(() => {
  const provider = props.profile?.identity_provider ?? props.authUser?.identity_provider
  return provider ? formatIdentityProviderLabel(provider) : t('profile.identityProviderUnavailable')
})

const linkedProvidersLabel = computed(() => {
  const values = [
    props.profile?.identity_provider,
    ...(props.profile?.linked_providers ?? []),
    props.authUser?.identity_provider,
    ...(props.authUser?.linked_providers ?? []),
  ]

  const labels = [
    ...new Set(
      values
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => formatIdentityProviderLabel(value))
    ),
  ]

  return labels.length ? labels.join(', ') : t('profile.noLinkedProviders')
})

const localizedMethodList = computed(() => (status.value?.methods ?? []).map(localizeMfaMethod))

const localizedMethodSummary = computed(() => {
  if (isRefreshingStatus.value && !status.value) {
    return t('profile.twoFactorStatusLoadingHint')
  }

  if (!status.value?.methods?.length) {
    return t('profile.twoFactorDisabled')
  }

  return localizedMethodList.value.join(' · ')
})

const mfaStatusLabel = computed(() => {
  if (isRefreshingStatus.value && !status.value) {
    return t('common.loading')
  }

  if (status.value?.totp_pending_setup && !status.value?.totp_enabled) {
    return t('profile.twoFactorSetupPending')
  }

  return status.value?.enabled ? t('profile.twoFactorEnabled') : t('profile.twoFactorDisabled')
})

const mfaStatusHint = computed(() => {
  if (status.value?.totp_pending_setup && !status.value?.totp_enabled) {
    return t('profile.twoFactorSetupInstructions')
  }

  if (status.value?.methods?.length) {
    return t('profile.twoFactorEnabledHint', {
      count: status.value.has_backup_codes ? 1 : 0,
      methods: localizedMethodList.value.join(' · '),
    })
  }

  return t('profile.twoFactorDisabledHint')
})

const canDisableMfa = computed(() => Boolean(disableCode.value.trim() || disablePassword.value))
const canSubmitRecovery = computed(() =>
  Boolean(recoveryCode.value.trim() || recoveryPassword.value)
)

function formatIdentityProviderLabel(provider: string): string {
  const normalized = provider.trim().toLowerCase()

  if (normalized === 'local') {
    return t('profile.authSourceEmail')
  }

  const knownLabels: Record<string, string> = {
    google: 'Google',
    github: 'GitHub',
    apple: 'Apple',
    microsoft: 'Microsoft',
    discord: 'Discord',
  }

  if (knownLabels[normalized]) {
    return knownLabels[normalized]
  }

  return provider
    .trim()
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function localizeMfaMethod(method: string): string {
  switch (method) {
    case 'totp':
      return t('profile.mfaMethodTotp')
    case 'backup_code':
      return t('profile.mfaMethodBackupCode')
    case 'webauthn':
      return t('profile.mfaMethodWebauthn')
    default:
      return method
  }
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return t('common.notFound')
  }

  try {
    return new Intl.DateTimeFormat(locale.value, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

async function fetchStatus() {
  isRefreshingStatus.value = true
  statusError.value = ''

  try {
    status.value = await twoFactorService.getStatus()
    if (status.value?.totp_pending_setup) {
      showTotpSetup.value = true
    }
  } catch (error) {
    statusError.value = error instanceof ApiError ? error.message : t('common.error')
  } finally {
    isRefreshingStatus.value = false
  }
}

async function copyToClipboard(text: string, successMessage: string) {
  if (!text.trim()) return

  try {
    await navigator.clipboard.writeText(text)
    toastStore.success(successMessage)
  } catch {
    toastStore.error(t('common.error'))
  }
}

async function copySecret() {
  await copyToClipboard(totpSetup.value?.secret ?? '', t('profile.twoFactorCopied'))
}

async function copyOtpAuthUrl() {
  await copyToClipboard(totpSetup.value?.otpauth_url ?? '', t('profile.twoFactorCopied'))
}

async function copyBackupCodes() {
  await copyToClipboard(backupCodes.value.join('\n'), t('profile.twoFactorCopied'))
}

function cancelTotpSetup() {
  showTotpSetup.value = false
  totpVerificationCode.value = ''
  if (!status.value?.totp_pending_setup) {
    totpSetup.value = null
  }
}

async function handleSetupTotp() {
  isSettingUpTotp.value = true
  statusError.value = ''

  try {
    totpSetup.value = await twoFactorService.setup()
    showTotpSetup.value = true
    toastStore.success(t('profile.twoFactorSetupReady'))
    await fetchStatus()
  } catch (error) {
    toastStore.error(error instanceof ApiError ? error.message : t('common.error'))
  } finally {
    isSettingUpTotp.value = false
  }
}

async function handleVerifyTotpSetup() {
  const code = totpVerificationCode.value.trim()
  if (!code) {
    toastStore.warning(t('auth.error.codeRequired'))
    return
  }

  isVerifyingTotp.value = true
  statusError.value = ''

  try {
    const response = await twoFactorService.verify(code)
    backupCodes.value = response.backup_codes ?? []
    totpVerificationCode.value = ''
    totpSetup.value = null
    showTotpSetup.value = false
    toastStore.success(t('profile.twoFactorSetupSuccess'))
    await fetchStatus()
  } catch (error) {
    toastStore.error(error instanceof ApiError ? error.message : t('auth.error.twoFactorInvalid'))
  } finally {
    isVerifyingTotp.value = false
  }
}

async function handleRegisterPasskey() {
  if (!isWebAuthnSupported()) {
    toastStore.error(t('auth.error.webauthnUnsupported'))
    return
  }

  isRegisteringPasskey.value = true
  statusError.value = ''

  try {
    const deviceName = passkeyDeviceName.value.trim() || undefined
    const options = await twoFactorService.beginWebAuthnRegistration(deviceName)
    const credential = await createWebAuthnCredential(options.options)
    if (!(credential instanceof PublicKeyCredential)) {
      throw new Error('Failed to create WebAuthn credential')
    }

    await twoFactorService.finishWebAuthnRegistration(
      options.ceremony_id,
      serializePublicKeyCredential(credential),
      deviceName
    )

    passkeyDeviceName.value = ''
    toastStore.success(t('profile.passkeyAddSuccess'))
    await fetchStatus()
  } catch (error) {
    toastStore.error(
      error instanceof ApiError ? error.message : t('auth.error.webauthnRegistrationFailed')
    )
  } finally {
    isRegisteringPasskey.value = false
  }
}

async function handleRegenerateBackupCodes() {
  if (!canSubmitRecovery.value) {
    toastStore.warning(t('profile.twoFactorRecoveryVerificationRequired'))
    return
  }

  isRegeneratingBackupCodes.value = true
  statusError.value = ''

  try {
    const response = await twoFactorService.regenerateBackupCodes(
      recoveryCode.value.trim() || undefined,
      recoveryPassword.value || undefined
    )
    backupCodes.value = response.backup_codes ?? []
    recoveryCode.value = ''
    recoveryPassword.value = ''
    toastStore.success(t('profile.twoFactorBackupCodesRegenerated'))
    await fetchStatus()
  } catch (error) {
    toastStore.error(error instanceof ApiError ? error.message : t('common.error'))
  } finally {
    isRegeneratingBackupCodes.value = false
  }
}

async function handleDisableMfa() {
  if (!canDisableMfa.value) {
    toastStore.warning(t('profile.twoFactorRecoveryVerificationRequired'))
    return
  }

  isDisablingMfa.value = true
  statusError.value = ''

  try {
    await twoFactorService.disable(
      disableCode.value.trim() || undefined,
      disablePassword.value || undefined
    )
    disableCode.value = ''
    disablePassword.value = ''
    backupCodes.value = []
    totpSetup.value = null
    showTotpSetup.value = false
    toastStore.success(t('profile.twoFactorDisabledSuccess'))
    await fetchStatus()
  } catch (error) {
    toastStore.error(error instanceof ApiError ? error.message : t('common.error'))
  } finally {
    isDisablingMfa.value = false
  }
}

onMounted(() => {
  void fetchStatus()
})
</script>

<style scoped>
.security-mfa-panel {
  display: grid;
  gap: clamp(1rem, 2vw, 1.25rem);
}

.settings-section {
  padding: clamp(1rem, 3vw, 1.5rem);
  max-width: 100%;
  border-radius: var(--profile-section-radius, 1.25rem);
  border: 1px solid var(--profile-surface-border, rgba(15, 23, 42, 0.08));
  border-inline-start-width: 0.1875rem;
  background: var(--profile-surface-bg, rgba(255, 255, 255, 0.85));
  box-shadow: var(--profile-surface-shadow, 0 20px 40px rgba(15, 23, 42, 0.08));
}

.settings-section-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-3, 0.75rem);
  margin-bottom: var(--spacing-5, 1.25rem);
  padding-bottom: var(--spacing-3, 0.75rem);
  border-bottom: 1px solid var(--profile-muted-border, rgba(15, 23, 42, 0.08));
}

.settings-section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-lg, 1rem);
  border: 1px solid var(--profile-muted-border-strong, rgba(15, 23, 42, 0.12));
  background: var(--profile-muted-bg-strong, rgba(37, 99, 235, 0.08));
  color: var(--color-primary);
}

.settings-section-icon--success {
  background: rgba(var(--color-success-rgb, 16, 185, 129), 0.12);
  color: var(--color-success, #10b981);
}

.settings-section-title {
  margin: 0;
  font-size: clamp(var(--text-base), 2vw, var(--text-lg));
  font-weight: var(--font-semibold, 600);
  color: var(--color-text-primary, #0f172a);
}

.settings-section-desc,
.field-hint,
.passkey-item__meta {
  margin: 0;
  font-size: var(--text-sm, 0.9rem);
  line-height: 1.6;
  color: var(--color-text-tertiary, #64748b);
}

.field-error {
  margin: 0 0 1rem;
  font-size: var(--text-sm, 0.9rem);
  color: var(--color-error, #ef4444);
}

.two-factor-status-card,
.two-factor-form-card,
.passkey-section {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--profile-muted-border, rgba(15, 23, 42, 0.08));
  border-radius: var(--radius-lg, 1rem);
  background: var(--profile-muted-bg, rgba(255, 255, 255, 0.78));
}

.two-factor-status-card {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.two-factor-status-copy,
.two-factor-form-card__copy {
  display: grid;
  gap: 0.35rem;
}

.two-factor-status-label,
.two-factor-secret-label {
  margin: 0;
  font-size: var(--text-xs, 0.78rem);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-tertiary, #64748b);
}

.two-factor-status-value {
  margin: 0;
  font-size: clamp(1rem, 2vw, 1.1rem);
  font-weight: 700;
  color: var(--color-text-primary, #0f172a);
}

.two-factor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
}

.two-factor-actions--stacked {
  justify-content: flex-start;
}

.account-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.875rem;
  margin-top: 1rem;
}

.account-meta-item {
  display: grid;
  gap: 0.25rem;
  padding: 0.875rem;
  border: 1px solid var(--profile-action-border, rgba(15, 23, 42, 0.08));
  border-radius: var(--radius-lg, 1rem);
  background: var(--profile-action-bg, rgba(255, 255, 255, 0.72));
}

.account-meta-label {
  font-size: var(--text-xs, 0.78rem);
  color: var(--color-text-tertiary, #64748b);
}

.account-meta-value {
  font-size: var(--text-sm, 0.92rem);
  font-weight: 600;
  color: var(--color-text-primary, #0f172a);
  overflow-wrap: anywhere;
}

.method-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  margin-top: 1rem;
}

.method-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.16);
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-primary);
  font-size: var(--text-xs, 0.78rem);
  font-weight: 600;
}

.two-factor-setup {
  display: grid;
  grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
  gap: 1rem;
  margin-top: 1rem;
}

.two-factor-setup-qr,
.two-factor-setup-details,
.two-factor-secret-card {
  display: grid;
  gap: 0.75rem;
}

.two-factor-secret-card {
  padding: 1rem;
  border-radius: var(--radius-lg, 1rem);
  border: 1px solid var(--profile-action-border, rgba(15, 23, 42, 0.08));
  background: var(--profile-action-bg, rgba(255, 255, 255, 0.72));
}

.two-factor-secret-value {
  display: block;
  padding: 0.75rem 0.875rem;
  border-radius: var(--radius-md, 0.75rem);
  border: 1px solid var(--profile-action-border, rgba(15, 23, 42, 0.08));
  background: rgba(15, 23, 42, 0.03);
  color: var(--color-text-primary, #0f172a);
  font-size: var(--text-sm, 0.92rem);
}

.two-factor-secret-value--wrap {
  overflow-wrap: anywhere;
}

.two-factor-backup-box {
  display: grid;
  gap: 0.875rem;
  margin-top: 1rem;
  padding: 1rem;
  border-radius: var(--radius-lg, 1rem);
  border: 1px dashed rgba(var(--color-success-rgb, 16, 185, 129), 0.3);
  background: rgba(var(--color-success-rgb, 16, 185, 129), 0.06);
}

.two-factor-backup-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.two-factor-backup-header h3 {
  margin: 0;
  font-size: var(--text-sm, 0.92rem);
  font-weight: 700;
  color: var(--color-text-primary, #0f172a);
}

.two-factor-backup-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.75rem;
}

.two-factor-backup-code {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius-md, 0.75rem);
  border: 1px solid var(--profile-action-border, rgba(15, 23, 42, 0.08));
  background: rgba(255, 255, 255, 0.8);
  color: var(--color-text-primary, #0f172a);
  font-size: var(--text-sm, 0.92rem);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.passkey-section {
  margin-top: 1rem;
}

.passkey-section__header {
  display: grid;
  gap: 0.75rem;
}

.passkey-list,
.two-factor-management-grid {
  display: grid;
  gap: 0.875rem;
  margin-top: 1rem;
}

.two-factor-management-grid {
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
}

.passkey-item {
  display: grid;
  gap: 0.375rem;
  padding: 0.875rem;
  border-radius: var(--radius-lg, 1rem);
  border: 1px solid var(--profile-action-border, rgba(15, 23, 42, 0.08));
  background: rgba(255, 255, 255, 0.72);
}

.passkey-item__name {
  color: var(--color-text-primary, #0f172a);
  font-size: var(--text-sm, 0.92rem);
}

.passkey-device-input {
  min-width: min(16rem, 100%);
}

.auth-form,
.form-group {
  display: grid;
  gap: 0.625rem;
}

.form-group label {
  font-size: var(--text-sm, 0.92rem);
  font-weight: 600;
  color: var(--color-text-secondary, #334155);
}

@media (max-width: 768px) {
  .two-factor-status-card,
  .two-factor-setup,
  .two-factor-management-grid,
  .two-factor-backup-header {
    grid-template-columns: 1fr;
  }

  .two-factor-status-card,
  .two-factor-backup-header {
    align-items: stretch;
  }

  .two-factor-actions {
    justify-content: stretch;
  }

  .two-factor-actions > .btn {
    width: 100%;
  }

  .passkey-device-input {
    min-width: 100%;
  }
}
</style>
