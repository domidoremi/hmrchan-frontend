<template>
  <div v-if="loading || error || empty" class="journal-state" role="status">
    <p>
      {{
        error
          ? t('common.loadingFailed')
          : loading
            ? t('common.loading')
            : t('journal.states.noPosts')
      }}
    </p>
    <button v-if="error" class="button button-outline button-small" @click="$emit('retry')">
      {{ t('common.retry') }}
    </button>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n({ useScope: 'global' })
defineProps<{ loading: boolean; error: string; empty?: boolean }>()
defineEmits<{ retry: [] }>()
</script>
