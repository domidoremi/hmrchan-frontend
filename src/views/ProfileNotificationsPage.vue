<template>
  <div class="notifications-page profile-sub-page" data-testid="profile-notifications-page">
    <div class="container">
      <ProfileSubPageHeader
        :title="$t('profile.tabs.notifications')"
        :subtitle="$t('profile.notificationsSubtitle')"
        :hint="$t('profile.notificationPreferencesHint')"
      >
        <template #actions>
          <div class="notifications-header-actions">
            <Button variant="ghost" size="sm" @click="togglePreferencesPanel">
              <SlidersHorizontal :size="14" />
              {{ $t('profile.notificationPreferences') }}
            </Button>
            <Button
              v-if="showArchiveReadAction"
              variant="ghost"
              size="sm"
              :loading="isArchivingRead"
              @click="handleArchiveRead"
            >
              <Archive :size="14" />
              {{ $t('profile.archiveRead') }}
            </Button>
            <Button
              v-if="showMarkAllReadAction"
              variant="ghost"
              size="sm"
              :loading="isMarkingAllRead"
              @click="handleMarkAllRead"
            >
              <CheckCheck :size="14" />
              {{ $t('profile.markAllRead') }}
            </Button>
          </div>
        </template>
      </ProfileSubPageHeader>

      <section class="notifications-overview glass-surface--editorial">
        <div class="notifications-overview__hero">
          <div class="notifications-overview__copy">
            <p class="notifications-overview__eyebrow">{{ $t('profile.unreadNotifications') }}</p>
            <h2 class="notifications-overview__count">{{ unreadDisplayCount }}</h2>
            <p class="notifications-overview__subtitle">
              {{ $t('profile.notificationCategories.interaction') }},
              {{ $t('profile.notificationCategories.security') }},
              {{ $t('profile.notificationCategories.system') }}
            </p>
          </div>

          <div class="notifications-live-pill" :class="streamStateClass">
            <component :is="streamIcon" :size="14" class="notifications-live-pill__icon" />
            <span>{{ $t(streamLabelKey) }}</span>
            <button
              v-if="notifStore.streamState === 'degraded'"
              type="button"
              class="notifications-live-pill__retry"
              @click="handleRetryStream"
            >
              {{ $t('profile.retryRealtime') }}
            </button>
          </div>
        </div>

        <div class="notifications-summary-grid">
          <article
            v-for="card in summaryCards"
            :key="card.key"
            class="notifications-summary-card"
            :class="`notifications-summary-card--${card.key}`"
          >
            <p class="notifications-summary-card__label">{{ card.label }}</p>
            <strong class="notifications-summary-card__value">{{ card.value }}</strong>
          </article>
        </div>

        <div
          v-if="notifStore.summaryError || notifStore.streamError"
          class="notifications-feedback"
        >
          <p v-if="notifStore.summaryError">{{ $t(notifStore.summaryError) }}</p>
          <p v-if="notifStore.streamError">{{ $t(notifStore.streamError) }}</p>
        </div>
      </section>

      <section class="notifications-filters glass-surface--editorial">
        <div class="notifications-filter-group">
          <p class="notifications-filter-group__label">
            {{ $t('profile.notificationStatusLabel') }}
          </p>
          <ControlGroup
            class="notifications-filter-row"
            role="tablist"
            :aria-label="$t('profile.notificationStatusLabel')"
          >
            <ControlButton
              v-for="option in statusOptions"
              :key="option.value"
              class="notification-filter-chip"
              size="compact"
              :class="{ 'notification-filter-chip--active': notifStore.status === option.value }"
              :pressed="notifStore.status === option.value"
              @click="notifStore.setStatus(option.value)"
            >
              <span>{{ option.label }}</span>
              <span v-if="option.badge" class="notification-filter-chip__badge">
                {{ option.badge }}
              </span>
            </ControlButton>
          </ControlGroup>
        </div>

        <div class="notifications-filter-group">
          <p class="notifications-filter-group__label">
            {{ $t('profile.notificationCategoryLabel') }}
          </p>
          <ControlGroup
            class="notifications-filter-row"
            role="tablist"
            :aria-label="$t('profile.notificationCategoryLabel')"
          >
            <ControlButton
              v-for="option in categoryOptions"
              :key="option.value"
              class="notification-filter-chip"
              size="compact"
              :class="{ 'notification-filter-chip--active': notifStore.category === option.value }"
              :pressed="notifStore.category === option.value"
              @click="notifStore.setCategory(option.value)"
            >
              <template #start>
                <component :is="option.icon" :size="14" />
              </template>
              <span>{{ option.label }}</span>
              <span v-if="option.badge" class="notification-filter-chip__badge">
                {{ option.badge }}
              </span>
            </ControlButton>
          </ControlGroup>
        </div>
      </section>

      <Transition name="notifications-panel">
        <section v-if="preferencesOpen" class="notifications-preferences glass-surface--editorial">
          <div class="notifications-preferences__header">
            <div>
              <h2 class="notifications-preferences__title">
                {{ $t('profile.notificationPreferences') }}
              </h2>
              <p class="notifications-preferences__hint">
                {{ $t('profile.notificationPreferencesHint') }}
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              :loading="notifStore.isPreferencesLoading"
              @click="refreshPreferences"
            >
              <RefreshCw :size="14" />
              {{ $t('common.refresh') }}
            </Button>
          </div>

          <div
            v-if="notifStore.preferencesError"
            class="notifications-feedback notifications-feedback--inline"
          >
            <p>{{ $t(notifStore.preferencesError) }}</p>
          </div>

          <div class="notification-preference-list">
            <article
              v-for="row in preferenceRows"
              :key="row.category"
              class="notification-preference-row"
            >
              <div class="notification-preference-row__copy">
                <p class="notification-preference-row__title">{{ row.label }}</p>
                <p class="notification-preference-row__description">
                  {{ $t('profile.notificationPreferencesHint') }}
                </p>
              </div>

              <div class="notification-preference-row__controls">
                <label class="notification-preference-toggle">
                  <span>{{ $t('profile.notificationInApp') }}</span>
                  <Switch
                    :model-value="row.preference.inbox_enabled"
                    size="sm"
                    :disabled="notifStore.savingPreferences[row.category]"
                    @update:model-value="handleInboxPreferenceChange(row.category, $event)"
                  />
                </label>

                <label class="notification-preference-toggle">
                  <span>{{ $t('profile.notificationEmail') }}</span>
                  <Switch
                    :model-value="row.preference.email_enabled"
                    size="sm"
                    :disabled="notifStore.savingPreferences[row.category]"
                    @update:model-value="handleEmailPreferenceChange(row.category, $event)"
                  />
                </label>
              </div>
            </article>
          </div>
        </section>
      </Transition>

      <section class="notifications-body glass-surface--editorial">
        <ProfileNotificationsTab />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ProfileNotificationsPage' })

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Archive,
  BellDot,
  CheckCheck,
  Inbox,
  MessageCircleMore,
  RefreshCw,
  Shield,
  SlidersHorizontal,
  Wifi,
  WifiOff,
} from '@lucide/vue'
import { useNotificationsStore, useToastStore } from '@/stores'
import type { InboxCategory } from '@/api/inboxService'
import { ControlButton, ControlGroup } from '@/components/appearance'
import ProfileNotificationsTab from '@/components/profile/ProfileNotificationsTab.vue'
import ProfileSubPageHeader from '@/components/profile/ProfileSubPageHeader.vue'
import Button from '@/components/ui/Button.vue'
import Switch from '@/components/ui/Switch.vue'

const { t } = useI18n()
const notifStore = useNotificationsStore()
const toastStore = useToastStore()

const preferencesOpen = ref(false)
const isMarkingAllRead = ref(false)
const isArchivingRead = ref(false)

const unreadDisplayCount = computed(() => notifStore.unreadDisplayCount ?? '0')
const showMarkAllReadAction = computed(() => notifStore.unreadCount > 0)
const showArchiveReadAction = computed(() => notifStore.status !== 'archived')

const streamLabelKey = computed(() => {
  switch (notifStore.streamState) {
    case 'live':
      return 'profile.notificationRealtimeLive'
    case 'reconnecting':
      return 'profile.notificationRealtimeReconnecting'
    case 'degraded':
      return 'profile.notificationRealtimeDegraded'
    case 'connecting':
    case 'idle':
    default:
      return 'profile.notificationRealtimeConnecting'
  }
})

const streamIcon = computed(() => {
  if (notifStore.streamState === 'degraded') return WifiOff
  return Wifi
})

const streamStateClass = computed(() => `notifications-live-pill--${notifStore.streamState}`)

const summaryCards = computed(() => [
  {
    key: 'unread',
    label: t('profile.unreadNotifications'),
    value: formatSummaryCount(notifStore.summary.total.count, notifStore.summary.total.is_capped),
  },
  {
    key: 'interaction',
    label: t('profile.notificationCategories.interaction'),
    value: formatSummaryCount(
      notifStore.summary.categories.interaction.count,
      notifStore.summary.categories.interaction.is_capped
    ),
  },
  {
    key: 'security',
    label: t('profile.notificationCategories.security'),
    value: formatSummaryCount(
      notifStore.summary.categories.security.count,
      notifStore.summary.categories.security.is_capped
    ),
  },
  {
    key: 'system',
    label: t('profile.notificationCategories.system'),
    value: formatSummaryCount(
      notifStore.summary.categories.system.count,
      notifStore.summary.categories.system.is_capped
    ),
  },
])

const statusOptions = computed(() => [
  {
    value: 'all' as const,
    label: t('profile.notificationStatus.all'),
    badge: undefined,
  },
  {
    value: 'unread' as const,
    label: t('profile.notificationStatus.unread'),
    badge: notifStore.unreadDisplayCount,
  },
  {
    value: 'archived' as const,
    label: t('profile.notificationStatus.archived'),
    badge: undefined,
  },
])

const categoryOptions = computed(() => [
  {
    value: 'all' as const,
    label: t('common.all'),
    icon: Inbox,
    badge: undefined,
  },
  {
    value: 'interaction' as const,
    label: t('profile.notificationCategories.interaction'),
    icon: MessageCircleMore,
    badge: formatOptionalCount(
      notifStore.summary.categories.interaction.count,
      notifStore.summary.categories.interaction.is_capped
    ),
  },
  {
    value: 'security' as const,
    label: t('profile.notificationCategories.security'),
    icon: Shield,
    badge: formatOptionalCount(
      notifStore.summary.categories.security.count,
      notifStore.summary.categories.security.is_capped
    ),
  },
  {
    value: 'system' as const,
    label: t('profile.notificationCategories.system'),
    icon: BellDot,
    badge: formatOptionalCount(
      notifStore.summary.categories.system.count,
      notifStore.summary.categories.system.is_capped
    ),
  },
])

const preferenceRows = computed(() =>
  (['interaction', 'security', 'system'] as const).map((category) => ({
    category,
    label: t(`profile.notificationCategories.${category}`),
    preference: notifStore.preferencesByCategory[category],
  }))
)

onMounted(() => {
  void notifStore.initialize()
})

onBeforeUnmount(() => {
  notifStore.stopStream()
})

function formatSummaryCount(count: number, isCapped: boolean): string {
  return isCapped ? `${count}+` : `${count}`
}

function formatOptionalCount(count: number, isCapped: boolean): string | undefined {
  if (count <= 0) return undefined
  return formatSummaryCount(count, isCapped)
}

async function ensurePreferencesLoaded() {
  if (!notifStore.preferencesLoaded || notifStore.preferencesError) {
    await notifStore.fetchPreferences(Boolean(notifStore.preferencesError))
  }
}

async function togglePreferencesPanel() {
  preferencesOpen.value = !preferencesOpen.value

  if (preferencesOpen.value) {
    await ensurePreferencesLoaded()
  }
}

async function refreshPreferences() {
  await notifStore.fetchPreferences(true)
}

async function handleMarkAllRead() {
  isMarkingAllRead.value = true
  try {
    const ok = await notifStore.markAllAsRead()
    if (ok) {
      toastStore.success(t('profile.allMarkedRead'))
      return
    }
    toastStore.error(t('notification.error.fetchFailed'))
  } finally {
    isMarkingAllRead.value = false
  }
}

async function handleArchiveRead() {
  isArchivingRead.value = true
  try {
    const ok = await notifStore.archiveRead()
    if (ok) {
      toastStore.success(t('profile.archiveReadSuccess'))
      return
    }
    toastStore.error(t('notification.error.fetchFailed'))
  } finally {
    isArchivingRead.value = false
  }
}

async function handleRetryStream() {
  const ok = await notifStore.retryStream()
  if (!ok) {
    toastStore.error(t(notifStore.streamError ?? 'notification.error.streamFailed'))
  }
}

async function handleInboxPreferenceChange(category: InboxCategory, value: boolean) {
  const ok = await notifStore.savePreferences(category, { inbox_enabled: value })
  if (!ok) {
    toastStore.error(t('notification.error.preferencesFailed'))
  }
}

async function handleEmailPreferenceChange(category: InboxCategory, value: boolean) {
  const ok = await notifStore.savePreferences(category, { email_enabled: value })
  if (!ok) {
    toastStore.error(t('notification.error.preferencesFailed'))
  }
}
</script>

<style scoped>
.notifications-page {
  min-height: 100dvh;
  padding: clamp(1rem, 2.5vw, 1.5rem) 0;
  --profile-shell-radius: clamp(0.95rem, 1.4vw, 1.05rem);
  --profile-section-radius: clamp(0.8rem, 1vw, 0.95rem);
  --profile-surface-bg: rgba(255, 255, 255, 0.98);
  --profile-surface-bg-soft: rgba(255, 255, 255, 0.94);
  --profile-surface-border: rgba(15, 23, 42, 0.08);
  --profile-surface-border-strong: rgba(15, 23, 42, 0.14);
  --profile-surface-shadow: 0 0.75rem 1.5rem -1.35rem rgba(15, 23, 42, 0.28);
  --profile-surface-shadow-hover: 0 0.95rem 1.8rem -1.3rem rgba(15, 23, 42, 0.32);
  --profile-muted-bg: rgba(15, 23, 42, 0.03);
  --profile-muted-bg-strong: rgba(15, 23, 42, 0.055);
  --profile-muted-border: rgba(15, 23, 42, 0.08);
  --profile-muted-border-strong: rgba(15, 23, 42, 0.14);
  --profile-action-bg: rgba(15, 23, 42, 0.022);
  --profile-action-bg-hover: rgba(15, 23, 42, 0.05);
  --profile-action-border: rgba(15, 23, 42, 0.08);
  --profile-action-border-strong: rgba(15, 23, 42, 0.14);
}

.notifications-header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--spacing-2);
}

.notifications-overview,
.notifications-filters,
.notifications-preferences,
.notifications-body {
  border-radius: var(--profile-shell-radius);
  border: 1px solid var(--profile-surface-border);
  background: var(--profile-surface-bg);
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.notifications-overview,
.notifications-filters,
.notifications-preferences {
  margin-bottom: clamp(0.875rem, 2vw, 1.25rem);
}

.notifications-overview {
  display: grid;
  gap: clamp(0.75rem, 1.8vw, 1rem);
  padding: clamp(0.9rem, 2.2vw, 1.15rem);
}

.notifications-overview__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-4);
  flex-wrap: wrap;
}

.notifications-overview__copy {
  display: grid;
  gap: 0.35rem;
}

.notifications-overview__eyebrow {
  margin: 0;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.notifications-overview__count {
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  line-height: 1;
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.notifications-overview__subtitle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.notifications-live-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.25rem;
  padding: 0 0.875rem;
  border-radius: calc(var(--profile-section-radius) - 0.1rem);
  border: 1px solid var(--profile-action-border);
  background: var(--profile-action-bg);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.notifications-live-pill--live {
  color: var(--color-text-secondary);
}

.notifications-live-pill--reconnecting,
.notifications-live-pill--connecting,
.notifications-live-pill--idle {
  color: var(--color-text-secondary);
}

.notifications-live-pill--degraded {
  color: var(--color-text-secondary);
}

.notifications-live-pill--live .notifications-live-pill__icon {
  color: var(--color-success);
}

.notifications-live-pill--degraded .notifications-live-pill__icon {
  color: var(--color-warning, #f59e0b);
}

.notifications-live-pill__icon {
  flex-shrink: 0;
}

.notifications-live-pill__retry {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  text-underline-offset: 0.2rem;
  cursor: pointer;
}

.notifications-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.notifications-summary-card {
  display: grid;
  gap: 0.35rem;
  padding: 0.8rem 0.95rem;
  border-radius: calc(var(--profile-section-radius) - 0.05rem);
  border: 1px solid var(--profile-action-border);
  background: var(--profile-action-bg);
}

.notifications-summary-card__label {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.notifications-summary-card__value {
  font-size: clamp(1.125rem, 2.5vw, 1.375rem);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.notifications-summary-card--unread {
  border-color: var(--profile-surface-border-strong);
}

.notifications-feedback {
  display: grid;
  gap: 0.35rem;
  padding: 0.875rem 1rem;
  border-radius: var(--profile-section-radius);
  border: 1px solid rgba(var(--color-warning-rgb, 245, 158, 11), 0.18);
  background: rgba(var(--color-warning-rgb, 245, 158, 11), 0.06);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.notifications-feedback--inline {
  margin-bottom: var(--spacing-3);
}

.notifications-feedback p {
  margin: 0;
}

.notifications-filters {
  display: grid;
  gap: 0.9rem;
  padding: clamp(0.85rem, 2vw, 1rem);
}

.notifications-filter-group {
  display: grid;
  gap: 0.55rem;
}

.notifications-filter-group__label {
  margin: 0;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.notifications-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.notification-filter-chip {
  justify-content: flex-start;
  border-color: var(--profile-action-border);
  background: var(--profile-action-bg);
  color: var(--color-text-secondary);
  box-shadow: none;
}

.notification-filter-chip:hover,
.notification-filter-chip:focus-visible {
  color: var(--color-text-primary);
  border-color: var(--profile-action-border-strong);
  background: var(--profile-action-bg-hover);
  box-shadow: none;
}

.notification-filter-chip--active,
.notification-filter-chip.page-control--active,
.notification-filter-chip[aria-pressed='true'] {
  color: var(--color-text-primary);
  border-color: var(--profile-action-border-strong);
  background: var(--profile-surface-bg-soft);
}

.notification-filter-chip__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.3rem;
  border-radius: 0.45rem;
  background: rgba(15, 23, 42, 0.06);
  color: var(--color-text-secondary);
  font-size: 0.6875rem;
  font-weight: var(--font-semibold);
  font-variant-numeric: tabular-nums;
}

.notifications-preferences {
  padding: clamp(0.85rem, 2vw, 1rem);
}

.notifications-preferences__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-4);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-4);
}

.notifications-preferences__title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.notifications-preferences__hint {
  margin: 0.35rem 0 0;
  max-width: 42rem;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.notification-preference-list {
  display: grid;
  gap: var(--spacing-3);
}

.notification-preference-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  padding: 0.8rem 0.95rem;
  border-radius: calc(var(--profile-section-radius) - 0.05rem);
  border: 1px solid var(--profile-action-border);
  background: var(--profile-action-bg);
}

.notification-preference-row__copy {
  min-width: 0;
}

.notification-preference-row__title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.notification-preference-row__description {
  margin: 0.25rem 0 0;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.notification-preference-row__controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.notification-preference-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.notifications-body {
  padding: clamp(0.9rem, 2.2vw, 1.1rem);
}

.notifications-panel-enter-active,
.notifications-panel-leave-active {
  transition:
    opacity var(--duration-fast) var(--ease-smooth),
    transform var(--duration-fast) var(--ease-smooth);
}

.notifications-panel-enter-from,
.notifications-panel-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}

@media (max-width: 1024px) {
  .notifications-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .notifications-header-actions {
    width: 100%;
    justify-content: stretch;
  }

  .notification-preference-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .notification-preference-row__controls {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 640px) {
  .notifications-summary-grid {
    grid-template-columns: 1fr;
  }

  .notifications-live-pill {
    width: 100%;
    justify-content: space-between;
  }

  .notification-filter-chip {
    width: 100%;
    justify-content: space-between;
  }

  .notification-preference-row__controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>
