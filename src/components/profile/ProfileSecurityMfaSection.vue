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
              :aria-label="$t('profile.passkeyDeviceNamePlaceholder')"
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
            <div class="passkey-item__details">
              <span class="passkey-item__meta">
                {{ $t('profile.passkeyDiscoverable') }}:
                {{ formatBoolean(credential.discoverable) }}
              </span>
              <span class="passkey-item__meta">
                {{ $t('profile.passkeyBackedUp') }}:
                {{ formatBoolean(credential.backup_state) }}
              </span>
              <span class="passkey-item__meta">
                {{ $t('profile.passkeyBackupEligible') }}:
                {{ formatBoolean(credential.backup_eligible) }}
              </span>
              <span class="passkey-item__meta">
                {{ $t('profile.passkeyAttachment') }}:
                {{ formatAuthenticatorAttachment(credential.authenticator_attachment) }}
              </span>
              <span class="passkey-item__meta">
                {{ $t('profile.passkeyTransports') }}:
                {{ formatPasskeyTransports(credential.transports) }}
              </span>
            </div>
            <div class="passkey-item__actions">
              <Input
                class="passkey-rename-input"
                type="text"
                :aria-label="$t('profile.passkeyRenamePlaceholder')"
                :placeholder="$t('profile.passkeyRenamePlaceholder')"
                :value="passkeyDraftName(credential)"
                @input="updatePasskeyDraftName(credential.id, $event)"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                :loading="passkeyBusyId === credential.id"
                :disabled="!canRenamePasskey(credential)"
                @click="handleRenamePasskey(credential)"
              >
                {{ $t('common.save') }}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                :loading="passkeyBusyId === credential.id"
                @click="handleDeletePasskey(credential)"
              >
                {{ $t('common.delete') }}
              </Button>
            </div>
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
import {
  type UserProfile,
  type UserResponse,
  type WebAuthnCredentialSummary,
  twoFactorService,
  ApiError,
} from '@/api'
import { useToastStore } from '@/stores'
import {
  createWebAuthnCredential,
  isWebAuthnSupported,
  serializePublicKeyCredential,
} from '@/utils/webauthn'
import {
  buildBackupCodesClipboardText,
  buildLinkedIdentityProviderLabel,
  buildMfaBackupCodeRegenerationSuccessState,
  buildMfaDisableSuccessState,
  buildMfaRecoveryVerificationPayload,
  buildPasskeyRegistrationDeviceName,
  buildPasskeyRegistrationSuccessState,
  buildPasskeyRenamePayload,
  buildTotpOtpAuthUrlClipboardText,
  buildTotpSetupCancelState,
  buildTotpSecretClipboardText,
  buildTotpVerificationCode,
  buildTotpVerificationSuccessState,
  canCopyMfaClipboardText,
  canSubmitMfaRecoveryVerification,
  canRenamePasskey as canRenamePasskeyWithDrafts,
  formatAuthenticatorAttachmentLabel,
  formatBooleanLabel,
  formatIdentityProviderLabel,
  formatPasskeyTransports as formatPasskeyTransportList,
  getPasskeyDraftName,
  localizeMfaMethod as localizeMfaMethodLabel,
  normalizeIdentityProvider,
  removePasskeyDraftName,
  resolveMfaMethodSummary,
  resolveMfaStatusHint,
  resolveMfaStatusLabel,
  updatePasskeyDraftNames,
} from './securityMfaModel'
import {
  formatOptionalIntlDateTime,
  resolveAuthSourceSummaryHintKey,
  resolveAuthSourceSummaryLabel,
} from '@/views/profile-settings/profileSettingsModel'

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
const passkeyDraftNames = ref<Record<string, string>>({})
const passkeyBusyId = ref<string | null>(null)

const normalizedIdentityProvider = computed(() =>
  normalizeIdentityProvider(props.profile?.identity_provider, props.authUser?.identity_provider)
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

const primaryIdentityProviderLabel = computed(() => {
  const provider = props.profile?.identity_provider ?? props.authUser?.identity_provider
  return provider
    ? formatIdentityProviderLabel(provider, t('profile.authSourceEmail'))
    : t('profile.identityProviderUnavailable')
})

const linkedProvidersLabel = computed(() =>
  buildLinkedIdentityProviderLabel({
    providers: [
      props.profile?.identity_provider,
      ...(props.profile?.linked_providers ?? []),
      props.authUser?.identity_provider,
      ...(props.authUser?.linked_providers ?? []),
    ],
    emailLabel: t('profile.authSourceEmail'),
    fallbackLabel: t('profile.noLinkedProviders'),
  })
)

const localizedMethodList = computed(() => (status.value?.methods ?? []).map(localizeMfaMethod))

const localizedMethodSummary = computed(() =>
  resolveMfaMethodSummary({
    isLoadingInitialStatus: isRefreshingStatus.value && !status.value,
    methods: localizedMethodList.value,
    loadingLabel: t('profile.twoFactorStatusLoadingHint'),
    disabledLabel: t('profile.twoFactorDisabled'),
  })
)

const mfaStatusLabel = computed(() =>
  resolveMfaStatusLabel({
    isLoadingInitialStatus: isRefreshingStatus.value && !status.value,
    isTotpPendingSetup: Boolean(status.value?.totp_pending_setup && !status.value?.totp_enabled),
    isEnabled: Boolean(status.value?.enabled),
    loadingLabel: t('common.loading'),
    pendingLabel: t('profile.twoFactorSetupPending'),
    enabledLabel: t('profile.twoFactorEnabled'),
    disabledLabel: t('profile.twoFactorDisabled'),
  })
)

const mfaStatusHint = computed(() =>
  resolveMfaStatusHint({
    isTotpPendingSetup: Boolean(status.value?.totp_pending_setup && !status.value?.totp_enabled),
    methods: localizedMethodList.value,
    hasBackupCodes: Boolean(status.value?.has_backup_codes),
    setupInstructionsLabel: t('profile.twoFactorSetupInstructions'),
    enabledHint: (values) => t('profile.twoFactorEnabledHint', values),
    disabledHint: t('profile.twoFactorDisabledHint'),
  })
)

const canDisableMfa = computed(() =>
  canSubmitMfaRecoveryVerification({
    code: disableCode.value,
    password: disablePassword.value,
  })
)
const canSubmitRecovery = computed(() =>
  canSubmitMfaRecoveryVerification({
    code: recoveryCode.value,
    password: recoveryPassword.value,
  })
)

function localizeMfaMethod(method: string): string {
  return localizeMfaMethodLabel(method, {
    totp: t('profile.mfaMethodTotp'),
    backupCode: t('profile.mfaMethodBackupCode'),
    webauthn: t('profile.mfaMethodWebauthn'),
  })
}

function formatDateTime(value?: string | null): string {
  return formatOptionalIntlDateTime(value, {
    fallback: t('common.notFound'),
    locale: locale.value,
  })
}

function formatBoolean(value?: boolean | null): string {
  return formatBooleanLabel(value, {
    yes: t('common.yes'),
    no: t('common.no'),
    unknown: t('common.notFound'),
  })
}

function formatAuthenticatorAttachment(value?: string | null): string {
  return formatAuthenticatorAttachmentLabel(value, {
    unknown: t('common.notFound'),
    platform: t('profile.passkeyAttachmentPlatform'),
    crossPlatform: t('profile.passkeyAttachmentCrossPlatform'),
  })
}

function formatPasskeyTransports(value?: string[] | null): string {
  return formatPasskeyTransportList(value, t('common.notFound'))
}

function passkeyDraftName(credential: WebAuthnCredentialSummary): string {
  return getPasskeyDraftName(credential, passkeyDraftNames.value)
}

function updatePasskeyDraftName(id: string, event: Event) {
  passkeyDraftNames.value = updatePasskeyDraftNames(
    passkeyDraftNames.value,
    id,
    (event.target as HTMLInputElement | null)?.value ?? ''
  )
}

function canRenamePasskey(credential: WebAuthnCredentialSummary): boolean {
  return canRenamePasskeyWithDrafts(credential, passkeyDraftNames.value)
}

async function fetchStatus() {
  isRefreshingStatus.value = true
  statusError.value = ''

  try {
    status.value = await twoFactorService.getStatus()
    for (const credential of status.value.webauthn_credentials ?? []) {
      if (passkeyDraftNames.value[credential.id] === undefined) {
        passkeyDraftNames.value = {
          ...passkeyDraftNames.value,
          [credential.id]: credential.device_name ?? '',
        }
      }
    }
    if (status.value?.totp_pending_setup) {
      showTotpSetup.value = true
    }
  } catch (error) {
    statusError.value = error instanceof ApiError ? error.message : t('common.error')
  } finally {
    isRefreshingStatus.value = false
  }
}

async function handleRenamePasskey(credential: WebAuthnCredentialSummary) {
  const nextName = buildPasskeyRenamePayload(credential, passkeyDraftNames.value)
  if (!nextName) return

  passkeyBusyId.value = credential.id
  statusError.value = ''

  try {
    await twoFactorService.updateWebAuthnCredential(credential.id, nextName)
    toastStore.success(t('profile.passkeyRenameSuccess'))
    await fetchStatus()
  } catch (error) {
    toastStore.error(error instanceof ApiError ? error.message : t('common.error'))
  } finally {
    passkeyBusyId.value = null
  }
}

async function handleDeletePasskey(credential: WebAuthnCredentialSummary) {
  if (!window.confirm(t('profile.passkeyDeleteConfirm'))) {
    return
  }

  passkeyBusyId.value = credential.id
  statusError.value = ''

  try {
    await twoFactorService.deleteWebAuthnCredential(credential.id)
    passkeyDraftNames.value = removePasskeyDraftName(passkeyDraftNames.value, credential.id)
    toastStore.success(t('profile.passkeyDeleteSuccess'))
    await fetchStatus()
  } catch (error) {
    toastStore.error(error instanceof ApiError ? error.message : t('common.error'))
  } finally {
    passkeyBusyId.value = null
  }
}

async function copyToClipboard(text: string, successMessage: string) {
  if (!canCopyMfaClipboardText(text)) return

  try {
    await navigator.clipboard.writeText(text)
    toastStore.success(successMessage)
  } catch {
    toastStore.error(t('common.error'))
  }
}

async function copySecret() {
  await copyToClipboard(
    buildTotpSecretClipboardText(totpSetup.value?.secret),
    t('profile.twoFactorCopied')
  )
}

async function copyOtpAuthUrl() {
  await copyToClipboard(
    buildTotpOtpAuthUrlClipboardText(totpSetup.value?.otpauth_url),
    t('profile.twoFactorCopied')
  )
}

async function copyBackupCodes() {
  await copyToClipboard(
    buildBackupCodesClipboardText(backupCodes.value),
    t('profile.twoFactorCopied')
  )
}

function cancelTotpSetup() {
  const nextState = buildTotpSetupCancelState({
    setup: totpSetup.value,
    isTotpPendingSetup: Boolean(status.value?.totp_pending_setup),
  })
  showTotpSetup.value = nextState.showSetup
  totpVerificationCode.value = nextState.verificationCode
  totpSetup.value = nextState.setup
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
  const code = buildTotpVerificationCode(totpVerificationCode.value)
  if (!code) {
    toastStore.warning(t('auth.error.codeRequired'))
    return
  }

  isVerifyingTotp.value = true
  statusError.value = ''

  try {
    const response = await twoFactorService.verify(code)
    const nextState = buildTotpVerificationSuccessState(response.backup_codes)
    backupCodes.value = nextState.backupCodes
    totpVerificationCode.value = nextState.verificationCode
    totpSetup.value = nextState.setup
    showTotpSetup.value = nextState.showSetup
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
    const deviceName = buildPasskeyRegistrationDeviceName(passkeyDeviceName.value)
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

    passkeyDeviceName.value = buildPasskeyRegistrationSuccessState().deviceName
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
    const payload = buildMfaRecoveryVerificationPayload({
      code: recoveryCode.value,
      password: recoveryPassword.value,
    })
    const response = await twoFactorService.regenerateBackupCodes(payload.code, payload.password)
    const nextState = buildMfaBackupCodeRegenerationSuccessState(response.backup_codes)
    backupCodes.value = nextState.backupCodes
    recoveryCode.value = nextState.code
    recoveryPassword.value = nextState.password
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
    const payload = buildMfaRecoveryVerificationPayload({
      code: disableCode.value,
      password: disablePassword.value,
    })
    await twoFactorService.disable(payload.code, payload.password)
    const nextState = buildMfaDisableSuccessState()
    disableCode.value = nextState.code
    disablePassword.value = nextState.password
    backupCodes.value = nextState.backupCodes
    totpSetup.value = nextState.setup
    showTotpSetup.value = nextState.showSetup
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
