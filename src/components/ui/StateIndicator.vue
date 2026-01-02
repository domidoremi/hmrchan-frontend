<template>
  <div class="state-indicator glass-card" :class="`state-indicator--${variant}`">
    <div class="state-icon-wrapper">
      <div class="state-icon-bg" />
      <component :is="iconComponent" :size="48" class="state-icon" />
    </div>

    <div class="state-content">
      <h3 class="state-title">{{ resolvedTitle }}</h3>
      <p v-if="description" class="state-description">{{ description }}</p>
    </div>

    <div v-if="shouldShowAction" class="state-actions">
      <Button :variant="variant === 'error' ? 'primary' : 'secondary'" :loading="actionLoading" @click="emit('action')">
        <RefreshCw v-if="variant === 'error'" :size="16" />
        {{ resolvedActionLabel }}
      </Button>
    </div>

    <!-- Decorative elements -->
    <div class="state-decor state-decor--1" />
    <div class="state-decor state-decor--2" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  AlertTriangle,
  Inbox,
  Search,
  FileQuestion,
  RefreshCw,
  type LucideIcon,
} from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'

interface Props {
  variant?: 'empty' | 'error' | 'not-found' | 'no-results'
  title?: string
  description?: string
  showAction?: boolean
  actionLabel?: string
  actionLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'empty',
  actionLoading: false,
})

const emit = defineEmits<{
  action: []
}>()

const { t } = useI18n()

const variant = computed(() => props.variant)

const resolvedTitle = computed(() => {
  if (props.title) return props.title

  const titles: Record<string, string> = {
    error: t('common.error'),
    empty: t('common.noResults'),
    'not-found': t('common.notFound'),
    'no-results': t('common.noResults'),
  }

  return titles[props.variant] ?? t('common.noResults')
})

const iconMap: Record<string, LucideIcon> = {
  error: AlertTriangle,
  empty: Inbox,
  'not-found': FileQuestion,
  'no-results': Search,
}

const iconComponent = computed(() => iconMap[props.variant] ?? Inbox)

const shouldShowAction = computed(() => {
  if (props.showAction !== undefined) return props.showAction
  return props.variant === 'error'
})

const resolvedActionLabel = computed(() => props.actionLabel ?? t('common.retry'))

const description = computed(() => props.description)
const actionLoading = computed(() => props.actionLoading)
</script>

<style scoped>
.state-indicator {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-12) var(--spacing-6);
  text-align: center;
  overflow: hidden;
}

/* ========== Icon Wrapper ========== */
.state-icon-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.state-icon-bg {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-full);
  background: var(--glass-bg-light);
  opacity: 0.8;
}

.state-icon {
  position: relative;
  z-index: 1;
  color: var(--color-text-tertiary);
  opacity: 0.6;
  animation: stateIconFloat 3s var(--ease-in-out) infinite;
}

@keyframes stateIconFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

/* ========== Variant Colors ========== */
.state-indicator--error .state-icon-bg {
  background: rgba(var(--color-error-rgb), 0.1);
}

.state-indicator--error .state-icon {
  color: var(--color-error);
  opacity: 0.8;
}

.state-indicator--empty .state-icon-bg,
.state-indicator--no-results .state-icon-bg {
  background: rgba(var(--color-primary-rgb), 0.08);
}

.state-indicator--empty .state-icon,
.state-indicator--no-results .state-icon {
  color: var(--color-primary);
  opacity: 0.5;
}

.state-indicator--not-found .state-icon-bg {
  background: rgba(var(--color-warning-rgb), 0.1);
}

.state-indicator--not-found .state-icon {
  color: var(--color-warning);
  opacity: 0.7;
}

/* ========== Content ========== */
.state-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  max-width: 400px;
}

.state-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.state-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* ========== Actions ========== */
.state-actions {
  margin-top: var(--spacing-2);
}

/* ========== Decorative Elements ========== */
.state-decor {
  position: absolute;
  border-radius: var(--radius-full);
  background: var(--gradient-primary);
  opacity: 0.03;
  pointer-events: none;
}

.state-decor--1 {
  width: 200px;
  height: 200px;
  top: -80px;
  right: -60px;
}

.state-decor--2 {
  width: 150px;
  height: 150px;
  bottom: -60px;
  left: -40px;
}

.state-indicator--error .state-decor {
  background: var(--color-error);
  opacity: 0.02;
}

/* ========== Dark Mode ========== */
[data-theme='dark'] .state-icon-bg {
  opacity: 0.5;
}

[data-theme='dark'] .state-decor {
  opacity: 0.05;
}

/* ========== Reduced Motion ========== */
@media (prefers-reduced-motion: reduce) {
  .state-icon {
    animation: none;
  }
}
</style>
