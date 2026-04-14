<template>
  <div class="reports-tab" data-testid="profile-reports-tab">
    <div v-if="showHeader" class="tab-header">
      <h2 class="tab-title">{{ $t('profile.tabs.reports') }}</h2>
      <span v-if="displayTotal" class="item-count profile-item-count">{{ displayTotal }}</span>
    </div>

    <StateIndicator v-if="error" variant="error" :description="error" @action="fetchReports" />

    <div v-else-if="isLoading && reports.length === 0" class="reports-skeleton">
      <div v-for="i in 4" :key="i" class="skeleton-card">
        <Skeleton width="28%" height="0.875rem" />
        <Skeleton width="55%" height="1rem" />
        <Skeleton width="100%" height="0.875rem" />
      </div>
    </div>

    <template v-else>
      <StateIndicator
        v-if="reports.length === 0"
        variant="empty"
        :description="$t('profile.noReports')"
      />

      <div v-else class="reports-list">
        <article
          v-for="(report, index) in reports"
          :key="report.id"
          class="report-card glass-surface--elevated"
          :style="{ '--stagger': index }"
        >
          <div class="report-card__header">
            <div class="report-card__badges">
              <span class="report-badge report-badge--target">
                {{ targetTypeLabel(report.target_type) }}
              </span>
              <span class="report-badge" :class="statusClass(report.status)">
                {{ statusLabel(report.status) }}
              </span>
            </div>
            <time class="report-time" :datetime="report.created_at">
              {{ formatDate(report.created_at) }}
            </time>
          </div>

          <h3 class="report-reason">
            {{ reasonLabel(report.reason) }}
          </h3>

          <p v-if="report.description" class="report-description">
            {{ report.description }}
          </p>
          <p v-else class="report-description report-description--muted">
            {{ $t('profile.reportDescriptionEmpty') }}
          </p>

          <div class="report-card__footer">
            <span class="report-meta"> {{ $t('profile.reportIdLabel') }} #{{ report.id }} </span>
            <span v-if="report.updated_at" class="report-meta">
              {{ $t('profile.reportUpdatedLabel') }} {{ formatDate(report.updated_at) }}
            </span>
          </div>
        </article>
      </div>

      <LoadMoreSection
        v-if="hasMore"
        :count="reports.length"
        :total="displayTotal"
        :has-more="hasMore"
        :loading="isLoadingMore"
        @load-more="loadMore"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ApiError, reportService, type ReportItem, type ReportTargetType } from '@/api'
import { normalizeReportsSummaryCount } from '@/api/summaryCounts'
import { usePreferredPageSize } from '@/composables/usePreferredPageSize'
import { formatRelativeTime } from '@/utils/date'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'

withDefaults(
  defineProps<{
    showHeader?: boolean
  }>(),
  {
    showHeader: true,
  }
)
import Skeleton from '@/components/ui/Skeleton.vue'

const { t, te } = useI18n()

const reports = ref<ReportItem[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const nextCursor = ref<string | null>(null)
const total = ref<number | null>(null)
const pageSize = usePreferredPageSize({ fallback: 20, min: 10, max: 50 })
let reportsController: AbortController | null = null
let reportsRequestToken = 0

const hasMoreState = ref(false)
const hasMore = computed(() => hasMoreState.value)
const displayTotal = computed(() => total.value ?? (reports.value.length || undefined))

function abortReportsRequest() {
  reportsController?.abort()
  reportsController = null
}

async function fetchReports(reset = true): Promise<boolean> {
  if (reset) {
    abortReportsRequest()
    isLoading.value = true
    nextCursor.value = null
  } else {
    if (isLoading.value || isLoadingMore.value) return false
    isLoadingMore.value = true
  }

  error.value = null
  const controller = new AbortController()
  reportsController = controller
  const requestToken = ++reportsRequestToken

  try {
    const response = await reportService.getMyReports(
      {
        limit: pageSize.value,
        cursor: reset ? null : nextCursor.value,
      },
      {
        signal: controller.signal,
        skipErrorToast: true,
      }
    )
    const nextItems = Array.isArray(response.items) ? response.items : []
    if (controller.signal.aborted || requestToken !== reportsRequestToken) return false

    if (reset) {
      reports.value = nextItems
    } else {
      const existingIds = new Set(reports.value.map((report) => report.id))
      reports.value.push(...nextItems.filter((report) => !existingIds.has(report.id)))
    }
    nextCursor.value = response.next_cursor ?? null
    hasMoreState.value = Boolean(response.has_more && response.next_cursor)
    if (reset) {
      void refreshReportsSummary()
    }
    return true
  } catch (err) {
    if (controller.signal.aborted || requestToken !== reportsRequestToken) return false
    if (reports.value.length === 0) {
      error.value = err instanceof ApiError ? err.message : t('common.error')
    }
    return false
  } finally {
    if (requestToken === reportsRequestToken) {
      isLoading.value = false
      isLoadingMore.value = false
      if (reportsController === controller) {
        reportsController = null
      }
    }
  }
}

async function loadMore() {
  if (!hasMore.value || isLoading.value || isLoadingMore.value) return
  await fetchReports(false)
}

async function refreshReportsSummary() {
  try {
    const summary = await reportService.getSummary({ skipErrorToast: true })
    total.value = normalizeReportsSummaryCount(summary)
  } catch {
    total.value = reports.value.length > 0 ? reports.value.length : null
  }
}

function targetTypeLabel(targetType: ReportTargetType) {
  const key = `profile.reportTargetTypes.${targetType}`
  return te(key) ? t(key) : targetType
}

function reasonLabel(reason: string) {
  const key = `comment.reportReason.${reason}`
  return te(key) ? t(key) : reason
}

function statusLabel(status?: ReportItem['status']) {
  if (!status) return t('profile.reportStatuses.pending')
  const key = `profile.reportStatuses.${status}`
  return te(key) ? t(key) : status
}

function statusClass(status?: ReportItem['status']) {
  return `report-badge--${status ?? 'pending'}`
}

function formatDate(dateString?: string | null) {
  return formatRelativeTime(dateString, t)
}

onMounted(() => {
  void fetchReports()
})

watch(pageSize, () => {
  if (reports.value.length === 0 && !isLoading.value) return
  void fetchReports(true)
})

onUnmounted(() => {
  abortReportsRequest()
})
</script>

<style scoped>
.reports-tab {
  min-height: 20rem;
}

.tab-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: clamp(1.25rem, 3vw, 2rem);
}

.tab-title {
  margin: 0;
  font-size: clamp(var(--text-lg), 2.5vw, var(--text-xl));
  font-weight: var(--font-bold);
}

.item-count {
  padding: 0.125rem 0.625rem;
  background: rgba(var(--color-primary-rgb), 0.08);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.reports-skeleton,
.reports-list {
  display: grid;
  gap: clamp(0.75rem, 2vw, 1rem);
}

.skeleton-card,
.report-card {
  display: grid;
  gap: 0.875rem;
  padding: clamp(0.875rem, 2.5vw, 1.125rem);
}

.report-card {
  border-left: 3px solid transparent;
  transition:
    border-color var(--duration-fast) var(--ease-smooth),
    transform var(--duration-fast) var(--ease-bounce-soft);
}

.report-card:hover {
  border-left-color: rgba(var(--color-primary-rgb), 0.2);
  transform: none;
}

.report-card__header,
.report-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.report-card__badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.report-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1875rem 0.625rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-primary);
}

.report-badge--target {
  background: rgba(var(--color-info-rgb, 59, 130, 246), 0.1);
  color: var(--color-info, #3b82f6);
}

.report-badge--pending,
.report-badge--reviewed {
  background: rgba(var(--color-warning-rgb, 245, 158, 11), 0.12);
  color: var(--color-warning, #f59e0b);
}

.report-badge--resolved {
  background: rgba(var(--color-success-rgb), 0.12);
  color: var(--color-success);
}

.report-badge--rejected,
.report-badge--dismissed {
  background: rgba(148, 163, 184, 0.14);
  color: var(--color-text-secondary);
}

.report-time,
.report-meta {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.report-reason {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.report-description {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.65;
  color: var(--color-text-secondary);
}

.report-description--muted {
  color: var(--color-text-tertiary);
}

@media (max-width: 640px) {
  .report-card__header,
  .report-card__footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
