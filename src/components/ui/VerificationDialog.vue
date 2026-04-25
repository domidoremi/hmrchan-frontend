<template>
  <Dialog
    :is-open="isOpen"
    :title="dialogTitle"
    :description="dialogDescription"
    size="sm"
    @update:isOpen="handleDialogToggle"
  >
    <div class="verification-dialog">
      <div class="form-group">
        <label for="verification_password">
          {{ $t('auth.password') }}
        </label>
        <div class="input-wrapper">
          <Input
            id="verification_password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            class="input-with-icon"
            autocomplete="current-password"
            :placeholder="$t('auth.passwordPlaceholder')"
            @keyup.enter="submitVerification"
          />
          <button
            type="button"
            class="password-toggle"
            :aria-label="showPassword ? $t('common.hide') : $t('common.show')"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? $t('common.hide') : $t('common.show') }}
          </button>
        </div>
      </div>

      <p v-if="errorMessage" class="field-error">
        {{ errorMessage }}
      </p>
    </div>

    <template #footer>
      <Button variant="ghost" size="sm" :disabled="isSubmitting" @click="handleCancel">
        {{ $t('common.cancel') }}
      </Button>
      <Button
        size="sm"
        :loading="isSubmitting"
        :disabled="!password.trim()"
        @click="submitVerification"
      >
        {{ currentRequest?.confirmLabel || $t('common.confirm') }}
      </Button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
defineOptions({ name: 'VerificationDialog' })

import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from '@/components/ui/Button.vue'
import Dialog from '@/components/ui/Dialog.vue'
import Input from '@/components/ui/Input.vue'
import { authService, ApiError } from '@/api'
import { clearAuthRuntimeSession } from '@/api/client/auth-runtime'
import {
  dismissVerification,
  resolveVerification,
  type VerificationAction,
} from '@/api/verificationBridge'
import { verificationDialogState } from '@/api/verificationState'

const { t, te } = useI18n()

const password = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

const isOpen = computed(() => verificationDialogState.isOpen.value)
const currentRequest = computed(() => verificationDialogState.currentRequest.value)

const actionReasonKeyMap: Record<string, string> = {
  update_security_settings: 'auth.stepUp.reasons.updateSecuritySettings',
  revoke_sessions: 'auth.stepUp.reasons.revokeSessions',
  export_data: 'auth.stepUp.reasons.exportData',
  delete_account: 'auth.stepUp.reasons.deleteAccount',
  delete_content: 'auth.stepUp.reasons.deleteContent',
  change_email: 'auth.stepUp.reasons.changeEmail',
  change_password: 'auth.stepUp.reasons.changePassword',
  manage_api_keys: 'auth.stepUp.reasons.manageApiKeys',
  admin_operation: 'auth.stepUp.reasons.adminOperation',
}

function isUnauthenticatedStepUpError(error: ApiError): boolean {
  const rawMessage =
    typeof error.details?.rawMessage === 'string' ? error.details.rawMessage : error.message
  const normalized = rawMessage.trim().toLowerCase()

  return (
    error.code === 'UNAUTHENTICATED' ||
    error.code === 'NOT_AUTHENTICATED' ||
    normalized.includes('not authenticated') ||
    normalized.includes('please login') ||
    normalized.includes('请先登录') ||
    normalized.includes('請先登入') ||
    normalized.includes('認証が必要です')
  )
}

function dispatchSessionRejected(): void {
  clearAuthRuntimeSession()
  window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'auth_failed' } }))
}

const dialogTitle = computed(() => currentRequest.value?.title || t('auth.stepUp.title'))

const dialogDescription = computed(() => {
  if (currentRequest.value?.description) {
    return currentRequest.value.description
  }

  const action = currentRequest.value?.action
  if (!action) {
    return t('auth.stepUp.defaultDescription')
  }

  const reasonKey = actionReasonKeyMap[action]
  if (reasonKey && te(reasonKey)) {
    return t(reasonKey)
  }

  return t('auth.stepUp.defaultDescription')
})

watch(
  isOpen,
  (open) => {
    if (open) {
      password.value = ''
      showPassword.value = false
      errorMessage.value = ''
      return
    }

    password.value = ''
    showPassword.value = false
    isSubmitting.value = false
    errorMessage.value = ''
  },
  { immediate: true }
)

async function submitVerification() {
  const request = currentRequest.value
  if (!request || isSubmitting.value || !password.value.trim()) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const response = await authService.verifyIdentity(
      password.value.trim(),
      request.action as VerificationAction,
      request.resourceId,
      { skipErrorToast: true }
    )

    const verificationToken = response.verification_token?.trim()
    if (!verificationToken || response.verified === false) {
      errorMessage.value = t('auth.stepUp.invalidPassword')
      return
    }

    resolveVerification({
      verificationToken,
      expiresIn: response.expires_in,
      action: request.action,
      resourceId: request.resourceId,
      stepUpRequired: response.step_up_required,
      currentDeviceTrusted: response.current_device_trusted,
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      if (isUnauthenticatedStepUpError(error)) {
        dispatchSessionRejected()
        errorMessage.value = t('auth.stepUp.sessionExpired')
      } else {
        errorMessage.value = t('auth.stepUp.invalidPassword')
      }
    } else {
      errorMessage.value = error instanceof ApiError ? error.message : t('common.error')
    }
  } finally {
    isSubmitting.value = false
  }
}

function handleCancel() {
  if (isSubmitting.value) return
  dismissVerification()
}

function handleDialogToggle(nextOpen: boolean) {
  if (!nextOpen) {
    handleCancel()
  }
}
</script>

<style scoped>
.verification-dialog {
  display: grid;
  gap: 1rem;
}

.form-group {
  display: grid;
  gap: 0.5rem;
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.input-wrapper {
  position: relative;
}

.input-wrapper .input-with-icon {
  width: 100%;
  padding-right: 4.5rem;
}

.password-toggle {
  position: absolute;
  inset-inline-end: 0.75rem;
  inset-block-start: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  font-size: var(--text-xs);
}

.field-error {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-error);
}
</style>
