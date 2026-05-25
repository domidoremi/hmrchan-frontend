<template>
  <div class="schedule-page">
    <div class="schedule-bg" aria-hidden="true" />

    <div class="container">
      <PageHeroShell class="schedule-hero" bare>
        <template #heading>
          <div class="schedule-hero__copy">
            <h1 class="page-hero-shell__title">{{ $t('schedule.title') }}</h1>
            <p class="page-hero-shell__subtitle">{{ $t('schedule.subtitle') }}</p>
          </div>
        </template>

        <template #actions>
          <div class="schedule-hero__actions page-actions page-actions--comfortable">
            <ControlGroup
              class="planner-view-switch page-control-group-shell--comfortable"
              :aria-label="$t('schedule.plannerTitle')"
            >
              <ControlButton
                v-for="view in plannerViews"
                :key="view.value"
                size="compact"
                :pressed="plannerView === view.value"
                @click="setPlannerView(view.value)"
              >
                {{ $t(view.label) }}
              </ControlButton>
            </ControlGroup>
            <ControlGroup
              class="category-filters page-control-group-shell--comfortable"
              role="group"
              :aria-label="$t('schedule.filterLabel')"
            >
              <ControlButton
                v-for="cat in categories"
                :key="cat.value"
                class="schedule-filter-pill"
                size="compact"
                :pressed="activeCategory === cat.value"
                @click="setCategory(cat.value)"
              >
                <template #start>
                  <component :is="cat.icon" :size="14" />
                </template>
                <span>{{ $t(cat.label) }}</span>
              </ControlButton>
            </ControlGroup>
          </div>
        </template>

        <template #meta>
          <PageMetaRow class="schedule-hero__meta page-meta-row--comfortable">
            <PageMetaChip>
              <strong>{{ monthLabel }}</strong>
              {{ $t('schedule.goToday') }}
            </PageMetaChip>
            <PageMetaChip>
              <strong>{{ upcomingEvents.length }}</strong>
              {{ $t('schedule.upcoming') }}
            </PageMetaChip>
            <PageMetaChip>
              <strong>{{ activeCategoryLabel }}</strong>
              {{ $t('schedule.filterLabel') }}
            </PageMetaChip>
          </PageMetaRow>
        </template>
      </PageHeroShell>

      <!-- 月份导航 -->
      <PageToolbar class="month-nav page-toolbar-shell--comfortable">
        <ControlButton
          class="month-nav-btn"
          size="square"
          icon-only
          :aria-label="$t('schedule.prevMonth')"
          @click="prevMonth"
        >
          <template #start>
            <ChevronLeft :size="18" />
          </template>
        </ControlButton>
        <ControlButton
          class="month-nav-title"
          :aria-label="`${plannerPeriodLabel} ${$t('schedule.goToday')}`"
          :title="$t('schedule.goToday')"
          @click="goToday"
        >
          {{ plannerPeriodLabel }}
        </ControlButton>
        <ControlButton
          class="month-nav-btn"
          size="square"
          icon-only
          :aria-label="$t('schedule.nextMonth')"
          @click="nextMonth"
        >
          <template #start>
            <ChevronRight :size="18" />
          </template>
        </ControlButton>
        <Transition name="today-fade">
          <ControlButton v-if="!isCurrentMonth" class="today-btn" size="compact" @click="goToday">
            <template #start>
              <CalendarCheck :size="14" />
            </template>
            <span>{{ $t('schedule.today') }}</span>
          </ControlButton>
        </Transition>
        <label class="schedule-date-jump">
          <span class="sr-only">{{ $t('schedule.dateJumpLabel') }}</span>
          <input
            :value="dateJumpValue"
            type="date"
            class="schedule-date-jump__input"
            :aria-label="$t('schedule.dateJumpLabel')"
            @input="handleDateJumpInput"
          />
        </label>
      </PageToolbar>

      <section class="schedule-overview">
        <section class="agenda-shell schedule-panel content-auto-lg">
          <div class="agenda-shell__head page-section-head page-section-head--stage">
            <div class="page-section-copy">
              <p class="page-section-kicker">{{ monthLabel }}</p>
              <h2 class="page-section-title">{{ $t('schedule.upcoming') }}</h2>
              <p class="page-section-subtitle">{{ agendaSummaryLabel }}</p>
            </div>

            <div class="agenda-shell__actions">
              <ControlButton
                class="agenda-shell__action"
                size="compact"
                @click="jumpToAgendaDate('today')"
              >
                <template #start>
                  <CalendarCheck :size="14" />
                </template>
                <span>{{ $t('schedule.today') }}</span>
              </ControlButton>
              <ControlButton
                v-if="nextAgendaDateLabel"
                class="agenda-shell__action"
                size="compact"
                @click="jumpToAgendaDate('next')"
              >
                <template #start>
                  <ChevronRight :size="14" />
                </template>
                <span>{{ nextAgendaDateLabel }}</span>
              </ControlButton>
            </div>
          </div>

          <div class="agenda-strip">
            <article class="agenda-spotlight agenda-spotlight--primary">
              <span class="agenda-spotlight__label">{{ $t('schedule.today') }}</span>
              <strong class="agenda-spotlight__value">{{ todayAgendaTitle }}</strong>
              <span class="agenda-spotlight__meta">{{ todayAgendaMeta }}</span>
            </article>
            <article class="agenda-spotlight">
              <span class="agenda-spotlight__label">{{ $t('schedule.insights.next') }}</span>
              <strong class="agenda-spotlight__value">{{ nextAgendaTitle }}</strong>
              <span class="agenda-spotlight__meta">{{ nextAgendaMeta }}</span>
            </article>
            <article class="agenda-spotlight">
              <span class="agenda-spotlight__label">{{ $t('schedule.filterLabel') }}</span>
              <strong class="agenda-spotlight__value">{{ activeCategoryLabel }}</strong>
              <span class="agenda-spotlight__meta"
                >{{ upcomingEvents.length }} {{ $t('schedule.eventsCount') }}</span
              >
            </article>
          </div>

          <StateIndicator
            v-if="upcomingEvents.length === 0 && !isLoading"
            variant="empty"
            :description="$t('schedule.noUpcoming')"
          />

          <div v-else class="events-list agenda-events-list">
            <article
              v-for="evt in upcomingEvents"
              :key="evt.id"
              class="event-card page-list-card"
              role="button"
              tabindex="0"
              @click="openDetail(evt.id)"
              @keydown.enter.prevent="openDetail(evt.id)"
              @keydown.space.prevent="openDetail(evt.id)"
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
                      background: getCategoryColor(evt.category) + '16',
                      color: getCategoryColor(evt.category),
                    }"
                  >
                    {{ $t(`schedule.categories.${evt.category}`) }}
                  </span>
                  <span class="event-time">
                    {{ formatEventDateTime(evt.start, evt.allDay) }}
                  </span>
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

        <section class="planner-shell schedule-panel schedule-panel--planner">
          <div class="planner-shell__head">
            <div class="planner-shell__copy">
              <p class="planner-shell__eyebrow">{{ $t('schedule.plannerTitle') }}</p>
              <p class="planner-shell__summary">{{ plannerSummaryLabel }}</p>
            </div>
            <span class="paper-chip">{{ activeCategoryLabel }}</span>
          </div>

          <div v-if="plannerView === 'week'" class="planner-week-grid">
            <button
              v-for="day in weekDays"
              :key="day.key"
              type="button"
              class="planner-week-day"
              :class="{
                'is-selected': selectedDay?.key === day.key,
                'is-today': day.isToday,
                'has-events': day.events.length > 0,
              }"
              @click="selectPlannerDay(day)"
            >
              <span class="planner-week-day__label">
                {{ formatWeekdayLabel(day.fullDate) }}
              </span>
              <strong class="planner-week-day__date">{{ day.date }}</strong>
              <span class="planner-week-day__count">
                {{ day.events.length }} {{ $t('schedule.eventsCount') }}
              </span>
              <span v-if="day.events[0]" class="planner-week-day__event">
                {{ day.events[0].title }}
              </span>
              <span v-if="day.events.length > 1" class="planner-week-day__overflow">
                +{{ day.events.length - 1 }}
              </span>
            </button>
          </div>

          <div v-else-if="plannerView === 'day'" class="planner-day-focus paper-rule">
            <strong class="planner-day-focus__title">{{
              selectedDayLabel || plannerPeriodLabel
            }}</strong>
            <p class="planner-day-focus__summary">
              {{
                selectedDayEvents.length > 0
                  ? `${selectedDayEvents.length} ${$t('schedule.eventsCount')}`
                  : $t('schedule.noEvents')
              }}
            </p>
          </div>

          <div class="planner-insights">
            <article class="planner-insight">
              <span class="planner-insight__label">{{ $t('schedule.insights.focus') }}</span>
              <strong class="planner-insight__value">
                {{ highlightedEvent?.title || $t('schedule.insights.empty') }}
              </strong>
            </article>
            <article class="planner-insight">
              <span class="planner-insight__label">{{ $t('schedule.insights.next') }}</span>
              <strong class="planner-insight__value">
                {{ nextHighlightLabel }}
              </strong>
            </article>
            <article class="planner-insight">
              <span class="planner-insight__label">{{ $t('schedule.insights.distribution') }}</span>
              <div class="planner-insight__chips">
                <span
                  v-for="item in categoryBreakdown"
                  :key="item.category"
                  class="paper-chip"
                  :style="{ '--paper-chip-accent': getCategoryColor(item.category) }"
                >
                  {{ $t(`schedule.categories.${item.category}`) }} · {{ item.count }}
                </span>
              </div>
            </article>
          </div>
        </section>
      </section>

      <!-- 日历网格 -->
      <StateIndicator
        v-if="error && !isUsingFallback"
        variant="error"
        :description="error"
        @action="fetchEvents"
      />

      <div class="schedule-workspace" :class="{ 'schedule-workspace--detail': detailPanelVisible }">
        <div class="schedule-workspace__main">
          <div
            v-if="plannerView === 'month'"
            ref="calendarRef"
            class="calendar-wrapper schedule-panel"
            :aria-label="$t('schedule.calendarLabel')"
            @keydown="handleCalendarKeydown"
            @touchstart.passive="onTouchStart"
            @touchend.passive="onTouchEnd"
          >
            <div class="calendar-weekdays">
              <div v-for="d in weekdays" :key="d" class="weekday-cell">
                {{ d }}
              </div>
            </div>

            <Transition :name="monthTransition" mode="out-in">
              <div v-if="isLoading && events.length === 0" key="skeleton" class="calendar-grid">
                <div v-for="i in 42" :key="i" class="calendar-cell calendar-cell--skeleton">
                  <div class="skeleton-day" />
                </div>
              </div>

              <div v-else :key="monthKey" class="calendar-grid">
                <button
                  v-for="(day, idx) in calendarDays"
                  :key="day.key"
                  type="button"
                  class="calendar-cell"
                  :class="{
                    'calendar-cell--other': !day.currentMonth,
                    'calendar-cell--today': day.isToday,
                    'calendar-cell--has-events': day.events.length > 0,
                    'calendar-cell--selected': selectedDay?.key === day.key,
                  }"
                  :tabindex="day.isToday || (idx === 0 && !selectedDay) ? 0 : -1"
                  :aria-label="getDayAriaLabel(day)"
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

          <Transition name="slide-fade">
            <section
              v-if="selectedDay && plannerView !== 'month'"
              class="day-events schedule-panel content-auto-lg"
            >
              <div class="page-section-head page-section-head--stage day-events-header">
                <div class="page-section-copy">
                  <p class="page-section-kicker">{{ $t('schedule.title') }}</p>
                  <h2 class="page-section-title">{{ selectedDayLabel }}</h2>
                  <p class="page-section-subtitle">
                    {{
                      selectedDayEvents.length > 0
                        ? $t('schedule.upcoming')
                        : $t('schedule.noEvents')
                    }}
                  </p>
                </div>
                <span v-if="selectedDayEvents.length" class="event-count">
                  {{ selectedDayEvents.length }}
                </span>
                <ControlButton
                  class="close-btn"
                  size="square"
                  icon-only
                  :aria-label="$t('common.close')"
                  @click="selectedDay = null"
                >
                  <template #start>
                    <X :size="16" />
                  </template>
                </ControlButton>
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
                  class="event-card page-list-card"
                  role="button"
                  tabindex="0"
                  @click="openDetail(evt.id)"
                  @keydown.enter.prevent="openDetail(evt.id)"
                  @keydown.space.prevent="openDetail(evt.id)"
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
                          background: getCategoryColor(evt.category) + '16',
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
        </div>

        <aside
          v-if="detailPanelVisible"
          ref="detailPanelRef"
          class="schedule-detail-shell schedule-panel content-auto-xl"
        >
          <div v-if="detailLoading" class="detail-loading">
            <div class="detail-skeleton" />
            <div class="detail-skeleton detail-skeleton--short" />
            <div class="detail-skeleton detail-skeleton--long" />
          </div>

          <article v-else-if="detailEvent" class="schedule-detail-article">
            <header class="schedule-detail-article__header">
              <div class="schedule-detail-article__topline">
                <span class="schedule-detail-article__eyebrow">
                  {{ $t('schedule.detail.panelEyebrow') }}
                </span>
                <ControlButton
                  class="schedule-detail-shell__close"
                  size="square"
                  icon-only
                  :aria-label="$t('common.close')"
                  @click="closeDetail"
                >
                  <template #start>
                    <X :size="16" />
                  </template>
                </ControlButton>
              </div>

              <div class="detail-meta">
                <span
                  class="event-badge"
                  :style="{
                    background: getCategoryColor(detailEvent.category) + '16',
                    color: getCategoryColor(detailEvent.category),
                  }"
                >
                  {{ $t(`schedule.categories.${detailEvent.category}`) }}
                </span>
                <span v-if="detailEvent.is_published === false" class="draft-badge">
                  {{ $t('schedule.detail.draft') }}
                </span>
              </div>

              <h2 class="schedule-detail-article__title">{{ detailEvent.title }}</h2>
              <p v-if="detailLead" class="schedule-detail-article__lead">{{ detailLead }}</p>
            </header>

            <div class="schedule-detail-actions">
              <ControlButton class="schedule-detail-action" size="compact" @click="copyDetailLink">
                <template #start>
                  <Copy :size="14" />
                </template>
                <span>{{ $t('schedule.detail.copyLinkAction') }}</span>
              </ControlButton>

              <ControlButton
                v-if="canShareDetail"
                class="schedule-detail-action"
                size="compact"
                @click="shareDetail"
              >
                <template #start>
                  <Share2 :size="14" />
                </template>
                <span>{{ $t('schedule.detail.shareAction') }}</span>
              </ControlButton>
            </div>

            <div class="schedule-detail-facts">
              <article class="schedule-detail-fact">
                <span class="schedule-detail-fact__label">
                  {{ $t('schedule.detail.whenLabel') }}
                </span>
                <div class="detail-row">
                  <Clock :size="16" class="detail-icon" />
                  <div class="detail-row-content">
                    <template v-if="detailEvent.is_all_day">
                      <span>{{ formatDetailDate(detailEvent.start_date) }}</span>
                      <template
                        v-if="
                          detailEvent.end_date && detailEvent.end_date !== detailEvent.start_date
                        "
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
              </article>

              <article v-if="detailEvent.venue" class="schedule-detail-fact">
                <span class="schedule-detail-fact__label">
                  {{ $t('schedule.detail.whereLabel') }}
                </span>
                <div class="detail-row">
                  <MapPin :size="16" class="detail-icon" />
                  <div class="detail-row-content detail-row-content--stack">
                    <span class="detail-venue-name">{{ detailEvent.venue }}</span>
                    <span v-if="detailEvent.venue_address" class="detail-venue-addr">
                      {{ detailEvent.venue_address }}
                    </span>
                  </div>
                </div>
              </article>

              <article v-if="detailHostLabel" class="schedule-detail-fact">
                <span class="schedule-detail-fact__label">
                  {{ $t('schedule.detail.hostLabel') }}
                </span>
                <div class="schedule-detail-fact__copy">
                  {{ detailHostLabel }}
                </div>
              </article>
            </div>

            <section class="schedule-detail-section">
              <h3 class="schedule-detail-section__title">
                {{ $t('schedule.detail.aboutTitle') }}
              </h3>

              <div v-if="detailEvent.description" class="detail-description">
                <template v-if="parsedDescription.length > 0">
                  <div v-for="(section, idx) in parsedDescription" :key="idx" class="desc-section">
                    <h4 v-if="section.heading" class="desc-heading">{{ section.heading }}</h4>
                    <SafeHtml
                      v-for="(line, li) in section.lines"
                      :key="li"
                      as="p"
                      class="desc-line"
                      :html="linkify(line)"
                    />
                  </div>
                </template>
              </div>

              <p v-else class="schedule-detail-empty">
                {{ $t('schedule.detail.descriptionFallback') }}
              </p>
            </section>

            <section v-if="hasDetailLinks" class="schedule-detail-section">
              <h3 class="schedule-detail-section__title">
                {{ $t('schedule.detail.linksTitle') }}
              </h3>

              <div class="detail-links page-control-group-shell--comfortable">
                <ControlButton
                  v-if="detailEvent.event_url"
                  :tag="'a'"
                  :href="detailEvent.event_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="detail-link-btn"
                  size="compact"
                >
                  <template #start>
                    <ExternalLink :size="14" />
                  </template>
                  <span>{{ $t('schedule.detail.eventPage') }}</span>
                </ControlButton>
                <ControlButton
                  v-if="detailEvent.ticket_url"
                  :tag="'a'"
                  :href="detailEvent.ticket_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="detail-link-btn detail-link-btn--ticket"
                  size="compact"
                >
                  <template #start>
                    <Ticket :size="14" />
                  </template>
                  <span>{{ $t('schedule.detail.buyTicket') }}</span>
                </ControlButton>
                <ControlButton
                  v-if="detailEvent.source_url"
                  :tag="'a'"
                  :href="detailEvent.source_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="detail-link-btn"
                  size="compact"
                >
                  <template #start>
                    <Link2 :size="14" />
                  </template>
                  <span>{{ $t('schedule.detail.source') }}</span>
                </ControlButton>
              </div>
            </section>
          </article>

          <StateIndicator
            v-else-if="detailStatus === 'not-found'"
            class="schedule-detail-state"
            variant="not-found"
            :title="$t('common.notFound')"
            :description="$t('schedule.detail.notFoundDescription')"
            show-action
            @action="retryDetail"
          />
          <StateIndicator
            v-else-if="detailStatus === 'error'"
            class="schedule-detail-state"
            variant="error"
            :description="detailError || $t('common.error')"
            @action="retryDetail"
          />
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'SchedulePage' })

import { ref, computed, nextTick, onMounted, watch, onWatcherCleanup, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Link2,
  MapPin,
  ExternalLink,
  Share2,
  X,
  Calendar,
  Radio,
  Film,
  Cake,
  LayoutGrid,
  CalendarCheck,
  Clock,
  Ticket,
} from '@lucide/vue'
import { scheduleService, type ScheduleCalendarItem } from '@/api/scheduleService'
import type { ScheduleCategory, ScheduleResponse } from '@/api/scheduleService'
import type { PlannerView } from '@/types'
import { useScheduleStore } from '@/stores/schedule'
import { useToastStore } from '@/stores'
import { ApiError } from '@/api'
import { getFallbackScheduleById, getFallbackScheduleCalendar } from '@/fallbacks/scheduleFallback'
import { getPublicSnapshot, setPublicSnapshot } from '@/utils/cache'
import { applyPageMeta } from '@/utils/pageMeta'
import {
  isServiceUnavailableError,
  type PublicPageDataSource,
} from '@/fallbacks/publicPageFallback'
import ControlButton from '@/components/appearance/ControlButton.vue'
import ControlGroup from '@/components/appearance/ControlGroup.vue'
import PageHeroShell from '@/components/appearance/PageHeroShell.vue'
import PageMetaChip from '@/components/appearance/PageMetaChip.vue'
import PageMetaRow from '@/components/appearance/PageMetaRow.vue'
import PageToolbar from '@/components/appearance/PageToolbar.vue'
import SafeHtml from '@/components/ui/SafeHtml.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const scheduleStore = useScheduleStore()
const toastStore = useToastStore()

// ========== 状态 ==========
const events = ref<ScheduleCalendarItem[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const eventsSource = ref<PublicPageDataSource>('live')
const isUsingFallback = computed(() => eventsSource.value === 'fallback')
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth())
const activeCategory = ref<ScheduleCategory | 'all'>('all')
const selectedDay = ref<CalendarDay | null>(null)
const plannerView = ref<PlannerView>('week')
const calendarRef = useTemplateRef<HTMLElement>('calendarRef')
const detailPanelRef = useTemplateRef<HTMLElement>('detailPanelRef')
const monthTransition = ref<'month-slide-left' | 'month-slide-right'>('month-slide-left')

// 详情弹窗
const detailEvent = ref<ScheduleResponse | null>(null)
const detailLoading = ref(false)
const detailStatus = ref<'idle' | 'ready' | 'not-found' | 'error'>('idle')
const detailError = ref<string | null>(null)
let latestFetchId = 0
const routeScheduleId = computed(() => {
  if (route.name !== 'schedule-detail') return null
  const value = route.params['id']
  return typeof value === 'string' && value.trim().length > 0 ? value : null
})

const SCHEDULE_CALENDAR_SNAPSHOT_SCOPE = 'schedule/calendar'
const SCHEDULE_DETAIL_SNAPSHOT_SCOPE = 'schedule/detail'

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
  other: '#22c55e',
}

const DEFAULT_COLOR = '#22c55e'

const categories = [
  { value: 'all' as const, label: 'schedule.categories.all', icon: LayoutGrid },
  { value: 'live' as const, label: 'schedule.categories.live', icon: Radio },
  { value: 'media' as const, label: 'schedule.categories.media', icon: Film },
  { value: 'birth' as const, label: 'schedule.categories.birth', icon: Cake },
  { value: 'other' as const, label: 'schedule.categories.other', icon: Calendar },
]

const plannerViews = [
  { value: 'week' as const, label: 'schedule.view.week' },
  { value: 'day' as const, label: 'schedule.view.day' },
  { value: 'month' as const, label: 'schedule.view.month' },
]

const activeCategoryLabel = computed(() => {
  const matched = categories.find((category) => category.value === activeCategory.value)
  return matched ? t(matched.label) : t('schedule.categories.all')
})

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
  const dateStr = formatCalendarDateKey(date)
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

const plannerAnchorDate = computed(() => selectedDay.value?.fullDate ?? new Date())

function buildCalendarDay(date: Date): CalendarDay {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const today = new Date()
  const isToday =
    today.getFullYear() === normalized.getFullYear() &&
    today.getMonth() === normalized.getMonth() &&
    today.getDate() === normalized.getDate()

  return {
    key: formatCalendarDateKey(normalized),
    date: normalized.getDate(),
    fullDate: normalized,
    currentMonth: normalized.getMonth() === currentMonth.value,
    isToday,
    events: getEventsForDate(normalized),
  }
}

const weekDays = computed(() => {
  const anchor = plannerAnchorDate.value
  const start = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() - anchor.getDay()
  )
  return Array.from({ length: 7 }, (_, index) =>
    buildCalendarDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
  )
})

const plannerPeriodLabel = computed(() => {
  if (plannerView.value === 'month') return monthLabel.value
  if (plannerView.value === 'day') return selectedDayLabel.value || t('schedule.today')

  const first = weekDays.value[0]
  const last = weekDays.value[weekDays.value.length - 1]
  if (!first || !last) return monthLabel.value

  return `${formatCalendarDateLabel(first.fullDate)} - ${formatCalendarDateLabel(last.fullDate)}`
})
const dateJumpValue = computed(() => {
  const target =
    plannerView.value === 'month'
      ? new Date(currentYear.value, currentMonth.value, 1)
      : plannerAnchorDate.value

  return formatCalendarDateKey(target)
})

const upcomingEvents = computed(() => {
  const now = new Date()
  return filteredEvents.value
    .filter((e) => new Date(e.start) >= now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 10)
})

const todayEvents = computed(() => {
  const todayKey = formatCalendarDateKey(new Date())
  return filteredEvents.value
    .filter((event) => event.start.slice(0, 10) === todayKey)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
})

const agendaSummaryLabel = computed(() => {
  if (todayEvents.value.length > 0) {
    return `${todayEvents.value.length} ${t('schedule.eventsCount')} · ${activeCategoryLabel.value}`
  }
  if (upcomingEvents.value.length > 0) {
    return `${upcomingEvents.value.length} ${t('schedule.eventsCount')} · ${nextHighlightLabel.value}`
  }
  return t('schedule.noUpcoming')
})

const plannerSummaryLabel = computed(() => {
  if (plannerView.value === 'month') {
    return `${monthLabel.value} · ${activeCategoryLabel.value}`
  }
  if (selectedDay.value) {
    return `${selectedDayLabel.value} · ${
      selectedDayEvents.value.length > 0
        ? `${selectedDayEvents.value.length} ${t('schedule.eventsCount')}`
        : t('schedule.noEvents')
    }`
  }
  return plannerPeriodLabel.value
})

const todayAgendaTitle = computed(() => {
  if (todayEvents.value[0]) return todayEvents.value[0].title
  return t('schedule.noEvents')
})

const todayAgendaMeta = computed(() => {
  if (todayEvents.value[0]) {
    return formatEventDateTime(todayEvents.value[0].start, todayEvents.value[0].allDay)
  }
  return activeCategoryLabel.value
})

const nextAgendaTitle = computed(() => {
  if (upcomingEvents.value[0]) return upcomingEvents.value[0].title
  return t('schedule.insights.empty')
})

const nextAgendaMeta = computed(() => {
  if (upcomingEvents.value[0]) {
    return formatEventDateTime(upcomingEvents.value[0].start, upcomingEvents.value[0].allDay)
  }
  return monthLabel.value
})

const nextAgendaDateLabel = computed(() => {
  const event = upcomingEvents.value[0]
  if (!event) return ''
  return formatEventDate(event.start)
})

const highlightedEvent = computed(
  () => selectedDayEvents.value[0] ?? upcomingEvents.value[0] ?? null
)

const nextHighlightLabel = computed(() => {
  const event = upcomingEvents.value[0]
  if (!event) return t('schedule.insights.empty')
  return `${formatEventDate(event.start)} · ${event.title}`
})

const categoryBreakdown = computed(() => {
  const counts = new Map<ScheduleCategory, number>()
  for (const event of filteredEvents.value) {
    counts.set(event.category, (counts.get(event.category) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 4)
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
function jumpToDate(date: Date) {
  currentYear.value = date.getFullYear()
  currentMonth.value = date.getMonth()
  selectedDay.value = buildCalendarDay(date)
}

function prevMonth() {
  if (plannerView.value !== 'month') {
    const offsetDays = plannerView.value === 'week' ? -7 : -1
    const target = new Date(
      plannerAnchorDate.value.getFullYear(),
      plannerAnchorDate.value.getMonth(),
      plannerAnchorDate.value.getDate() + offsetDays
    )
    jumpToDate(target)
    return
  }

  monthTransition.value = 'month-slide-right'
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (plannerView.value !== 'month') {
    const offsetDays = plannerView.value === 'week' ? 7 : 1
    const target = new Date(
      plannerAnchorDate.value.getFullYear(),
      plannerAnchorDate.value.getMonth(),
      plannerAnchorDate.value.getDate() + offsetDays
    )
    jumpToDate(target)
    return
  }

  monthTransition.value = 'month-slide-left'
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
  jumpToDate(now)
}

function setCategory(cat: ScheduleCategory | 'all') {
  activeCategory.value = cat
  selectedDay.value = buildCalendarDay(plannerAnchorDate.value)
}

function selectDay(day: CalendarDay) {
  if (selectedDay.value?.key === day.key) {
    selectedDay.value = null
  } else {
    selectedDay.value = day
  }
}

function setPlannerView(view: PlannerView) {
  plannerView.value = view
  if (!selectedDay.value) {
    selectedDay.value = buildCalendarDay(new Date())
  }
}

function selectPlannerDay(day: CalendarDay) {
  selectedDay.value = buildCalendarDay(day.fullDate)
}

function handleDateJumpInput(event: Event) {
  const value = (event.target as HTMLInputElement | null)?.value
  if (!value) return

  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return

  jumpToDate(parsed)
}

function formatWeekdayLabel(date: Date): string {
  return date.toLocaleDateString(locale.value === 'zh-CN' ? 'zh-CN' : locale.value, {
    weekday: 'short',
  })
}

function formatCalendarDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatCalendarDateLabel(date: Date): string {
  return date.toLocaleDateString(locale.value, {
    month: 'short',
    day: 'numeric',
  })
}

function formatEventTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(locale.value, { month: 'short', day: 'numeric' })
}

function formatEventDateTime(dateStr: string, allDay: boolean): string {
  if (allDay) {
    return `${formatEventDate(dateStr)} · ${t('schedule.allDay')}`
  }

  return `${formatEventDate(dateStr)} · ${formatEventTime(dateStr)}`
}

function jumpToAgendaDate(target: 'today' | 'next') {
  const targetDate =
    target === 'today'
      ? new Date()
      : upcomingEvents.value[0]
        ? new Date(upcomingEvents.value[0].start)
        : null

  if (!targetDate || Number.isNaN(targetDate.getTime())) return

  jumpToDate(targetDate)
  plannerView.value = 'week'
}

function resolveCalendarDay(dateStr: string): CalendarDay | null {
  const targetDate = dateStr.slice(0, 10)
  return (
    calendarDays.value.find((day) => formatCalendarDateKey(day.fullDate) === targetDate) ?? null
  )
}

function syncSelectedDayWithDetail(event: ScheduleResponse | null | undefined) {
  if (!event?.start_date) return

  const eventDate = new Date(event.start_date)
  if (!Number.isNaN(eventDate.getTime())) {
    currentYear.value = eventDate.getFullYear()
    currentMonth.value = eventDate.getMonth()
  }

  const matchedDay = resolveCalendarDay(event.start_date)
  if (matchedDay) {
    selectedDay.value = matchedDay
  }
}

// ========== 详情弹窗 ==========
const hasDetailLinks = computed(() => {
  if (!detailEvent.value) return false
  return detailEvent.value.event_url || detailEvent.value.ticket_url || detailEvent.value.source_url
})

const detailPanelVisible = computed(() =>
  Boolean(routeScheduleId.value || detailLoading.value || detailEvent.value)
)

const detailLead = computed(() => {
  const event = detailEvent.value
  if (!event?.description) return ''
  const firstLine = normalizeHtml(event.description)
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean)
  return firstLine ?? ''
})

const detailHostLabel = computed(() => {
  const event = detailEvent.value
  if (!event) return ''

  const authorLabel = event.author?.display_name || event.author?.username || ''
  const sourceLabel = event.source_platform || ''

  if (authorLabel && sourceLabel) {
    return `${authorLabel} · ${sourceLabel}`
  }

  return authorLabel || sourceLabel
})

const detailPermalink = computed(() => {
  const eventId = detailEvent.value?.id || routeScheduleId.value
  if (!eventId) return ''

  const resolved = router.resolve({
    name: 'schedule-detail',
    params: { id: eventId },
  })

  if (typeof window === 'undefined') {
    return resolved.href
  }

  return new URL(resolved.href, window.location.origin).toString()
})

const canShareDetail = computed(
  () =>
    Boolean(detailEvent.value && detailPermalink.value) &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function'
)

async function loadDetail(eventId: string) {
  detailLoading.value = true
  detailStatus.value = 'idle'
  detailError.value = null
  detailEvent.value = { id: eventId } as ScheduleResponse
  try {
    const liveDetail = await scheduleService.getById(eventId, { skipErrorToast: true })
    await setPublicSnapshot(SCHEDULE_DETAIL_SNAPSHOT_SCOPE, { id: eventId }, liveDetail)
    detailEvent.value = liveDetail
    detailStatus.value = 'ready'
    eventsSource.value = 'live'
    syncScheduleDetailMeta(detailEvent.value)
    syncSelectedDayWithDetail(detailEvent.value)
  } catch (err) {
    if (isServiceUnavailableError(err)) {
      const cachedDetail = await getPublicSnapshot<ScheduleResponse>(
        SCHEDULE_DETAIL_SNAPSHOT_SCOPE,
        {
          id: eventId,
        }
      )
      if (cachedDetail) {
        detailEvent.value = cachedDetail
        detailStatus.value = 'ready'
        eventsSource.value = 'cached'
        syncScheduleDetailMeta(cachedDetail)
        syncSelectedDayWithDetail(cachedDetail)
        return
      }

      const fallbackDetail = getFallbackScheduleById(eventId)
      if (fallbackDetail) {
        detailEvent.value = fallbackDetail
        detailStatus.value = 'ready'
        eventsSource.value = 'fallback'
        syncScheduleDetailMeta(fallbackDetail)
        syncSelectedDayWithDetail(fallbackDetail)
        return
      }
    }
    detailEvent.value = null
    if (err instanceof ApiError && err.status === 404) {
      detailStatus.value = 'not-found'
    } else {
      detailStatus.value = 'error'
      detailError.value = err instanceof ApiError ? err.message : t('common.error')
    }
  } finally {
    detailLoading.value = false
  }
}

async function openDetail(eventId: string) {
  if (routeScheduleId.value !== eventId) {
    await router.push({ name: 'schedule-detail', params: { id: eventId } })
    return
  }

  await loadDetail(eventId)
}

function closeDetail() {
  detailEvent.value = null
  detailStatus.value = 'idle'
  detailError.value = null
  if (routeScheduleId.value) {
    void router.replace({ name: 'schedule' })
  }
}

function retryDetail() {
  if (!routeScheduleId.value) return
  void loadDetail(routeScheduleId.value)
}

async function copyDetailLink() {
  if (
    !detailPermalink.value ||
    typeof navigator === 'undefined' ||
    !navigator.clipboard?.writeText
  ) {
    toastStore.error(t('schedule.detail.copyFailed'))
    return
  }

  try {
    await navigator.clipboard.writeText(detailPermalink.value)
    toastStore.success(t('schedule.detail.copySuccess'))
  } catch {
    toastStore.error(t('schedule.detail.copyFailed'))
  }
}

async function shareDetail() {
  if (!detailEvent.value || !detailPermalink.value || typeof navigator === 'undefined') return

  if (typeof navigator.share !== 'function') {
    await copyDetailLink()
    return
  }

  try {
    await navigator.share({
      title: detailEvent.value.title,
      text: detailLead.value || detailEvent.value.venue || undefined,
      url: detailPermalink.value,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return
    }
    toastStore.error(t('schedule.detail.shareFailed'))
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

function syncScheduleDetailMeta(event: ScheduleResponse | null | undefined) {
  const title = event?.title?.trim()
  if (!title) return

  applyPageMeta({
    title,
    description: event?.description ?? event?.venue,
    canonicalPath: route.path,
  })
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

function scrollDetailPanelIntoView() {
  if (typeof window === 'undefined' || window.innerWidth > 768) return

  void nextTick(() => {
    window.requestAnimationFrame(() => {
      detailPanelRef.value?.scrollIntoView({
        block: 'start',
        behavior: 'smooth',
      })
    })
  })
}

// ========== 数据加载 ==========
function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

async function fetchEvents(signal?: AbortSignal) {
  const fetchId = ++latestFetchId
  isLoading.value = true
  error.value = null
  const start = new Date(currentYear.value, currentMonth.value - 1, 1).toISOString()
  const end = new Date(currentYear.value, currentMonth.value + 2, 0).toISOString()
  try {
    const result = await scheduleService.calendar({ start, end }, { signal })
    if (signal?.aborted || fetchId !== latestFetchId) return
    events.value = result
    eventsSource.value = 'live'
    await setPublicSnapshot(SCHEDULE_CALENDAR_SNAPSHOT_SCOPE, { start, end }, result)
    if (!selectedDay.value && plannerView.value !== 'month') {
      selectedDay.value = buildCalendarDay(new Date())
    }
  } catch (err) {
    if (signal?.aborted || isAbortError(err) || fetchId !== latestFetchId) return

    if (err instanceof ApiError && err.status === 404) {
      events.value = []
      eventsSource.value = 'live'
    } else if (isServiceUnavailableError(err)) {
      const cachedEvents = await getPublicSnapshot<ScheduleCalendarItem[]>(
        SCHEDULE_CALENDAR_SNAPSHOT_SCOPE,
        { start, end }
      )
      if (cachedEvents) {
        events.value = cachedEvents
        eventsSource.value = 'cached'
      } else {
        events.value = getFallbackScheduleCalendar({ start, end })
        eventsSource.value = 'fallback'
      }
      error.value = null
      if (!selectedDay.value && plannerView.value !== 'month') {
        selectedDay.value = buildCalendarDay(new Date())
      }
    } else {
      error.value = err instanceof ApiError ? err.message : t('common.error')
    }
  } finally {
    if (!signal?.aborted && fetchId === latestFetchId) {
      isLoading.value = false
    }
  }
}

watch(
  [currentYear, currentMonth],
  () => {
    const controller = new AbortController()
    void fetchEvents(controller.signal)
    onWatcherCleanup(() => controller.abort())
  },
  { immediate: true }
)

watch(
  [events, routeScheduleId],
  ([, nextId]) => {
    if (!nextId || !detailEvent.value?.start_date) return

    const matchedDay = resolveCalendarDay(detailEvent.value.start_date)
    if (matchedDay) {
      selectedDay.value = matchedDay
    }
  },
  { flush: 'post' }
)

watch(
  routeScheduleId,
  (nextId) => {
    if (!nextId) {
      detailEvent.value = null
      detailLoading.value = false
      detailStatus.value = 'idle'
      detailError.value = null
      return
    }

    scrollDetailPanelIntoView()
    void loadDetail(nextId)
  },
  { immediate: true }
)

watch(plannerView, () => {
  if (!selectedDay.value) {
    selectedDay.value = buildCalendarDay(new Date())
  }
})

onMounted(() => {
  scheduleStore.markVisited()
})
</script>

<style scoped src="../styles/page-systems/schedule-page-view.css"></style>
