<template>
  <Dialog
    :is-open="isOpen"
    :title="$t('auth.verifyTitle')"
    :description="$t('auth.clientChallengeHint')"
    size="sm"
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
    </div>

    <template #footer>
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

const turnstileRef = useTemplateRef<{ reset: () => void }>('turnstileRef')

const isOpen = computed(() => clientChallengeState.isOpen.value)
const resolvedSiteKey = computed(() => clientChallengeState.turnstileSiteKey.value)

watch(
  isOpen,
  (open) => {
    if (open) {
      errorMessage.value = ''
      void ensureSiteKey()
      return
    }

    isPreparing.value = false
    isSubmitting.value = false
    errorMessage.value = ''
  },
  { immediate: true }
)

async function ensureSiteKey() {
  if (resolvedSiteKey.value) return

  isPreparing.value = true
  errorMessage.value = ''

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
  } finally {
    isPreparing.value = false
  }
}

async function handleTurnstileVerify(token: string) {
  if (isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await clientSecurityService.verify(token)
    resolveClientChallenge()
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : t('auth.error.turnstileFailed')
    turnstileRef.value?.reset()
  } finally {
    isSubmitting.value = false
  }
}

function handleTurnstileExpire() {
  errorMessage.value = t('auth.error.turnstileRequired')
}

function handleTurnstileError() {
  errorMessage.value = t('auth.error.turnstileFailed')
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
</style>
