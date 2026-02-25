<template>
  <div class="schedule-page">
    <!-- 背景装饰 -->
    <div class="schedule-bg" aria-hidden="true">
      <div class="schedule-bg__blob schedule-bg__blob--blue" />
      <div class="schedule-bg__blob schedule-bg__blob--amber" />
    </div>

    <div class="container">
      <header class="page-header">
        <div class="page-header-text">
          <h1>{{ $t('schedule.title') }}</h1>
          <p class="page-subtitle">{{ $t('schedule.subtitle') }}</p>
        </div>
        <div class="page-header-actions">
          <div class="category-filters" role="radiogroup" :aria-label="$t('schedule.filterLabel')">
            <button
              v-for="cat in categories"
              :key="cat.value"
              class="filter-chip glass-button"
              :class="{ 'filter-chip--active': activeCategory === cat.value }"
              role="radio"
              :aria-checked="activeCategory === cat.value"
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
        <button
          class="month-nav-btn glass-button"
          :aria-label="$t('schedule.prevMonth')"
          @click="prevMonth"
        >
          <ChevronLeft :size="18" />
        </button>
        <button class="month-nav-title" :aria-label="$t('schedule.goToday')" @click="goToday">
          {{ monthLabel }}
        </button>
        <button
          class="month-nav-btn glass-button"
          :aria-label="$t('schedule.nextMonth')"
          @click="nextMonth"
        >
          <ChevronRight :size="18" />
        </button>
        <Transition name="today-fade">
          <button v-if="!isCurrentMonth" class="today-btn glass-button" @click="goToday">
            <CalendarCheck :size="14" />
            <span>{{ $t('schedule.today') }}</span>
          </button>
        </Transition>
      </div>

      <!-- 日历网格 -->
      <div
        ref="calendarRef"
        class="calendar-wrapper glass-card"
        role="grid"
        :aria-label="$t('schedule.calendarLabel')"
        @keydown="handleCalendarKeydown"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <div class="calendar-weekdays" role="row">
          <div v-for="d in weekdays" :key="d" class="weekday-cell" role="columnheader">
            {{ d }}
          </div>
        </div>

        <Transition :name="monthTransition" mode="out-in">
          <div v-if="isLoading && events.length === 0" key="skeleton" class="calendar-grid">
            <div v-for="i in 42" :key="i" class="calendar-cell calendar-cell--skeleton">
              <div class="skeleton-day" />
            </div>
          </div>

          <div v-else :key="monthKey" class="calendar-grid" role="rowgroup">
            <button
              v-for="(day, idx) in calendarDays"
              :key="day.key"
              class="calendar-cell"
              :class="{
                'calendar-cell--other': !day.currentMonth,
                'calendar-cell--today': day.isToday,
                'calendar-cell--has-events': day.events.length > 0,
                'calendar-cell--selected': selectedDay?.key === day.key,
              }"
              role="gridcell"
              :tabindex="day.isToday || (idx === 0 && !selectedDay) ? 0 : -1"
              :aria-label="getDayAriaLabel(day)"
              :aria-selected="selectedDay?.key === day.key"
              @click="selectDay(day)"
            >
              <span class="day-number">{{ day.date }}</span>
              <div v-if="day.events.length > 0" class="day-dots">
                <span
                  v-for="(evt, i) in day.events.slice(0, 3)"
                  :key="i"
                  class="day-dot"
                  :style="{ background: getCategoryColor(evt.category) }"
                />
              </div>
            </button>
          </div>
        </Transition>
      </div>

      <StateIndicator v-if="error" variant="error" :description="error" @action="fetchEvents" />

      <!-- 日程详情弹窗 -->
      <Dialog
        :is-open="!!detailEvent"
        :title="detailEvent?.title ?? ''"
        size="default"
        @close="detailEvent = null"
      >
        <div v-if="detailLoading" class="detail-loading">
          <div class="detail-skeleton" />
          <div class="detail-skeleton detail-skeleton--short" />
          <div class="detail-skeleton detail-skeleton--long" />
        </div>
        <div v-else-if="detailEvent" class="event-detail">
          <!-- 分类 & 时间 -->
          <div class="detail-meta">
            <span
              class="event-badge"
              :style="{
                background: getCategoryColor(detailEvent.category) + '20',
                color: getCategoryColor(detailEvent.category),
              }"
            >
              {{ $t(`schedule.categories.${detailEvent.category}`) }}
            </span>
            <span v-if="detailEvent.is_published === false" class="draft-badge">
              {{ $t('schedule.detail.draft') }}
            </span>
          </div>

          <!-- 时间信息 -->
          <div class="detail-row">
            <Clock :size="16" class="detail-icon" />
            <div class="detail-row-content">
              <template v-if="detailEvent.is_all_day">
                <span>{{ formatDetailDate(detailEvent.start_date) }}</span>
                <template
                  v-if="detailEvent.end_date && detailEvent.end_date !== detailEvent.start_date"
                >
                  <span class="detail-separator">—</span>
                  <span>{{ formatDetailDate(detailEvent.end_date) }}</span>
                </template>
                <span class="detail-allday-tag">{{ $t('schedule.allDay') }}</span>
              </template>
              <template v-else>
                <span>{{ formatDetailTime(detailEvent.start_date) }}</span>
                <template v-if="detailEvent.end_date">
                  <span class="detail-separator">—</span>
                  <span v-if="isSameDay(detailEvent.start_date, detailEvent.end_date)">
                    {{ formatTimeOnly(detailEvent.end_date) }}
                  </span>
                  <span v-else>{{ formatDetailTime(detailEvent.end_date) }}</span>
                </template>
              </template>
            </div>
          </div>

          <!-- 地点 -->
          <div v-if="detailEvent.venue" class="detail-row">
            <MapPin :size="16" class="detail-icon" />
            <div class="detail-row-content">
              <span class="detail-venue-name">{{ detailEvent.venue }}</span>
              <span v-if="detailEvent.venue_address" class="detail-venue-addr">
                {{ detailEvent.venue_address }}
              </span>
            </div>
          </div>

          <!-- 描述 -->
          <div v-if="detailEvent.description" class="detail-description">
            <template v-if="parsedDescription.length > 0">
              <div v-for="(section, idx) in parsedDescription" :key="idx" class="desc-section">
                <h4 v-if="section.heading" class="desc-heading">{{ section.heading }}</h4>
                <p
                  v-for="(line, li) in section.lines"
                  :key="li"
                  class="desc-line"
                  v-html="linkify(line)"
                />
              </div>
            </template>
          </div>

          <!-- 链接区域 -->
          <div v-if="hasDetailLinks" class="detail-links">
            <a
              v-if="detailEvent.event_url"
              :href="detailEvent.event_url"
              target="_blank"
              rel="noopener noreferrer"
              class="detail-link-btn glass-button"
            >
              <ExternalLink :size="14" />
              <span>{{ $t('schedule.detail.eventPage') }}</span>
            </a>
            <a
              v-if="detailEvent.ticket_url"
              :href="detailEvent.ticket_url"
              target="_blank"
              rel="noopener noreferrer"
              class="detail-link-btn detail-link-btn--ticket glass-button"
            >
              <Ticket :size="14" />
              <span>{{ $t('schedule.detail.buyTicket') }}</span>
            </a>
            <a
              v-if="detailEvent.source_url"
              :href="detailEvent.source_url"
              target="_blank"
              rel="noopener noreferrer"
              class="detail-link-btn glass-button"
            >
              <ExternalLink :size="14" />
              <span>{{ $t('schedule.detail.source') }}</span>
            </a>
          </div>
        </div>
      </Dialog>

      <!-- 选中日期的事件列表 -->
      <Transition name="slide-fade">
        <section v-if="selectedDay" class="day-events">
          <div class="day-events-header">
            <h2>{{ selectedDayLabel }}</h2>
            <span v-if="selectedDayEvents.length" class="event-count">
              {{ selectedDayEvents.length }}
            </span>
            <button
              class="close-btn glass-button"
              :aria-label="$t('common.close')"
              @click="selectedDay = null"
            >
              <X :size="16" />
            </button>
          </div>

          <StateIndicator
            v-if="selectedDayEvents.length === 0"
            variant="empty"
            :description="$t('schedule.noEvents')"
          />

          <div v-else class="events-list">
            <article
              v-for="evt in selectedDayEvents"
              :key="evt.id"
              class="event-card glass-card"
              role="button"
              tabindex="0"
              @click="openDetail(evt.id)"
              @keydown.enter="openDetail(evt.id)"
            >
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
                <div class="event-card-hint">
                  <ChevronRight :size="14" />
                </div>
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
          <article
            v-for="evt in upcomingEvents"
            :key="evt.id"
            class="event-card glass-card"
            role="button"
            tabindex="0"
            @click="openDetail(evt.id)"
            @keydown.enter="openDetail(evt.id)"
          >
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
              <div class="event-card-hint">
                <ChevronRight :size="14" />
              </div>
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
  CalendarCheck,
  Clock,
  Ticket,
} from 'lucide-vue-next'
import { scheduleService, type ScheduleCalendarItem } from '@/api/scheduleService'
import type { ScheduleCategory, ScheduleResponse } from '@/api/scheduleService'
import { useScheduleStore } from '@/stores/schedule'
import { ApiError } from '@/api'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Dialog from '@/components/ui/Dialog.vue'

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
const calendarRef = ref<HTMLElement | null>(null)
const monthTransition = ref<'month-slide-left' | 'month-slide-right'>('month-slide-left')

// 详情弹窗
const detailEvent = ref<ScheduleResponse | null>(null)
const detailLoading = ref(false)

// 触摸手势
let touchStartX = 0
let touchStartY = 0

// ========== 分类配置 ==========
const CATEGORY_COLORS: Record<string, string> = {
  live: '#ef4444',
  event: '#10b981',
  release: '#06b6d4',
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

const monthKey = computed(() => `${currentYear.value}-${currentMonth.value}`)

const isCurrentMonth = computed(() => {
  const now = new Date()
  return currentYear.value === now.getFullYear() && currentMonth.value === now.getMonth()
})

const filteredEvents = computed(() => {
  if (activeCategory.value === 'all') return events.value
  return events.value.filter((e) => e.category === activeCategory.value)
})

/** 预构建 date→events 映射，避免 O(n*m) 遍历 */
const eventsByDate = computed(() => {
  const map = new Map<string, ScheduleCalendarItem[]>()
  for (const evt of filteredEvents.value) {
    const dateStr = evt.start.slice(0, 10)
    const arr = map.get(dateStr)
    if (arr) {
      arr.push(evt)
    } else {
      map.set(dateStr, [evt])
    }
  }
  return map
})

function getEventsForDate(date: Date): ScheduleCalendarItem[] {
  const dateStr = date.toISOString().slice(0, 10)
  return eventsByDate.value.get(dateStr) ?? []
}

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

// ========== 无障碍 ==========
function getDayAriaLabel(day: CalendarDay): string {
  const dateLabel = day.fullDate.toLocaleDateString(
    locale.value === 'zh-CN' ? 'zh-CN' : locale.value,
    { month: 'long', day: 'numeric' }
  )
  if (day.events.length > 0) {
    return `${dateLabel}, ${day.events.length} ${t('schedule.eventsCount')}`
  }
  return dateLabel
}

function handleCalendarKeydown(e: KeyboardEvent) {
  const grid = calendarRef.value
  if (!grid) return

  const cells = Array.from(
    grid.querySelectorAll<HTMLButtonElement>('.calendar-cell:not(.calendar-cell--skeleton)')
  )
  const focused = document.activeElement as HTMLElement
  const idx = cells.indexOf(focused as HTMLButtonElement)
  if (idx === -1) return

  let next = -1
  switch (e.key) {
    case 'ArrowRight':
      next = Math.min(idx + 1, cells.length - 1)
      break
    case 'ArrowLeft':
      next = Math.max(idx - 1, 0)
      break
    case 'ArrowDown':
      next = Math.min(idx + 7, cells.length - 1)
      break
    case 'ArrowUp':
      next = Math.max(idx - 7, 0)
      break
    default:
      return
  }

  e.preventDefault()
  cells[next]?.focus()
}

// ========== 触摸手势 ==========
function onTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  touchStartX = touch.clientX
  touchStartY = touch.clientY
}

function onTouchEnd(e: TouchEvent) {
  const touch = e.changedTouches[0]
  if (!touch) return
  const dx = touch.clientX - touchStartX
  const dy = touch.clientY - touchStartY

  // 水平滑动距离 > 60px 且大于垂直距离
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    if (dx < 0) {
      nextMonth()
    } else {
      prevMonth()
    }
  }
}

// ========== 操作 ==========
function prevMonth() {
  monthTransition.value = 'month-slide-right'
  selectedDay.value = null
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  monthTransition.value = 'month-slide-left'
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
  if (now.getMonth() < currentMonth.value || now.getFullYear() < currentYear.value) {
    monthTransition.value = 'month-slide-right'
  } else {
    monthTransition.value = 'month-slide-left'
  }
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

// ========== 详情弹窗 ==========
const hasDetailLinks = computed(() => {
  if (!detailEvent.value) return false
  return detailEvent.value.event_url || detailEvent.value.ticket_url || detailEvent.value.source_url
})

async function openDetail(eventId: string) {
  detailLoading.value = true
  detailEvent.value = { id: eventId } as ScheduleResponse // placeholder to open dialog
  try {
    detailEvent.value = await scheduleService.getById(eventId)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      // API not deployed yet — build detail from calendar item
      const calItem = events.value.find((e) => e.id === eventId)
      if (calItem) {
        detailEvent.value = calendarItemToResponse(calItem)
      } else {
        detailEvent.value = null
      }
    } else {
      detailEvent.value = null
    }
  } finally {
    detailLoading.value = false
  }
}

function calendarItemToResponse(item: ScheduleCalendarItem): ScheduleResponse {
  return {
    id: item.id,
    uuid: '',
    title: item.title,
    description: item.description ?? null,
    category: item.category,
    start_date: item.start,
    end_date: item.end ?? null,
    is_all_day: item.allDay,
    venue: item.venue ?? null,
    venue_address: null,
    event_url: item.url ?? null,
    ticket_url: null,
    source_url: null,
    source_platform: null,
    color: item.color ?? null,
    is_published: true,
    created_at: '',
  }
}

function formatDetailTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString(locale.value, {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDetailDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(locale.value, {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

function formatTimeOnly(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
}

function isSameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10)
}

// ========== 描述解析 ==========
interface DescSection {
  heading: string | null
  lines: string[]
}

const parsedDescription = computed<DescSection[]>(() => {
  const desc = detailEvent.value?.description
  if (!desc) return []

  // 按 ▼ 分段
  const parts = desc.split(/▼/)
  const sections: DescSection[] = []

  for (let i = 0; i < parts.length; i++) {
    const raw = normalizeHtml(parts[i] ?? '').trim()
    if (!raw) continue

    if (i === 0) {
      // ▼ 之前的开头文本，无标题
      sections.push({ heading: null, lines: raw.split(/\n/) })
    } else {
      // 第一行是标题，其余是内容
      const lines = raw.split(/\n/)
      const heading = (lines[0] ?? '').trim()
      const body = lines.slice(1).join('\n').trim()
      sections.push({
        heading: heading || null,
        lines: body ? body.split(/\n/) : [],
      })
    }
  }

  return sections
})

function normalizeHtml(text: string): string {
  return text.replace(/<\/?br\s*\/?>/gi, '\n').replace(/&nbsp;/gi, ' ')
}

function linkify(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.replace(
    /(https?:\/\/[^\s<&]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="desc-link">$1</a>'
  )
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
  position: relative;
  min-height: 100dvh;
  padding: var(--spacing-6) 0;
}

/* ========== 背景装饰 ========== */
.schedule-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: -2;
  overflow: hidden;
}

.schedule-bg__blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.3;
}

.schedule-bg__blob--blue {
  width: 26.25rem;
  height: 26.25rem;
  top: 8%;
  right: -6%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%);
}

.schedule-bg__blob--amber {
  width: 23.75rem;
  height: 23.75rem;
  bottom: 12%;
  left: -5%;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, transparent 70%);
}

[data-theme='dark'] .schedule-bg__blob {
  opacity: 0.15;
}

/* ========== Header ========== */
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
  padding: 0.25rem 0.75rem;
  font-size: var(--text-xs);
  border-radius: var(--radius-full);
  transition: all 0.2s ease;
}

.filter-chip--active {
  background: rgba(var(--color-primary-rgb), 0.15);
  color: var(--color-primary);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

/* ========== 月份导航 ========== */
.month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
  flex-wrap: wrap;
}

.month-nav-btn {
  width: 2.25rem;
  height: 2.25rem;
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

.today-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: 0.25rem 0.75rem;
  font-size: var(--text-xs);
  border-radius: var(--radius-full);
  color: var(--color-primary);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

/* ========== 日历 ========== */
.calendar-wrapper {
  padding: var(--spacing-4);
  margin-bottom: var(--spacing-6);
  overflow: hidden;
  touch-action: pan-y;
  max-width: 56rem;
  margin-inline: auto;
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
  gap: 0.125rem;
}

.calendar-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 48px;
  padding: var(--spacing-2) 0;
  background: none;
  border: 2px solid transparent;
  color: inherit;
  font: inherit;
}

.calendar-cell:hover {
  background: var(--glass-bg-subtle);
}

.calendar-cell:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.calendar-cell--other {
  opacity: 0.35;
}

.calendar-cell--today .day-number {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: var(--radius-full);
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-bold);
}

.calendar-cell--selected {
  background: rgba(var(--color-primary-rgb), 0.1);
  border-color: var(--color-primary);
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
  gap: 0.1875rem;
}

.day-dot {
  width: 0.3125rem;
  height: 0.3125rem;
  border-radius: 50%;
}

.calendar-cell--skeleton {
  pointer-events: none;
}

.skeleton-day {
  width: 1.5rem;
  height: 1rem;
  border-radius: 4px;
  background: var(--glass-bg-light);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

/* ========== 月份切换动画 ========== */
.month-slide-left-enter-active,
.month-slide-left-leave-active,
.month-slide-right-enter-active,
.month-slide-right-leave-active {
  transition: all 0.2s ease;
}

.month-slide-left-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.month-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.month-slide-right-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.month-slide-right-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* ========== Today 按钮过渡 ========== */
.today-fade-enter-active,
.today-fade-leave-active {
  transition: all 0.2s ease;
}

.today-fade-enter-from,
.today-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* ========== 事件列表 ========== */
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
  padding: 0.125rem 0.625rem;
  background: var(--glass-bg-light);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.close-btn {
  margin-left: auto;
  width: 2rem;
  height: 2rem;
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
  width: 0.25rem;
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
  padding: 0.125rem 0.5rem;
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

/* ========== 即将到来 ========== */
.upcoming-section {
  margin-bottom: var(--spacing-8);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-4);
}

/* ========== 过渡动画 ========== */
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

/* ========== 响应式 ========== */
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
    width: 1.5rem;
    height: 1.5rem;
  }

  .day-dot {
    width: 0.25rem;
    height: 0.25rem;
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

/* ========== 可点击事件卡片 ========== */
.event-card[role='button'] {
  cursor: pointer;
}

.event-card-hint {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: var(--color-text-tertiary);
  opacity: 0;
  transition: opacity 0.15s ease;
  margin-top: var(--spacing-1);
}

.event-card:hover .event-card-hint,
.event-card:focus-visible .event-card-hint {
  opacity: 1;
}

/* ========== 详情弹窗 ========== */
.detail-loading {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  padding: var(--spacing-2) 0;
}

.detail-skeleton {
  height: 1rem;
  border-radius: 4px;
  background: var(--glass-bg-light);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  width: 80%;
}

.detail-skeleton--short {
  width: 50%;
}

.detail-skeleton--long {
  width: 100%;
  height: 3rem;
}

.event-detail {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.draft-badge {
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
}

.detail-icon {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.detail-row-content {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--spacing-1);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.detail-separator {
  color: var(--color-text-tertiary);
  margin: 0 var(--spacing-1);
}

.detail-allday-tag {
  padding: 0.0625rem 0.375rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  background: var(--glass-bg-light);
  color: var(--color-text-tertiary);
  margin-left: var(--spacing-2);
}

.detail-venue-name {
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}

.detail-venue-addr {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-top: 0.125rem;
}

.detail-description {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  padding: var(--spacing-3);
  background: var(--glass-bg-subtle);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  overflow-wrap: break-word;
}

.detail-description p {
  margin: 0;
}

.desc-section + .desc-section {
  padding-top: var(--spacing-3);
  border-top: 1px solid var(--glass-border);
}

.desc-heading {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-1);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.desc-line {
  margin: 0;
  word-break: break-word;
  white-space: pre-wrap;
}

.desc-link {
  color: var(--color-primary);
  text-decoration: none;
  word-break: break-all;
}

.desc-link:hover {
  text-decoration: underline;
}

.detail-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  padding-top: var(--spacing-2);
  border-top: 1px solid var(--glass-border);
}

.detail-link-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border-radius: var(--radius-full);
  text-decoration: none;
  color: var(--color-primary);
  transition: all 0.2s ease;
}

.detail-link-btn:hover {
  background: rgba(var(--color-primary-rgb), 0.1);
}

.detail-link-btn--ticket {
  color: #f59e0b;
}

.detail-link-btn--ticket:hover {
  background: rgba(245, 158, 11, 0.1);
}

/* ========== Reduced Motion ========== */
@media (prefers-reduced-motion: reduce) {
  .month-slide-left-enter-active,
  .month-slide-left-leave-active,
  .month-slide-right-enter-active,
  .month-slide-right-leave-active,
  .today-fade-enter-active,
  .today-fade-leave-active,
  .slide-fade-enter-active,
  .slide-fade-leave-active {
    transition: none;
  }

  .skeleton-day {
    animation: none;
  }
}
</style>
