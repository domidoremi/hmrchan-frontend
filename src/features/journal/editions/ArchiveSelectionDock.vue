<template>
  <Transition name="selection-dock">
    <div
      v-if="post && visible"
      class="archive-selection-dock"
      role="group"
      aria-label="当前预览"
      :data-selected-post="post.id"
    >
      <button
        class="icon-button"
        aria-label="上一条所选动态"
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
        aria-label="下一条所选动态"
        :disabled="total < 2"
        @click="$emit('step', 1)"
      >
        <JournalIcon name="arrow" />
      </button>
      <button
        class="icon-button selection-dock-open"
        :data-open="post.id"
        aria-label="打开所选动态"
      >
        <JournalIcon name="expand" />
      </button>
    </div>
  </Transition>
</template>
<script setup lang="ts">
import JournalIcon from '../JournalIcon.vue'
import type { JournalPost } from '../models'
defineProps<{ post?: JournalPost | undefined; index: number; total: number; visible: boolean }>()
defineEmits<{ step: [delta: number]; preview: [] }>()
</script>
