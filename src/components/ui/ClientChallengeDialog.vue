<template>
  <Dialog
    :is-open="isOpen"
    :title="$t('auth.verifyTitle')"
    size="sm"
    allow-overflow
    @update:isOpen="handleDialogToggle"
  >
    <div class="client-challenge-dialog">
      <p v-if="isPreparing" class="client-challenge-dialog__hint">
        {{ $t('auth.clientChallengeLoading') }}
      </p>

      <TurnstileWidget
        v-else-if="resolvedSiteKey"
        ref="turnstileRef"
        :site-key="resolvedSiteKey"
        action="client_verify"
        @verify="handleTurnstileVerify"
        @expire="handleTurnstileExpire"
        @error="handleTurnstileError"
      />

      <p v-else class="client-challenge-dialog__hint">
        {{ $t('auth.clientChallengeLoading') }}
      </p>

      <p v-if="errorMessage" class="field-error">{{ errorMessage }}</p>
      <p v-if="errorDetail" class="client-challenge-dialog__detail">{{ errorDetail }}</p>
    </div>

    <template #footer>
      <Button
        v-if="errorMessage"
        variant="secondary"
        size="sm"
        :disabled="isSubmitting"
        @click="handleRetry"
      >
        {{ $t('common.retry') }}
      </Button>
      <Button variant="ghost" size="sm" :disabled="isSubmitting" @click="handleCancel">
        {{ $t('common.cancel') }}
      </Button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
defineOptions({ name: 'ClientChallengeDialog' })

import { computed, ref, watch, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from '@/components/ui/Button.vue'
import Dialog from '@/components/ui/Dialog.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'
import { ApiError } from '@/api'
import { clientSecurityService } from '@/api/clientSecurityService'
import { describeTurnstileError, getTurnstileErrorMessageKey } from '@/utils/turnstile'
import {
  clientChallengeState,
  dismissClientChallenge,
  resolveClientChallenge,
  setClientChallengeSiteKey,
} from '@/api/clientChallengeBridge'

const { t } = useI18n()

const isSubmitting = ref(false)
const isPreparing = ref(false)
const errorMessage = ref('')
const errorDetail = ref('')

const turnstileRef = useTemplateRef<{ reset: () => void; rerender?: () => void }>('turnstileRef')

const isOpen = computed(() => clientChallengeState.isOpen.value)
const resolvedSiteKey = computed(() => clientChallengeState.turnstileSiteKey.value)

watch(
  isOpen,
  (open) => {
    if (open) {
      errorMessage.value = ''
      errorDetail.value = ''
      void ensureSiteKey()
      return
    }

    isPreparing.value = false
    isSubmitting.value = false
    errorMessage.value = ''
    errorDetail.value = ''
  },
  { immediate: true }
)

async function ensureSiteKey() {
  if (resolvedSiteKey.value || isPreparing.value) return

  isPreparing.value = true
  errorMessage.value = ''
  errorDetail.value = ''

  try {
    const status = await clientSecurityService.getStatus()
    if (status.turnstile_site_key) {
      setClientChallengeSiteKey(status.turnstile_site_key)
    }
    if (!status.challenge_required) {
      resolveClientChallenge()
    }
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : t('auth.error.turnstileFailed')
    errorDetail.value = error instanceof Error ? error.message : ''
  } finally {
    isPreparing.value = false
  }
}

async function handleTurnstileVerify(token: string) {
  if (isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = ''
  errorDetail.value = ''

  try {
    await clientSecurityService.verify(token)
    resolveClientChallenge()
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : t('auth.error.turnstileFailed')
    errorDetail.value = error instanceof Error ? error.message : ''
  } finally {
    isSubmitting.value = false
  }
}

function handleTurnstileExpire() {
  errorMessage.value = t('auth.error.turnstileRequired')
  errorDetail.value = ''
}

function handleTurnstileError(error?: Error) {
  errorMessage.value = t(getTurnstileErrorMessageKey(error))
  errorDetail.value = error ? describeTurnstileError(error) : ''
}

async function handleRetry() {
  if (isSubmitting.value) return
  errorMessage.value = ''
  errorDetail.value = ''

  if (!resolvedSiteKey.value) {
    await ensureSiteKey()
    return
  }

  if (turnstileRef.value?.rerender) {
    turnstileRef.value.rerender()
    return
  }

  turnstileRef.value?.reset()
}

function handleCancel() {
  if (isSubmitting.value) return
  dismissClientChallenge()
}

function handleDialogToggle(nextOpen: boolean) {
  if (!nextOpen) {
    handleCancel()
  }
}
</script>

<style scoped>
.client-challenge-dialog {
  display: grid;
  gap: 1rem;
}

.client-challenge-dialog__hint {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  line-height: 1.55;
}

.client-challenge-dialog__detail {
  margin: -0.5rem 0 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  line-height: 1.5;
}
</style>
