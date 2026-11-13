<template>
  <div class="editorial-page editorial-schedule">
    <header class="editorial-page-heading" data-reveal>
      <div>
        <h1>
          {{ t('nav.schedule') }}<em>{{ String(events.length).padStart(2, '0') }}</em>
        </h1>
        <button class="text-button" data-action="notifications">
          <JournalIcon name="bookmark" />{{ t('journal.nav.savedSchedule') }} {{ reminders.size }}
        </button>
      </div>
    </header>
    <div class="schedule-book">
      <aside class="schedule-book-cover" data-tilt>
        <div>
          <span>{{ year }}</span><span>{{ t('journal.calendar.taipeiTime') }}</span>
        </div>
        <Transition name="month-turn" mode="out-in"
          ><div :key="month" class="month-turn-face">
            <strong>{{ String(number).padStart(2, '0') }}</strong><span>{{ monthName }}</span
            ><i aria-hidden="true" /></div
        ></Transition>
        <div class="month-navigation">
          <button
            class="icon-button journal-month-prev"
            :aria-label="t('schedule.prevMonth')"
            @click="stepMonth(-1)"
          >
            <JournalIcon name="arrow-left" /></button
          ><span>{{ year }}.{{ String(number).padStart(2, '0') }}</span
          ><button
            class="icon-button journal-month-next"
            :aria-label="t('schedule.nextMonth')"
            @click="stepMonth(1)"
          >
            <JournalIcon name="arrow" />
          </button>
        </div>
      </aside>
      <section class="schedule-pages">
        <div class="schedule-page-tools">
          <button
            class="text-button"
            :class="{ active: selectedDay === 'all' }"
            @click="$emit('change', 'day', 'all')"
          >
            {{ t('journal.calendar.allEvents') }} <span>{{ events.length }}</span></button
          ><button
            class="text-button"
            :aria-pressed="savedOnly"
            @click="$emit('change', 'saved', savedOnly ? '' : '1')"
          >
            <JournalIcon name="bookmark" />{{ t('journal.nav.savedSchedule') }}</button
          ><button
            class="text-button"
            :aria-pressed="view === 'month'"
            @click="$emit('change', 'calendar', view === 'month' ? 'week' : 'month')"
          >
            <JournalIcon name="grid" />{{ t('schedule.view.month') }}
          </button>
        </div>
        <div :key="month" class="editorial-date-strip" :class="{ expanded: view === 'month' }">
          <button
            v-for="day in days"
            :key="day"
            :data-day="day"
            :class="{ active: selectedDay === String(day), today: isToday(day) }"
            :aria-pressed="selectedDay === String(day)"
            :aria-label="dayLabel(day)"
            @click="$emit('change', 'day', String(day))"
          >
            <small>{{ weekday(day) }}</small><b>{{ String(day).padStart(2, '0') }}</b
            ><i :class="{ marked: dayEvents(day).length > 0 }" />
          </button>
        </div>
        <div class="schedule-ledger">
          <div v-for="group in groups" :key="group.day" class="schedule-day-group" data-reveal>
            <div class="ledger-date">
              <b>{{ String(group.day).padStart(2, '0') }}</b><span>{{ weekday(group.day) }}</span>
            </div>
            <article v-for="event in group.events" :key="event.id" class="ledger-event">
              <span class="ledger-time"
                >{{ journalEventTimeLabel(event, t) }}<small>{{ event.type }}</small></span
              >
              <div>
                <h2>
                  <button :data-event="event.id">{{ event.title }}</button>
                </h2>
                <p>{{ event.venue }}</p>
                <p v-if="event.description" class="ledger-description">{{ event.description }}</p>
              </div>
              <button
                class="icon-button remind"
                :data-remind="event.id"
                :aria-pressed="reminders.has(event.id)"
                :aria-label="
                  t(
                    reminders.has(event.id)
                      ? 'journal.actions.removeReminderNamed'
                      : 'journal.actions.remindNamed',
                    { title: event.title }
                  )
                "
              >
                <JournalIcon :name="reminders.has(event.id) ? 'check' : 'plus'" />
              </button>
            </article>
          </div>
          <div v-if="!visible.length" class="empty-state">
            <JournalIcon name="calendar" />
            <h3>{{ loading ? t('common.loading') : t('journal.states.noEvents') }}</h3>
            <button
              v-if="selectedDay !== 'all'"
              class="text-button"
              @click="$emit('change', 'day', 'all')"
            >
              {{ t('journal.calendar.allEvents') }} <JournalIcon name="arrow" />
            </button>
          </div>
        </div>
        <slot name="state" />
      </section>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { journalEventTimeLabel } from '../localizedEventTime'
import JournalIcon from '../JournalIcon.vue'
import { useCalendar, type CalendarProps } from './useCalendar'
const props = defineProps<CalendarProps>()
const { t } = useI18n({ useScope: 'global' })
const emit = defineEmits<{ change: [key: string, value: string] }>()
const {
  year,
  number,
  days,
  visible,
  groups,
  monthName,
  isToday,
  dayEvents,
  weekday,
  dayLabel,
  stepMonth,
} = useCalendar(props, (key, value) => emit('change', key, value))
</script>
