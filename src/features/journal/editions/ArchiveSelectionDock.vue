<template>
  <Transition name="selection-dock">
    <div
      v-if="post && visible"
      class="archive-selection-dock"
      role="group"
      :aria-label="t('journal.selection.current')"
      :data-selected-post="post.id"
    >
      <button
        class="icon-button"
        :aria-label="t('journal.selection.previous')"
        :disabled="total < 2"
        @click="$emit('step', -1)"
      >
        <JournalIcon name="arrow-left" />
      </button>
      <button class="selection-dock-title" @click="$emit('preview')">
        <small>{{ String(index + 1).padStart(2, '0') }} / {{ total }} · {{ post.author }}</small
        ><span :key="post.id">{{ post.title }}</span>
      </button>
      <button
        class="icon-button"
        :aria-label="t('journal.selection.next')"
        :disabled="total < 2"
        @click="$emit('step', 1)"
      >
        <JournalIcon name="arrow" />
      </button>
      <button
        class="icon-button selection-dock-open"
        :data-open="post.id"
        :aria-label="t('journal.selection.open')"
      >
        <JournalIcon name="expand" />
      </button>
    </div>
  </Transition>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import JournalIcon from '../JournalIcon.vue'
import type { JournalPost } from '../models'
const { t } = useI18n({ useScope: 'global' })
defineProps<{ post?: JournalPost | undefined; index: number; total: number; visible: boolean }>()
defineEmits<{ step: [delta: number]; preview: [] }>()
</script>
