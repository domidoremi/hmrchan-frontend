<template>
  <div
    class="toast-viewport"
    :class="`toast-viewport--${position}`"
    :data-theme="resolvedTheme"
    :data-ui-style="uiStyle"
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
import { AlertTriangle, CheckCircle2, Info, TriangleAlert, X, CircleAlert } from 'lucide-vue-next'
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

const { position = 'top-right' } = defineProps<Props>()

const toastStore = useToastStore()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()

const { toasts } = storeToRefs(toastStore)
const { resolvedTheme } = storeToRefs(themeStore)
const { settings } = storeToRefs(settingsStore)
const { removeToast } = toastStore

const pausedIds = ref(new Set<string>())
const uiStyle = computed(() => settings.value.uiStyle)
const visibleToasts = computed(() => toasts.value.slice(0, 5))

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
  padding: var(--spacing-4);
}

.toast-viewport--top-right {
  inset-block-start: 0;
  inset-inline-end: 0;
}

.toast-viewport--top-left {
  inset-block-start: 0;
  inset-inline-start: 0;
}

.toast-viewport--bottom-right {
  inset-block-end: 0;
  inset-inline-end: 0;
}

.toast-viewport--bottom-left {
  inset-block-end: 0;
  inset-inline-start: 0;
}

.toast-viewport--top-center {
  inset-block-start: 0;
  inset-inline-start: 50%;
  transform: translateX(-50%);
}

.toast-viewport--bottom-center {
  inset-block-end: 0;
  inset-inline-start: 50%;
  transform: translateX(-50%);
}

.toast-stack {
  display: grid;
  gap: 0.75rem;
  width: min(22rem, calc(100vw - 2rem));
}

.toast-card {
  --toast-accent: var(--color-info);
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.75rem;
  overflow: hidden;
  padding-block: 0.85rem;
  padding-inline: 0.95rem;
  border: 0.0625rem solid color-mix(in srgb, var(--color-border) 88%, transparent);
  border-radius: clamp(0.65rem, 1vw, 0.85rem);
  background: color-mix(in srgb, var(--color-surface) 94%, rgba(255, 255, 255, 0.58));
  box-shadow: 0 0.75rem 1.5rem -1rem rgba(15, 23, 42, 0.28);
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
  inset-block-start: 0;
  inset-inline-start: 0;
  inline-size: 0.18rem;
  block-size: 100%;
  background: var(--toast-accent);
}

.toast-card__icon {
  display: grid;
  place-items: center;
  inline-size: 2rem;
  block-size: 2rem;
  border-radius: 0.7rem;
  color: var(--toast-accent);
  background: color-mix(in srgb, var(--toast-accent) 12%, transparent);
}

.toast-card__body {
  display: grid;
  gap: 0.2rem;
  min-inline-size: 0;
}

.toast-card__title,
.toast-card__message {
  margin: 0;
  word-break: break-word;
}

.toast-card__title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.toast-card__message {
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.toast-card__action,
.toast-card__close {
  align-self: start;
  color: var(--color-text-tertiary);
  transition:
    color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out);
}

.toast-card__action {
  margin-block-start: 0.15rem;
  justify-self: start;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--toast-accent);
}

.toast-card__close {
  display: grid;
  place-items: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  border-radius: 0.6rem;
}

.toast-card__close:hover,
.toast-card__action:hover {
  color: var(--color-text-primary);
}

.toast-card__progress {
  position: absolute;
  inset-block-end: 0;
  inset-inline-start: 0;
  block-size: 0.125rem;
  inline-size: 100%;
  transform-origin: left center;
  background: color-mix(in srgb, var(--toast-accent) 36%, transparent);
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
  transform: translateY(-0.5rem);
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
    inset-inline: 0;
    padding-inline: 0.75rem;
  }

  .toast-stack {
    width: min(100%, 100vw - 1.5rem);
  }
}
</style>
