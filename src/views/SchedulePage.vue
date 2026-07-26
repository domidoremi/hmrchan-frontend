<template>
  <div
    class="hmr-route-page hmr-route-page--schedule schedule-page"
    :class="{ 'is-preview': usingPreviewSchedule }"
  >
    <header class="hmr-page-hero hmr-page-hero--schedule">
      <div class="hmr-container hmr-page-hero-container">
        <p class="hmr-kicker">{{ t('schedule.eyebrow') }}</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>{{ t('schedule.title') }}</h1>
        <div
          class="hmr-page-tags hmr-page-tags--schedule"
          role="group"
          :aria-label="t('schedule.overviewLabel')"
        >
          <span>{{ selectedMonthLabel }}</span>
          <span>{{ activeFilterLabel }}</span>
          <span>{{ scheduleOverviewCount }} {{ t('schedule.itemCount') }}</span>
        </div>
        <HmrPageStateBlock
          :loading="pageState === 'loading'"
          :empty="pageState === 'empty'"
          :error="resource.error"
          :empty-title="t('schedule.previewTitle')"
          :empty-body="t('schedule.previewEmptyBody')"
          :error-title="t('schedule.previewTitle')"
          :error-body="t('schedule.previewErrorBody')"
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
          <div class="hmr-schedule-filter-row" role="group" :aria-label="t('schedule.filterLabel')">
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

        <div
          class="hmr-schedule-date-strip"
          role="group"
          :aria-label="t('schedule.datePickerLabel')"
        >
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

        <div
          v-if="activeFilter === 'month'"
          class="hmr-schedule-month-tools"
          role="group"
          aria-label="Month navigation"
        >
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
            <component
              v-for="item in selectedDayEvents"
              :key="item.id"
              :is="isValidPostRouteId(item.id) ? RouterLink : 'article'"
              class="hmr-schedule-event"
              :class="{ 'is-performance': item.isPerformance }"
              :to="isValidPostRouteId(item.id) ? `/schedule/${item.id}` : undefined"
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
            </component>

            <div v-if="!selectedDayEvents.length" class="hmr-schedule-empty">
              <span class="hmr-schedule-empty-ornament" aria-hidden="true"></span>
              <strong>{{ selectedDayLabel }}</strong>
              <p>{{ t('schedule.emptyDay') }}</p>
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
          <article v-for="item in highlightEvents" :key="item.id">
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
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import { loadScheduleContentResource, type HmrScheduleContent } from '@/api/hmrContent'
import { isValidPostRouteId } from '@/edge/htmlDocument'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import { useHmrPublicContentResource } from '@/hmr/composables/useHmrPublicContentResource'
import { useHmrMountedResourceRefresh } from '@/hmr/composables/useHmrRouteResourceRefresh'
import { useHmrScheduleBoard } from '@/hmr/composables/useHmrScheduleBoard'
import type { HmrScheduleItem } from '@/hmr/types'

const { locale, t } = useI18n({ useScope: 'global' })
const schedulePreviewAnchor = new Date()

function buildPreviewScheduleTime(offsetDays: number, hours: number, minutes: number): string {
  const date = new Date(schedulePreviewAnchor)
  date.setDate(schedulePreviewAnchor.getDate() + offsetDays)
  date.setHours(hours, minutes, 0, 0)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}:00`
}

const schedulePreviewItems = computed<HmrScheduleItem[]>(() => [
  {
    id: 'schedule-preview-live',
    title: t('schedule.previewLiveTitle'),
    phase: t('schedule.performance'),
    time: buildPreviewScheduleTime(0, 20, 30),
    description: t('schedule.previewItemBody'),
  },
  {
    id: 'schedule-preview-planning',
    title: t('schedule.previewPlanningTitle'),
    phase: t('schedule.arrangement'),
    time: buildPreviewScheduleTime(1, 10, 0),
    description: t('schedule.previewItemBody'),
  },
  {
    id: 'schedule-preview-release',
    title: t('schedule.previewReleaseTitle'),
    phase: t('schedule.arrangement'),
    time: buildPreviewScheduleTime(2, 18, 0),
    description: t('schedule.previewItemBody'),
  },
  {
    id: 'schedule-preview-community',
    title: t('schedule.previewCommunityTitle'),
    phase: t('community.title'),
    time: buildPreviewScheduleTime(4, 14, 0),
    description: t('schedule.previewItemBody'),
  },
])

const initialScheduleContent: HmrScheduleContent = {
  items: [],
  calendar: [],
  highlights: [],
}
const {
  content,
  pageState,
  resource,
  refresh: refreshSchedule,
} = useHmrPublicContentResource<HmrScheduleContent>({
  initialData: initialScheduleContent,
  paths: ['/schedules', '/schedules/calendar', '/schedules/highlights'],
  cacheKey: 'hmr:schedule',
  scope: 'schedule',
  strategy: 'network-first',
  loader: loadScheduleContentResource,
  isEmpty: (data) => data.items.length === 0,
})
const usingPreviewSchedule = computed(() => content.value.items.length === 0)
const scheduleBoardContent = computed<HmrScheduleContent>(() => ({
  items: usingPreviewSchedule.value ? schedulePreviewItems.value : content.value.items,
  calendar: content.value.calendar,
  highlights: content.value.highlights.length
    ? content.value.highlights
    : schedulePreviewItems.value,
}))
const {
  activeFilter,
  dayOptions,
  filterOptions,
  monthDays,
  normalizedEvents,
  populatedDays,
  selectedDayEvents,
  selectedDayKey,
  selectedDayLabel,
  selectedMonthLabel,
  selectedSummary,
  setFilter,
  shiftMonth,
  upcomingEvents,
} = useHmrScheduleBoard(scheduleBoardContent, { locale, t })
const activeFilterLabel = computed(
  () =>
    filterOptions.value.find((item) => item.id === activeFilter.value)?.label ?? t('schedule.all')
)
const scheduleOverviewCount = computed(() => scheduleBoardContent.value.items.length)
const highlightEvents = computed(() =>
  (upcomingEvents.value.length ? upcomingEvents.value : normalizedEvents.value).slice(0, 3)
)

useHmrMountedResourceRefresh(refreshSchedule)
</script>
