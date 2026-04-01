<template>
  <div class="notifications-tab">
    <StateIndicator
      v-if="error && notifications.length === 0"
      variant="error"
      :description="error"
      @action="fetchNotifications"
    />

    <div v-else-if="isLoading && notifications.length === 0" class="notifications-skeleton">
      <div v-for="i in 4" :key="i" class="notification-skeleton">
        <Skeleton variant="avatar" />
        <div class="notification-skeleton__content">
          <Skeleton width="55%" height="1rem" />
          <Skeleton width="85%" height="0.875rem" />
          <Skeleton width="40%" height="0.875rem" />
        </div>
      </div>
    </div>

    <template v-else>
      <StateIndicator
        v-if="notifications.length === 0"
        variant="empty"
        :description="emptyDescription"
      />

      <div v-else class="notifications-list">
        <article
          v-for="message in notifications"
          :key="message.id"
          class="notification-item"
          :class="{
            'notification-item--unread': !message.is_read,
            'notification-item--archived': Boolean(message.archived_at),
            'notification-item--actionable': Boolean(resolveActionTarget(message.action_url)),
          }"
          :role="resolveActionTarget(message.action_url) ? 'button' : undefined"
          :tabindex="resolveActionTarget(message.action_url) ? 0 : undefined"
          @click="handleMessageClick(message)"
          @keydown.enter.prevent="handleMessageClick(message)"
          @keydown.space.prevent="handleMessageClick(message)"
        >
          <div class="notification-item__media">
            <Avatar
              v-if="message.last_actor"
              :src="resolveAvatarSrc(message.last_actor.avatar_url)"
              :fallback="resolveActorFallback(message)"
              :alt="message.last_actor.username"
              size="default"
            />
            <div v-else class="notification-item__icon">
              <AnimatedIcon
                :name="getNotificationAnimation(message)"
                :fallback-icon="getNotificationIcon(message)"
                size="sm"
              />
            </div>
          </div>

          <div class="notification-item__content">
            <div class="notification-item__header">
              <div class="notification-item__headline-wrap">
                <p class="notification-item__title">{{ message.title }}</p>
                <p v-if="message.body" class="notification-item__body">{{ message.body }}</p>
              </div>
              <ChevronRight
                v-if="resolveActionTarget(message.action_url)"
                :size="16"
                class="notification-item__chevron"
              />
            </div>

            <div class="notification-item__meta-row">
              <span v-if="message.last_actor" class="notification-item__actor">
                {{ message.last_actor.username }}
              </span>
              <span class="notification-item__time">{{ formatDate(message.last_event_at) }}</span>
            </div>

            <div class="notification-item__tag-row">
              <span class="notification-chip">
                {{ t(`profile.notificationCategories.${message.category}`) }}
              </span>
              <span class="notification-chip notification-chip--priority">
                {{ t(`profile.notificationPriorities.${message.priority}`) }}
              </span>
              <span
                v-if="message.aggregate_count > 1"
                class="notification-chip notification-chip--count"
              >
                {{ t('profile.notificationAggregated', { count: message.aggregate_count }) }}
              </span>
              <span
                v-if="message.archived_at"
                class="notification-chip notification-chip--archived"
              >
                {{ t('profile.notificationStatus.archived') }}
              </span>
            </div>
          </div>

          <div class="notification-item__actions">
            <Button
              v-if="!message.is_read"
              variant="ghost"
              size="sm"
              :loading="pendingReadId === message.id"
              @click.stop="handleMarkAsRead(message.id)"
            >
              {{ t('profile.markAsRead') }}
            </Button>
            <Button
              v-if="!message.archived_at"
              variant="ghost"
              size="sm"
              :loading="pendingArchiveId === message.id"
              @click.stop="handleArchive(message.id)"
            >
              {{ t('profile.archiveAction') }}
            </Button>
          </div>
        </article>
      </div>

      <div v-if="hasMore" class="notifications-load-more">
        <Button variant="secondary" size="sm" :loading="isLoadingMore" @click="loadMore">
          {{ t('common.loadMore') }}
        </Button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Bell, ChevronRight, Heart, MessageCircle, ShieldAlert } from '@lucide/vue'
import { useNotificationsStore } from '@/stores'
import { type InboxMessage } from '@/api/inboxService'
import { formatRelativeTime } from '@/utils/date'
import { isSafeRedirect } from '@/utils/security'
import { resolveAvatarSrc, getAvatarFallbackLabel } from '@/utils/avatarPresentation'
import Button from '@/components/ui/Button.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import Avatar from '@/components/ui/Avatar.vue'

const { t } = useI18n()
const router = useRouter()
const notifStore = useNotificationsStore()

const notifications = computed(() => notifStore.items)
const isLoading = computed(() => notifStore.isLoading)
const isLoadingMore = computed(() => notifStore.isLoading && notifStore.items.length > 0)
const error = computed(() => (notifStore.error ? t(notifStore.error) : null))
const hasMore = computed(() => notifStore.hasMore)
const emptyDescription = computed(() => {
  if (notifStore.status === 'archived') return t('profile.noArchivedNotifications')
  if (notifStore.status === 'unread') return t('profile.noUnreadNotifications')
  return t('profile.noNotifications')
})

const pendingReadId = ref<string | null>(null)
const pendingArchiveId = ref<string | null>(null)

type NavigationTarget =
  | {
      kind: 'internal'
      to: string
    }
  | {
      kind: 'external'
      to: string
    }

function getNotificationIcon(message: InboxMessage) {
  if (message.category === 'security') return ShieldAlert
  if (message.event_type.includes('like')) return Heart
  if (message.event_type.includes('comment') || message.event_type.includes('reply')) {
    return MessageCircle
  }
  return Bell
}

function getNotificationAnimation(message: InboxMessage) {
  if (message.category === 'security') return 'explore'
  if (message.event_type.includes('like')) return 'heart'
  if (message.event_type.includes('comment') || message.event_type.includes('reply')) {
    return 'sparkle'
  }
  return 'sparkle'
}

function fetchNotifications() {
  return notifStore.fetchNotifications(true)
}

function loadMore() {
  return notifStore.loadMore()
}

async function handleMarkAsRead(messageId: string) {
  pendingReadId.value = messageId
  try {
    await notifStore.markAsRead(messageId)
  } finally {
    pendingReadId.value = null
  }
}

async function handleArchive(messageId: string) {
  pendingArchiveId.value = messageId
  try {
    await notifStore.archiveMessage(messageId)
  } finally {
    pendingArchiveId.value = null
  }
}

function resolveActorFallback(message: InboxMessage): string {
  return getAvatarFallbackLabel(message.last_actor?.username, message.title)
}

function resolveActionTarget(actionUrl: string | null | undefined): NavigationTarget | null {
  if (!actionUrl) return null

  if (actionUrl.startsWith('/') && !actionUrl.startsWith('//')) {
    return {
      kind: 'internal',
      to: actionUrl,
    }
  }

  if (!isSafeRedirect(actionUrl)) {
    return null
  }

  try {
    const parsed = new URL(actionUrl, window.location.origin)
    if (parsed.origin === window.location.origin) {
      return {
        kind: 'internal',
        to: `${parsed.pathname}${parsed.search}${parsed.hash}`,
      }
    }

    return {
      kind: 'external',
      to: parsed.toString(),
    }
  } catch {
    return null
  }
}

async function handleMessageClick(message: InboxMessage) {
  const target = resolveActionTarget(message.action_url)
  if (!target) return

  if (!message.is_read) {
    await notifStore.markAsRead(message.id)
  }

  if (target.kind === 'internal') {
    await router.push(target.to)
    return
  }

  window.location.assign(target.to)
}

function formatDate(dateStr: string): string {
  return formatRelativeTime(dateStr, t)
}
</script>

<style scoped>
.notifications-tab {
  min-height: 20rem;
}

.notifications-skeleton {
  display: grid;
  gap: var(--spacing-3);
}

.notification-skeleton {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--spacing-3);
  padding: clamp(0.875rem, 2vw, 1rem);
  border: 1px solid var(--profile-surface-border);
  border-radius: var(--profile-section-radius);
  background: var(--profile-surface-bg);
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.notification-skeleton__content {
  display: grid;
  gap: 0.5rem;
}

.notifications-list {
  display: grid;
  gap: var(--spacing-3);
}

.notification-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--spacing-4);
  padding: clamp(0.875rem, 2vw, 1.125rem);
  border: 1px solid var(--profile-surface-border);
  border-radius: var(--profile-section-radius);
  background: var(--profile-surface-bg);
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  transition:
    border-color var(--duration-fast) var(--ease-smooth),
    background var(--duration-fast) var(--ease-smooth),
    box-shadow var(--duration-fast) var(--ease-smooth);
}

.notification-item--actionable {
  cursor: pointer;
}

.notification-item--actionable:hover,
.notification-item--actionable:focus-visible {
  outline: none;
  border-color: var(--profile-surface-border-strong);
  background: var(--profile-muted-bg);
  box-shadow: none;
}

.notification-item--unread {
  border-color: var(--profile-surface-border-strong);
  background: var(--profile-surface-bg);
  box-shadow: inset 0.1875rem 0 0 rgba(var(--color-primary-rgb), 0.3);
}

.notification-item--archived {
  opacity: 0.72;
}

.notification-item__media {
  display: flex;
  align-items: flex-start;
  padding-top: 0.125rem;
}

.notification-item__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: calc(var(--profile-section-radius) - 0.1rem);
  border: 1px solid var(--profile-muted-border);
  background: var(--profile-muted-bg);
  color: var(--color-text-secondary);
}

.notification-item__content {
  display: grid;
  gap: 0.625rem;
  min-width: 0;
}

.notification-item__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-3);
}

.notification-item__headline-wrap {
  display: grid;
  gap: 0.375rem;
  min-width: 0;
}

.notification-item__title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  line-height: 1.5;
}

.notification-item__body {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.notification-item__chevron {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
}

.notification-item__meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.notification-item__actor {
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.notification-item__tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.notification-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  padding: 0 0.625rem;
  border-radius: 0.6rem;
  border: 1px solid var(--profile-action-border);
  background: var(--profile-muted-bg);
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.notification-chip--priority {
  color: var(--color-text-primary);
}

.notification-chip--count {
  color: var(--color-text-secondary);
  border-color: var(--profile-action-border);
}

.notification-chip--archived {
  color: var(--color-text-tertiary);
}

.notification-item__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  justify-content: center;
}

.notification-item__actions :deep(.btn) {
  min-width: 6.5rem;
  border-radius: 0.65rem;
  border: 1px solid var(--profile-action-border);
  background: var(--profile-action-bg);
  color: var(--color-text-secondary);
  box-shadow: none !important;
}

.notification-item__actions :deep(.btn:hover:not(:disabled)),
.notification-item__actions :deep(.btn:focus-visible) {
  border-color: var(--profile-action-border-strong);
  background: var(--profile-action-bg-hover);
  color: var(--color-text-primary);
}

.notifications-load-more {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-5);
}

.notifications-load-more :deep(.btn) {
  min-width: 8rem;
  border-radius: 0.7rem;
  box-shadow: none !important;
}

@media (max-width: 768px) {
  .notification-item {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .notification-item__actions {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-end;
  }
}
</style>

<style>
[data-color-mode='dark'] .notifications-tab .notification-item--unread {
  background: var(--profile-surface-bg);
  box-shadow: inset 0.1875rem 0 0 rgba(var(--color-primary-rgb), 0.45);
}

#app .notifications-tab .notification-skeleton,
#app .notifications-tab .notification-item {
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

#app .notifications-tab .notification-item:hover,
#app .notifications-tab .notification-item:focus-visible {
  box-shadow: none !important;
}

#app[data-preset='material-calm'] .notifications-tab .notification-item,
#app[data-preset='sketch-doodle'] .notifications-tab .notification-item,
#app[data-preset='material-calm'] .notifications-tab .notification-skeleton,
#app[data-preset='sketch-doodle'] .notifications-tab .notification-skeleton {
  border-radius: var(--radius-lg);
}
</style>
