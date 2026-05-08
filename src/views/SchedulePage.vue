<template>
  <div class="hmr-route-page hmr-route-page--schedule">
    <header class="hmr-page-hero hmr-page-hero--schedule">
      <div class="hmr-container hmr-page-hero-container">
        <p class="hmr-kicker">{{ t('schedule.eyebrow') }}</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>{{ t('schedule.title') }}</h1>
        <HmrPageStateBlock
          :loading="pageState === 'loading'"
          :empty="pageState === 'empty'"
          :error="resource.error"
          :retry-label="t('explore.loadMore')"
          @retry="refreshSchedule"
        />
      </div>
    </header>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head hmr-section-head--split">
          <div>
            <p class="hmr-kicker">{{ t('schedule.date') }}</p>
            <h2 class="hmr-section-title">{{ t('schedule.dateTitle') }}</h2>
          </div>
          <div class="hmr-schedule-filter-row" aria-label="日程筛选">
            <button
              v-for="item in filterOptions"
              :key="item.id"
              class="hmr-schedule-filter"
              :class="{ 'is-active': activeFilter === item.id }"
              type="button"
              @click="setFilter(item.id)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>

        <div class="hmr-schedule-date-strip" aria-label="选择日期">
          <button
            v-for="day in dayOptions"
            :key="day.key"
            class="hmr-schedule-date-card"
            :class="{ 'is-active': selectedDayKey === day.key, 'is-empty': day.count === 0 }"
            type="button"
            @click="selectedDayKey = day.key"
          >
            <span>{{ day.weekday }}</span>
            <strong>{{ day.day }}</strong>
            <em>{{
              day.count ? `${day.count} ${t('schedule.itemCount')}` : t('schedule.noItems')
            }}</em>
          </button>
        </div>

        <div class="hmr-schedule-month-tools" aria-label="Month navigation">
          <button type="button" :aria-label="t('schedule.previousMonth')" @click="shiftMonth(-1)">
            <span></span>
          </button>
          <strong>{{ selectedMonthLabel }}</strong>
          <button type="button" :aria-label="t('schedule.nextMonth')" @click="shiftMonth(1)">
            <span></span>
          </button>
        </div>

        <div v-if="activeFilter === 'month'" class="hmr-schedule-month-grid">
          <button
            v-for="day in monthDays"
            :key="`month-${day.key}`"
            class="hmr-schedule-month-cell"
            :class="{
              'is-today': day.isToday,
              'is-active': selectedDayKey === day.key,
              'is-outside': !day.inMonth,
              'is-empty': day.count === 0,
            }"
            type="button"
            @click="selectedDayKey = day.key"
          >
            <span>{{ day.day }}</span>
            <em>{{ day.count }}</em>
          </button>
        </div>

        <div class="hmr-schedule-board">
          <aside class="hmr-schedule-day-summary">
            <p class="hmr-kicker">{{ t('schedule.selected') }}</p>
            <strong>{{ selectedDayLabel }}</strong>
            <span>{{ selectedDayEvents.length ? selectedSummary : t('schedule.emptyDay') }}</span>
            <RouterLink class="hmr-text-link" to="/contact">{{ t('schedule.clue') }}</RouterLink>
          </aside>

          <div class="hmr-schedule-event-list">
            <article
              v-for="item in selectedDayEvents"
              :key="item.id"
              class="hmr-schedule-event"
              :class="{ 'is-performance': item.isPerformance }"
            >
              <time :datetime="item.dateKey">{{ item.timeLabel }}</time>
              <div>
                <p class="hmr-kicker">{{ item.phase }}</p>
                <strong>{{ item.title }}</strong>
                <span>{{ item.description }}</span>
              </div>
              <em>{{
                item.isPerformance ? t('schedule.performance') : t('schedule.arrangement')
              }}</em>
            </article>

            <div v-if="!selectedDayEvents.length" class="hmr-schedule-empty">
              <span aria-hidden="true"></span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="hmr-dark-stage hmr-dark-stage--schedule" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">{{ t('schedule.upcoming') }}</p>
          <h2 class="hmr-section-title">{{ t('schedule.nextWindow') }}</h2>
        </div>
        <div class="hmr-schedule-highlight-grid">
          <article v-for="item in upcomingEvents.slice(0, 3)" :key="item.id">
            <span>{{ item.dayLabel }} · {{ item.timeLabel }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
          </article>
        </div>
        <RouterLink class="hmr-text-link hmr-text-link--light" to="/explore">
          {{ t('schedule.related') }}
        </RouterLink>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">{{ t('schedule.weekTitle') }}</p>
          <h2 class="hmr-section-title">{{ t('schedule.dateTitle') }}</h2>
        </div>
        <div class="hmr-schedule-week-list">
          <article v-for="day in populatedDays" :key="day.key" class="hmr-schedule-week-row">
            <div>
              <span>{{ day.weekday }}</span>
              <strong>{{ day.label }}</strong>
            </div>
            <ul>
              <li v-for="item in day.events" :key="item.id">
                <time :datetime="item.dateKey">{{ item.timeLabel }}</time>
                <span>{{ item.title }}</span>
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import { loadScheduleContentResource, type HmrScheduleContent } from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import type {
  HmrAsyncResource,
  HmrPageState,
  HmrScheduleItem,
  HmrScheduleViewMode,
} from '@/hmr/types'
import { readOrCreatePublicSnapshot } from '@/utils/cache/publicSnapshotCache'

type ScheduleFilter = 'all' | 'today' | HmrScheduleViewMode | 'performance'

interface HmrScheduleEvent extends HmrScheduleItem {
  dateKey: string
  dayLabel: string
  weekday: string
  timeLabel: string
  isPerformance: boolean
}

const content = ref<HmrScheduleContent>({
  items: [],
  calendar: [],
  highlights: [],
})
const pageState = ref<HmrPageState>('idle')
const resource = ref<HmrAsyncResource<HmrScheduleContent>>({
  state: 'idle',
  data: content.value,
  source: 'local',
  error: null,
  paths: ['/schedules', '/schedules/calendar', '/schedules/highlights'],
  updatedAt: null,
})
const activeFilter = ref<ScheduleFilter>('all')
const selectedDayKey = ref(formatDateKey(new Date()))
const selectedMonth = ref(startOfMonth(new Date()))
const { locale, t } = useI18n()

const filterOptions = computed<Array<{ id: ScheduleFilter; label: string }>>(() => [
  { id: 'all', label: t('schedule.all') },
  { id: 'today', label: t('schedule.today') },
  { id: 'week', label: t('schedule.week') },
  { id: 'month', label: t('schedule.month') },
  { id: 'performance', label: t('schedule.performance') },
])

const normalizedEvents = computed(() =>
  content.value.items
    .map((item, index) => normalizeScheduleEvent(item, index))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.timeLabel.localeCompare(b.timeLabel))
)
const filteredEvents = computed(() => {
  const todayKey = formatDateKey(new Date())
  const weekKeys = new Set(makeDayWindow(new Date(), 7).map((item) => item.key))
  const monthKey = formatMonthKey(selectedMonth.value)

  if (activeFilter.value === 'today') {
    return normalizedEvents.value.filter((item) => item.dateKey === todayKey)
  }
  if (activeFilter.value === 'week') {
    return normalizedEvents.value.filter((item) => weekKeys.has(item.dateKey))
  }
  if (activeFilter.value === 'month') {
    return normalizedEvents.value.filter((item) => item.dateKey.startsWith(monthKey))
  }
  if (activeFilter.value === 'performance') {
    return normalizedEvents.value.filter((item) => item.isPerformance)
  }

  return normalizedEvents.value
})
const dayOptions = computed(() =>
  makeDayWindow(new Date(), 7).map((day) => ({
    ...day,
    count: filteredEvents.value.filter((item) => item.dateKey === day.key).length,
  }))
)
const selectedDayEvents = computed(() =>
  filteredEvents.value.filter((item) => item.dateKey === selectedDayKey.value)
)
const selectedDay = computed(
  () => dayOptions.value.find((item) => item.key === selectedDayKey.value) ?? dayOptions.value[0]
)
const selectedDayLabel = computed(() => selectedDay.value?.label ?? '今天')
const selectedSummary = computed(
  () =>
    `${selectedDayEvents.value.length} ${t('schedule.itemCount')} · ${selectedDayEvents.value[0]?.timeLabel ?? t('schedule.noItems')}`
)
const upcomingEvents = computed(() => filteredEvents.value.slice(0, 6))
const selectedMonthLabel = computed(() => formatMonthLabel(selectedMonth.value))
const monthDays = computed(() =>
  makeMonthGrid(selectedMonth.value).map((day) => ({
    ...day,
    count: filteredEvents.value.filter((item) => item.dateKey === day.key).length,
  }))
)
const populatedDays = computed(() =>
  dayOptions.value
    .map((day) => ({
      ...day,
      events: filteredEvents.value.filter((item) => item.dateKey === day.key),
    }))
    .filter((day) => day.events.length)
)

async function refreshSchedule(): Promise<void> {
  pageState.value = 'loading'
  const nextResource = await readOrCreatePublicSnapshot(
    'hmr:schedule',
    loadScheduleContentResource,
    'short'
  )
  resource.value = nextResource
  content.value = nextResource.data
  pageState.value = nextResource.data.items.length ? 'ready' : 'empty'
}

function setFilter(filter: ScheduleFilter): void {
  activeFilter.value = filter
  if (filter === 'today') selectedDayKey.value = formatDateKey(new Date())
  if (filter === 'month') selectedMonth.value = startOfMonth(new Date(selectedDayKey.value))
}

function normalizeScheduleEvent(item: HmrScheduleItem, index: number): HmrScheduleEvent {
  const date = resolveEventDate(item, index)
  const searchable = `${item.phase} ${item.title} ${item.description}`.toLowerCase()

  return {
    ...item,
    dateKey: formatDateKey(date),
    dayLabel: formatDayLabel(date),
    weekday: formatWeekday(date),
    timeLabel: formatTimeLabel(item.time, date),
    isPerformance: /演出|直播|live|show|stage|performance|发布/.test(searchable),
  }
}

function resolveEventDate(item: HmrScheduleItem, index: number): Date {
  const raw = item.time.trim()
  const parsed = new Date(raw)
  const hasDate = /\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}/.test(raw)

  if (hasDate && Number.isFinite(parsed.getTime())) return parsed

  const date = new Date()
  date.setDate(date.getDate() + Math.floor(index / 2))
  const timeMatch = raw.match(/(\d{1,2}):(\d{2})/)
  if (timeMatch) {
    date.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0)
  }
  return date
}

function makeDayWindow(
  startDate: Date,
  days: number
): Array<{
  key: string
  label: string
  weekday: string
  day: string
}> {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    return {
      key: formatDateKey(date),
      label: formatDayLabel(date),
      weekday: formatWeekday(date),
      day: new Intl.DateTimeFormat(locale.value, { day: '2-digit' }).format(date),
    }
  })
}

function makeMonthGrid(monthDate: Date): Array<{
  key: string
  day: string
  isToday: boolean
  inMonth: boolean
}> {
  const monthStart = startOfMonth(monthDate)
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - monthStart.getDay())
  const todayKey = formatDateKey(new Date())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    const key = formatDateKey(date)
    return {
      key,
      day: new Intl.DateTimeFormat(locale.value, { day: 'numeric' }).format(date),
      isToday: key === todayKey,
      inMonth: date.getMonth() === monthStart.getMonth(),
    }
  })
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat(locale.value, {
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(date)
}

function formatTimeLabel(raw: string, date: Date): string {
  const timeMatch = raw.match(/(\d{1,2}):(\d{2})/)
  if (timeMatch) return `${timeMatch[1]?.padStart(2, '0')}:${timeMatch[2]}`
  return new Intl.DateTimeFormat(locale.value, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function formatMonthKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat(locale.value, {
    year: 'numeric',
    month: 'long',
  }).format(date)
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function shiftMonth(offset: number): void {
  const nextMonth = new Date(selectedMonth.value)
  nextMonth.setMonth(nextMonth.getMonth() + offset)
  selectedMonth.value = startOfMonth(nextMonth)
  selectedDayKey.value = formatDateKey(selectedMonth.value)
  activeFilter.value = 'month'
}

watch(
  dayOptions,
  (days) => {
    if (!days.some((day) => day.key === selectedDayKey.value)) {
      selectedDayKey.value = days[0]?.key ?? formatDateKey(new Date())
    }
  },
  { immediate: true }
)

onMounted(() => {
  void refreshSchedule()
})
</script>
