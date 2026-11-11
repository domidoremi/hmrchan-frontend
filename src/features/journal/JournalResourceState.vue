<template>
  <div v-if="state !== 'ready' || empty" class="home-resource-state" :data-state="state">
    <p role="status">{{ message }}</p>
    <button
      v-if="state === 'error'"
      class="button button-outline button-small"
      :aria-label="t('journal.states.retryNamed', { label: localizedLabel })"
      @click="$emit('retry')"
    >
      {{ t('common.retry') }}
    </button>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { JournalResourceState } from './resourceState'
const props = defineProps<{
  state: JournalResourceState
  label: string
  labelKey?: string
  empty: boolean
  emptyMessage: string
  emptyMessageKey?: string
}>()
defineEmits<{ retry: [] }>()
const { t } = useI18n({ useScope: 'global' })
const localizedLabel = computed(() => (props.labelKey ? t(props.labelKey) : props.label))
const message = computed(() =>
  props.state === 'error'
    ? t('journal.states.failed', { label: localizedLabel.value })
    : props.state === 'ready'
      ? props.emptyMessageKey
        ? t(props.emptyMessageKey)
        : props.emptyMessage
      : t('journal.states.loading', { label: localizedLabel.value })
)
</script>
