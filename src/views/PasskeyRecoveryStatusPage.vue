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

            <p class="auth-helper auth-helper--emphasis">
              {{
                status.can_register
                  ? $t('auth.passkeyRecovery.readyHint')
                  : $t('auth.passkeyRecovery.pendingHint')
              }}
            </p>

            <div v-if="status.can_register" class="form-group">
              <label for="recovery-device-name">
                {{ $t('auth.passkeyRecovery.deviceNameLabel') }}
              </label>
              <Input
                id="recovery-device-name"
                v-model="deviceName"
                type="text"
                :placeholder="$t('profile.passkeyDeviceNamePlaceholder')"
              />
            </div>
          </template>

          <p v-if="errorMessage" class="field-error">{{ errorMessage }}</p>

          <div class="action-group">
            <Button type="button" variant="ghost" full-width :disabled="isLoading" @click="refresh">
              {{ $t('auth.passkeyRecovery.refreshAction') }}
            </Button>
            <Button
              v-if="status?.can_register"
              class="recovery-register-btn"
              type="button"
              full-width
              :loading="isRegistering"
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

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ApiError, authService } from '@/api'
import { useAuthStore, useToastStore } from '@/stores'
import { getDeviceInfo } from '@/utils/device'
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
let refreshTimer: ReturnType<typeof setInterval> | null = null

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
  isLoading.value = true
  errorMessage.value = ''

  try {
    status.value = await authService.getPasskeyRecoveryStatus(recoveryId.value)
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : t('auth.error.unknown')
  } finally {
    isLoading.value = false
  }
}

async function handleRegister() {
  if (!status.value?.can_register || isRegistering.value) return

  isRegistering.value = true
  errorMessage.value = ''

  try {
    const options = await authService.beginRecoveryPasskeyRegistration({
      recovery_id: recoveryId.value,
      ...(deviceName.value.trim() ? { device_name: deviceName.value.trim() } : {}),
    })

    const credential = await createWebAuthnCredential(
      options.options as PublicKeyCredentialCreationOptionsJSON
    )
    const hasBrowserCredentialType = typeof PublicKeyCredential !== 'undefined'
    const isCredentialObject = typeof credential === 'object' && credential !== null
    if (
      (hasBrowserCredentialType && !(credential instanceof PublicKeyCredential)) ||
      !isCredentialObject
    ) {
      throw new Error('Failed to create WebAuthn credential')
    }

    await authService.finishRecoveryPasskeyRegistration(
      recoveryId.value,
      options.ceremony_id,
      serializePublicKeyCredential(credential),
      deviceName.value.trim() || undefined
    )

    toastStore.success(t('auth.passkeyRecovery.registerSuccess'))
    authStore.clearLocalSession({ navigateToLogin: true })
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError ? error.message : t('auth.error.webauthnRegistrationFailed')
  } finally {
    isRegistering.value = false
  }
}

onMounted(() => {
  void refresh()
  refreshTimer = setInterval(() => {
    if (!status.value?.can_register) {
      void refresh()
    }
  }, 15000)
})

onBeforeUnmount(() => {
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
