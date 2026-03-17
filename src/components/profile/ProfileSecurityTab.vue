<template>
  <div class="security-tab">
    <div class="tab-header">
      <h2 class="tab-title">{{ $t('profile.tabs.security') }}</h2>
      <span v-if="summary" class="item-count profile-item-count">{{
        summary.security_events
      }}</span>
    </div>

    <StateIndicator v-if="error" variant="error" :description="error" @action="loadSecurityData" />

    <div v-else-if="isLoading" class="security-skeleton">
      <div v-for="i in 2" :key="i" class="skeleton-card">
        <Skeleton width="28%" height="0.875rem" />
        <Skeleton width="100%" height="4rem" />
        <Skeleton width="70%" height="0.875rem" />
      </div>
    </div>

    <template v-else>
      <section class="security-card glass-surface--elevated">
        <div class="security-section-head">
          <div>
            <h3 class="security-section-title">{{ $t('profile.securitySummaryTitle') }}</h3>
            <p class="security-section-desc">{{ $t('profile.securitySummaryHint') }}</p>
          </div>
        </div>

        <div class="summary-grid">
          <article class="summary-item">
            <span class="summary-label">{{ $t('profile.securityTotalLogins') }}</span>
            <strong class="summary-value">{{ summary?.total_logins ?? 0 }}</strong>
          </article>
          <article class="summary-item">
            <span class="summary-label">{{ $t('profile.securityFailedLogins') }}</span>
            <strong class="summary-value">{{ summary?.failed_logins ?? 0 }}</strong>
          </article>
          <article class="summary-item">
            <span class="summary-label">{{ $t('profile.securityPasswordChanges') }}</span>
            <strong class="summary-value">{{ summary?.password_changes ?? 0 }}</strong>
          </article>
          <article class="summary-item">
            <span class="summary-label">{{ $t('profile.securityNewDevices') }}</span>
            <strong class="summary-value">{{ summary?.new_devices ?? 0 }}</strong>
          </article>
          <article class="summary-item">
            <span class="summary-label">{{ $t('profile.securityEvents') }}</span>
            <strong class="summary-value">{{ summary?.security_events ?? 0 }}</strong>
          </article>
        </div>

        <div class="summary-meta">
          <div class="meta-row">
            <span class="meta-label">{{ $t('profile.securityLastLogin') }}</span>
            <span class="meta-value">{{ formatDate(summary?.last_login) }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">{{ $t('profile.securityLastPasswordChange') }}</span>
            <span class="meta-value">{{ formatDate(summary?.last_password_change) }}</span>
          </div>
        </div>
      </section>

      <section class="security-card glass-surface--elevated">
        <div class="security-section-head">
          <div>
            <h3 class="security-section-title">{{ $t('profile.securityActivityTitle') }}</h3>
            <p class="security-section-desc">{{ $t('profile.securityActivityHint') }}</p>
          </div>
        </div>

        <StateIndicator
          v-if="activity.length === 0"
          variant="empty"
          :description="$t('profile.securityNoActivity')"
        />

        <div v-else class="activity-list">
          <article
            v-for="item in activity"
            :key="item.id"
            class="activity-item"
            :class="{
              'activity-item--failed': !item.success,
            }"
          >
            <div class="activity-main">
              <div class="activity-top">
                <h4 class="activity-title">
                  {{ item.event_description || item.event_type }}
                </h4>
                <span class="activity-status" :class="{ 'activity-status--failed': !item.success }">
                  {{
                    item.success
                      ? $t('profile.securityEventSuccess')
                      : $t('profile.securityEventFailed')
                  }}
                </span>
              </div>

              <div class="activity-meta">
                <span>{{ formatRelativeTime(item.created_at, t) }}</span>
                <span v-if="item.request_path">{{ item.request_path }}</span>
                <span v-if="item.ip_address">{{ item.ip_address }}</span>
                <span v-if="item.device_type">{{ item.device_type }}</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ApiError, auditService, type AuditActivityItem, type SecuritySummary } from '@/api'
import { formatRelativeTime } from '@/utils/date'
import Skeleton from '@/components/ui/Skeleton.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'

const { t } = useI18n()

const summary = ref<SecuritySummary | null>(null)
const activity = ref<AuditActivityItem[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

async function loadSecurityData() {
  isLoading.value = true
  error.value = null

  try {
    const [securitySummary, activityResponse] = await Promise.all([
      auditService.getMySecuritySummary(30),
      auditService.getMyActivity({ days: 30, limit: 10 }),
    ])
    summary.value = securitySummary
    activity.value = Array.isArray(activityResponse.logs) ? activityResponse.logs : []
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t('common.error')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadSecurityData()
})
</script>

<style scoped>
.security-tab {
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

.security-skeleton,
.security-tab {
  display: grid;
  gap: clamp(0.875rem, 2.5vw, 1.25rem);
}

.skeleton-card,
.security-card {
  display: grid;
  gap: var(--spacing-4);
  padding: clamp(0.875rem, 2.5vw, 1.125rem);
}

.security-section-head {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-3);
  align-items: start;
}

.security-section-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.security-section-desc {
  margin: var(--spacing-1) 0 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
  gap: var(--spacing-3);
}

.summary-item {
  display: grid;
  gap: var(--spacing-1);
  padding: var(--spacing-3);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
}

.summary-label {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
}

.summary-value {
  color: var(--color-text-primary);
  font-size: clamp(1.125rem, 2vw, 1.5rem);
}

.summary-meta {
  display: grid;
  gap: var(--spacing-2);
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  font-size: var(--text-sm);
}

.meta-label {
  color: var(--color-text-tertiary);
}

.meta-value {
  color: var(--color-text-primary);
  text-align: right;
}

.activity-list {
  display: grid;
  gap: var(--spacing-3);
}

.activity-item {
  padding: var(--spacing-3);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
}

.activity-item--failed {
  border-color: rgba(var(--color-danger-rgb), 0.2);
}

.activity-main {
  display: grid;
  gap: var(--spacing-2);
}

.activity-top {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--spacing-3);
}

.activity-title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.activity-status {
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  background: rgba(var(--color-success-rgb), 0.12);
  color: var(--color-success);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  white-space: nowrap;
}

.activity-status--failed {
  background: rgba(var(--color-danger-rgb), 0.12);
  color: var(--color-danger);
}

.activity-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem 0.75rem;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
}
@media (max-width: 640px) {
  .activity-top,
  .meta-row {
    flex-direction: column;
    align-items: start;
  }

  .meta-value {
    text-align: left;
  }
}
</style>
