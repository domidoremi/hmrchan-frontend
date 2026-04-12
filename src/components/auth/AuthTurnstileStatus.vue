<template>
  <div
    class="auth-turnstile-status"
    :class="[
      `auth-turnstile-status--${status}`,
      {
        'auth-turnstile-status--interactive': showWidgetFrame,
        'auth-turnstile-status--error': Boolean(errorMessage),
      },
    ]"
  >
    <div class="auth-turnstile-status__copy" aria-live="polite" aria-atomic="true">
      <span class="turnstile-title">{{ title }}</span>
      <span class="turnstile-hint">{{ hint }}</span>
    </div>

    <div
      class="auth-turnstile-status__widget"
      :class="{ 'auth-turnstile-status__widget--interactive': showWidgetFrame }"
    >
      <slot />
    </div>

    <p v-if="errorMessage" class="field-error">{{ errorMessage }}</p>
    <p v-else-if="detail" class="turnstile-hint">{{ detail }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TurnstileWidgetStatus } from '@/utils/turnstileWidgetStatus'

const props = withDefaults(
  defineProps<{
    status: TurnstileWidgetStatus
    errorMessage?: string
    detail?: string
    showWidgetFrame?: boolean
  }>(),
  {
    errorMessage: '',
    detail: '',
    showWidgetFrame: false,
  }
)

const { t } = useI18n()

const title = computed(() => {
  switch (props.status) {
    case 'executing':
      return t('auth.turnstileStatusExecutingTitle')
    case 'interactive_required':
      return t('auth.turnstileStatusInteractiveTitle')
    case 'verified':
      return t('auth.turnstileStatusVerifiedTitle')
    default:
      return t('auth.verifyTitle')
  }
})

const hint = computed(() => {
  if (props.errorMessage) {
    return props.detail || t('auth.verifyHint')
  }

  switch (props.status) {
    case 'executing':
      return t('auth.turnstileStatusExecutingHint')
    case 'interactive_required':
      return t('auth.turnstileStatusInteractiveHint')
    case 'verified':
      return t('auth.turnstileStatusVerifiedHint')
    case 'expired':
      return t('auth.error.turnstileRequired')
    default:
      return props.detail || t('auth.verifyHint')
  }
})
</script>
