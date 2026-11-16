<template>
  <div class="auth-page auth-page--recovery-status">
    <AuthEntryShell
      :title="$t('auth.passkeyRecovery.statusTitle')"
      :subtitle="$t('auth.passkeyRecovery.statusSubtitle')"
      :show-tabs="false"
      split
      @back="handleBack"
    >
      <div class="auth-form">
        <div class="auth-card auth-card--stack">
          <div v-if="isLoading" class="auth-helper">{{ $t('common.loading') }}</div>

          <template v-else-if="status">
            <dl class="status-grid">
              <div class="status-row">
                <dt>{{ $t('auth.passkeyRecovery.statusLabel') }}</dt>
                <dd>{{ status.status }}</dd>
              </div>
              <div class="status-row">
                <dt>{{ $t('auth.passkeyRecovery.approvalLabel') }}</dt>
                <dd>{{ status.approval_status || $t('common.notFound') }}</dd>
              </div>
              <div class="status-row">
                <dt>{{ $t('auth.passkeyRecovery.cooldownLabel') }}</dt>
                <dd>{{ formatDateTime(status.cooldown_until) }}</dd>
              </div>
              <div class="status-row">
                <dt>{{ $t('auth.passkeyRecovery.expiresLabel') }}</dt>
                <dd>{{ formatDateTime(status.expires_at) }}</dd>
              </div>
            </dl>

            <p class="auth-helper auth-helper--emphasis" role="status">
              {{ statusHint }}
            </p>

            <div v-if="status.can_register" class="form-group">
              <label for="recovery-device-name">
                {{ $t('auth.passkeyRecovery.deviceNameLabel') }}
              </label>
              <Input
                id="recovery-device-name"
                v-model="deviceName"
                type="text"
                :disabled="isRegistering"
                :placeholder="$t('profile.passkeyDeviceNamePlaceholder')"
              />
            </div>
          </template>

          <p v-if="errorMessage" class="field-error">{{ errorMessage }}</p>

          <div class="action-group">
            <Button
              v-if="canRestart"
              class="recovery-restart-btn"
              type="button"
              full-width
              @click="router.push('/auth/passkeys/recovery')"
            >
              {{ $t('auth.passkeyRecovery.restartAction') }}
            </Button>
            <Button
              type="button"
              variant="ghost"
              full-width
              :disabled="isLoading || isRegistering"
              @click="refresh"
            >
              {{ $t('auth.passkeyRecovery.refreshAction') }}
            </Button>
            <Button
              v-if="status?.can_register"
              class="recovery-register-btn"
              type="button"
              full-width
              :loading="isRegistering"
              :disabled="isLoading"
              @click="handleRegister"
            >
              {{ $t('auth.passkeyRecovery.registerAction') }}
            </Button>
          </div>
        </div>
      </div>

      <template #footer>
        <p class="auth-footer">
          {{ $t('auth.passkeyRecovery.loginHint') }}
          <RouterLink to="/login">{{ $t('nav.login') }}</RouterLink>
        </p>
      </template>
    </AuthEntryShell>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'PasskeyRecoveryStatusPage' })

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ApiError, authService } from '@/api'
import { useAuthStore, useToastStore } from '@/stores'
import { getDeviceInfo } from '@/utils/device'
import { subscribeAuthSessionScope } from '@/services/authSessionScope'
import { createWebAuthnCredential, serializePublicKeyCredential } from '@/utils/webauthn'
import { AuthEntryShell } from '@/components/auth/entry'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { t, locale } = useI18n()

const recoveryId = computed(() => String(route.params['id'] ?? ''))
const status = ref<Awaited<ReturnType<typeof authService.getPasskeyRecoveryStatus>> | null>(null)
const isLoading = ref(true)
const isRegistering = ref(false)
const errorMessage = ref('')
const deviceName = ref(getDeviceInfo().device_name)
const isTerminal = computed(() =>
  ['expired', 'denied', 'completed'].includes(status.value?.status ?? '')
)
const canRestart = computed(() => ['expired', 'denied'].includes(status.value?.status ?? ''))
const statusHint = computed(() => {
  switch (status.value?.status) {
    case 'expired':
      return t('auth.passkeyRecovery.expiredHint')
    case 'denied':
      return t('auth.passkeyRecovery.deniedHint')
    case 'completed':
      return t('auth.passkeyRecovery.completedHint')
    default:
      return status.value?.can_register
        ? t('auth.passkeyRecovery.readyHint')
        : t('auth.passkeyRecovery.pendingHint')
  }
})
let refreshTimer: ReturnType<typeof setInterval> | null = null
let statusController: AbortController | null = null
let registrationController: AbortController | null = null
let disposed = false

function cancelOperations() {
  statusController?.abort()
  registrationController?.abort()
  statusController = null
  registrationController = null
  isLoading.value = false
  isRegistering.value = false
}

function handleBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }

  void router.replace('/auth/passkeys/recovery')
}

function formatDateTime(value?: string | null) {
  if (!value) return t('common.notFound')

  try {
    return new Intl.DateTimeFormat(locale.value, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

async function refresh() {
  if (statusController || isRegistering.value || disposed) return

  const controller = new AbortController()
  const id = recoveryId.value
  statusController = controller
  const isCurrent = () =>
    statusController === controller && !controller.signal.aborted && recoveryId.value === id
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await authService.getPasskeyRecoveryStatus(id, { signal: controller.signal })
    if (isCurrent()) status.value = response
  } catch (error) {
    if (isCurrent()) {
      errorMessage.value = error instanceof ApiError ? error.message : t('auth.error.unknown')
    }
  } finally {
    if (statusController === controller) {
      statusController = null
      isLoading.value = false
    }
  }
}

async function handleRegister() {
  if (!status.value?.can_register || isLoading.value || isRegistering.value || disposed) return

  const controller = new AbortController()
  const id = recoveryId.value
  const name = deviceName.value.trim()
  registrationController = controller
  const isCurrent = () =>
    registrationController === controller && !controller.signal.aborted && recoveryId.value === id
  isRegistering.value = true
  errorMessage.value = ''

  try {
    const options = await authService.beginRecoveryPasskeyRegistration(
      {
        recovery_id: id,
        ...(name ? { device_name: name } : {}),
      },
      { signal: controller.signal }
    )
    if (!isCurrent()) return

    const credential = await createWebAuthnCredential(options.options, {
      signal: controller.signal,
    })
    if (!isCurrent()) return
    if (
      typeof PublicKeyCredential === 'undefined' ||
      !(credential instanceof PublicKeyCredential)
    ) {
      throw new Error('Failed to create WebAuthn credential')
    }

    await authService.finishRecoveryPasskeyRegistration(
      id,
      options.ceremony_id,
      serializePublicKeyCredential(credential),
      name || undefined,
      { signal: controller.signal }
    )
    if (!isCurrent()) return

    toastStore.success(t('auth.passkeyRecovery.registerSuccess'))
    authStore.clearLocalSession({ navigateToLogin: true })
  } catch (error) {
    if (isCurrent()) {
      errorMessage.value =
        error instanceof ApiError ? error.message : t('auth.error.webauthnRegistrationFailed')
    }
  } finally {
    if (registrationController === controller) {
      registrationController = null
      isRegistering.value = false
    }
  }
}

watch(
  recoveryId,
  () => {
    cancelOperations()
    status.value = null
    errorMessage.value = ''
    deviceName.value = getDeviceInfo().device_name
    void refresh()
  },
  { flush: 'sync' }
)

const stopSessionObservation = subscribeAuthSessionScope(cancelOperations)

onMounted(() => {
  void refresh()
  refreshTimer = setInterval(() => {
    if (!status.value?.can_register && !isTerminal.value) {
      void refresh()
    }
  }, 15000)
})

onBeforeUnmount(() => {
  disposed = true
  cancelOperations()
  stopSessionObservation()
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})
</script>

<style scoped>
.status-grid {
  display: grid;
  gap: var(--spacing-2);
  margin: 0;
}

.status-row {
  display: grid;
  gap: 0.25rem;
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--glass-border-medium);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-light);
}

.status-row dt {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.status-row dd {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  word-break: break-word;
}
</style>
