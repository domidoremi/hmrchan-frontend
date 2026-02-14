<template>
  <div class="schedule-page">
    <div class="container">
      <header class="page-header">
        <div class="page-header-text">
          <h1>{{ $t('schedule.title') }}</h1>
          <p class="page-subtitle">{{ $t('schedule.subtitle') }}</p>
        </div>
        <div class="page-header-actions">
          <div class="category-filters">
            <button
              v-for="cat in categories"
              :key="cat.value"
              class="filter-chip glass-button"
              :class="{ 'filter-chip--active': activeCategory === cat.value }"
              @click="setCategory(cat.value)"
            >
              <component :is="cat.icon" :size="14" />
              <span>{{ $t(cat.label) }}</span>
            </button>
          </div>
        </div>
      </header>

      <!-- 月份导航 -->
      <div class="month-nav">
        <button class="month-nav-btn glass-button" @click="prevMonth">
          <ChevronLeft :size="18" />
        </button>
        <button class="month-nav-title" @click="goToday">
          {{ monthLabel }}
        </button>
        <button class="month-nav-btn glass-button" @click="nextMonth">
          <ChevronRight :size="18" />
        </button>
      </div>

      <!-- 日历网格 -->
      <div class="calendar-wrapper glass-card">
        <div class="calendar-weekdays">
          <div v-for="d in weekdays" :key="d" class="weekday-cell">{{ d }}</div>
        </div>

        <div v-if="isLoading && events.length === 0" class="calendar-grid">
          <div v-for="i in 35" :key="i" class="calendar-cell calendar-cell--skeleton">
            <div class="skeleton" style="width: 24px; height: 16px; border-radius: 4px" />
          </div>
        </div>

        <div v-else class="calendar-grid">
          <div
            v-for="day in calendarDays"
            :key="day.key"
            class="calendar-cell"
            :class="{
              'calendar-cell--other': !day.currentMonth,
              'calendar-cell--today': day.isToday,
              'calendar-cell--has-events': day.events.length > 0,
              'calendar-cell--selected': selectedDay?.key === day.key,
            }"
            @click="selectDay(day)"
          >
            <span class="day-number">{{ day.date }}</span>
            <div v-if="day.events.length > 0" class="day-dots">
              <span
                v-for="(evt, idx) in day.events.slice(0, 3)"
                :key="idx"
                class="day-dot"
                :style="{ background: getCategoryColor(evt.category) }"
              />
            </div>
          </div>
        </div>
      </div>

      <StateIndicator v-if="error" variant="error" :description="error" @action="fetchEvents" />

      <!-- 选中日期的事件列表 -->
      <Transition name="slide-fade">
        <section v-if="selectedDay" class="day-events">
          <div class="day-events-header">
            <h2>{{ selectedDayLabel }}</h2>
            <span v-if="selectedDayEvents.length" class="event-count">
              {{ selectedDayEvents.length }}
            </span>
            <button class="close-btn glass-button" @click="selectedDay = null">
              <X :size="16" />
            </button>
          </div>

          <StateIndicator
            v-if="selectedDayEvents.length === 0"
            variant="empty"
            :description="$t('schedule.noEvents')"
          />

          <div v-else class="events-list">
            <article v-for="evt in selectedDayEvents" :key="evt.id" class="event-card glass-card">
              <div
                class="event-category-bar"
                :style="{ background: getCategoryColor(evt.category) }"
              />
              <div class="event-body">
                <div class="event-header">
                  <span
                    class="event-badge"
                    :style="{
                      background: getCategoryColor(evt.category) + '20',
                      color: getCategoryColor(evt.category),
                    }"
                  >
                    {{ $t(`schedule.categories.${evt.category}`) }}
                  </span>
                  <span v-if="!evt.allDay" class="event-time">
                    {{ formatEventTime(evt.start) }}
                  </span>
                  <span v-else class="event-time">{{ $t('schedule.allDay') }}</span>
                </div>
                <h3 class="event-title">{{ evt.title }}</h3>
                <p v-if="evt.description" class="event-desc">{{ evt.description }}</p>
                <div v-if="evt.venue" class="event-venue">
                  <MapPin :size="14" />
                  <span>{{ evt.venue }}</span>
                </div>
                <a
                  v-if="evt.url"
                  :href="evt.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="event-link"
                >
                  <ExternalLink :size="14" />
                  <span>{{ $t('schedule.viewDetail') }}</span>
                </a>
              </div>
            </article>
          </div>
        </section>
      </Transition>

      <!-- 即将到来的事件 -->
      <section v-if="!selectedDay" class="upcoming-section">
        <h2 class="section-title">{{ $t('schedule.upcoming') }}</h2>
        <StateIndicator
          v-if="upcomingEvents.length === 0 && !isLoading"
          variant="empty"
          :description="$t('schedule.noUpcoming')"
        />
        <div v-else class="events-list">
          <article v-for="evt in upcomingEvents" :key="evt.id" class="event-card glass-card">
            <div
              class="event-category-bar"
              :style="{ background: getCategoryColor(evt.category) }"
            />
            <div class="event-body">
              <div class="event-header">
                <span
                  class="event-badge"
                  :style="{
                    background: getCategoryColor(evt.category) + '20',
                    color: getCategoryColor(evt.category),
                  }"
                >
                  {{ $t(`schedule.categories.${evt.category}`) }}
                </span>
                <span class="event-time">
                  {{ formatEventDate(evt.start) }}
                </span>
              </div>
              <h3 class="event-title">{{ evt.title }}</h3>
              <p v-if="evt.description" class="event-desc">{{ evt.description }}</p>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'SchedulePage' })

import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  ExternalLink,
  X,
  Calendar,
  Radio,
  Film,
  Cake,
  LayoutGrid,
} from 'lucide-vue-next'
import { scheduleService, type ScheduleCalendarItem } from '@/api/scheduleService'
import type { ScheduleCategory } from '@/api/scheduleService'
import { useScheduleStore } from '@/stores/schedule'
import { ApiError } from '@/api'
import StateIndicator from '@/components/ui/StateIndicator.vue'

const { t, locale } = useI18n()
const scheduleStore = useScheduleStore()

// ========== 状态 ==========
const events = ref<ScheduleCalendarItem[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth())
const activeCategory = ref<ScheduleCategory | 'all'>('all')
const selectedDay = ref<CalendarDay | null>(null)

// ========== 分类配置 ==========
const CATEGORY_COLORS: Record<string, string> = {
  live: '#ef4444',
  media: '#3b82f6',
  birth: '#f59e0b',
  other: '#8b5cf6',
}

const DEFAULT_COLOR = '#8b5cf6'

const categories = [
  { value: 'all' as const, label: 'schedule.categories.all', icon: LayoutGrid },
  { value: 'live' as const, label: 'schedule.categories.live', icon: Radio },
  { value: 'media' as const, label: 'schedule.categories.media', icon: Film },
  { value: 'birth' as const, label: 'schedule.categories.birth', icon: Cake },
  { value: 'other' as const, label: 'schedule.categories.other', icon: Calendar },
]

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? DEFAULT_COLOR
}

// ========== 日历计算 ==========
interface CalendarDay {
  key: string
  date: number
  fullDate: Date
  currentMonth: boolean
  isToday: boolean
  events: ScheduleCalendarItem[]
}

const weekdays = computed(() => {
  const lang = locale.value
  if (lang === 'ja') return ['日', '月', '火', '水', '木', '金', '土']
  if (lang === 'en') return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return ['日', '一', '二', '三', '四', '五', '六']
})

const monthLabel = computed(() => {
  const d = new Date(currentYear.value, currentMonth.value, 1)
  return d.toLocaleDateString(locale.value === 'zh-CN' ? 'zh-CN' : locale.value, {
    year: 'numeric',
    month: 'long',
  })
})

const filteredEvents = computed(() => {
  if (activeCategory.value === 'all') return events.value
  return events.value.filter((e) => e.category === activeCategory.value)
})

const calendarDays = computed<CalendarDay[]>(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

  const days: CalendarDay[] = []

  // 上月填充
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const fullDate = new Date(year, month - 1, d)
    days.push({
      key: `prev-${d}`,
      date: d,
      fullDate,
      currentMonth: false,
      isToday: false,
      events: getEventsForDate(fullDate),
    })
  }

  // 当月
  for (let d = 1; d <= daysInMonth; d++) {
    const fullDate = new Date(year, month, d)
    const dateStr = `${year}-${month}-${d}`
    days.push({
      key: `cur-${d}`,
      date: d,
      fullDate,
      currentMonth: true,
      isToday: dateStr === todayStr,
      events: getEventsForDate(fullDate),
    })
  }

  // 下月填充至 6 行
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    const fullDate = new Date(year, month + 1, d)
    days.push({
      key: `next-${d}`,
      date: d,
      fullDate,
      currentMonth: false,
      isToday: false,
      events: getEventsForDate(fullDate),
    })
  }

  return days
})

function getEventsForDate(date: Date): ScheduleCalendarItem[] {
  const dateStr = date.toISOString().slice(0, 10)
  return filteredEvents.value.filter((evt) => {
    const evtDate = evt.start.slice(0, 10)
    return evtDate === dateStr
  })
}

const selectedDayEvents = computed(() => {
  if (!selectedDay.value) return []
  return selectedDay.value.events
})

const selectedDayLabel = computed(() => {
  if (!selectedDay.value) return ''
  return selectedDay.value.fullDate.toLocaleDateString(
    locale.value === 'zh-CN' ? 'zh-CN' : locale.value,
    { month: 'long', day: 'numeric', weekday: 'long' }
  )
})

const upcomingEvents = computed(() => {
  const now = new Date()
  return filteredEvents.value
    .filter((e) => new Date(e.start) >= now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 10)
})

// ========== 操作 ==========
function prevMonth() {
  selectedDay.value = null
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  selectedDay.value = null
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

function goToday() {
  const now = new Date()
  currentYear.value = now.getFullYear()
  currentMonth.value = now.getMonth()
  selectedDay.value = null
}

function setCategory(cat: ScheduleCategory | 'all') {
  activeCategory.value = cat
  selectedDay.value = null
}

function selectDay(day: CalendarDay) {
  if (selectedDay.value?.key === day.key) {
    selectedDay.value = null
  } else {
    selectedDay.value = day
  }
}

function formatEventTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(locale.value, { month: 'short', day: 'numeric' })
}

// ========== 数据加载 ==========
async function fetchEvents() {
  isLoading.value = true
  error.value = null
  try {
    const start = new Date(currentYear.value, currentMonth.value - 1, 1).toISOString()
    const end = new Date(currentYear.value, currentMonth.value + 2, 0).toISOString()
    events.value = await scheduleService.calendar({ start, end })
  } catch (err) {
    // 404 表示后端尚未部署该接口，视为空数据
    if (err instanceof ApiError && err.status === 404) {
      events.value = []
    } else {
      error.value = err instanceof ApiError ? err.message : t('common.error')
    }
  } finally {
    isLoading.value = false
  }
}

watch([currentYear, currentMonth], () => {
  fetchEvents()
})

onMounted(() => {
  scheduleStore.markVisited()
  fetchEvents()
})
</script>

<style scoped>
.schedule-page {
  min-height: 100vh;
  padding: var(--spacing-6) 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
}

.page-header h1 {
  margin-bottom: var(--spacing-1);
  font-size: var(--text-xl);
}

.page-subtitle {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.category-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: 4px 12px;
  font-size: var(--text-xs);
  border-radius: var(--radius-full);
  transition: all 0.2s ease;
}

.filter-chip--active {
  background: rgba(var(--color-primary-rgb), 0.15);
  color: var(--color-primary);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

/* 月份导航 */
.month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.month-nav-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  padding: 0;
}

.month-nav-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-md);
  transition: background 0.2s ease;
  min-width: 180px;
  text-align: center;
}

.month-nav-title:hover {
  background: var(--glass-bg-subtle);
}

/* 日历 */
.calendar-wrapper {
  padding: var(--spacing-4);
  margin-bottom: var(--spacing-6);
  overflow: hidden;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: var(--spacing-2);
}

.weekday-cell {
  text-align: center;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-tertiary);
  padding: var(--spacing-2) 0;
  text-transform: uppercase;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.calendar-cell {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 48px;
}

.calendar-cell:hover {
  background: var(--glass-bg-subtle);
}

.calendar-cell--other {
  opacity: 0.35;
}

.calendar-cell--today .day-number {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: var(--radius-full);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-bold);
}

.calendar-cell--selected {
  background: rgba(var(--color-primary-rgb), 0.1);
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.calendar-cell--has-events {
  font-weight: var(--font-medium);
}

.day-number {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  line-height: 1;
}

.day-dots {
  display: flex;
  gap: 3px;
}

.day-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.calendar-cell--skeleton {
  pointer-events: none;
}

/* 事件列表 */
.day-events {
  margin-bottom: var(--spacing-6);
}

.day-events-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.day-events-header h2 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin: 0;
}

.event-count {
  padding: 2px 10px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.close-btn {
  margin-left: auto;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  padding: 0;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.event-card {
  display: flex;
  overflow: hidden;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.event-card:hover {
  border-color: rgba(var(--color-primary-rgb), 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.event-category-bar {
  width: 4px;
  flex-shrink: 0;
}

.event-body {
  flex: 1;
  padding: var(--spacing-4);
}

.event-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-2);
}

.event-badge {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.event-time {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-left: auto;
}

.event-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin: 0 0 var(--spacing-1);
  color: var(--color-text-primary);
}

.event-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-venue {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-2);
}

.event-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-xs);
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--font-medium);
}

.event-link:hover {
  text-decoration: underline;
}

/* 即将到来 */
.upcoming-section {
  margin-bottom: var(--spacing-8);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-4);
}

/* 过渡动画 */
.slide-fade-enter-active {
  transition: all 0.25s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.15s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* 响应式 */
@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
  }

  .calendar-cell {
    min-height: 40px;
  }

  .day-number {
    font-size: var(--text-xs);
  }

  .calendar-cell--today .day-number {
    width: 24px;
    height: 24px;
  }

  .day-dot {
    width: 4px;
    height: 4px;
  }

  .category-filters {
    overflow-x: auto;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .category-filters::-webkit-scrollbar {
    display: none;
  }

  .filter-chip {
    white-space: nowrap;
  }
}
</style>
