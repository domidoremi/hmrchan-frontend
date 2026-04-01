<template>
  <div class="auth-card auth-card--stack glass-surface--base auth-mfa-step">
    <div class="auth-mfa-step__copy">
      <h2 class="auth-title auth-title--section">{{ title }}</h2>
      <p class="auth-helper">{{ hint }}</p>
      <p v-if="message" class="auth-helper auth-helper--emphasis">{{ message }}</p>
    </div>

    <div v-if="methodOptions.length > 1" class="auth-mfa-step__methods" role="tablist">
      <button
        v-for="option in methodOptions"
        :key="option.value"
        type="button"
        class="auth-mfa-step__method"
        :class="{ 'auth-mfa-step__method--active': selectedMethod === option.value }"
        :aria-pressed="selectedMethod === option.value"
        @click="selectedMethod = option.value"
      >
        {{ option.label }}
      </button>
    </div>

    <div v-if="usesCodeEntry" class="auth-form">
      <div class="form-group">
        <label for="mfa-code">{{ codeLabel }}</label>
        <Input
          id="mfa-code"
          v-model="code"
          type="text"
          :inputmode="selectedMethod === 'backup_code' ? 'text' : 'numeric'"
          :placeholder="$t('auth.twoFactorCodePlaceholder')"
          autocomplete="one-time-code"
          @keyup.enter="handleCodeSubmit"
        />
      </div>

      <p v-if="errorMessage" class="field-error">{{ errorMessage }}</p>

      <div class="action-group">
        <Button type="button" full-width :loading="isLoading" @click="handleCodeSubmit">
          {{ $t('auth.verifyButton') }}
        </Button>
      </div>
    </div>

    <div v-else class="auth-form">
      <p class="auth-helper">{{ $t('auth.mfa.passkeyHint') }}</p>
      <p v-if="errorMessage" class="field-error">{{ errorMessage }}</p>
      <div class="action-group">
        <Button
          type="button"
          full-width
          :loading="isLoading"
          :disabled="!webauthnSupported"
          @click="handlePasskeySubmit"
        >
          {{ $t('auth.mfa.passkeyAction') }}
        </Button>
      </div>
      <p v-if="!webauthnSupported" class="field-hint">
        {{ $t('auth.error.webauthnUnsupported') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import { useAuthStore, type AuthFlowResult } from '@/stores/auth'
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

const code = ref('')
const selectedMethod = ref('totp')
const webauthnSupported = isWebAuthnSupported()

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
    if (!methods.includes(selectedMethod.value)) {
      selectedMethod.value = defaultMethod.value
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
  const nextCode = code.value.trim()
  if (!nextCode) {
    emit('resolved', {
      status: 'error',
      error: 'auth.error.codeRequired',
    })
    return
  }

  const result = await authStore.completeMfaLogin(props.pendingMfaLoginToken, nextCode)
  if (result.status !== 'error') {
    code.value = ''
  }
  emit('resolved', result)
}

async function handlePasskeySubmit() {
  if (!webauthnSupported) {
    emit('resolved', {
      status: 'error',
      error: 'auth.error.webauthnUnsupported',
    })
    return
  }

  const optionsResult = await authStore.beginWebAuthnLogin(props.pendingMfaLoginToken)
  if (optionsResult.status === 'error') {
    emit('resolved', optionsResult)
    return
  }

  try {
    const assertion = await getWebAuthnAssertion(optionsResult.options)
    if (!(assertion instanceof PublicKeyCredential)) {
      emit('resolved', {
        status: 'error',
        error: 'auth.error.webauthnLoginFailed',
      })
      return
    }

    const result = await authStore.finishWebAuthnLogin(
      props.pendingMfaLoginToken,
      optionsResult.ceremonyId,
      serializePublicKeyCredential(assertion)
    )
    emit('resolved', result)
  } catch {
    emit('resolved', {
      status: 'error',
      error: 'auth.error.webauthnLoginFailed',
    })
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
