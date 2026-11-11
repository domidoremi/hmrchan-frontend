<template>
  <div class="archive-navigation-hint">
    <p role="status" aria-live="polite" aria-atomic="true">
      <span class="selection-marker" aria-hidden="true" />
      {{
        total
          ? t('journal.selection.selected', { current: index + 1, total })
          : state === 'loading' || state === 'idle'
            ? t('journal.states.loading', { label: t('journal.nav.posts') })
            : state === 'error'
              ? t('journal.states.failed', { label: t('journal.nav.posts') })
              : t('journal.states.noRecords')
      }}
      <span v-if="title" class="sr-only">：{{ title }}</span>
    </p>
    <span v-if="total" :id="`${previewId}-hint`" class="keyboard-guide">
      <span><kbd>↑ ↓</kbd> {{ t('journal.selection.select') }}</span
      ><span><kbd>Enter</kbd> {{ t('journal.actions.open') }}</span>
      <span
        ><kbd>→</kbd> {{ t('journal.selection.preview') }} · <kbd>Esc</kbd>
        {{ t('journal.selection.returnToList') }}</span
      >
    </span>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { JournalResourceState } from '../resourceState'
const { t } = useI18n({ useScope: 'global' })
defineProps<{
  index: number
  total: number
  previewId: string
  title?: string | undefined
  state?: JournalResourceState
}>()
</script>
