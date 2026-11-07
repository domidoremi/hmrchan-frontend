<template>
  <div class="page-container">
    <div class="page-heading">
      <div>
        <span class="eyebrow">SCHEDULE / {{ monthWord }}</span>
        <h1>活动日程</h1>
      </div>
      <button
        class="button button-outline button-small"
        :aria-pressed="savedOnly"
        @click="change('saved', savedOnly ? '' : '1')"
      >
        <JournalIcon name="bookmark" />已记下
        <span class="reminder-count">{{ reminders.size }}</span>
      </button>
    </div>
    <div class="calendar-toolbar">
      <h2>
        <button class="icon-button journal-month-prev" aria-label="上个月" @click="stepMonth(-1)">
          <JournalIcon name="arrow-left" /></button
        >{{ year }} 年 {{ monthNumber }} 月<span>台北时间</span
        ><button class="icon-button journal-month-next" aria-label="下个月" @click="stepMonth(1)">
          <JournalIcon name="arrow" />
        </button>
      </h2>
      <div class="calendar-controls">
        <div class="calendar-view-toggle" aria-label="日历视图">
          <button
            v-for="[value, label] in views"
            :key="value"
            :data-calendar-view="value"
            :class="{ active: view === value }"
            :aria-pressed="view === value"
            @click="change('calendar', value)"
          >
            {{ label }}
          </button>
        </div>
        <button
          class="text-button"
          :class="{ active: selectedDay === 'all' }"
          data-day="all"
          :aria-pressed="selectedDay === 'all'"
          @click="change('day', 'all')"
        >
          全部日程 <JournalIcon name="arrow" />
        </button>
      </div>
    </div>
    <div class="calendar-content" :data-calendar-mode="view">
      <div id="calendar-dates">
        <div v-if="view === 'month'" class="month-calendar">
          <div class="calendar-weekdays" aria-hidden="true">
            <span v-for="day in ['一', '二', '三', '四', '五', '六', '日']" :key="day">{{
              day
            }}</span>
          </div>
          <div class="month-grid" role="group" :aria-label="`${year} 年 ${monthNumber} 月`">
            <span
              v-for="i in offset"
              :key="`pre-${i}`"
              class="calendar-blank"
              aria-hidden="true"
            /><button
              v-for="day in days"
              :key="day"
              class="month-day"
              :class="{ active: selectedDay === String(day), 'has-events': dayEvents(day).length }"
              :data-day="day"
              :aria-pressed="selectedDay === String(day)"
              :aria-label="`${monthNumber} 月 ${day} 日，${dayEvents(day).length ? '有活动' : '无活动'}`"
              @click="change('day', String(day))"
            >
              <span>{{ String(day).padStart(2, '0') }}</span
              ><i v-if="isToday(day)" class="calendar-today">今日</i
              ><small>{{
                dayEvents(day)
                  .map((item) => item.title)
                  .join('、')
              }}</small
              ><b
                v-if="dayEvents(day).length"
                class="calendar-event-dot"
                aria-hidden="true"
              /></button
            ><span
              v-for="i in trailing"
              :key="`post-${i}`"
              class="calendar-blank"
              aria-hidden="true"
            />
          </div>
        </div>
        <div v-else class="week-grid" aria-label="选择日期">
          <button
            v-for="day in weekDays"
            :key="day"
            class="day-pill"
            :class="{ active: selectedDay === String(day) }"
            :data-day="day"
            :aria-pressed="selectedDay === String(day)"
            :aria-label="`${monthNumber} 月 ${day} 日 ${weekday(day)}`"
            @click="change('day', String(day))"
          >
            <small>{{ weekday(day) }}</small
            ><strong>{{ String(day).padStart(2, '0') }}</strong
            ><span :style="{ opacity: dayEvents(day).length ? 1 : 0 }" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div class="schedule-layout">
        <section id="schedule-events" aria-label="活动列表" aria-live="polite">
          <div class="schedule-list-caption">
            <span
              >{{ monthNumber }} 月{{ selectedDay === 'all' ? '日程' : ` ${selectedDay} 日` }}</span
            ><small>{{ visibleEvents.length }} 项活动</small>
          </div>
          <JournalEventCard
            v-for="event in visibleEvents"
            :key="event.id"
            :event="event"
            :saved="reminders.has(event.id)"
          />
          <div v-if="!visibleEvents.length" class="empty-state">
            <JournalIcon name="compass" />
            <h3>{{ loading ? '加载中…' : '当天没有活动' }}</h3>
            <button class="button button-outline button-small" @click="change('day', 'all')">
              全部日程
            </button>
          </div>
        </section>
        <aside class="calendar-note">
          <JournalIcon name="bookmark" />
          <h3>已记下的日程</h3>
          <p>{{ reminders.size ? `${reminders.size} 项活动` : '暂无日程' }}</p>
          <button class="text-button" @click="change('saved', savedOnly ? '' : '1')">
            查看日程 <JournalIcon name="arrow" />
          </button>
        </aside>
      </div>
    </div>
    <slot name="state" />
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, nextTick, watch } from 'vue'
import JournalIcon from './JournalIcon.vue'
import JournalEventCard from './JournalEventCard.vue'
import { useJournal } from './context'
import type { JournalEvent } from './models'
const props = defineProps<{
  events: JournalEvent[]
  month: string
  selectedDay: string
  view: string
  reminders: Set<string>
  savedOnly: boolean
  loading: boolean
  fixture: boolean
}>()
const emit = defineEmits<{ change: [key: string, value: string] }>()
const runtime = useJournal()
const views = [
  ['week', '日期'],
  ['month', '月历'],
] as const
const year = computed(() => Number(props.month.slice(0, 4))),
  monthNumber = computed(() => Number(props.month.slice(5)))
const days = computed(() => new Date(year.value, monthNumber.value, 0).getDate())
const offset = computed(() => (new Date(year.value, monthNumber.value - 1, 1).getDay() + 6) % 7)
const trailing = computed(() => (7 - ((days.value + offset.value) % 7)) % 7)
const monthWord = computed(() =>
  new Intl.DateTimeFormat('en', { month: 'long' })
    .format(new Date(year.value, monthNumber.value - 1, 1))
    .toUpperCase()
)
const startDay = computed(() =>
  props.selectedDay === 'all'
    ? props.fixture
      ? 7
      : Math.min(new Date().getDate(), days.value - 6)
    : Math.max(1, Math.min(days.value - 6, 1 + Math.floor((Number(props.selectedDay) - 1) / 7) * 7))
)
const weekDays = computed(() => Array.from({ length: 7 }, (_, i) => startDay.value + i))
const visibleEvents = computed(() =>
  props.events.filter(
    (event) =>
      (props.selectedDay === 'all' || event.day === Number(props.selectedDay)) &&
      (!props.savedOnly || props.reminders.has(event.id))
  )
)
const dayEvents = (day: number) => props.events.filter((event) => event.day === day)
const weekday = (day: number) =>
  ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][
    new Date(year.value, monthNumber.value - 1, day).getDay()
  ]
const isToday = (day: number) =>
  props.fixture
    ? day === 7
    : `${props.month}-${String(day).padStart(2, '0')}` ===
      new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(new Date())
function change(key: string, value: string) {
  emit('change', key, value)
}
function stepMonth(step: number) {
  const value = new Date(year.value, monthNumber.value - 1 + step, 1)
  change('month', `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`)
}
async function mount() {
  await nextTick()
  runtime.value?.mount()
  const dial = document.querySelector('.calendar-object-center')
  if (dial) {
    dial.querySelector('small')!.textContent = monthWord.value
    dial.querySelector('b')!.textContent = String(monthNumber.value)
    dial.querySelector('span')!.textContent = String(year.value)
  }
}
onMounted(mount)
watch(() => [runtime.value, props.month, props.selectedDay, props.view, props.events], mount)
</script>
