<template>
  <article class="event-card">
    <div class="event-date">
      <strong>{{ String(event.day).padStart(2, '0') }}</strong
      ><small>{{ event.month }} 月 · {{ event.week }}</small>
    </div>
    <div class="event-copy">
      <span class="badge" :class="`badge-${event.tone}`">{{ event.type }}</span>
      <h3>
        <button class="discussion-title" :data-event="event.id">{{ event.title }}</button>
      </h3>
      <p>
        <span><JournalIcon name="clock" />{{ event.time }}</span
        ><span><JournalIcon name="pin" />{{ event.venue }}</span>
      </p>
    </div>
    <button
      class="button button-outline button-small"
      :data-remind="event.id"
      :aria-label="`${saved ? '移除日程' : '记下'}：${event.title}`"
      :aria-pressed="saved"
    >
      <JournalIcon :name="saved ? 'check' : 'bell'" />{{ saved ? '已记下' : '记下' }}
    </button>
  </article>
</template>
<script setup lang="ts">
import JournalIcon from './JournalIcon.vue'
import type { JournalEvent } from './models'
defineProps<{ event: JournalEvent; saved: boolean }>()
</script>
