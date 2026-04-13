<template>
  <div
    class="toast-viewport"
    :class="`toast-viewport--${normalizedPosition}`"
    :data-preset="settings.appearancePreset"
    :data-color-mode="resolvedTheme"
    :data-motion="motionMode"
    :data-contrast="settings.contrastMode"
    data-scene-role="utility"
  >
    <TransitionGroup name="toast-slide" tag="div" class="toast-stack">
      <section
        v-for="toast in visibleToasts"
        :key="toast.id"
        class="toast-card"
        :class="`toast-card--${toast.type}`"
        role="alert"
        @mouseenter="handlePause(toast.id)"
        @mouseleave="handleResume(toast.id)"
      >
        <span class="toast-card__accent" aria-hidden="true" />

        <div class="toast-card__icon">
          <component :is="getIcon(toast.type)" :size="18" />
        </div>

        <div class="toast-card__body">
          <h4 v-if="toast.title" class="toast-card__title">{{ toast.title }}</h4>
          <p class="toast-card__message">{{ toast.message }}</p>

          <button
            v-if="toast.action"
            type="button"
            class="toast-card__action"
            @click="handleAction(toast)"
          >
            {{ toast.action.label }}
          </button>
        </div>

        <button
          type="button"
          class="toast-card__close"
          :aria-label="$t('common.close')"
          @click="removeToast(toast.id)"
        >
          <X :size="16" />
        </button>

        <span
          v-if="toast.duration > 0"
          class="toast-card__progress"
          :class="{ 'is-paused': isPaused(toast.id) }"
          :style="{ animationDuration: `${toast.duration}ms` }"
        />
      </section>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { AlertTriangle, CheckCircle2, Info, TriangleAlert, X, CircleAlert } from '@lucide/vue'
import { useToastStore, useThemeStore, useSettingsStore, type Toast } from '@/stores'

defineOptions({ name: 'UiToastContainer' })

interface Props {
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center'
}

const { position = 'bottom-center' } = defineProps<Props>()

const toastStore = useToastStore()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()

const { toasts } = storeToRefs(toastStore)
const { resolvedTheme } = storeToRefs(themeStore)
const { settings, motionMode } = storeToRefs(settingsStore)
const { removeToast } = toastStore

const pausedIds = ref(new Set<string>())
const visibleToasts = computed(() => toasts.value.slice(0, 5))
const normalizedPosition = computed<'bottom-center'>(() => {
  if (!position) return 'bottom-center'
  return 'bottom-center'
})

function getIcon(type: Toast['type']) {
  if (type === 'success') return CheckCircle2
  if (type === 'error') return CircleAlert
  if (type === 'warning') return TriangleAlert
  if (type === 'info') return Info
  return AlertTriangle
}

function handlePause(id: string) {
  pausedIds.value = new Set([...pausedIds.value, id])
  toastStore.pauseTimer(id)
}

function handleResume(id: string) {
  const next = new Set(pausedIds.value)
  next.delete(id)
  pausedIds.value = next
  toastStore.resumeTimer(id)
}

function isPaused(id: string) {
  return pausedIds.value.has(id)
}

function handleAction(toast: Toast) {
  toast.action?.onClick?.()
  removeToast(toast.id)
}
</script>

<style scoped>
.toast-viewport {
  position: fixed;
  z-index: var(--z-toast);
  pointer-events: none;
  inset-inline: 0;
  display: flex;
  justify-content: center;
  padding-inline: var(--spacing-4);
  padding-block-end: calc(env(safe-area-inset-bottom, 0rem) + var(--spacing-4));
}

.toast-viewport--bottom-center {
  inset-block-end: 0;
}

.toast-stack {
  display: grid;
  gap: 0.875rem;
  inline-size: min(26rem, calc(100vw - 1.5rem));
}

.toast-card {
  --toast-accent: var(--color-info);
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: flex-start;
  gap: 0.875rem;
  overflow: hidden;
  padding-block: 0.9375rem;
  padding-inline: 1rem;
  border: 1px solid color-mix(in srgb, var(--ui-compat-border) 72%, transparent);
  border-radius: clamp(1rem, 2vw, 1.25rem);
  background: color-mix(in srgb, var(--ui-compat-surface-elevated) 88%, transparent);
  box-shadow:
    0 1rem 2.5rem rgba(15, 23, 42, 0.16),
    0 0.25rem 1rem rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(1rem) saturate(1.08);
  -webkit-backdrop-filter: blur(1rem) saturate(1.08);
  pointer-events: auto;
}

.toast-card--success {
  --toast-accent: var(--color-success);
}

.toast-card--error {
  --toast-accent: var(--color-error);
}

.toast-card--warning {
  --toast-accent: var(--color-warning);
}

.toast-card--info {
  --toast-accent: var(--color-info);
}

.toast-card__accent {
  position: absolute;
  inset-block-start: 0.75rem;
  inset-inline-start: 0.75rem;
  inline-size: 0.625rem;
  block-size: 0.625rem;
  border-radius: 999rem;
  background: color-mix(in srgb, var(--toast-accent) 86%, white 14%);
  box-shadow: 0 0 0 0.25rem color-mix(in srgb, var(--toast-accent) 12%, transparent);
}

.toast-card__icon {
  display: grid;
  place-items: center;
  inline-size: 2.5rem;
  block-size: 2.5rem;
  margin-block-start: 0.125rem;
  border-radius: 0.9rem;
  color: color-mix(in srgb, var(--toast-accent) 82%, var(--color-text-primary) 18%);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--toast-accent) 16%, transparent),
    color-mix(in srgb, var(--toast-accent) 9%, white 8%)
  );
  border: 1px solid color-mix(in srgb, var(--toast-accent) 16%, transparent);
}

.toast-card__body {
  display: grid;
  gap: 0.35rem;
  min-inline-size: 0;
}

.toast-card__title,
.toast-card__message {
  margin: 0;
  word-break: break-word;
}

.toast-card__title {
  font-size: 0.9375rem;
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  line-height: 1.35;
}

.toast-card__message {
  font-size: var(--text-sm);
  line-height: 1.55;
  color: var(--color-text-secondary);
}

.toast-card__action,
.toast-card__close {
  color: var(--color-text-tertiary);
  transition:
    color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.toast-card__action {
  margin-block-start: 0.1rem;
  justify-self: start;
  padding: 0.375rem 0.625rem;
  border-radius: 999rem;
  border: 1px solid color-mix(in srgb, var(--toast-accent) 18%, transparent);
  background: color-mix(in srgb, var(--toast-accent) 8%, transparent);
  font-size: 0.75rem;
  font-weight: var(--font-medium);
  color: var(--toast-accent);
}

.toast-card__close {
  display: grid;
  place-items: center;
  align-self: start;
  inline-size: 2rem;
  block-size: 2rem;
  border: 1px solid transparent;
  border-radius: 999rem;
}

.toast-card__close:hover,
.toast-card__close:focus-visible {
  color: var(--color-text-primary);
  background: color-mix(in srgb, var(--ui-compat-surface-interactive) 82%, transparent);
  border-color: color-mix(in srgb, var(--ui-compat-border) 80%, transparent);
  transform: translateY(-0.0625rem);
}

.toast-card__action:hover,
.toast-card__action:focus-visible {
  color: color-mix(in srgb, var(--toast-accent) 82%, var(--color-text-primary) 18%);
  background: color-mix(in srgb, var(--toast-accent) 14%, transparent);
  border-color: color-mix(in srgb, var(--toast-accent) 28%, transparent);
}

.toast-card__progress {
  position: absolute;
  inset-block-end: 0;
  inset-inline: 0;
  block-size: 0.125rem;
  transform-origin: left center;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--toast-accent) 55%, transparent),
    color-mix(in srgb, var(--toast-accent) 18%, transparent)
  );
  animation: toast-progress linear forwards;
}

.toast-card__progress.is-paused {
  animation-play-state: paused;
}

.toast-slide-enter-active,
.toast-slide-leave-active,
.toast-slide-move {
  transition:
    transform 220ms ease,
    opacity 220ms ease;
}

.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(0.875rem) scale(0.985);
}

@keyframes toast-progress {
  from {
    transform: scaleX(1);
  }

  to {
    transform: scaleX(0);
  }
}

@media (max-width: 40rem) {
  .toast-viewport {
    padding-inline: 0.75rem;
    padding-block-end: calc(env(safe-area-inset-bottom, 0rem) + 0.75rem);
  }

  .toast-stack {
    width: min(100%, 100vw - 1.5rem);
  }

  .toast-card {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.75rem;
    padding-inline: 0.875rem;
  }

  .toast-card__icon {
    inline-size: 2.25rem;
    block-size: 2.25rem;
  }
}
</style>
