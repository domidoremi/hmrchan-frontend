<template>
  <div class="page-loading" :class="{ 'page-loading--fullscreen': fullscreen }">
    <div class="page-loading__container">
      <div class="page-loading__visual">
        <div class="page-loading__glow" />
        <div class="page-loading__ring">
          <svg class="page-loading__svg" viewBox="0 0 50 50">
            <circle
              class="page-loading__track"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke-width="3"
            />
            <circle
              class="page-loading__indicator"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke-width="3"
              stroke-dasharray="125.6"
              stroke-dashoffset="75"
            />
          </svg>
        </div>
        <div class="page-loading__logo">
          <AnimatedIcon
            name="loading"
            :fallback-icon="Loader2"
            size="lg"
            class="page-loading__icon"
          />
        </div>
      </div>

      <div class="page-loading__content">
        <p class="page-loading__text">
          {{ text || $t('common.loading') }}
          <span class="page-loading__dots">
            <span class="page-loading__dot" />
            <span class="page-loading__dot" />
            <span class="page-loading__dot" />
          </span>
        </p>

        <div v-if="showProgress" class="page-loading__progress">
          <div class="page-loading__progress-track">
            <div
              class="page-loading__progress-fill"
              :class="{ 'page-loading__progress-fill--indeterminate': indeterminate }"
              :style="!indeterminate ? { width: `${progress}%` } : undefined"
            />
          </div>
          <span v-if="!indeterminate && progress > 0" class="page-loading__progress-text">
            {{ Math.round(progress) }}%
          </span>
        </div>

        <p v-if="hint" class="page-loading__hint">{{ hint }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

defineOptions({ name: 'UiPageLoading' })

interface Props {
  text?: string
  hint?: string
  showProgress?: boolean
  progress?: number
  indeterminate?: boolean
  fullscreen?: boolean
}

withDefaults(defineProps<Props>(), {
  showProgress: false,
  progress: 0,
  indeterminate: true,
  fullscreen: false,
})
</script>

<style scoped>
.page-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100svh - var(--navbar-height));
  min-height: calc(100dvh - var(--navbar-height));
  padding: var(--spacing-6);
}

.page-loading--fullscreen {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  min-height: 100svh;
  min-height: 100dvh;
  background: var(--glass-bg-strong);
  backdrop-filter: var(--glass-blur-strong);
}

.page-loading__container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-6);
  max-width: 280px;
  text-align: center;
}

.page-loading__visual {
  position: relative;
  width: 5rem;
  height: 5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-loading__glow {
  position: absolute;
  inset: -20%;
  background: radial-gradient(
    circle,
    rgba(var(--color-primary-rgb), 0.2) 0%,
    rgba(var(--color-primary-rgb), 0.05) 40%,
    transparent 70%
  );
  border-radius: var(--radius-full);
  animation: glow-pulse 2.5s var(--ease-in-out) infinite;
}

.page-loading__ring {
  position: absolute;
  inset: 0;
}

.page-loading__svg {
  width: 100%;
  height: 100%;
  animation: ring-rotate 2s linear infinite;
}

.page-loading__track {
  stroke: var(--glass-border);
  opacity: 0.5;
}

.page-loading__indicator {
  stroke: var(--color-primary);
  stroke-linecap: round;
  animation: ring-dash 1.5s ease-in-out infinite;
  filter: drop-shadow(0 0 0.375rem rgba(var(--color-primary-rgb), 0.5));
}

.page-loading__logo {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  background: var(--glass-bg);
  border-radius: var(--radius-full);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-md);
}

.page-loading__icon {
  color: var(--color-primary);
  animation: icon-spin 1.5s linear infinite;
}

@keyframes glow-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.4;
  }
}

@keyframes ring-rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes ring-dash {
  0% {
    stroke-dashoffset: 125.6;
  }
  50% {
    stroke-dashoffset: 31.4;
  }
  100% {
    stroke-dashoffset: 125.6;
  }
}

@keyframes icon-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.page-loading__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
}

.page-loading__text {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--color-foreground);
  margin: 0;
}

.page-loading__dots {
  display: inline-flex;
  gap: 0.1875rem;
  padding-left: 0.125rem;
}

.page-loading__dot {
  width: 0.25rem;
  height: 0.25rem;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  animation: dot-bounce 1.4s ease-in-out infinite;
}

.page-loading__dot:nth-child(1) {
  animation-delay: 0ms;
}

.page-loading__dot:nth-child(2) {
  animation-delay: 160ms;
}

.page-loading__dot:nth-child(3) {
  animation-delay: 320ms;
}

@keyframes dot-bounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.page-loading__progress {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  align-items: center;
}

.page-loading__progress-track {
  width: 100%;
  height: 0.25rem;
  background: var(--glass-bg-light);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.page-loading__progress-fill {
  height: 100%;
  background: var(--gradient-primary);
  border-radius: inherit;
  transition: width 200ms var(--ease-out);
}

.page-loading__progress-fill--indeterminate {
  width: 30%;
  animation: progress-slide 1.2s ease-in-out infinite;
}

@keyframes progress-slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}

.page-loading__progress-text {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.page-loading__hint {
  font-size: var(--text-sm);
  color: var(--color-muted-foreground);
  margin: 0;
  line-height: var(--leading-relaxed);
}

@media (prefers-reduced-motion: reduce) {
  .page-loading__glow,
  .page-loading__svg,
  .page-loading__indicator,
  .page-loading__icon,
  .page-loading__dot,
  .page-loading__progress-fill--indeterminate {
    animation: none;
  }

  .page-loading__indicator {
    stroke-dashoffset: 50;
  }
}
</style>
