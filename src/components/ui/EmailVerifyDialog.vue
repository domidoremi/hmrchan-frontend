<template>
  <Dialog
    :is-open="isOpen"
    size="sm"
    :close-on-overlay="!isVerifying"
    :close-on-escape="!isVerifying"
    @close="handleClose"
  >
    <template #title>{{ $t('emailCode.title') }}</template>
    <template #description>{{ $t('emailCode.description') }}</template>

    <div class="verify-content">
      <!-- Step 1: Send code -->
      <template v-if="step === 'send'">
        <div class="verify-icon">
          <Mail :size="36" />
        </div>
        <p class="verify-hint">
          {{ $t('emailCode.sendHint', { email: maskedEmail }) }}
        </p>
        <Button full-width :loading="isSending" @click="sendCode">
          {{ $t('emailCode.sendButton') }}
        </Button>
      </template>

      <!-- Step 2: Enter code -->
      <template v-else>
        <p class="verify-sent-hint">
          {{ $t('emailCode.codeSentTo', { email: maskedEmail }) }}
        </p>

        <EmailCodeInput
          ref="codeInputRef"
          :disabled="isVerifying"
          :error="codeError"
          @complete="handleCodeComplete"
        />

        <p v-if="errorMessage" class="verify-error">{{ errorMessage }}</p>

        <Button full-width :loading="isVerifying" :disabled="!codeReady" @click="verifyCode">
          {{ $t('emailCode.verifyButton') }}
        </Button>

        <div class="verify-footer">
          <button
            type="button"
            class="resend-btn"
            :disabled="resendCooldown > 0 || isSending"
            @click="sendCode"
          >
            <span v-if="isSending" class="spinner spinner-xs" />
            {{
              resendCooldown > 0
                ? $t('emailCode.resendCooldown', { seconds: resendCooldown })
                : $t('emailCode.resend')
            }}
          </button>
        </div>
      </template>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Mail } from 'lucide-vue-next'
import { authService, ApiError, type SendEmailCodeRequest } from '@/api'
import { useToastStore } from '@/stores'
import Dialog from '@/components/ui/Dialog.vue'
import Button from '@/components/ui/Button.vue'
import EmailCodeInput from '@/components/ui/EmailCodeInput.vue'

interface Props {
  isOpen: boolean
  /** The action name for the verification (e.g. 'change_email', 'change_password') */
  action: 'change_password' | 'change_email'
  /** User's current email (will be masked in display) */
  email: string
  /**
   * Optional target email to send code to (for Change Email flow).
   * If provided, code is sent here instead of current email.
   */
  targetEmail?: string | undefined
  /** Current password (required for sending code) */
  password?: string | undefined
  /** Sensitive action verification token */
  verificationToken?: string | undefined
  /** New password (required for change_password verification) */
  newPassword?: string | undefined
  /** Auto-send code when dialog opens */
  autoSend?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoSend: false,
})

const emit = defineEmits<{
  close: []
  /** Emitted when verification succeeds, with the verification_token */
  verified: [token: string]
}>()

const { t } = useI18n()
const toastStore = useToastStore()

type Step = 'send' | 'code'
const step = ref<Step>('send')
const isSending = ref(false)
const isVerifying = ref(false)
const codeError = ref(false)
const errorMessage = ref('')
const currentCode = ref('')
const resendCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null
let sendCodeController: AbortController | null = null
let verifyCodeController: AbortController | null = null
let sendCodeRequestToken = 0
let verifyCodeRequestToken = 0

const codeInputRef = useTemplateRef<InstanceType<typeof EmailCodeInput>>('codeInputRef')

const maskedEmail = computed(() => {
  const emailToMask = props.targetEmail || props.email
  if (!emailToMask) return ''
  const parts = emailToMask.split('@')
  const local = parts[0] ?? ''
  const domain = parts[1]
  if (!domain) return emailToMask
  const visible = local.length <= 2 ? local : local.slice(0, 2)
  return `${visible}***@${domain}`
})

const codeReady = computed(() => currentCode.value.length === 6)

function startCooldown() {
  resendCooldown.value = 60
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

function abortSendCodeRequest() {
  sendCodeController?.abort()
  sendCodeController = null
}

function abortVerifyCodeRequest() {
  verifyCodeController?.abort()
  verifyCodeController = null
}

function abortAllRequests() {
  abortSendCodeRequest()
  abortVerifyCodeRequest()
}

function resetState() {
  abortAllRequests()
  step.value = 'send'
  isSending.value = false
  isVerifying.value = false
  codeError.value = false
  errorMessage.value = ''
  currentCode.value = ''
  resendCooldown.value = 0
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
}

async function sendCode() {
  abortSendCodeRequest()
  const controller = new AbortController()
  sendCodeController = controller
  const requestToken = ++sendCodeRequestToken

  isSending.value = true
  errorMessage.value = ''

  try {
    const payload: SendEmailCodeRequest = { action: props.action }
    if (props.verificationToken) {
      payload.verification_token = props.verificationToken
    }
    if (props.action === 'change_password' && props.password) {
      payload.password = props.password
    } else if (props.action === 'change_email' && props.password && props.targetEmail) {
      payload.password = props.password
      payload.new_email = props.targetEmail
    }
    await authService.sendEmailCode(payload, { signal: controller.signal })
    if (controller.signal.aborted || requestToken !== sendCodeRequestToken) return
    step.value = 'code'
    startCooldown()
    toastStore.success(t('emailCode.codeSent'))
    nextTick(() => codeInputRef.value?.focus())
  } catch (err) {
    if (controller.signal.aborted || requestToken !== sendCodeRequestToken) return
    if (err instanceof ApiError) {
      if (err.status === 429) {
        toastStore.error(t('emailCode.tooManyRequests'))
      } else {
        toastStore.error(err.message)
      }
    } else {
      toastStore.error(t('emailCode.sendFailed'))
    }
  } finally {
    if (requestToken === sendCodeRequestToken) {
      isSending.value = false
      if (sendCodeController === controller) {
        sendCodeController = null
      }
    }
  }
}

function handleCodeComplete(code: string) {
  currentCode.value = code
  verifyCode()
}

async function verifyCode() {
  if (!codeReady.value || isVerifying.value) return

  abortVerifyCodeRequest()
  const controller = new AbortController()
  verifyCodeController = controller
  const requestToken = ++verifyCodeRequestToken

  isVerifying.value = true
  errorMessage.value = ''
  codeError.value = false

  try {
    const result = await authService.verifyEmailCode(
      {
        action: props.action,
        verification_code: currentCode.value,
        ...(props.verificationToken ? { verification_token: props.verificationToken } : {}),
        ...(props.action === 'change_password' && props.newPassword
          ? { new_password: props.newPassword }
          : {}),
      },
      { signal: controller.signal }
    )
    if (controller.signal.aborted || requestToken !== verifyCodeRequestToken) return
    emit('verified', result.message || '')
  } catch (err) {
    if (controller.signal.aborted || requestToken !== verifyCodeRequestToken) return
    codeError.value = true
    if (err instanceof ApiError) {
      if (err.status === 400 || err.code === 'INVALID_CODE') {
        errorMessage.value = t('emailCode.invalidCode')
      } else if (err.status === 410 || err.code === 'CODE_EXPIRED') {
        errorMessage.value = t('emailCode.codeExpired')
      } else if (err.status === 429) {
        errorMessage.value = t('emailCode.tooManyAttempts')
      } else {
        errorMessage.value = err.message
      }
    } else {
      errorMessage.value = t('emailCode.verifyFailed')
    }
  } finally {
    if (requestToken === verifyCodeRequestToken) {
      isVerifying.value = false
      if (verifyCodeController === controller) {
        verifyCodeController = null
      }
    }
  }
}

function handleClose() {
  if (!isVerifying.value) {
    abortAllRequests()
    emit('close')
  }
}

// Reset state when dialog opens/closes
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      resetState()
      if (props.autoSend) {
        void sendCode()
      }
      return
    }
    abortAllRequests()
    isSending.value = false
    isVerifying.value = false
    // 关闭时清理计时器，避免后台计时占用
    if (cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }
)

onUnmounted(() => {
  abortAllRequests()
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
})
</script>

<style scoped>
.verify-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-2) 0;
}

.verify-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  border-radius: var(--radius-full);
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}

.verify-hint {
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  margin: 0;
}

.verify-sent-hint {
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin: 0;
}

.verify-error {
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-error);
  margin: 0;
}

.verify-footer {
  display: flex;
  justify-content: center;
}

.resend-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-md);
  transition: color 150ms ease;
}

.resend-btn:not(:disabled):hover {
  color: var(--color-primary);
}

.resend-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
