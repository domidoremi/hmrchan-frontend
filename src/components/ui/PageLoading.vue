<template>
  <div class="page-loading">
    <div class="loading-container">
      <!-- Animated Logo/Icon -->
      <div class="loading-icon-wrapper">
        <div class="loading-icon">
          <div class="loading-pulse" />
          <div class="loading-ring" />
          <div class="loading-ring loading-ring--delayed" />
          <Loader2 :size="32" class="loading-spinner-icon" />
        </div>
      </div>

      <!-- Text with shimmer -->
      <div class="loading-text-wrapper">
        <p class="loading-text">{{ text || $t('common.loading') }}</p>
        <div class="loading-dots">
          <span class="loading-dot" />
          <span class="loading-dot" />
          <span class="loading-dot" />
        </div>
      </div>

      <!-- Optional progress bar -->
      <div v-if="showProgress" class="loading-progress">
        <div class="loading-progress-track">
          <div
            class="loading-progress-fill"
            :class="{ 'loading-progress-fill--indeterminate': indeterminate }"
            :style="!indeterminate ? { width: `${progress}%` } : undefined"
          />
        </div>
        <span v-if="!indeterminate && progress > 0" class="loading-progress-text">
          {{ Math.round(progress) }}%
        </span>
      </div>

      <!-- Hint text -->
      <p v-if="hint" class="loading-hint">{{ hint }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

interface Props {
  text?: string
  hint?: string
  showProgress?: boolean
  progress?: number
  indeterminate?: boolean
}

withDefaults(defineProps<Props>(), {
  showProgress: false,
  progress: 0,
  indeterminate: true,
})
</script>

<style scoped>
.page-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--navbar-height));
  min-height: calc(100svh - var(--navbar-height));
  padding: var(--spacing-6);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-6);
  max-width: 280px;
  text-align: center;
}

/* ========== Icon Animation ========== */
.loading-icon-wrapper {
  position: relative;
  padding: var(--spacing-4);
}

.loading-icon {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-pulse {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle,
    rgba(var(--color-primary-rgb), 0.15) 0%,
    transparent 70%
  );
  border-radius: var(--radius-full);
  animation: loadingPulse 2s var(--ease-in-out) infinite;
}

.loading-ring {
  position: absolute;
  inset: 0;
  border: 2px solid transparent;
  border-top-color: rgba(var(--color-primary-rgb), 0.3);
  border-radius: var(--radius-full);
  animation: loadingRing 1.5s var(--ease-linear) infinite;
}

.loading-ring--delayed {
  inset: 8px;
  border-top-color: rgba(var(--color-primary-rgb), 0.2);
  animation-delay: 0.2s;
  animation-direction: reverse;
}

.loading-spinner-icon {
  color: var(--color-primary);
  animation: spin 1s var(--ease-linear) infinite;
  filter: drop-shadow(0 0 8px rgba(var(--color-primary-rgb), 0.4));
}

@keyframes loadingPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.3;
  }
}

@keyframes loadingRing {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* ========== Text with Dots ========== */
.loading-text-wrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

.loading-text {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
  margin: 0;
}

.loading-dots {
  display: flex;
  gap: 3px;
  padding-left: 2px;
}

.loading-dot {
  width: 4px;
  height: 4px;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  animation: loadingDots 1.4s var(--ease-in-out) infinite;
}

.loading-dot:nth-child(1) {
  animation-delay: 0ms;
}

.loading-dot:nth-child(2) {
  animation-delay: 200ms;
}

.loading-dot:nth-child(3) {
  animation-delay: 400ms;
}

@keyframes loadingDots {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* ========== Progress Bar ========== */
.loading-progress {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  align-items: center;
}

.loading-progress-track {
  width: 100%;
  height: 4px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.loading-progress-fill {
  height: 100%;
  background: var(--gradient-primary);
  border-radius: inherit;
  transition: width var(--duration-normal) var(--ease-out);
}

.loading-progress-fill--indeterminate {
  width: 40%;
  animation: progressIndeterminate 1.5s var(--ease-in-out) infinite;
}

@keyframes progressIndeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(350%);
  }
}

.loading-progress-text {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

/* ========== Hint Text ========== */
.loading-hint {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin: 0;
  line-height: 1.5;
}

/* ========== Reduced Motion ========== */
@media (prefers-reduced-motion: reduce) {
  .loading-pulse,
  .loading-ring,
  .loading-ring--delayed,
  .loading-spinner-icon,
  .loading-dot,
  .loading-progress-fill--indeterminate {
    animation: none;
  }

  .loading-spinner-icon {
    opacity: 0.7;
  }
}
</style>
