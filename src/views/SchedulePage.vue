<template>
  <div class="hmr-route-page hmr-route-page--schedule">
    <header class="hmr-page-hero hmr-page-hero--schedule">
      <div class="hmr-container hmr-page-hero-container">
        <p class="hmr-kicker">日程</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>活动与演出日历</h1>
        <HmrPageStateBlock
          :loading="pageState === 'loading'"
          :empty="pageState === 'empty'"
          :error="resource.error"
          empty-title="暂时没有日程。"
          @retry="refreshSchedule"
        />
      </div>
    </header>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head hmr-section-head--split">
          <div>
            <p class="hmr-kicker">日期</p>
            <h2 class="hmr-section-title">先选一天。</h2>
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
            <em>{{ day.count ? `${day.count} 项` : '暂无' }}</em>
          </button>
        </div>

        <div class="hmr-schedule-board">
          <aside class="hmr-schedule-day-summary">
            <p class="hmr-kicker">当前选择</p>
            <strong>{{ selectedDayLabel }}</strong>
            <span>{{ selectedDayEvents.length ? selectedSummary : '这一天暂时没有安排。' }}</span>
            <RouterLink class="hmr-text-link" to="/contact">补充活动线索</RouterLink>
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
              <em>{{ item.isPerformance ? '演出/直播' : '安排' }}</em>
            </article>

            <div v-if="!selectedDayEvents.length" class="hmr-schedule-empty">
              <strong>这一天没有活动。</strong>
              <span>切换到有数量标记的日期，或查看本周全部安排。</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="hmr-dark-stage hmr-dark-stage--schedule" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">即将发生</p>
          <h2 class="hmr-section-title">接下来三个窗口。</h2>
        </div>
        <div class="hmr-schedule-highlight-grid">
          <article v-for="item in upcomingEvents.slice(0, 3)" :key="item.id">
            <span>{{ item.dayLabel }} · {{ item.timeLabel }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
          </article>
        </div>
        <RouterLink class="hmr-text-link hmr-text-link--light" to="/explore">
          查看相关内容
        </RouterLink>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">本周</p>
          <h2 class="hmr-section-title">按天浏览。</h2>
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
import { RouterLink } from 'vue-router'

import { loadScheduleContentResource, type HmrScheduleContent } from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import type { HmrAsyncResource, HmrPageState, HmrScheduleItem } from '@/hmr/types'

type ScheduleFilter = 'all' | 'today' | 'week' | 'performance'

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

const filterOptions: Array<{ id: ScheduleFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'today', label: '今天' },
  { id: 'week', label: '本周' },
  { id: 'performance', label: '演出/直播' },
]

const normalizedEvents = computed(() =>
  content.value.items
    .map((item, index) => normalizeScheduleEvent(item, index))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.timeLabel.localeCompare(b.timeLabel))
)
const filteredEvents = computed(() => {
  const todayKey = formatDateKey(new Date())
  const weekKeys = new Set(makeDayWindow(new Date(), 7).map((item) => item.key))

  if (activeFilter.value === 'today') {
    return normalizedEvents.value.filter((item) => item.dateKey === todayKey)
  }
  if (activeFilter.value === 'week') {
    return normalizedEvents.value.filter((item) => weekKeys.has(item.dateKey))
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
    `${selectedDayEvents.value.length} 个安排，最早 ${selectedDayEvents.value[0]?.timeLabel ?? '待定'}`
)
const upcomingEvents = computed(() => filteredEvents.value.slice(0, 6))
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
  const nextResource = await loadScheduleContentResource()
  resource.value = nextResource
  content.value = nextResource.data
  pageState.value = nextResource.data.items.length ? 'ready' : 'empty'
}

function setFilter(filter: ScheduleFilter): void {
  activeFilter.value = filter
  if (filter === 'today') selectedDayKey.value = formatDateKey(new Date())
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
      day: new Intl.DateTimeFormat('zh-CN', { day: '2-digit' }).format(date),
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
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date)
}

function formatTimeLabel(raw: string, date: Date): string {
  const timeMatch = raw.match(/(\d{1,2}):(\d{2})/)
  if (timeMatch) return `${timeMatch[1]?.padStart(2, '0')}:${timeMatch[2]}`
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
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
