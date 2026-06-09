<template>
  <div class="hmr-route-page hmr-route-page--schedule schedule-page">
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
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import { loadScheduleContentResource, type HmrScheduleContent } from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import { useHmrPublicContentResource } from '@/hmr/composables/useHmrPublicContentResource'
import { useHmrMountedResourceRefresh } from '@/hmr/composables/useHmrRouteResourceRefresh'
import { useHmrScheduleBoard } from '@/hmr/composables/useHmrScheduleBoard'

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
const { locale, t } = useI18n({ useScope: 'global' })
const {
  activeFilter,
  dayOptions,
  filterOptions,
  monthDays,
  populatedDays,
  selectedDayEvents,
  selectedDayKey,
  selectedDayLabel,
  selectedMonthLabel,
  selectedSummary,
  setFilter,
  shiftMonth,
  upcomingEvents,
} = useHmrScheduleBoard(content, { locale, t })

useHmrMountedResourceRefresh(refreshSchedule)
</script>
