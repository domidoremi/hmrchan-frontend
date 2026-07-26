<template>
  <article class="hmr-detail hmr-detail--reader schedule-detail-page">
    <header class="hmr-detail-reader-hero">
      <div class="hmr-detail-reader-copy">
        <RouterLink class="hmr-text-link hmr-detail-back" to="/schedule">
          {{ t('scheduleDetail.back') }}
        </RouterLink>
        <p class="hmr-kicker">{{ t('scheduleDetail.eyebrow') }}</p>
        <h1 class="hmr-detail-title" data-hmr-text-reveal>{{ eventTitle }}</h1>
        <p class="hmr-detail-lede">{{ eventDescription }}</p>

        <div class="hmr-detail-meta-grid" role="list" :aria-label="t('scheduleDetail.infoLabel')">
          <div
            v-for="item in detailMetrics"
            :key="item.label"
            class="hmr-detail-meta-card"
            role="listitem"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>

        <HmrPageStateBlock
          :loading="pageState === 'loading'"
          :empty="pageState === 'empty'"
          :error="pageState === 'error' ? resource.error : null"
          :title="t('scheduleDetail.errorTitle')"
          :body="t('scheduleDetail.errorBody')"
          :loading-title="t('scheduleDetail.loadingTitle')"
          :loading-body="t('scheduleDetail.loadingBody')"
          :empty-title="t('scheduleDetail.emptyTitle')"
          :empty-body="t('scheduleDetail.emptyBody')"
          :error-title="t('scheduleDetail.errorTitle')"
          :error-body="t('scheduleDetail.errorBody')"
          :show-retry="pageState === 'error'"
          :retry-label="t('scheduleDetail.retry')"
          @retry="loadSchedule"
        />
      </div>

      <aside
        class="hmr-detail-cover"
        :class="{ 'is-muted': pageState !== 'ready' }"
        data-hmr-reveal
      >
        <div class="hmr-detail-cover-media">
          <span>{{ dateBadge }}</span>
        </div>
        <div class="hmr-detail-cover-caption">
          <span>{{ t('scheduleDetail.dateLabel') }}</span>
          <strong>{{ scheduleWindow }}</strong>
        </div>
      </aside>
    </header>

    <section v-if="pageState === 'ready'" class="hmr-detail-reader-section" data-hmr-reveal>
      <div class="hmr-detail-reader-grid">
        <aside class="hmr-detail-sidebar">
          <div class="hmr-detail-source-card">
            <p class="hmr-kicker">{{ t('scheduleDetail.organizer') }}</p>
            <strong>{{ detail.author?.name || t('scheduleDetail.publicEvent') }}</strong>
            <RouterLink v-if="authorPath" class="hmr-text-link" :to="authorPath">
              {{ t('scheduleDetail.creatorProfile') }}
            </RouterLink>
          </div>

          <div v-if="externalLinks.length" class="hmr-detail-source-card">
            <p class="hmr-kicker">{{ t('scheduleDetail.links') }}</p>
            <a
              v-for="link in externalLinks"
              :key="link.href"
              class="hmr-text-link"
              :href="link.href"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ link.label }}
            </a>
          </div>

          <div class="hmr-detail-source-card">
            <p class="hmr-kicker">{{ t('scheduleDetail.continueBrowsing') }}</p>
            <strong>{{ t('scheduleDetail.moreEvents') }}</strong>
            <RouterLink class="hmr-text-link" to="/schedule">
              {{ t('scheduleDetail.openSchedule') }}
            </RouterLink>
          </div>
        </aside>

        <div class="hmr-detail-prose">
          <p class="hmr-kicker">{{ t('scheduleDetail.about') }}</p>
          <h2>{{ eventTitle }}</h2>
          <p>{{ eventDescription }}</p>
          <blockquote>
            <span>{{ locationLabel }}</span>
            <time :datetime="detail.startAt || undefined">{{ scheduleWindow }}</time>
          </blockquote>
        </div>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import { loadScheduleDetailContentResource, type HmrScheduleDetailContent } from '@/api/hmrContent'
import { isValidPostRouteId } from '@/edge/htmlDocument'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import { useHmrPublicContentResource } from '@/hmr/composables/useHmrPublicContentResource'
import {
  normalizeHmrRouteParam,
  useHmrRouteResourceRefresh,
} from '@/hmr/composables/useHmrRouteResourceRefresh'

const route = useRoute()
const { locale, t } = useI18n({ useScope: 'global' })
const initialDetail: HmrScheduleDetailContent = {
  id: '',
  title: '',
  description: '',
  category: '',
  startAt: '',
  isAllDay: false,
  viewState: 'available',
}

function scheduleId(): string {
  return normalizeHmrRouteParam(route.params['id'], '')
}

const {
  content: detail,
  pageState,
  resource,
  refresh: loadSchedule,
} = useHmrPublicContentResource<HmrScheduleDetailContent>({
  initialData: initialDetail,
  paths: ['/schedules/:id'],
  cacheKey: () => `hmr:schedule-detail:${scheduleId()}`,
  scope: 'schedule-detail',
  strategy: 'stale-while-revalidate',
  loader: () => loadScheduleDetailContentResource(scheduleId()),
  resolvePageState: (data) =>
    data.viewState === 'available'
      ? data.id && data.title
        ? 'ready'
        : 'empty'
      : data.viewState === 'not-found'
        ? 'empty'
        : 'error',
})

function formatDateTime(value: string): string {
  if (!value) return t('scheduleDetail.datePending')
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    ...(detail.value.isAllDay ? {} : { timeStyle: 'short' as const }),
  }).format(parsed)
}

const eventTitle = computed(() => detail.value.title || t('scheduleDetail.fallbackTitle'))
const eventDescription = computed(
  () => detail.value.description || t('scheduleDetail.fallbackBody')
)
const startLabel = computed(() => formatDateTime(detail.value.startAt))
const endLabel = computed(() => (detail.value.endAt ? formatDateTime(detail.value.endAt) : ''))
const scheduleWindow = computed(() =>
  endLabel.value ? `${startLabel.value} - ${endLabel.value}` : startLabel.value
)
const dateBadge = computed(() => {
  const parsed = new Date(detail.value.startAt)
  if (Number.isNaN(parsed.getTime())) return 'M'
  return new Intl.DateTimeFormat(locale.value, { day: '2-digit' }).format(parsed)
})
const locationLabel = computed(
  () =>
    [detail.value.venue, detail.value.venueAddress].filter(Boolean).join(' · ') ||
    t('scheduleDetail.locationPending')
)
const detailMetrics = computed(() => [
  {
    label: t('scheduleDetail.typeLabel'),
    value: detail.value.category || t('scheduleDetail.publicEvent'),
  },
  { label: t('scheduleDetail.dateLabel'), value: scheduleWindow.value },
  { label: t('scheduleDetail.locationLabel'), value: locationLabel.value },
])
const authorPath = computed(() => {
  const authorId = detail.value.author?.id
  return authorId && isValidPostRouteId(authorId) ? `/author/${authorId}` : null
})
const externalLinks = computed(() =>
  [
    detail.value.eventUrl
      ? { href: detail.value.eventUrl, label: t('scheduleDetail.officialLink') }
      : null,
    detail.value.ticketUrl
      ? { href: detail.value.ticketUrl, label: t('scheduleDetail.ticketLink') }
      : null,
    detail.value.sourceUrl
      ? { href: detail.value.sourceUrl, label: t('scheduleDetail.sourceLink') }
      : null,
  ].filter((item): item is { href: string; label: string } => item !== null)
)

useHmrRouteResourceRefresh({
  refresh: loadSchedule,
  watchSource: () => route.params['id'],
})
</script>
