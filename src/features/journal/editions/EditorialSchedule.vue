<template>
  <div class="editorial-page editorial-schedule">
    <header class="editorial-page-heading" data-reveal>
      <span class="eyebrow">THE CALENDAR</span>
      <div>
        <h1>
          日程<em>{{ String(events.length).padStart(2, '0') }}</em>
        </h1>
        <button class="text-button" data-action="notifications">
          <JournalIcon name="bookmark" />已记下 {{ reminders.size }}
        </button>
      </div>
    </header>
    <div class="schedule-book">
      <aside class="schedule-book-cover" data-tilt>
        <div>
          <span>{{ year }}</span
          ><span>台北时间</span>
        </div>
        <Transition name="month-turn" mode="out-in"
          ><div :key="month" class="month-turn-face">
            <strong>{{ String(number).padStart(2, '0') }}</strong
            ><span>{{ monthName }}</span
            ><i aria-hidden="true" /></div
        ></Transition>
        <div class="month-navigation">
          <button class="icon-button journal-month-prev" aria-label="上个月" @click="stepMonth(-1)">
            <JournalIcon name="arrow-left" /></button
          ><span>{{ year }}.{{ String(number).padStart(2, '0') }}</span
          ><button class="icon-button journal-month-next" aria-label="下个月" @click="stepMonth(1)">
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
            全部日程 <span>{{ events.length }}</span></button
          ><button
            class="text-button"
            :aria-pressed="savedOnly"
            @click="$emit('change', 'saved', savedOnly ? '' : '1')"
          >
            <JournalIcon name="bookmark" />已记下</button
          ><button
            class="text-button"
            :aria-pressed="view === 'month'"
            @click="$emit('change', 'calendar', view === 'month' ? 'week' : 'month')"
          >
            <JournalIcon name="grid" />月历
          </button>
        </div>
        <div :key="month" class="editorial-date-strip" :class="{ expanded: view === 'month' }">
          <button
            v-for="day in days"
            :key="day"
            :data-day="day"
            :class="{ active: selectedDay === String(day), today: isToday(day) }"
            :aria-pressed="selectedDay === String(day)"
            :aria-label="`星期${weekday(day)}${String(day).padStart(2, '0')}，${number} 月 ${day} 日，${dayEvents(day).length} 项活动`"
            @click="$emit('change', 'day', String(day))"
          >
            <small>{{ weekday(day) }}</small
            ><b>{{ String(day).padStart(2, '0') }}</b
            ><i :class="{ marked: dayEvents(day).length > 0 }" />
          </button>
        </div>
        <div class="schedule-ledger">
          <div v-for="group in groups" :key="group.day" class="schedule-day-group" data-reveal>
            <div class="ledger-date">
              <b>{{ String(group.day).padStart(2, '0') }}</b
              ><span>星期{{ weekday(group.day) }}</span>
            </div>
            <article v-for="event in group.events" :key="event.id" class="ledger-event">
              <span class="ledger-time"
                >{{ event.time }}<small>{{ event.type }}</small></span
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
                :aria-label="`记下：${event.title}`"
              >
                <JournalIcon :name="reminders.has(event.id) ? 'check' : 'plus'" />
              </button>
            </article>
          </div>
          <div v-if="!visible.length" class="empty-state">
            <JournalIcon name="calendar" />
            <h3>{{ loading ? '加载中…' : '暂无日程' }}</h3>
            <button
              v-if="selectedDay !== 'all'"
              class="text-button"
              @click="$emit('change', 'day', 'all')"
            >
              全部日程 <JournalIcon name="arrow" />
            </button>
          </div>
        </div>
        <slot name="state" />
      </section>
    </div>
  </div>
</template>
<script setup lang="ts">
import JournalIcon from '../JournalIcon.vue'
import { useCalendar, type CalendarProps } from './useCalendar'
const props = defineProps<CalendarProps>()
const emit = defineEmits<{ change: [key: string, value: string] }>()
const { year, number, days, visible, groups, monthName, isToday, dayEvents, weekday, stepMonth } =
  useCalendar(props, (key, value) => emit('change', key, value))
</script>
