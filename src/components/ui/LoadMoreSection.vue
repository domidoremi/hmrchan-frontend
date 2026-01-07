<template>
  <div class="load-more-section">
    <!-- Progress indicator -->
    <div class="progress-indicator">
      <div class="progress-bar-wrapper">
        <div class="progress-bar-fill" :style="{ width: `${progressPercent}%` }" />
      </div>
      <span class="progress-text">
        {{ t('common.showing', { count, total }) }}
      </span>
    </div>

    <!-- Infinite scroll sentinel -->
    <div v-if="hasMore" :ref="sentinelRef" class="scroll-sentinel">
      <Transition name="fade" mode="out-in">
        <div v-if="loading" class="sentinel-loading">
          <div class="sentinel-spinner">
            <span class="spinner spinner-sm" />
          </div>
          <span class="sentinel-text">{{ t('common.loadingMore') || t('common.loading') }}</span>
        </div>
      </Transition>
    </div>

    <!-- Manual load button -->
    <div class="load-more-actions">
      <Button
        v-if="hasMore"
        variant="secondary"
        size="md"
        :loading="loading"
        class="load-more-btn"
        @click="emit('load-more')"
      >
        <ChevronDown :size="18" class="load-more-icon" />
        {{ t('common.loadMore') }}
      </Button>

      <div v-else class="end-indicator">
        <div class="end-line" />
        <span class="end-text">{{ t('common.noMoreItems') }}</span>
        <div class="end-line" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'

interface Props {
  count: number
  total: number
  hasMore: boolean
  loading?: boolean
  sentinelRef?: (el: Element | null) => void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  'load-more': []
}>()

const { t } = useI18n()

const progressPercent = computed(() => {
  if (props.total === 0) return 0
  return Math.min((props.count / props.total) * 100, 100)
})
</script>

<style scoped>
.load-more-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
  margin-top: var(--spacing-8);
  padding: var(--spacing-4);
}

/* ========== Progress Indicator ========== */
.progress-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2);
  width: 100%;
  max-width: 300px;
}

.progress-bar-wrapper {
  width: 100%;
  height: 4px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--gradient-primary);
  border-radius: inherit;
  transition: width var(--duration-slow) var(--ease-out);
  position: relative;
}

.progress-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 20px;
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
    transform: translateX(-20px);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(20px);
  }
}

.progress-text {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

/* ========== Scroll Sentinel ========== */
.scroll-sentinel {
  width: 100%;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sentinel-loading {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
}

.sentinel-spinner {
  color: var(--color-primary);
}

.sentinel-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ========== Load More Button ========== */
.load-more-actions {
  width: 100%;
  display: flex;
  justify-content: center;
}

.load-more-btn {
  min-width: 160px;
}

.load-more-icon {
  transition: transform var(--transition-fast);
}

.load-more-btn:hover .load-more-icon {
  transform: translateY(2px);
}

/* ========== End Indicator ========== */
.end-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  width: 100%;
  max-width: 400px;
}

.end-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--glass-border-strong) 50%,
    transparent 100%
  );
}

.end-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

/* ========== Transitions ========== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ========== Reduced Motion ========== */
@media (prefers-reduced-motion: reduce) {
  .progress-bar-fill::after {
    animation: none;
  }
}
</style>
