<template>
  <div class="comments-tab" data-testid="profile-comments-tab">
    <StateIndicator v-if="error" variant="error" :description="error" @action="fetchComments" />

    <div v-else-if="isLoading && comments.length === 0" class="skeleton-timeline">
      <div v-for="i in 4" :key="i" class="skeleton-item">
        <div class="skeleton-dot" />
        <div class="skeleton-card">
          <Skeleton width="40%" height="0.75rem" />
          <Skeleton width="100%" height="1rem" />
          <Skeleton width="60%" height="0.75rem" />
        </div>
      </div>
    </div>

    <template v-else>
      <StateIndicator
        v-if="comments.length === 0"
        variant="empty"
        :description="$t('profile.noComments')"
      />

      <div v-else class="timeline content-auto-xl">
        <article
          v-for="(comment, idx) in comments"
          :key="comment.id"
          v-memo="getUserCommentMemo(comment)"
          class="timeline-item"
          :class="{ 'timeline-item--deleting': deletingId === comment.id }"
          :style="{ '--i': idx }"
        >
          <div class="timeline-rail">
            <div class="timeline-dot">
              <MessageCircle :size="12" />
            </div>
            <div class="timeline-line" />
          </div>

          <div class="timeline-card">
            <div class="card-header">
              <span class="card-time">{{ formatDate(comment.created_at) }}</span>
              <div class="card-actions">
                <span v-if="comment.replies_count" class="reply-count">
                  {{ comment.replies_count }} {{ $t('comment.replies') }}
                </span>
                <button
                  type="button"
                  class="delete-btn"
                  :disabled="deletingId === comment.id"
                  :aria-label="$t('common.delete')"
                  @click.stop="handleDelete(comment.id)"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>

            <p class="card-body">{{ comment.content }}</p>

            <div class="card-footer">
              <button
                v-if="comment.post_title"
                type="button"
                class="post-link"
                @click="goToPost(comment.post_id)"
              >
                <ExternalLink :size="12" />
                {{ comment.post_title }}
              </button>
              <span class="like-count">
                <Heart :size="12" :class="{ liked: comment.likes_count > 0 }" />
                {{ comment.likes_count || 0 }}
              </span>
            </div>
          </div>
        </article>
      </div>

      <LoadMoreSection
        v-if="hasMore"
        :count="comments.length"
        :total="displayTotal"
        :has-more="hasMore"
        :loading="isLoadingMore"
        @load-more="loadMore"
      />
    </template>

    <ConfirmDialog
      v-model:is-open="showConfirmDialog"
      :title="$t('comment.confirmDeleteTitle')"
      :message="$t('comment.confirmDeleteMessage')"
      variant="danger"
      :confirm-text="$t('common.delete')"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Heart, MessageCircle, Trash2, ExternalLink } from '@lucide/vue'
import { apiClient, ApiError, historyService, type MyCommentHistoryItem } from '@/api'
import { normalizeHistorySummaryCounts } from '@/api/summaryCounts'
import { usePreferredPageSize } from '@/composables/usePreferredPageSize'
import { useToastStore } from '@/stores'
import { formatRelativeTime } from '@/utils/date'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { defineAsyncComponent } from 'vue'

const ConfirmDialog = defineAsyncComponent(() => import('@/components/ui/ConfirmDialog.vue'))

interface UserComment {
  id: string
  content: string
  post_id: string
  post_title?: string
  parent_id?: string | null
  likes_count: number
  replies_count?: number
  created_at: string
}

const router = useRouter()
const { t } = useI18n()
const toastStore = useToastStore()

const comments = ref<UserComment[]>([])
const showConfirmDialog = ref(false)
const pendingDeleteId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const nextCursor = ref<string | null>(null)
const total = ref<number | null>(null)
const pageSize = usePreferredPageSize({ fallback: 20, min: 10, max: 50 })
let commentsController: AbortController | null = null
let commentsRequestToken = 0

const hasMoreState = ref(false)
const hasMore = computed(() => hasMoreState.value)
const displayTotal = computed(() => total.value ?? (comments.value.length || undefined))

function normalizeUserComment(item: MyCommentHistoryItem): UserComment {
  return {
    id: String(item.id),
    content: item.content,
    post_id: item.post_id ?? item.post_uuid ?? '',
    ...(item.post_title ? { post_title: item.post_title } : {}),
    ...(item.parent_id !== undefined ? { parent_id: item.parent_id } : {}),
    likes_count: item.likes_count ?? item.like_count ?? 0,
    replies_count: item.replies_count ?? item.reply_count,
    created_at: item.created_at,
  }
}

function abortCommentsRequest() {
  commentsController?.abort()
  commentsController = null
}

async function fetchComments(reset = true): Promise<boolean> {
  if (reset) {
    abortCommentsRequest()
    isLoading.value = true
    nextCursor.value = null
  } else {
    if (isLoadingMore.value || isLoading.value) return false
    isLoadingMore.value = true
  }
  error.value = null
  const controller = new AbortController()
  commentsController = controller
  const requestToken = ++commentsRequestToken

  try {
    const res = await historyService.getMyComments(
      {
        limit: pageSize.value,
        cursor: reset ? null : nextCursor.value,
      },
      {
        signal: controller.signal,
        skipErrorToast: true,
      }
    )
    if (controller.signal.aborted || requestToken !== commentsRequestToken) return false
    const nextItems = (Array.isArray(res.items) ? res.items : []).map(normalizeUserComment)

    if (reset) {
      comments.value = nextItems
    } else {
      const existingIds = new Set(comments.value.map((comment) => comment.id))
      comments.value.push(...nextItems.filter((comment) => !existingIds.has(comment.id)))
    }
    nextCursor.value = res.next_cursor ?? null
    hasMoreState.value = Boolean(res.has_more && res.next_cursor)
    if (reset) {
      void refreshCommentsSummary()
    }
    return true
  } catch (err) {
    if (controller.signal.aborted || requestToken !== commentsRequestToken) return false
    if (comments.value.length === 0) {
      error.value = err instanceof ApiError ? err.message : t('common.error')
    }
    return false
  } finally {
    if (requestToken === commentsRequestToken) {
      isLoading.value = false
      isLoadingMore.value = false
      if (commentsController === controller) {
        commentsController = null
      }
    }
  }
}

async function loadMore() {
  if (!hasMore.value || isLoading.value || isLoadingMore.value) return
  await fetchComments(false)
}

async function refreshCommentsSummary() {
  try {
    const summary = await historyService.getSummary({ skipErrorToast: true })
    const counts = normalizeHistorySummaryCounts(summary)
    total.value = counts.comments
    if (total.value === null) {
      const stats = await historyService.getStats()
      total.value = normalizeHistorySummaryCounts(stats).comments
    }
  } catch {
    total.value = comments.value.length > 0 ? comments.value.length : null
  }
}

function getUserCommentMemo(comment: UserComment) {
  return [
    comment.id,
    comment.created_at,
    comment.likes_count ?? 0,
    comment.replies_count ?? 0,
    comment.post_id,
    comment.post_title ?? '',
  ]
}

watch(pageSize, () => {
  if (comments.value.length === 0 && !isLoading.value) return
  void fetchComments(true)
})

function formatDate(dateStr: string): string {
  return formatRelativeTime(dateStr, t)
}

function goToPost(postId: string) {
  router.push(`/post/${postId}`)
}

function handleDelete(commentId: string) {
  pendingDeleteId.value = commentId
  showConfirmDialog.value = true
}

async function confirmDelete() {
  if (!pendingDeleteId.value) return
  const commentId = pendingDeleteId.value
  deletingId.value = commentId

  try {
    await apiClient.delete(`/comments/${commentId}`)
    comments.value = comments.value.filter((c) => c.id !== commentId)
    if (typeof total.value === 'number') {
      total.value = Math.max(0, total.value - 1)
    }
    toastStore.success(t('comment.deleteSuccess'))
  } catch (err) {
    toastStore.error(err instanceof ApiError ? err.message : t('comment.error.deleteFailed'))
  } finally {
    pendingDeleteId.value = null
    deletingId.value = null
  }
}

onMounted(() => {
  void fetchComments()
})

onUnmounted(() => {
  abortCommentsRequest()
})
</script>

<style scoped>
.comments-tab {
  min-height: 20rem;
}

/* ===== Skeleton ===== */
.skeleton-timeline {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  padding-left: clamp(1.5rem, 3vw, 2.5rem);
}

.skeleton-item {
  display: flex;
  gap: var(--spacing-3);
  align-items: flex-start;
}

.skeleton-dot {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: var(--radius-full);
  background: var(--glass-bg-medium);
  flex-shrink: 0;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}

.skeleton-card {
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
  animation-delay: calc(var(--i) * 60ms);
  opacity: 0;
}

.timeline-item--deleting {
  opacity: 0.4;
  pointer-events: none;
  transform: scale(0.97);
  transition:
    opacity var(--duration-normal) var(--ease-smooth),
    transform var(--duration-normal) var(--ease-smooth);
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
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
  transition: transform var(--duration-fast) var(--ease-bounce-soft);
}

.timeline-item:hover .timeline-dot {
  transform: scale(1.01);
  background: rgba(var(--color-primary-rgb), 0.2);
}

.timeline-line {
  flex: 1;
  width: 2px;
  background: linear-gradient(to bottom, rgba(var(--color-primary-rgb), 0.15), transparent);
  margin-top: var(--spacing-1);
}

/* Card */
.timeline-card {
  flex: 1;
  min-width: 0;
  padding: clamp(0.875rem, 2vw, 1.25rem);
  background: var(--profile-surface-bg-soft);
  backdrop-filter: blur(var(--blur-md));
  -webkit-backdrop-filter: blur(var(--blur-md));
  border: 1px solid var(--profile-surface-border);
  border-radius: var(--profile-section-radius);
  box-shadow: var(--profile-surface-shadow);
  position: relative;
  overflow: hidden;
  transition:
    transform var(--duration-normal) var(--ease-out-smooth),
    box-shadow var(--duration-normal) var(--ease-out-smooth),
    border-color var(--duration-fast) var(--ease-smooth);
}

.timeline-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 0.0625rem;
  background: var(--highlight-gradient);
  opacity: 0.6;
}

.timeline-card:hover {
  transform: var(--lift-sm);
  box-shadow: var(--profile-surface-shadow-hover);
  border-color: var(--profile-surface-border-strong);
}

/* Card Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
  gap: var(--spacing-2);
}

.card-time {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  font-weight: var(--font-medium);
}

.card-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.reply-count {
  font-size: var(--text-xs);
  color: var(--profile-chip-text);
  padding: 0.0625rem 0.375rem;
  background: var(--profile-chip-bg);
  border: 1px solid var(--profile-chip-border);
  border-radius: var(--radius-full);
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--radius-full);
  background: var(--profile-action-bg);
  border: 1px solid var(--profile-action-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  opacity: 0;
  transition:
    opacity var(--duration-fast) var(--ease-smooth),
    color var(--duration-fast) var(--ease-smooth),
    background var(--duration-fast) var(--ease-smooth),
    border-color var(--duration-fast) var(--ease-smooth),
    transform var(--duration-fast) var(--ease-bounce-soft);
}

.timeline-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover:not(:disabled) {
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.2);
  transform: none;
}

.delete-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Card Body */
.card-body {
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

/* Card Footer */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-3);
  padding-top: var(--spacing-3);
  border-top: 1px solid var(--profile-muted-border);
  gap: var(--spacing-3);
}

.post-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
  font: inherit;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  transition: color var(--duration-fast) var(--ease-smooth);
}

.post-link:hover {
  color: var(--color-primary-dark);
  text-decoration: underline;
}

.like-count {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.liked {
  color: var(--color-error);
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

  .delete-btn {
    opacity: 1;
  }

  .card-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
