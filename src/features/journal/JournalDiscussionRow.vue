<template>
  <article class="discussion-row" :data-discussion-row="discussion.id">
    <div class="discussion-avatar" :class="discussion.tone" aria-hidden="true">
      {{ discussion.avatar }}
    </div>
    <div class="discussion-content">
      <button class="discussion-title" :data-discussion="discussion.id">
        {{ discussion.title }}
      </button>
      <div class="discussion-meta">
        <span v-if="discussion.pinned" class="muted">置顶</span
        ><span>{{ discussion.category }}</span
        ><span>·</span><span>{{ discussion.author }}</span
        ><span>·</span><span>{{ discussion.time }}</span>
      </div>
    </div>
    <span class="discussion-replies" :aria-label="`${discussion.replies} 条回复`"
      ><JournalIcon name="messages" />{{ discussion.replies }}</span
    >
  </article>
</template>
<script setup lang="ts">
import JournalIcon from './JournalIcon.vue'
import type { JournalDiscussion } from './models'
defineProps<{ discussion: JournalDiscussion }>()
</script>
