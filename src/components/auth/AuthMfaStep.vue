<template>
  <div ref="mfaStep" class="auth-card auth-card--stack glass-surface--base auth-mfa-step">
    <div class="auth-mfa-step__copy">
      <h2 :id="`${stepId}-title`" class="auth-title auth-title--section">{{ title }}</h2>
      <p :id="`${stepId}-hint`" class="auth-helper">{{ hint }}</p>
      <p v-if="message" class="auth-helper auth-helper--emphasis">{{ message }}</p>
    </div>

    <div
      v-if="hasMethodTabs"
      class="auth-mfa-step__methods"
      role="tablist"
      :aria-labelledby="`${stepId}-title`"
      @keydown="handleTabListKeydown"
    >
      <button
        v-for="option in methodOptions"
        :key="option.value"
        :id="`${stepId}-tab-${option.value}`"
        type="button"
        role="tab"
        class="auth-mfa-step__method"
        :class="{ 'auth-mfa-step__method--active': selectedMethod === option.value }"
        :aria-selected="selectedMethod === option.value"
        :aria-controls="`${stepId}-panel`"
        :tabindex="selectedMethod === option.value ? 0 : -1"
        :disabled="isBusy"
        @click="selectedMethod = option.value"
      >
        {{ option.label }}
      </button>
    </div>

    <div
      :id="`${stepId}-panel`"
      class="auth-form"
      :role="hasMethodTabs ? 'tabpanel' : undefined"
      :aria-labelledby="hasMethodTabs ? `${stepId}-tab-${selectedMethod}` : undefined"
      :tabindex="hasMethodTabs && !usesCodeEntry ? 0 : -1"
    >
      <div v-if="usesCodeEntry" class="form-group">
        <label :for="`${stepId}-code`">{{ codeLabel }}</label>
        <Input
          :id="`${stepId}-code`"
          v-model="code"
          type="text"
          :inputmode="selectedMethod === 'backup_code' ? 'text' : 'numeric'"
          :placeholder="$t('auth.twoFactorCodePlaceholder')"
          autocomplete="one-time-code"
          :aria-describedby="`${stepId}-hint${errorMessage ? ` ${stepId}-error` : ''}`"
          :aria-invalid="errorMessage ? 'true' : undefined"
          :disabled="isBusy"
          @keyup.enter="handleCodeSubmit"
        />
      </div>
      <p v-else class="auth-helper">{{ $t('auth.mfa.passkeyHint') }}</p>
      <p v-if="errorMessage" :id="`${stepId}-error`" class="field-error" role="alert">
        {{ errorMessage }}
      </p>
      <div class="action-group">
        <Button
          type="button"
          full-width
          :loading="isBusy"
          :disabled="!usesCodeEntry && !webauthnSupported"
          @click="usesCodeEntry ? handleCodeSubmit() : handlePasskeySubmit()"
        >
          {{ usesCodeEntry ? $t('auth.verifyButton') : $t('auth.mfa.passkeyAction') }}
        </Button>
      </div>
      <p v-if="!usesCodeEntry && !webauthnSupported" class="field-hint">
        {{ $t('auth.error.webauthnUnsupported') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import { useAuthStore, type AuthFlowResult } from '@/stores/auth'
import { handleTabListKeydown } from '@/utils/tabNavigation'
import {
  getWebAuthnAssertion,
  isWebAuthnSupported,
  serializePublicKeyCredential,
} from '@/utils/webauthn'

const props = withDefaults(
  defineProps<{
    pendingMfaLoginToken: string
    methods: string[]
    message?: string
    title?: string
    hint?: string
    errorMessage?: string
  }>(),
  {
    message: '',
    title: '',
    hint: '',
    errorMessage: '',
  }
)

const emit = defineEmits<{
  resolved: [result: AuthFlowResult]
}>()

const { t } = useI18n()
const authStore = useAuthStore()
const { isLoading } = storeToRefs(authStore)
const stepId = `mfa-${useId()}`
const mfaStep = useTemplateRef<HTMLElement>('mfaStep')

const code = ref('')
const selectedMethod = ref('totp')
const webauthnSupported = isWebAuthnSupported()
const isSubmitting = ref(false)
const isBusy = computed(() => isLoading.value || isSubmitting.value)

type MfaAttempt = { token: string; controller: AbortController }
let activeAttempt: MfaAttempt | null = null

function cancelAttempt() {
  activeAttempt?.controller.abort()
  activeAttempt = null
  isSubmitting.value = false
  code.value = ''
}

function beginAttempt(): MfaAttempt | null {
  if (isBusy.value) return null
  const attempt = { token: props.pendingMfaLoginToken, controller: new AbortController() }
  activeAttempt = attempt
  isSubmitting.value = true
  return attempt
}

function isCurrentAttempt(attempt: MfaAttempt): boolean {
  return activeAttempt === attempt && !attempt.controller.signal.aborted
}

function finishAttempt(attempt: MfaAttempt) {
  if (activeAttempt === attempt) {
    activeAttempt = null
    isSubmitting.value = false
  }
}

watch(() => props.pendingMfaLoginToken, cancelAttempt, { flush: 'sync' })
onBeforeUnmount(cancelAttempt)

const normalizedMethods = computed(() => {
  const values = Array.isArray(props.methods) ? props.methods : []
  return [...new Set(values.filter((value): value is string => typeof value === 'string'))]
})

const defaultMethod = computed(() => {
  if (normalizedMethods.value.includes('totp')) return 'totp'
  if (normalizedMethods.value.includes('backup_code')) return 'backup_code'
  if (normalizedMethods.value.includes('webauthn')) return 'webauthn'
  return 'totp'
})

watch(
  normalizedMethods,
  (methods) => {
    const methodRemoved = !methods.includes(selectedMethod.value)
    const restoreFocus =
      mfaStep.value?.contains(document.activeElement) &&
      (methodRemoved ||
        (methods.length < 2 && document.activeElement?.getAttribute('role') === 'tab'))
    if (methodRemoved) selectedMethod.value = defaultMethod.value
    if (restoreFocus) {
      void nextTick(() => {
        const step = mfaStep.value
        if (!step || isBusy.value) return
        const active = document.activeElement
        if (active !== document.body && active?.isConnected && !step.contains(active)) return
        const target =
          step.querySelector<HTMLElement>(
            '[role="tab"][aria-selected="true"], input:not(:disabled), .action-group button:not(:disabled)'
          ) ?? step.querySelector<HTMLElement>('.auth-form')
        target?.focus({ preventScroll: true })
      })
    }
  },
  { immediate: true }
)

const methodOptions = computed(() =>
  normalizedMethods.value.map((value) => ({
    value,
    label: localizeMethod(value),
  }))
)
const hasMethodTabs = computed(() => methodOptions.value.length > 1)

const usesCodeEntry = computed(() => selectedMethod.value !== 'webauthn')
const title = computed(() => props.title || t('auth.mfa.title'))
const hint = computed(() => props.hint || t('auth.mfa.hint'))
const codeLabel = computed(() =>
  selectedMethod.value === 'backup_code' ? t('auth.mfa.backupCodeLabel') : t('auth.mfa.codeLabel')
)

function localizeMethod(method: string): string {
  switch (method) {
    case 'backup_code':
      return t('profile.mfaMethodBackupCode')
    case 'webauthn':
      return t('profile.mfaMethodWebauthn')
    case 'totp':
    default:
      return t('profile.mfaMethodTotp')
  }
}

async function handleCodeSubmit() {
  if (isBusy.value) return
  const nextCode = code.value.trim()
  if (!nextCode) {
    emit('resolved', {
      status: 'error',
      error: 'auth.error.codeRequired',
    })
    return
  }

  const attempt = beginAttempt()
  if (!attempt) return
  try {
    const result = await authStore.completeMfaLogin(attempt.token, nextCode, {
      signal: attempt.controller.signal,
    })
    if (!isCurrentAttempt(attempt)) return
    if (result.status !== 'error') code.value = ''
    emit('resolved', result)
  } catch {
    if (isCurrentAttempt(attempt)) {
      emit('resolved', { status: 'error', error: 'auth.error.twoFactorInvalid' })
    }
  } finally {
    finishAttempt(attempt)
  }
}

async function handlePasskeySubmit() {
  if (isBusy.value) return
  if (!webauthnSupported) {
    emit('resolved', {
      status: 'error',
      error: 'auth.error.webauthnUnsupported',
    })
    return
  }

  const attempt = beginAttempt()
  if (!attempt) return
  try {
    const optionsResult = await authStore.beginWebAuthnLogin(attempt.token, {
      signal: attempt.controller.signal,
    })
    if (!isCurrentAttempt(attempt)) return
    if (optionsResult.status === 'error') {
      emit('resolved', optionsResult)
      return
    }

    const assertion = await getWebAuthnAssertion(optionsResult.options, {
      signal: attempt.controller.signal,
    })
    if (!isCurrentAttempt(attempt)) return
    if (!(assertion instanceof PublicKeyCredential)) {
      emit('resolved', {
        status: 'error',
        error: 'auth.error.webauthnLoginFailed',
      })
      return
    }

    const result = await authStore.finishWebAuthnLogin(
      attempt.token,
      optionsResult.ceremonyId,
      serializePublicKeyCredential(assertion),
      { signal: attempt.controller.signal }
    )
    if (isCurrentAttempt(attempt)) emit('resolved', result)
  } catch {
    if (isCurrentAttempt(attempt)) {
      emit('resolved', { status: 'error', error: 'auth.error.webauthnLoginFailed' })
    }
  } finally {
    finishAttempt(attempt)
  }
}
</script>

<style scoped>
.auth-mfa-step {
  gap: 1rem;
}

.auth-mfa-step__copy {
  display: grid;
  gap: 0.65rem;
}

.auth-title--section {
  font-size: clamp(1.2rem, 1.05rem + 0.7vw, 1.6rem);
}

.auth-helper--emphasis {
  color: var(--auth-text-strong);
}

.auth-mfa-step__methods {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.auth-mfa-step__method {
  border: 0.0625rem solid color-mix(in srgb, var(--auth-panel-border) 88%, transparent);
  border-radius: 999rem;
  background: color-mix(in srgb, var(--auth-panel-bg) 82%, rgba(255, 255, 255, 0.14));
  color: var(--auth-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  min-height: 2.5rem;
  padding: 0.55rem 0.9rem;
  transition:
    color var(--transition-fast),
    background-color var(--transition-fast),
    border-color var(--transition-fast);
}

.auth-mfa-step__method--active {
  color: var(--auth-text-strong);
  border-color: color-mix(in srgb, var(--auth-panel-border) 94%, transparent);
  background: color-mix(in srgb, var(--auth-panel-bg-strong) 88%, rgba(255, 255, 255, 0.18));
}
</style>
