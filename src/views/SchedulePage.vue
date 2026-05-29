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
import {
  buildCalendarDay as buildScheduleCalendarDay,
  buildCalendarDays,
  buildCategoryBreakdown,
  buildEventsByDate,
  buildWeekDays,
  buildScheduleDetailSharePayload,
  canShareScheduleDetail,
  filterScheduleEvents,
  formatCalendarDateKey,
  formatEventDateTimeLabel,
  getScheduleCategoryColor,
  getTodayScheduleEvents,
  getUpcomingScheduleEvents,
  hasScheduleDetailLinks,
  isSameScheduleDate,
  linkifyScheduleDescriptionLine,
  parseScheduleDateJumpValue,
  parseScheduleDescription,
  resolveScheduleAgendaJumpTargetDate,
  resolveScheduleAgendaSummaryLabel,
  resolveScheduleCalendarNavigationIndex,
  resolveScheduleDateJumpValue,
  resolveScheduleDayAriaLabel,
  resolveScheduleDetailHostLabel,
  resolveScheduleDetailLead,
  resolveScheduleDetailPermalink,
  resolveScheduleDetailRecoverySource,
  resolveScheduleEventMetaLabel,
  resolveScheduleEventTitleLabel,
  resolveScheduleMonthStep,
  resolveScheduleMonthSwipeDirection,
  resolveScheduleNextHighlightLabel,
  resolveSchedulePlannerSummaryLabel,
  resolveSchedulePlannerStepTarget,
  resolveScheduleTodayTransition,
  resolveScheduleWeekdays,
  type ScheduleAgendaJumpTarget,
  type CalendarDay,
  type ScheduleMonthTransitionName,
  type ScheduleDescriptionSection,
} from './schedule/schedulePageModel'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const scheduleStore = useScheduleStore()
const toastStore = useToastStore()

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
const monthTransition = ref<ScheduleMonthTransitionName>('month-slide-left')

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

let touchStartX = 0
let touchStartY = 0

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
  return getScheduleCategoryColor(cat)
}

const weekdays = computed(() => resolveScheduleWeekdays(locale.value))

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
  return filterScheduleEvents(events.value, activeCategory.value)
})

const eventsByDate = computed(() => buildEventsByDate(filteredEvents.value))

const calendarDays = computed<CalendarDay[]>(() => {
  return buildCalendarDays({
    year: currentYear.value,
    month: currentMonth.value,
    eventsByDate: eventsByDate.value,
  })
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
  return buildScheduleCalendarDay({
    date,
    currentMonth: currentMonth.value,
    eventsByDate: eventsByDate.value,
  })
}

const weekDays = computed(() => {
  return buildWeekDays({
    anchor: plannerAnchorDate.value,
    currentMonth: currentMonth.value,
    eventsByDate: eventsByDate.value,
  })
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
  return resolveScheduleDateJumpValue({
    view: plannerView.value,
    year: currentYear.value,
    month: currentMonth.value,
    anchor: plannerAnchorDate.value,
  })
})

const upcomingEvents = computed(() => {
  return getUpcomingScheduleEvents(filteredEvents.value)
})

const todayEvents = computed(() => {
  return getTodayScheduleEvents(filteredEvents.value)
})

const agendaSummaryLabel = computed(() => {
  return resolveScheduleAgendaSummaryLabel({
    todayCount: todayEvents.value.length,
    upcomingCount: upcomingEvents.value.length,
    eventsCountLabel: t('schedule.eventsCount'),
    activeCategoryLabel: activeCategoryLabel.value,
    nextHighlightLabel: nextHighlightLabel.value,
    noUpcomingLabel: t('schedule.noUpcoming'),
  })
})

const plannerSummaryLabel = computed(() => {
  return resolveSchedulePlannerSummaryLabel({
    view: plannerView.value,
    monthLabel: monthLabel.value,
    activeCategoryLabel: activeCategoryLabel.value,
    selectedDayLabel: selectedDay.value ? selectedDayLabel.value : null,
    selectedDayEventCount: selectedDayEvents.value.length,
    eventsCountLabel: t('schedule.eventsCount'),
    noEventsLabel: t('schedule.noEvents'),
    plannerPeriodLabel: plannerPeriodLabel.value,
  })
})

const todayAgendaTitle = computed(() => {
  return resolveScheduleEventTitleLabel({
    event: todayEvents.value[0],
    fallbackLabel: t('schedule.noEvents'),
  })
})

const todayAgendaMeta = computed(() => {
  return resolveScheduleEventMetaLabel({
    event: todayEvents.value[0],
    fallbackLabel: activeCategoryLabel.value,
    formatEvent: formatEventDateTime,
  })
})

const nextAgendaTitle = computed(() => {
  return resolveScheduleEventTitleLabel({
    event: upcomingEvents.value[0],
    fallbackLabel: t('schedule.insights.empty'),
  })
})

const nextAgendaMeta = computed(() => {
  return resolveScheduleEventMetaLabel({
    event: upcomingEvents.value[0],
    fallbackLabel: monthLabel.value,
    formatEvent: formatEventDateTime,
  })
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
  return resolveScheduleNextHighlightLabel({
    event,
    emptyLabel: t('schedule.insights.empty'),
    dateLabel: event ? formatEventDate(event.start) : '',
  })
})

const categoryBreakdown = computed(() => {
  return buildCategoryBreakdown(filteredEvents.value)
})

function getDayAriaLabel(day: CalendarDay): string {
  return resolveScheduleDayAriaLabel({
    day,
    locale: locale.value,
    eventsCountLabel: t('schedule.eventsCount'),
  })
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

  const next = resolveScheduleCalendarNavigationIndex(e.key, idx, cells.length)
  if (next === null) return

  e.preventDefault()
  cells[next]?.focus()
}

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

  const direction = resolveScheduleMonthSwipeDirection(dx, dy)
  if (direction === 'next') nextMonth()
  if (direction === 'previous') prevMonth()
}

function jumpToDate(date: Date) {
  currentYear.value = date.getFullYear()
  currentMonth.value = date.getMonth()
  selectedDay.value = buildCalendarDay(date)
}

function applyScheduleStep(direction: -1 | 1) {
  const target = resolveSchedulePlannerStepTarget(
    plannerView.value,
    direction,
    plannerAnchorDate.value
  )
  if (target) {
    jumpToDate(target)
    return
  }

  const next = resolveScheduleMonthStep(currentYear.value, currentMonth.value, direction)
  monthTransition.value = next.transition
  currentYear.value = next.year
  currentMonth.value = next.month
}

function prevMonth() {
  applyScheduleStep(-1)
}

function nextMonth() {
  applyScheduleStep(1)
}

function goToday() {
  const now = new Date()
  monthTransition.value = resolveScheduleTodayTransition(currentYear.value, currentMonth.value, now)
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
  const parsed = parseScheduleDateJumpValue(value)
  if (!parsed) return

  jumpToDate(parsed)
}

function formatWeekdayLabel(date: Date): string {
  return date.toLocaleDateString(locale.value === 'zh-CN' ? 'zh-CN' : locale.value, {
    weekday: 'short',
  })
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
  return formatEventDateTimeLabel({
    dateStr,
    allDay,
    locale: locale.value,
    allDayLabel: t('schedule.allDay'),
  })
}

function jumpToAgendaDate(target: ScheduleAgendaJumpTarget) {
  const targetDate = resolveScheduleAgendaJumpTargetDate({
    target,
    upcomingEvent: upcomingEvents.value[0],
  })
  if (!targetDate) return

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

const hasDetailLinks = computed(() => hasScheduleDetailLinks(detailEvent.value))

const detailPanelVisible = computed(() =>
  Boolean(routeScheduleId.value || detailLoading.value || detailEvent.value)
)

const detailLead = computed(() => resolveScheduleDetailLead(detailEvent.value))

const detailHostLabel = computed(() => resolveScheduleDetailHostLabel(detailEvent.value))

const detailPermalink = computed(() => {
  const eventId = detailEvent.value?.id || routeScheduleId.value
  if (!eventId) return ''
  return resolveScheduleDetailPermalink({
    href: router.resolve({ name: 'schedule-detail', params: { id: eventId } }).href,
    origin: typeof window === 'undefined' ? null : window.location.origin,
  })
})

const canShareDetail = computed(() =>
  canShareScheduleDetail({
    hasDetail: Boolean(detailEvent.value),
    permalink: detailPermalink.value,
    shareAvailable: typeof navigator !== 'undefined' && typeof navigator.share === 'function',
  })
)

function applyReadyScheduleDetail(event: ScheduleResponse, source: PublicPageDataSource) {
  detailEvent.value = event
  detailStatus.value = 'ready'
  eventsSource.value = source
  syncScheduleDetailMeta(event)
  syncSelectedDayWithDetail(event)
}

async function loadDetail(eventId: string) {
  detailLoading.value = true
  detailStatus.value = 'idle'
  detailError.value = null
  detailEvent.value = { id: eventId } as ScheduleResponse
  try {
    const liveDetail = await scheduleService.getById(eventId, { skipErrorToast: true })
    await setPublicSnapshot(SCHEDULE_DETAIL_SNAPSHOT_SCOPE, { id: eventId }, liveDetail)
    applyReadyScheduleDetail(liveDetail, 'live')
  } catch (err) {
    const serviceUnavailable = isServiceUnavailableError(err)
    const cachedDetail = serviceUnavailable
      ? await getPublicSnapshot<ScheduleResponse>(SCHEDULE_DETAIL_SNAPSHOT_SCOPE, { id: eventId })
      : undefined
    const fallbackDetail = serviceUnavailable ? getFallbackScheduleById(eventId) : null
    const recoverySource = resolveScheduleDetailRecoverySource({
      serviceUnavailable,
      notFound: err instanceof ApiError && err.status === 404,
      hasCachedDetail: Boolean(cachedDetail),
      hasFallbackDetail: Boolean(fallbackDetail),
    })

    if (recoverySource === 'cached' && cachedDetail) {
      applyReadyScheduleDetail(cachedDetail, 'cached')
      return
    }

    if (recoverySource === 'fallback' && fallbackDetail) {
      applyReadyScheduleDetail(fallbackDetail, 'fallback')
      return
    }

    detailEvent.value = null
    if (recoverySource === 'not-found') {
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
    await navigator.share(
      buildScheduleDetailSharePayload({
        title: detailEvent.value.title,
        lead: detailLead.value,
        venue: detailEvent.value.venue,
        url: detailPermalink.value,
      })
    )
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
  return isSameScheduleDate(a, b)
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

const parsedDescription = computed<ScheduleDescriptionSection[]>(() =>
  parseScheduleDescription(detailEvent.value?.description)
)

function linkify(text: string): string {
  return linkifyScheduleDescriptionLine(text)
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
