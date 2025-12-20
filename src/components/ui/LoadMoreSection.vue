<template>
  <div class="load-more-section">
    <div class="quota-indicator">
      <span class="quota-text">{{ t('common.showing', { count, total }) }}</span>
    </div>

    <div v-if="hasMore" :ref="sentinelRef" class="scroll-sentinel">
      <span v-if="loading" class="spinner spinner-sm" />
    </div>

    <Button v-if="hasMore" variant="secondary" :loading="loading" @click="emit('load-more')">
      {{ t('common.loadMore') }}
    </Button>

    <p v-else class="no-more-text">{{ t('common.noMoreItems') }}</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from '@/components/ui/Button.vue'

interface Props {
  count: number
  total: number
  hasMore: boolean
  loading?: boolean
  sentinelRef?: (el: Element | null) => void
}

withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  'load-more': []
}>()

const { t } = useI18n()
</script>

<style scoped>
.load-more-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  margin-top: var(--spacing-8);
  padding: var(--spacing-4);
}

.quota-indicator {
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
}

.quota-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.no-more-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}
</style>
