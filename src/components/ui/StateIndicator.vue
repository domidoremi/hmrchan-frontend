<template>
  <div class="state-indicator glass-card" :class="`state-${variant}`">
    <component :is="iconComponent" :size="48" class="state-icon" />

    <p class="state-title">{{ resolvedTitle }}</p>
    <p v-if="description" class="state-description">{{ description }}</p>

    <Button v-if="shouldShowAction" size="sm" :loading="actionLoading" @click="emit('action')">
      {{ resolvedActionLabel }}
    </Button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, Inbox } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'

interface Props {
  variant?: 'empty' | 'error'
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
  return props.variant === 'error' ? t('common.error') : t('common.noResults')
})

const iconComponent = computed(() => (props.variant === 'error' ? AlertTriangle : Inbox))

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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-10);
  text-align: center;
}

.state-icon {
  color: var(--color-text-tertiary);
  opacity: 0.55;
}

.state-title {
  color: var(--color-text-primary);
  font-weight: var(--font-medium);
}

.state-description {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  line-height: 1.6;
  max-width: 520px;
}
</style>
