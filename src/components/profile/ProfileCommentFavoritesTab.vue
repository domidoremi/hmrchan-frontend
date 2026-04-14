<template>
  <div class="comment-favorites-tab" data-testid="profile-comment-favorites-tab">
    <ProfileTabHeader
      v-if="showHeader"
      :title="$t('profile.tabs.commentFavorites')"
      :count="displayTotal"
    />

    <StateIndicator v-if="error" variant="error" :description="error" @action="fetchFavorites" />

    <div v-else-if="isLoading && items.length === 0" class="loading-skeleton">
      <div v-for="i in 4" :key="i" class="skeleton-item">
        <div class="skeleton-accent" />
        <div class="skeleton-body">
          <Skeleton width="35%" height="0.75rem" />
          <Skeleton width="100%" height="1rem" />
          <Skeleton width="50%" height="0.75rem" />
        </div>
      </div>
    </div>

    <template v-else>
      <StateIndicator
        v-if="items.length === 0"
        variant="empty"
        :description="$t('profile.noCommentFavorites')"
      />

      <div v-else class="timeline content-auto-xl">
        <article
          v-for="(item, idx) in items"
          :key="item.id"
          v-memo="getCommentFavoriteMemo(item)"
          class="timeline-item"
          :style="{ '--stagger': idx }"
        >
          <div class="timeline-rail">
            <span class="timeline-dot">
              <Bookmark :size="10" />
            </span>
            <span class="timeline-line" />
          </div>

          <div class="timeline-card glass-surface--elevated">
            <div class="card-top">
              <span v-if="item.author_username" class="card-author">
                @{{ item.author_username }}
              </span>
              <span class="card-date">{{ formatDate(item.created_at) }}</span>
            </div>

            <p class="card-text">{{ item.content }}</p>

            <div class="card-bottom">
              <div v-if="item.post_title" class="card-source">
                <Bookmark :size="12" class="source-icon" />
                <span>{{ $t('profile.commentOn') }}</span>
                <button
                  type="button"
                  class="post-link"
                  @click="goToPost(item.post_uuid || item.post_id)"
                >
                  {{ item.post_title }}
                </button>
              </div>
              <div class="card-actions">
                <span class="like-count">
                  <Heart :size="12" />
                  {{ item.likes_count || 0 }}
                </span>
                <button
                  type="button"
                  class="unfav-btn"
                  :disabled="unfavoritingId === item.id"
                  @click.stop="handleUnfavorite(item)"
                >
                  <BookmarkMinus :size="12" />
                  <span>{{ $t('profile.unfavorite') }}</span>
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>

      <LoadMoreSection
        v-if="hasMore"
        :count="items.length"
        :total="displayTotal"
        :has-more="hasMore"
        :loading="isLoadingMore"
        @load-more="loadMore"
      />
    </template>

    <ConfirmDialog
      v-model:is-open="showConfirmDialog"
      :title="$t('profile.confirmUnfavoriteComment')"
      :message="$t('profile.confirmUnfavoriteCommentMessage')"
      variant="warning"
      :confirm-text="$t('profile.unfavorite')"
      @confirm="confirmUnfavorite"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Heart, Bookmark, BookmarkMinus } from '@lucide/vue'
import { apiClient, ApiError, historyService, type MyCommentFavoriteItem } from '@/api'
import { normalizeHistorySummaryCounts } from '@/api/summaryCounts'
import { usePreferredPageSize } from '@/composables/usePreferredPageSize'
import { useToastStore } from '@/stores'
import { formatRelativeTime } from '@/utils/date'
import ProfileTabHeader from '@/components/profile/ProfileTabHeader.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const ConfirmDialog = defineAsyncComponent(() => import('@/components/ui/ConfirmDialog.vue'))

withDefaults(
  defineProps<{
    showHeader?: boolean
  }>(),
  {
    showHeader: true,
  }
)

const router = useRouter()
const { t } = useI18n()
const toastStore = useToastStore()

const items = ref<MyCommentFavoriteItem[]>([])
const unfavoritingId = ref<string | number | null>(null)
const showConfirmDialog = ref(false)
const pendingUnfavoriteItem = ref<MyCommentFavoriteItem | null>(null)
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const nextCursor = ref<string | null>(null)
const total = ref<number | null>(null)
const pageSize = usePreferredPageSize({ fallback: 20, min: 10, max: 50 })
let commentFavoritesController: AbortController | null = null
let commentFavoritesRequestToken = 0

const hasMoreState = ref(false)
const hasMore = computed(() => hasMoreState.value)
const displayTotal = computed(() => total.value ?? (items.value.length || undefined))

function abortCommentFavoritesRequest() {
  commentFavoritesController?.abort()
  commentFavoritesController = null
}

async function fetchFavorites(reset = true): Promise<boolean> {
  if (reset) {
    abortCommentFavoritesRequest()
    isLoading.value = true
    nextCursor.value = null
  } else {
    if (isLoadingMore.value || isLoading.value) return false
    isLoadingMore.value = true
  }
  error.value = null
  const controller = new AbortController()
  commentFavoritesController = controller
  const requestToken = ++commentFavoritesRequestToken

  try {
    const res = await historyService.getMyCommentFavorites(
      {
        limit: pageSize.value,
        cursor: reset ? null : nextCursor.value,
      },
      {
        signal: controller.signal,
        skipErrorToast: true,
      }
    )
    if (controller.signal.aborted || requestToken !== commentFavoritesRequestToken) return false
    const nextItems = Array.isArray(res.items) ? res.items : []

    if (reset) {
      items.value = nextItems
    } else {
      const existingIds = new Set(items.value.map((item) => String(item.id)))
      items.value.push(...nextItems.filter((item) => !existingIds.has(String(item.id))))
    }
    nextCursor.value = res.next_cursor ?? null
    hasMoreState.value = Boolean(res.has_more && res.next_cursor)
    if (reset) {
      void refreshCommentFavoritesSummary()
    }
    return true
  } catch (err) {
    if (controller.signal.aborted || requestToken !== commentFavoritesRequestToken) return false
    if (items.value.length === 0) {
      error.value = err instanceof ApiError ? err.message : t('common.error')
    }
    return false
  } finally {
    if (requestToken === commentFavoritesRequestToken) {
      isLoading.value = false
      isLoadingMore.value = false
      if (commentFavoritesController === controller) {
        commentFavoritesController = null
      }
    }
  }
}

async function loadMore() {
  if (!hasMore.value || isLoading.value || isLoadingMore.value) return
  await fetchFavorites(false)
}

async function refreshCommentFavoritesSummary() {
  try {
    const summary = await historyService.getSummary()
    const counts = normalizeHistorySummaryCounts(summary)
    total.value = counts.commentFavorites
    if (total.value === null) {
      const stats = await historyService.getStats()
      total.value = normalizeHistorySummaryCounts(stats).commentFavorites
    }
  } catch {
    total.value = items.value.length > 0 ? items.value.length : null
  }
}

function getCommentFavoriteMemo(item: MyCommentFavoriteItem) {
  return [
    item.id,
    item.created_at,
    item.likes_count ?? 0,
    item.author_username ?? '',
    item.post_id ?? item.post_uuid ?? '',
    item.post_title ?? '',
  ]
}

watch(pageSize, () => {
  if (items.value.length === 0 && !isLoading.value) return
  void fetchFavorites(true)
})

function formatDate(dateStr: string): string {
  return formatRelativeTime(dateStr, t)
}

function goToPost(postId?: string) {
  if (postId) router.push(`/post/${postId}`)
}

function handleUnfavorite(item: MyCommentFavoriteItem) {
  pendingUnfavoriteItem.value = item
  showConfirmDialog.value = true
}

async function confirmUnfavorite() {
  if (!pendingUnfavoriteItem.value) return
  const item = pendingUnfavoriteItem.value
  unfavoritingId.value = item.id

  try {
    await apiClient.delete(`/comments/${item.id}/favorite`)
    items.value = items.value.filter((c) => c.id !== item.id)
    if (typeof total.value === 'number') {
      total.value = Math.max(0, total.value - 1)
    }
    toastStore.success(t('profile.unfavoriteSuccess'))
  } catch (err) {
    toastStore.error(err instanceof ApiError ? err.message : t('common.error'))
  } finally {
    unfavoritingId.value = null
    pendingUnfavoriteItem.value = null
  }
}

onMounted(() => {
  void fetchFavorites()
})

onUnmounted(() => {
  abortCommentFavoritesRequest()
})
</script>

<style scoped>
.comment-favorites-tab {
  min-height: 20rem;
  --profile-tab-header-count-color: #f59e0b;
}

/* Skeleton */
.loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  padding-left: clamp(1.5rem, 3vw, 2.5rem);
}

.skeleton-item {
  display: flex;
  gap: var(--spacing-3);
}

.skeleton-accent {
  width: 3px;
  border-radius: calc(var(--radius-sm) / 2);
  background: rgba(245, 158, 11, 0.15);
  flex-shrink: 0;
}

.skeleton-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  background: var(--profile-surface-bg-soft);
  border: 1px solid var(--profile-surface-border);
  border-radius: var(--profile-section-radius);
}

/* ===== Timeline ===== */
.timeline {
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 1.5vw, 0.75rem);
}

.timeline-item {
  display: flex;
  gap: clamp(0.75rem, 2vw, 1.25rem);
  animation: stagger-fade-in var(--duration-slow) var(--ease-out-smooth) forwards;
  animation-delay: calc(var(--stagger) * 60ms);
  opacity: 0;
}

/* Rail */
.timeline-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 1.25rem;
  padding-top: clamp(1rem, 2vw, 1.25rem);
}

.timeline-dot {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: var(--radius-full);
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
  transition: transform var(--duration-fast) var(--ease-bounce-soft);
}

.timeline-item:hover .timeline-dot {
  transform: scale(1.01);
  background: rgba(245, 158, 11, 0.2);
}

.timeline-line {
  flex: 1;
  width: 2px;
  background: linear-gradient(to bottom, rgba(245, 158, 11, 0.15), transparent);
  margin-top: var(--spacing-1);
}

/* Card */
.timeline-card {
  flex: 1;
  min-width: 0;
  padding: clamp(0.875rem, 2vw, 1.25rem);
  border-radius: var(--profile-section-radius);
  border: 1px solid var(--profile-surface-border);
  background: var(--profile-surface-bg-soft);
  box-shadow: var(--profile-surface-shadow);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
  transition:
    transform var(--duration-fast) var(--ease-out-smooth),
    border-color var(--duration-fast) var(--ease-smooth),
    box-shadow var(--duration-fast) var(--ease-smooth);
}

.timeline-card:hover {
  transform: none;
  border-color: var(--profile-surface-border-strong);
  box-shadow: var(--profile-surface-shadow-hover);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
  gap: var(--spacing-2);
}

.card-author {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-primary);
}

.card-date {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.card-text {
  margin: 0;
  color: var(--color-text-primary);
  line-height: 1.6;
  font-size: var(--text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
}

/* Bottom */
.card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-3);
  padding-top: var(--spacing-3);
  border-top: 1px solid var(--profile-muted-border);
  gap: var(--spacing-3);
}

.card-source {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  flex: 1;
  min-width: 0;
}

.source-icon {
  color: #f59e0b;
  flex-shrink: 0;
}

.post-link {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
  font: inherit;
  font-weight: var(--font-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--duration-fast) var(--ease-smooth);
}

.post-link:hover {
  color: var(--color-primary-dark);
  text-decoration: underline;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex-shrink: 0;
}

.like-count {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--text-xs);
  color: var(--profile-chip-text);
  padding: 0.0625rem 0.375rem;
  background: var(--profile-chip-bg);
  border: 1px solid var(--profile-chip-border);
  border-radius: var(--radius-full);
}

/* Unfavorite */
.unfav-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  background: var(--profile-action-bg);
  border: 1px solid var(--profile-action-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  opacity: 0;
  transition:
    opacity var(--duration-fast) var(--ease-smooth),
    border-color var(--duration-fast) var(--ease-smooth),
    color var(--duration-fast) var(--ease-smooth),
    background var(--duration-fast) var(--ease-smooth);
}

.timeline-card:hover .unfav-btn {
  opacity: 1;
}

.unfav-btn:hover:not(:disabled) {
  border-color: #f59e0b;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.unfav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .timeline-rail {
    width: 1rem;
  }

  .timeline-dot {
    width: 1rem;
    height: 1rem;
  }

  .unfav-btn {
    opacity: 1;
  }

  .card-bottom {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
