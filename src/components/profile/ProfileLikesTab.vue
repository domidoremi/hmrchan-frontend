<template>
  <div class="likes-tab">
    <div class="tab-header">
      <h2 class="tab-title">{{ $t('profile.tabs.likes') }}</h2>
      <span v-if="total > 0" class="item-count">{{ total }}</span>
    </div>

    <StateIndicator v-if="error" variant="error" :description="error" @action="fetchLikes" />

    <div v-else-if="isLoading && comments.length === 0" class="loading-skeleton">
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
        v-if="comments.length === 0"
        variant="empty"
        :description="$t('profile.noLikes')"
      />

      <div v-else class="timeline">
        <article
          v-for="(comment, idx) in comments"
          :key="comment.id"
          v-memo="getLikedCommentMemo(comment)"
          class="timeline-item"
          :style="{ '--stagger': idx }"
        >
          <div class="timeline-rail">
            <span class="timeline-dot">
              <Heart :size="10" />
            </span>
            <span class="timeline-line" />
          </div>

          <div class="timeline-card glass-card-enhanced">
            <div class="card-top">
              <span class="comment-date">{{ formatDate(comment.created_at) }}</span>
              <div class="card-stats">
                <span v-if="comment.reply_count" class="stat-chip">
                  <MessageCircle :size="11" />
                  {{ comment.reply_count }}
                </span>
                <span class="stat-chip">
                  <Heart :size="11" />
                  {{ comment.like_count || 0 }}
                </span>
              </div>
            </div>

            <p class="comment-text">{{ comment.content }}</p>

            <div class="card-bottom">
              <div v-if="comment.post_title" class="comment-source">
                <Heart :size="12" class="source-icon" />
                <span>{{ $t('profile.likedOn') }}</span>
                <button type="button" class="post-link" @click="goToPost(comment.post_uuid)">
                  {{ comment.post_title }}
                </button>
              </div>
              <button
                type="button"
                class="unlike-btn"
                :disabled="unlikingId === comment.id"
                @click.stop="handleUnlike(comment)"
              >
                <HeartOff :size="12" />
                <span>{{ $t('profile.unlike') }}</span>
              </button>
            </div>
          </div>
        </article>
      </div>

      <LoadMoreSection
        v-if="hasMore"
        :count="comments.length"
        :total="total"
        :has-more="hasMore"
        :loading="isLoadingMore"
        @load-more="loadMore"
      />
    </template>

    <ConfirmDialog
      v-model:is-open="showConfirmDialog"
      :title="$t('profile.confirmUnlike')"
      :message="$t('profile.confirmUnlikeMessage')"
      variant="warning"
      :confirm-text="$t('profile.unlike')"
      @confirm="confirmUnlike"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Heart, MessageCircle, HeartOff } from 'lucide-vue-next'
import { apiClient, ApiError } from '@/api'
import { usePreferredPageSize } from '@/composables/usePreferredPageSize'
import { useToastStore } from '@/stores'
import { formatRelativeTime } from '@/utils/date'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { defineAsyncComponent } from 'vue'

const ConfirmDialog = defineAsyncComponent(() => import('@/components/ui/ConfirmDialog.vue'))

interface LikedComment {
  id: number
  uuid: string
  content: string
  post_uuid: string
  post_title?: string
  like_count: number
  reply_count?: number
  created_at: string
}

const router = useRouter()
const { t } = useI18n()
const toastStore = useToastStore()

const comments = ref<LikedComment[]>([])
const unlikingId = ref<number | null>(null)
const showConfirmDialog = ref(false)
const pendingUnlikeComment = ref<LikedComment | null>(null)
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const total = ref(0)
const pageSize = usePreferredPageSize({ fallback: 20, min: 10, max: 50 })
let likesController: AbortController | null = null
let likesRequestToken = 0

const hasMore = computed(() => comments.value.length < total.value)

function abortLikesRequest() {
  likesController?.abort()
  likesController = null
}

async function fetchLikes(reset = true): Promise<boolean> {
  if (reset) {
    abortLikesRequest()
    isLoading.value = true
    page.value = 1
  } else {
    if (isLoadingMore.value || isLoading.value) return false
    isLoadingMore.value = true
  }
  error.value = null
  const controller = new AbortController()
  likesController = controller
  const requestToken = ++likesRequestToken

  try {
    const res = await apiClient.get<{
      items: LikedComment[]
      total: number
      page: number
      page_size: number
      has_more: boolean
    }>(`/history/my-likes?page=${page.value}&page_size=${pageSize.value}`, {
      signal: controller.signal,
      skipErrorToast: true,
    })
    if (controller.signal.aborted || requestToken !== likesRequestToken) return false

    if (reset) {
      comments.value = res.items
    } else {
      comments.value.push(...res.items)
    }
    total.value = res.total
    return true
  } catch (err) {
    if (controller.signal.aborted || requestToken !== likesRequestToken) return false
    if (comments.value.length === 0) {
      error.value = err instanceof ApiError ? err.message : t('common.error')
    }
    return false
  } finally {
    if (requestToken === likesRequestToken) {
      isLoading.value = false
      isLoadingMore.value = false
      if (likesController === controller) {
        likesController = null
      }
    }
  }
}

async function loadMore() {
  if (!hasMore.value || isLoading.value || isLoadingMore.value) return
  const nextPage = page.value + 1
  page.value = nextPage
  const ok = await fetchLikes(false)
  if (!ok) {
    page.value = nextPage - 1
  }
}

function getLikedCommentMemo(comment: LikedComment) {
  return [
    comment.id,
    comment.created_at,
    comment.like_count ?? 0,
    comment.reply_count ?? 0,
    comment.post_uuid,
    comment.post_title ?? '',
  ]
}

watch(pageSize, () => {
  if (comments.value.length === 0 && !isLoading.value) return
  void fetchLikes(true)
})

function formatDate(dateStr: string): string {
  return formatRelativeTime(dateStr, t)
}

function goToPost(postUuid: string) {
  router.push(`/post/${postUuid}`)
}

function handleUnlike(comment: LikedComment) {
  pendingUnlikeComment.value = comment
  showConfirmDialog.value = true
}

async function confirmUnlike() {
  if (!pendingUnlikeComment.value) return
  const comment = pendingUnlikeComment.value
  unlikingId.value = comment.id

  try {
    await apiClient.delete(`/comments/${comment.id}/like`)
    comments.value = comments.value.filter((c) => c.id !== comment.id)
    total.value = Math.max(0, total.value - 1)
    toastStore.success(t('profile.unlikeSuccess'))
  } catch (err) {
    toastStore.error(err instanceof ApiError ? err.message : t('common.error'))
  } finally {
    unlikingId.value = null
    pendingUnlikeComment.value = null
  }
}

onMounted(() => {
  void fetchLikes()
})

onUnmounted(() => {
  abortLikesRequest()
})
</script>

<style scoped>
.likes-tab {
  min-height: 20rem;
}

.tab-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: clamp(1.25rem, 3vw, 2rem);
}

.tab-title {
  font-size: clamp(var(--text-lg), 2.5vw, var(--text-xl));
  font-weight: var(--font-bold);
  margin: 0;
}

.item-count {
  padding: 0.125rem 0.625rem;
  background: rgba(244, 63, 94, 0.08);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-error);
  font-weight: var(--font-medium);
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
  border-radius: 2px;
  background: rgba(244, 63, 94, 0.15);
  flex-shrink: 0;
}

.skeleton-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  background: var(--glass-bg-light);
  border-radius: var(--radius-lg);
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
  background: rgba(244, 63, 94, 0.1);
  color: var(--color-error);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
  transition: transform var(--duration-fast) var(--ease-bounce-soft);
}

.timeline-item:hover .timeline-dot {
  transform: scale(1.2);
  background: rgba(244, 63, 94, 0.2);
}

.timeline-line {
  flex: 1;
  width: 2px;
  background: linear-gradient(to bottom, rgba(244, 63, 94, 0.15), transparent);
  margin-top: var(--spacing-1);
}

/* Card */
.timeline-card {
  flex: 1;
  min-width: 0;
  padding: clamp(0.875rem, 2vw, 1.25rem);
}

.timeline-card:hover {
  transform: var(--lift-sm);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
  gap: var(--spacing-2);
}

.comment-date {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  font-weight: var(--font-medium);
}

.card-stats {
  display: flex;
  gap: var(--spacing-2);
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.1875rem;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  padding: 0.0625rem 0.375rem;
  background: var(--glass-bg-medium);
  border-radius: var(--radius-full);
}

.comment-text {
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
  border-top: 1px solid var(--glass-border-subtle);
  gap: var(--spacing-3);
}

.comment-source {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  flex: 1;
  min-width: 0;
}

.source-icon {
  color: var(--color-error);
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

/* Unlike */
.unlike-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  background: transparent;
  border: 1px solid var(--glass-border-medium);
  color: var(--color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0;
  transition:
    opacity var(--duration-fast) var(--ease-smooth),
    border-color var(--duration-fast) var(--ease-smooth),
    color var(--duration-fast) var(--ease-smooth),
    background var(--duration-fast) var(--ease-smooth),
    transform var(--duration-fast) var(--ease-bounce-soft);
}

.timeline-card:hover .unlike-btn {
  opacity: 1;
}

.unlike-btn:hover:not(:disabled) {
  border-color: var(--color-error);
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.06);
  transform: scale(1.03);
}

.unlike-btn:disabled {
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

  .unlike-btn {
    opacity: 1;
  }

  .card-bottom {
    flex-direction: column;
    align-items: flex-start;
  }

  .unlike-btn {
    align-self: flex-end;
  }
}
</style>

<style>
/* ===== Material 3 Overrides ===== */
#app[data-ui-style='material'] .likes-tab .timeline-card {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background: var(--color-surface, var(--glass-bg-light));
  border-radius: 12px;
  border: 1px solid var(--md-outline-variant, var(--glass-border-medium));
  box-shadow: var(--shadow-sm);
}

#app[data-ui-style='material'] .likes-tab .timeline-card::before {
  display: none;
}

#app[data-ui-style='material'] .likes-tab .timeline-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

#app[data-ui-style='material'] .likes-tab .timeline-dot {
  border-radius: 6px;
}

#app[data-ui-style='material'] .likes-tab .stat-chip {
  border-radius: 4px;
}

#app[data-ui-style='material'] .likes-tab .unlike-btn {
  border-radius: 8px;
}

#app[data-ui-style='material'] .likes-tab .unlike-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.12);
}

#app[data-ui-style='material'] .likes-tab .skeleton-body {
  border-radius: 12px;
}

#app[data-ui-style='material'] .likes-tab .item-count {
  border-radius: 4px;
}

/* ===== Dark Theme Overrides ===== */
[data-theme='dark'] .likes-tab .timeline-dot {
  background: rgba(244, 63, 94, 0.2);
}

[data-theme='dark'] .likes-tab .timeline-line {
  background: linear-gradient(to bottom, rgba(244, 63, 94, 0.25), transparent);
}

[data-theme='dark'] .likes-tab .card-bottom {
  border-top-color: rgba(255, 255, 255, 0.06);
}

[data-theme='dark'] .likes-tab .stat-chip {
  background: rgba(255, 255, 255, 0.08);
}

/* ===== Blue Theme Overrides ===== */
[data-theme='blue'] .likes-tab .timeline-dot {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

[data-theme='blue'] .likes-tab .timeline-item:hover .timeline-dot {
  background: rgba(59, 130, 246, 0.2);
}

[data-theme='blue'] .likes-tab .timeline-line {
  background: linear-gradient(to bottom, rgba(59, 130, 246, 0.15), transparent);
}

[data-theme='blue'] .likes-tab .item-count {
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
}

[data-theme='blue'] .likes-tab .source-icon {
  color: #3b82f6;
}

/* ===== Material + Dark ===== */
#app[data-ui-style='material'][data-theme='dark'] .likes-tab .timeline-card {
  background: var(--md-surface-container, rgba(28, 28, 32, 0.92));
  border-color: rgba(255, 255, 255, 0.06);
}

#app[data-ui-style='material'][data-theme='dark'] .likes-tab .timeline-card:hover {
  background: var(--md-surface-container-high, rgba(34, 34, 38, 0.95));
  border-color: rgba(255, 255, 255, 0.1);
}

/* ===== Material + Blue ===== */
#app[data-ui-style='material'][data-theme='blue'] .likes-tab .timeline-card {
  background: #ffffff;
  border-color: rgba(59, 130, 246, 0.12);
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.08);
}

#app[data-ui-style='material'][data-theme='blue'] .likes-tab .timeline-card:hover {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.12);
}
</style>
