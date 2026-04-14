<template>
  <header class="sub-header" data-testid="profile-section-header">
    <div class="sub-header__content empty-surface surface-editorial">
      <ControlButton
        class="back-btn"
        size="square"
        icon-only
        :aria-label="$t('common.back')"
        @click="goBack"
      >
        <template #start>
          <ArrowLeft :size="16" />
        </template>
      </ControlButton>
      <div class="header-text">
        <span class="header-eyebrow">{{ $t('nav.profile') }}</span>
        <h1>{{ title }}</h1>
        <p v-if="subtitle" class="header-subtitle">{{ subtitle }}</p>
        <p v-if="hint" class="header-hint">{{ hint }}</p>
      </div>
      <div class="header-actions">
        <slot name="actions">
          <Button variant="ghost" size="sm" @click="goToProfile">
            <User :size="14" />
            {{ $t('nav.profile') }}
          </Button>
        </slot>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, User } from '@lucide/vue'
import { sanitizeProfileReturnTo, PROFILE_RETURN_FALLBACK } from '@/utils/profileReturnTo'
import ControlButton from '@/components/appearance/ControlButton.vue'
import Button from '@/components/ui/Button.vue'

defineProps<{
  title: string
  subtitle?: string
  hint?: string
}>()
defineSlots<{
  actions?: () => unknown
}>()

const route = useRoute()
const router = useRouter()

function hasKnownRouterBackEntry(): boolean {
  const state = window.history.state as { back?: unknown } | null
  return typeof state?.back === 'string' && state.back.startsWith('/')
}

function goBack() {
  const returnTo = sanitizeProfileReturnTo(route.query['returnTo'], PROFILE_RETURN_FALLBACK)
  if (hasKnownRouterBackEntry()) {
    router.back()
    return
  }

  router.replace(returnTo)
}

function goToProfile() {
  router.push(PROFILE_RETURN_FALLBACK)
}
</script>

<style scoped>
.sub-header {
  position: relative;
  margin-bottom: clamp(1.25rem, 3vw, 2rem);
}

.sub-header__content {
  display: flex;
  align-items: flex-start;
  gap: clamp(0.75rem, 2vw, 1rem);
  padding: clamp(0.875rem, 2.5vw, 1.25rem);
}

.header-text {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 0.35rem;
}

.header-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.header-text h1 {
  margin: 0;
  font-size: clamp(var(--text-lg), 2.5vw, var(--text-xl));
  line-height: 1.3;
  color: var(--color-text-primary);
}

.header-subtitle {
  margin: 0.25rem 0 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  max-width: 42ch;
}

.header-hint {
  margin: 0.25rem 0 0;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  max-width: 52ch;
}

.back-btn {
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.header-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

@media (max-width: 768px) {
  .sub-header__content {
    flex-wrap: wrap;
    gap: var(--spacing-2);
  }

  .header-actions {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
