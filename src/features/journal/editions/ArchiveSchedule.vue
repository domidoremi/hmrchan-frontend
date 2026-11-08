<template>
  <div class="archive-page archive-schedule">
    <header class="archive-page-title" data-reveal>
      <div>
        <span class="eyebrow">CALENDAR</span>
        <h1>月历<span class="title-dot">.</span></h1>
      </div>
      <button class="button button-outline" data-action="notifications">
        <JournalIcon name="bookmark" />已记下 {{ reminders.size }}
      </button>
    </header>
    <div class="archive-calendar-toolbar">
      <div class="month-navigation">
        <button class="icon-button journal-month-prev" aria-label="上个月" @click="stepMonth(-1)">
          <JournalIcon name="arrow-left" />
        </button>
        <h2>{{ year }} <span>/</span> {{ String(number).padStart(2, '0') }}</h2>
        <button class="icon-button journal-month-next" aria-label="下个月" @click="stepMonth(1)">
          <JournalIcon name="arrow" />
        </button>
      </div>
      <span>台北时间</span
      ><button
        class="text-button"
        :aria-pressed="savedOnly"
        @click="$emit('change', 'saved', savedOnly ? '' : '1')"
      >
        <JournalIcon name="bookmark" />{{ savedOnly ? '已记下' : '全部日程' }}</button
      ><button class="text-button" @click="$emit('change', 'day', 'all')">全部日期</button>
    </div>
    <div class="archive-calendar-workspace">
      <section class="archive-month" data-reveal>
        <div class="calendar-weekdays">
          <span v-for="day in ['一', '二', '三', '四', '五', '六', '日']" :key="day">{{
            day
          }}</span>
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
              :aria-label="`${number} 月 ${day} 日，${dayEvents(day).length} 项活动`"
              @click="$emit('change', 'day', String(day))"
            >
              <span>{{ String(day).padStart(2, '0') }}<small v-if="isToday(day)">今日</small></span>
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
          <h2>{{ selectedDay === 'all' ? '本月日程' : number + ' / ' + selectedDay }}</h2>
          <span class="meta-count">{{ visible.length }}</span>
        </div>
        <article v-for="event in visible" :key="event.id" class="calendar-inspector-event">
          <div>
            <span class="status-light" /><time
              >{{ event.month }}/{{ event.day }} · {{ event.time }}</time
            ><button
              class="icon-button remind"
              :data-remind="event.id"
              :aria-pressed="reminders.has(event.id)"
              :aria-label="`记下：${event.title}`"
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
          <h3>{{ loading ? '加载中…' : '暂无日程' }}</h3>
        </div>
      </aside>
    </div>
    <slot name="state" />
  </div>
</template>
<script setup lang="ts">
import JournalIcon from '../JournalIcon.vue'
import { useCalendar, type CalendarProps } from './useCalendar'
const props = defineProps<CalendarProps>()
const emit = defineEmits<{ change: [key: string, value: string] }>()
const { year, number, days, offset, visible, monthName, isToday, dayEvents, stepMonth } =
  useCalendar(props, (key, value) => emit('change', key, value))
</script>
