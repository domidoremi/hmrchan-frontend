<template>
  <section class="load-more-section">
    <header class="load-more-header">
      <PageMetaChip class="progress-pill">
        <span class="progress-label">{{
          t('common.showing', { count: displayCount, total: displayTotal })
        }}</span>
        <span class="progress-value">{{ Math.round(progressPercent) }}%</span>
      </PageMetaChip>
      <ControlButton
        v-if="hasMore && allowManual"
        class="ghost-action"
        size="compact"
        @click="emit('load-more')"
      >
        {{ t('common.loadMore') }}
      </ControlButton>
    </header>

    <div class="progress-track">
      <div class="progress-fill" :style="{ width: `${progressPercent}%` }">
        <div class="progress-glow" />
      </div>
    </div>

    <div class="load-more-body">
      <div v-if="hasMore" class="load-more-state">
        <div :ref="setSentinelRef" class="scroll-sentinel">
          <Transition name="fade" mode="out-in">
            <div v-if="loading" class="sentinel-loading empty-surface">
              <span class="spinner spinner-sm" />
              <span>{{ t('common.loadingMore') || t('common.loading') }}</span>
            </div>
            <div v-else class="sentinel-idle">
              <span class="idle-dot" />
              <span>{{ t('common.scrollToLoad') || t('common.loadMore') }}</span>
            </div>
          </Transition>
        </div>

        <div class="load-more-actions">
          <Button
            v-if="allowManual"
            variant="secondary"
            size="md"
            :loading="loading"
            class="load-more-btn"
            @click="emit('load-more')"
          >
            <AnimatedIcon
              name="explore"
              :fallback-icon="ChevronDown"
              size="md"
              class="load-more-icon"
            />
            {{ t('common.loadMore') }}
          </Button>
        </div>
      </div>

      <div v-else class="end-indicator">
        <div class="end-line" />
        <span class="end-text">{{ t('common.noMoreItems') }}</span>
        <div class="end-line" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts" vapor>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown } from '@lucide/vue'
import ControlButton from '@/components/appearance/ControlButton.vue'
import PageMetaChip from '@/components/appearance/PageMetaChip.vue'
import Button from '@/components/ui/Button.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import { resolveLoadMoreMetrics } from '@/components/ui/loadMoreMetrics'

interface Props {
  count: number
  total: number
  hasMore: boolean
  loading?: boolean
  sentinelRef?: (el: HTMLElement | null) => void
  allowManual?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  allowManual: true,
})

const emit = defineEmits<{
  'load-more': []
}>()

const { t } = useI18n()

const metrics = computed(() => resolveLoadMoreMetrics(props.count, props.total))
const displayCount = computed(() => metrics.value.count)
const displayTotal = computed(() => metrics.value.total)

const progressPercent = computed(() => {
  return metrics.value.progressPercent
})

const setSentinelRef = (el: Element | null) => {
  const resolved = el instanceof HTMLElement ? el : null
  props.sentinelRef?.(resolved)
}
</script>

<style scoped>
.load-more-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  margin-top: var(--spacing-8);
  padding: var(--spacing-4);
  border-radius: var(--radius-2xl);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.load-more-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
}

.progress-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-3);
  min-block-size: var(--appearance-chip-min-block-size);
  padding-inline: var(--appearance-chip-padding-inline);
  border-radius: var(--appearance-chip-radius);
  font-size: var(--text-sm);
  line-height: var(--appearance-ui-line-height);
}

.progress-pill.empty-surface,
.sentinel-loading.empty-surface {
  animation: none;
}

.progress-label {
  color: var(--color-text-secondary);
}

.progress-value {
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.ghost-action.page-control {
  box-shadow: none;
}

.progress-track {
  width: 100%;
  height: 0.375rem;
  background: var(--color-muted);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--gradient-primary);
  border-radius: inherit;
  position: relative;
  transition: width var(--duration-slow) var(--ease-out);
}

.progress-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  animation: progressShine 1.5s ease-in-out infinite;
}

@keyframes progressShine {
  0% {
    opacity: 0;
    transform: translateX(-30%);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(30%);
  }
}

.load-more-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.load-more-state {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.scroll-sentinel {
  width: 100%;
  min-height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sentinel-loading,
.sentinel-idle {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  min-block-size: var(--appearance-chip-min-block-size);
  padding-inline: var(--appearance-chip-padding-inline);
  border-radius: var(--appearance-chip-radius);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--appearance-ui-line-height);
}

.sentinel-idle {
  background: var(--color-muted);
}

.idle-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: var(--color-text-tertiary);
  box-shadow: none;
}

.load-more-actions {
  display: flex;
  justify-content: center;
}

.load-more-btn {
  min-width: 10rem;
}

.load-more-icon {
  transition: color var(--transition-fast);
}

.end-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  width: 100%;
}

.end-line {
  flex: 1;
  height: 0.0625rem;
  background: linear-gradient(90deg, transparent 0%, var(--color-border) 50%, transparent 100%);
}

.end-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .progress-glow {
    animation: none;
  }
}
</style>
