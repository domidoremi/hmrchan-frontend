<template>
  <header class="sub-header">
    <div class="sub-header__content empty-surface surface-editorial">
      <button
        type="button"
        class="back-btn page-control-btn page-control-btn--square"
        @click="goBack"
        :aria-label="$t('common.back')"
      >
        <ArrowLeft :size="16" />
      </button>
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
import { useRouter } from 'vue-router'
import { ArrowLeft, User } from '@lucide/vue'
import Button from '@/components/ui/Button.vue'

defineProps<{
  title: string
  subtitle?: string
  hint?: string
}>()
defineSlots<{
  actions?: () => unknown
}>()

const router = useRouter()

function goBack() {
  router.back()
}

function goToProfile() {
  router.push('/profile')
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

.header-actions :deep(.btn-ghost) {
  background: var(--profile-action-bg);
  border: 1px solid var(--profile-action-border);
  color: var(--color-text-secondary);
  box-shadow: none;
}

.header-actions :deep(.btn-ghost:hover:not(:disabled)) {
  background: var(--profile-action-bg-hover);
  border-color: var(--profile-action-border-strong);
  color: var(--color-primary);
}

@media (max-width: 768px) {
  .sub-header__content {
    flex-wrap: wrap;
    gap: var(--spacing-2);
  }

  .back-btn {
    width: 2rem;
    height: 2rem;
  }

  .header-actions {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }
}
</style>

<style>
/* ===== Material 3 Overrides ===== */
#app[data-preset='material-calm'] .sub-header .sub-header__content,
#app[data-preset='sketch-doodle'] .sub-header .sub-header__content {
  border-radius: var(--radius-lg);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background: var(--color-surface, var(--profile-surface-bg));
  box-shadow: var(--shadow-sm);
}

#app[data-preset='material-calm'] .sub-header .sub-header__content::before,
#app[data-preset='sketch-doodle'] .sub-header .sub-header__content::before {
  display: none;
}

#app[data-preset='material-calm'] .sub-header .back-btn,
#app[data-preset='sketch-doodle'] .sub-header .back-btn {
  border-radius: 50%;
}

#app[data-preset='material-calm'] .sub-header .back-btn:hover,
#app[data-preset='sketch-doodle'] .sub-header .back-btn:hover {
  transform: none;
  background: rgba(var(--color-primary-rgb), 0.12);
}

/* ===== Material + Dark ===== */
#app[data-preset='material-calm'][data-color-mode='dark'] .sub-header .sub-header__content,
#app[data-preset='sketch-doodle'][data-color-mode='dark'] .sub-header .sub-header__content {
  background: var(--md-surface-container, rgba(28, 28, 32, 0.92));
  border-color: rgba(255, 255, 255, 0.06);
}
</style>
