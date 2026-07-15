<template>
  <div class="auth-page auth-page--recovery">
    <AuthEntryShell
      :title="pageTitle"
      :subtitle="pageSubtitle"
      :show-tabs="false"
      split
      @back="handleBack"
    >
      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="auth-card auth-card--stack">
          <div class="form-group">
            <label for="recovery-email">{{ $t('auth.passkeyRecovery.emailLabel') }}</label>
            <Input
              id="recovery-email"
              v-model="email"
              type="email"
              autocomplete="email"
              :disabled="step === 'verify'"
              :placeholder="$t('auth.emailPlaceholder')"
              required
            />
          </div>

          <div v-if="step === 'verify'" class="form-group">
            <label for="recovery-code">{{ $t('auth.passkeyRecovery.codeLabel') }}</label>
            <Input
              id="recovery-code"
              v-model="verificationCode"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              :placeholder="$t('auth.riskVerificationCodePlaceholder')"
              required
            />
          </div>

          <div v-if="step === 'verify'" class="form-group">
            <label for="recovery-password">{{ $t('auth.passkeyRecovery.passwordLabel') }}</label>
            <Input
              id="recovery-password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              :placeholder="$t('auth.passwordPlaceholder')"
            />
            <p class="field-hint">{{ $t('auth.passkeyRecovery.passwordHint') }}</p>
          </div>

          <p v-if="successMessage" class="auth-helper auth-helper--emphasis">
            {{ successMessage }}
          </p>
          <p v-if="errorMessage" class="field-error">{{ errorMessage }}</p>

          <div class="action-group">
            <Button type="submit" full-width :loading="isSubmitting">
              {{
                step === 'start'
                  ? $t('auth.passkeyRecovery.sendCodeAction')
                  : $t('auth.passkeyRecovery.verifyAction')
              }}
            </Button>
            <Button
              v-if="step === 'verify'"
              type="button"
              variant="ghost"
              full-width
              :disabled="isSubmitting"
              @click="resetToStart"
            >
              {{ $t('common.reset') }}
            </Button>
          </div>
        </div>
      </form>

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
defineOptions({ name: 'PasskeyRecoveryPage' })

import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ApiError, authService } from '@/api'
import { AuthEntryShell } from '@/components/auth/entry'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'

type Step = 'start' | 'verify'

const router = useRouter()
const { t } = useI18n()

const step = ref<Step>('start')
const email = ref('')
const verificationCode = ref('')
const password = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isSubmitting = ref(false)

const pageTitle = computed(() =>
  step.value === 'start' ? t('auth.passkeyRecovery.title') : t('auth.passkeyRecovery.verifyTitle')
)
const pageSubtitle = computed(() =>
  step.value === 'start' ? t('auth.passkeyRecovery.subtitle') : t('auth.passkeyRecovery.verifyHint')
)

function handleBack() {
  if (step.value === 'verify') {
    resetToStart()
    return
  }

  if (window.history.length > 1) {
    router.back()
    return
  }

  void router.replace('/login')
}

function resetToStart() {
  step.value = 'start'
  verificationCode.value = ''
  password.value = ''
  errorMessage.value = ''
}

async function handleSubmit() {
  if (isSubmitting.value) return

  errorMessage.value = ''
  successMessage.value = ''

  if (!email.value.trim()) {
    errorMessage.value = t('auth.emailRequired')
    return
  }

  isSubmitting.value = true

  try {
    if (step.value === 'start') {
      await authService.startPasskeyRecovery({
        email: email.value.trim(),
      })
      step.value = 'verify'
      successMessage.value = t('auth.passkeyRecovery.codeSent')
      return
    }

    if (!verificationCode.value.trim()) {
      errorMessage.value = t('auth.error.codeRequired')
      return
    }

    const result = await authService.verifyPasskeyRecovery({
      email: email.value.trim(),
      verification_code: verificationCode.value.trim(),
      ...(password.value ? { password: password.value } : {}),
    })

    await router.push({
      name: 'passkey-recovery-detail',
      params: { id: result.recovery_id },
    })
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : t('auth.error.unknown')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.field-hint {
  margin: 0;
}
</style>
