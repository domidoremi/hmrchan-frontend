<template>
  <article class="event-card">
    <div class="event-date">
      <strong>{{ String(event.day).padStart(2, '0') }}</strong><small>{{
        journalDateLabel(event.date, locale, true)
      }}</small>
    </div>
    <div class="event-copy">
      <span class="badge" :class="`badge-${event.tone}`">{{ event.type }}</span>
      <h3>
        <button class="discussion-title" :data-event="event.id">{{ event.title }}</button>
      </h3>
      <p>
        <span><JournalIcon name="clock" />{{ journalEventTimeLabel(event, t) }}</span
        ><span><JournalIcon name="pin" />{{ event.venue }}</span>
      </p>
    </div>
    <button
      class="button button-outline button-small"
      :data-remind="event.id"
      :aria-label="
        t(saved ? 'journal.actions.removeReminderNamed' : 'journal.actions.remindNamed', {
          title: event.title,
        })
      "
      :aria-pressed="saved"
    >
      <JournalIcon :name="saved ? 'check' : 'bell'" />{{
        t(saved ? 'journal.actions.reminded' : 'journal.actions.remind')
      }}
    </button>
  </article>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { journalDateLabel } from './localizedDate'
import { journalEventTimeLabel } from './localizedEventTime'
import JournalIcon from './JournalIcon.vue'
import type { JournalEvent } from './models'
defineProps<{ event: JournalEvent; saved: boolean }>()
const { locale, t } = useI18n({ useScope: 'global' })
</script>
