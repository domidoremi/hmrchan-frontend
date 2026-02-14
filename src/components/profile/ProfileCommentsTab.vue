<template>
  <div class="comments-tab">
    <div class="tab-header">
      <h2 class="tab-title">{{ $t('profile.tabs.comments') }}</h2>
      <span v-if="total > 0" class="item-count">{{ total }}</span>
    </div>

    <StateIndicator v-if="error" variant="error" :description="error" @action="fetchComments" />

    <div v-else-if="isLoading && comments.length === 0" class="loading-skeleton">
      <div v-for="i in 5" :key="i" class="comment-skeleton glass-card">
        <div class="skeleton-content">
          <div class="skeleton-header">
            <div class="skeleton" style="height: 14px; width: 80px" />
            <div class="skeleton" style="height: 14px; width: 60px" />
          </div>
          <div class="skeleton" style="height: 16px; width: 100%; margin: 12px 0" />
          <div class="skeleton" style="height: 14px; width: 70%" />
        </div>
      </div>
    </div>

    <template v-else>
      <StateIndicator
        v-if="comments.length === 0"
        variant="empty"
        :description="$t('profile.noComments')"
      />

      <div v-else class="comments-list">
        <article
          v-for="comment in comments"
          :key="comment.id"
          class="comment-item glass-card"
          :class="{ 'comment-item--deleting': deletingId === comment.id }"
        >
          <!-- Comment Header -->
          <div class="comment-header">
            <div class="comment-meta">
              <span class="comment-date">
                <AnimatedIcon name="explore" :fallback-icon="Clock" size="sm" />
                {{ formatDate(comment.created_at) }}
              </span>
              <span v-if="comment.replies_count" class="comment-replies">
                <AnimatedIcon name="sparkle" :fallback-icon="MessageCircle" size="sm" />
                {{ comment.replies_count }} {{ $t('comment.replies') }}
              </span>
            </div>
            <button
              class="delete-btn"
              :disabled="deletingId === comment.id"
              @click.stop="handleDelete(comment.id)"
              :aria-label="$t('common.delete')"
            >
              <AnimatedIcon name="sparkle" :fallback-icon="Trash2" size="sm" />
            </button>
          </div>

          <!-- Comment Content -->
          <div class="comment-body">
            <p class="comment-text">{{ comment.content }}</p>
          </div>

          <!-- Comment Footer -->
          <div class="comment-footer">
            <div v-if="comment.post_title" class="comment-context">
              <AnimatedIcon name="explore" :fallback-icon="MessageSquare" size="sm" />
              <span class="context-label">{{ $t('profile.commentOn') }}</span>
              <button class="post-link" @click="goToPost(comment.post_id)">
                {{ comment.post_title }}
              </button>
            </div>
            <div class="comment-stats">
              <span class="stat-item">
                <AnimatedIcon
                  name="heart"
                  :fallback-icon="Heart"
                  size="sm"
                  :active="comment.likes_count > 0"
                />
                {{ comment.likes_count || 0 }}
              </span>
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
      :title="$t('comment.confirmDeleteTitle')"
      :message="$t('comment.confirmDeleteMessage')"
      variant="danger"
      :confirm-text="$t('common.delete')"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Heart, MessageCircle, MessageSquare, Trash2, Clock } from 'lucide-vue-next'
import { apiClient, ApiError } from '@/api'
import { useToastStore } from '@/stores'
import { formatRelativeTime } from '@/utils/date'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import { defineAsyncComponent } from 'vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

// 动态导入对话框组件以减少初始包体积
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
const page = ref(1)
const total = ref(0)
const pageSize = 20

const hasMore = computed(() => comments.value.length < total.value)

async function fetchComments(reset = true) {
  if (reset) {
    if (isLoading.value) return
    isLoading.value = true
    page.value = 1
  } else {
    if (isLoadingMore.value) return
    isLoadingMore.value = true
  }

  error.value = null

  try {
    const res = await apiClient.get<{
      items: UserComment[]
      total: number
      page: number
      page_size: number
      has_more: boolean
    }>(`/history/my-comments?page=${page.value}&page_size=${pageSize}`)

    if (reset) {
      comments.value = res.items
    } else {
      comments.value.push(...res.items)
    }
    total.value = res.total
  } catch (err) {
    if (comments.value.length === 0) {
      if (err instanceof ApiError) {
        error.value = err.message
      } else {
        error.value = t('common.error')
      }
    }
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || isLoading.value || isLoadingMore.value) return

  page.value++
  await fetchComments(false)
}

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
    total.value = Math.max(0, total.value - 1)
    toastStore.success(t('comment.deleteSuccess'))
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('comment.error.deleteFailed'))
    }
  } finally {
    pendingDeleteId.value = null
    deletingId.value = null
  }
}

onMounted(() => {
  fetchComments()
})
</script>

<style scoped>
.comments-tab {
  min-height: 400px;
}

.tab-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-6);
}

.tab-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin: 0;
}

.item-count {
  padding: 4px 12px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Loading Skeleton */
.loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.comment-skeleton {
  padding: var(--spacing-4);
}

.skeleton-content {
  display: flex;
  flex-direction: column;
}

.skeleton-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-2);
}

/* Comments List */
.comments-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

/* Comment Item */
.comment-item {
  padding: var(--spacing-4);
  transition: all var(--transition-base);
  border: 1px solid transparent;
  position: relative;
  background: var(--glass-bg-light);
  border-radius: var(--radius-lg);
}

.comment-item:hover {
  border-color: rgba(var(--color-primary-rgb), 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.comment-item--deleting {
  opacity: 0.5;
  pointer-events: none;
}

/* Comment Header */
.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-3);
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.comment-date,
.comment-replies {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.comment-replies {
  color: var(--color-text-secondary);
}

/* Delete Button */
.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-md);
  cursor: pointer;
  opacity: 0;
  transition: all var(--transition-fast);
}

.comment-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
}

.delete-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Comment Body */
.comment-body {
  margin-bottom: var(--spacing-3);
}

.comment-text {
  margin: 0;
  color: var(--color-text-primary);
  line-height: 1.6;
  font-size: var(--text-base);
  word-break: break-word;
}

/* Comment Footer */
.comment-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--spacing-3);
  border-top: 1px solid var(--glass-border);
}

.comment-context {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  flex: 1;
  min-width: 0;
}

.context-label {
  flex-shrink: 0;
}

.post-link {
  color: var(--color-primary);
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  transition: color var(--transition-fast);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-link:hover {
  color: var(--color-primary-dark);
  text-decoration: underline;
}

/* Comment Stats */
.comment-stats {
  display: flex;
  gap: var(--spacing-3);
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.stat-icon--active {
  color: var(--color-error);
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .tab-header {
    margin-bottom: var(--spacing-4);
  }

  .tab-title {
    font-size: var(--text-lg);
  }

  .comments-list {
    gap: var(--spacing-3);
  }

  .comment-item {
    padding: var(--spacing-3);
  }

  .comment-item .delete-btn {
    opacity: 1;
  }

  .comment-header {
    margin-bottom: var(--spacing-2);
  }

  .comment-meta {
    gap: var(--spacing-3);
  }

  .comment-text {
    font-size: var(--text-sm);
  }

  .comment-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
    padding-top: var(--spacing-2);
  }

  .comment-context {
    width: 100%;
  }

  .comment-stats {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 480px) {
  .comment-item {
    border-radius: var(--radius-md);
  }

  .comment-meta {
    flex-wrap: wrap;
    gap: var(--spacing-2);
  }
}
</style>
