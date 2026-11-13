<template>
  <div class="archive-page archive-schedule">
    <header class="archive-page-title" data-reveal>
      <div>
        <h1>{{ t('journal.nav.calendar') }}<span class="title-dot">.</span></h1>
      </div>
      <button class="button button-outline" data-action="notifications">
        <JournalIcon name="bookmark" />{{ t('journal.nav.savedSchedule') }} {{ reminders.size }}
      </button>
    </header>
    <div class="archive-calendar-toolbar">
      <div class="month-navigation">
        <button
          class="icon-button journal-month-prev"
          :aria-label="t('schedule.prevMonth')"
          @click="stepMonth(-1)"
        >
          <JournalIcon name="arrow-left" />
        </button>
        <h2>{{ year }} <span>/</span> {{ String(number).padStart(2, '0') }}</h2>
        <button
          class="icon-button journal-month-next"
          :aria-label="t('schedule.nextMonth')"
          @click="stepMonth(1)"
        >
          <JournalIcon name="arrow" />
        </button>
      </div>
      <span>{{ t('journal.calendar.taipeiTime') }}</span><button
        class="text-button"
        :aria-pressed="savedOnly"
        @click="$emit('change', 'saved', savedOnly ? '' : '1')"
      >
        <JournalIcon name="bookmark" />{{
          t(savedOnly ? 'journal.nav.savedSchedule' : 'journal.calendar.allEvents')
        }}</button
      ><button class="text-button" @click="$emit('change', 'day', 'all')">
        {{ t('journal.calendar.allDates') }}
      </button>
    </div>
    <div class="archive-calendar-workspace">
      <section class="archive-month" data-reveal>
        <div class="calendar-weekdays">
          <span v-for="day in weekdays" :key="day">{{ day }}</span>
        </div>
        <Transition name="calendar-shift" mode="out-in"
          ><div :key="month" class="archive-month-grid">
            <span v-for="i in offset" :key="'blank-' + i" class="month-blank" /><button
              v-for="day in days"
              :key="day"
              class="archive-month-day"
              :class="{ selected: selectedDay === String(day), today: isToday(day) }"
              :data-day="day"
              :aria-pressed="selectedDay === String(day)"
              :aria-label="dayLabel(day)"
              @click="$emit('change', 'day', String(day))"
            >
              <span
                >{{ String(day).padStart(2, '0')
                }}<small v-if="isToday(day)">{{ t('schedule.today') }}</small></span
              >
              <div class="month-day-events">
                <span
                  v-for="event in dayEvents(day).slice(0, 2)"
                  :key="event.id"
                  :class="event.tone"
                  ><i />{{ event.title }}</span
                ><b v-if="dayEvents(day).length > 2">+{{ dayEvents(day).length - 2 }}</b>
              </div>
            </button>
          </div></Transition
        >
      </section>
      <aside class="archive-calendar-inspector">
        <div class="panel-heading">
          <span>{{ monthName }}</span>
          <h2>
            {{
              selectedDay === 'all'
                ? t('journal.calendar.monthEvents')
                : number + ' / ' + selectedDay
            }}
          </h2>
          <span class="meta-count">{{ visible.length }}</span>
        </div>
        <article v-for="event in visible" :key="event.id" class="calendar-inspector-event">
          <div>
            <span class="status-light" /><time
              >{{ event.month }}/{{ event.day }} · {{ journalEventTimeLabel(event, t) }}</time
            ><button
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
          </div>
          <h3>
            <button :data-event="event.id">{{ event.title }}</button>
          </h3>
          <p>{{ event.venue }}</p>
          <span class="badge">{{ event.type }}</span>
        </article>
        <div v-if="!visible.length" class="empty-state">
          <JournalIcon name="calendar" />
          <h3>{{ loading ? t('common.loading') : t('journal.states.noEvents') }}</h3>
        </div>
      </aside>
    </div>
    <slot name="state" />
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
  offset,
  visible,
  monthName,
  isToday,
  dayEvents,
  weekdays,
  dayLabel,
  stepMonth,
} = useCalendar(props, (key, value) => emit('change', key, value))
</script>
