<template>
  <div class="state-indicator" :class="`state-indicator--${variant}`">
    <div class="state-indicator__visual">
      <div class="state-indicator__glow" />
      <div class="state-indicator__icon-wrapper">
        <component :is="iconComponent" :size="32" class="state-indicator__icon" />
      </div>
    </div>

    <div class="state-indicator__content">
      <h3 class="state-indicator__title">{{ resolvedTitle }}</h3>
      <p v-if="description" class="state-indicator__description">{{ description }}</p>
    </div>

    <div v-if="shouldShowAction" class="state-indicator__actions">
      <Button
        :variant="variant === 'error' ? 'default' : 'outline'"
        size="sm"
        :loading="actionLoading"
        :icon="variant === 'error' ? RefreshCw : undefined"
        @click="emit('action')"
      >
        {{ resolvedActionLabel }}
      </Button>
    </div>
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
import Button from './Button.vue'

defineOptions({ name: 'UiStateIndicator' })

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
</script>

<style scoped>
.state-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-5);
  padding: var(--spacing-10) var(--spacing-6);
  text-align: center;
}

.state-indicator__visual {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.state-indicator__glow {
  position: absolute;
  inset: -20%;
  border-radius: var(--radius-full);
  opacity: 0.6;
  animation: state-glow 3s ease-in-out infinite;
}

.state-indicator__icon-wrapper {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-md);
  animation: state-float 3s ease-in-out infinite;
}

.state-indicator__icon {
  opacity: 0.7;
}

@keyframes state-glow {
  0%, 100% {
    transform: scale(1);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.2;
  }
}

@keyframes state-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

/* Variant: Empty / No Results */
.state-indicator--empty .state-indicator__glow,
.state-indicator--no-results .state-indicator__glow {
  background: radial-gradient(circle, rgba(var(--color-primary-rgb), 0.15) 0%, transparent 70%);
}

.state-indicator--empty .state-indicator__icon,
.state-indicator--no-results .state-indicator__icon {
  color: var(--color-primary);
}

/* Variant: Error */
.state-indicator--error .state-indicator__glow {
  background: radial-gradient(circle, rgba(var(--color-error-rgb), 0.15) 0%, transparent 70%);
}

.state-indicator--error .state-indicator__icon-wrapper {
  border-color: rgba(var(--color-error-rgb), 0.2);
}

.state-indicator--error .state-indicator__icon {
  color: var(--color-error);
}

/* Variant: Not Found */
.state-indicator--not-found .state-indicator__glow {
  background: radial-gradient(circle, rgba(var(--color-warning-rgb), 0.15) 0%, transparent 70%);
}

.state-indicator--not-found .state-indicator__icon-wrapper {
  border-color: rgba(var(--color-warning-rgb), 0.2);
}

.state-indicator--not-found .state-indicator__icon {
  color: var(--color-warning);
}

.state-indicator__content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  max-width: 320px;
}

.state-indicator__title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-foreground);
  margin: 0;
}

.state-indicator__description {
  font-size: var(--text-sm);
  color: var(--color-muted-foreground);
  line-height: var(--leading-relaxed);
  margin: 0;
}

.state-indicator__actions {
  margin-top: var(--spacing-1);
}

@media (prefers-reduced-motion: reduce) {
  .state-indicator__glow,
  .state-indicator__icon-wrapper {
    animation: none;
  }
}
</style>
