<template>
  <div class="comments-tab">
    <div class="tab-header">
      <h2 class="tab-title">{{ $t('profile.tabs.comments') }}</h2>
      <span v-if="total > 0" class="item-count">{{ total }}</span>
    </div>

    <StateIndicator
      v-if="error"
      variant="error"
      :description="error"
      @action="fetchComments"
    />

    <div v-else-if="isLoading && comments.length === 0" class="loading-skeleton">
      <div v-for="i in 5" :key="i" class="comment-skeleton glass-card">
        <div class="skeleton" style="height: 40px; width: 40px; border-radius: 50%" />
        <div style="flex: 1">
          <div class="skeleton" style="height: 16px; width: 30%; margin-bottom: 8px" />
          <div class="skeleton" style="height: 14px; width: 100%" />
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
        <article v-for="comment in comments" :key="comment.id" class="comment-item glass-card">
          <div class="comment-header">
            <span class="comment-date">{{ formatDate(comment.created_at) }}</span>
          </div>
          <div class="comment-content">
            <p>{{ comment.content }}</p>
          </div>
          <div v-if="comment.post_title" class="comment-context">
            <MessageSquare :size="14" />
            <span>{{ $t('profile.commentOn') }}: </span>
            <button class="post-link" @click="goToPost(comment.post_id)">
              {{ comment.post_title }}
            </button>
          </div>
          <div class="comment-actions">
            <button
              class="action-btn delete-btn"
              @click.stop="handleDelete(comment.id)"
              :aria-label="$t('common.delete')"
            >
              <Trash2 :size="16" />
              <span>{{ $t('common.delete') }}</span>
            </button>
          </div>
          <div class="comment-stats">
            <span><Heart :size="14" /> {{ comment.likes_count || 0 }}</span>
            <span v-if="comment.replies_count"><MessageCircle :size="14" /> {{ comment.replies_count }}</span>
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
import { Heart, MessageCircle, MessageSquare, Trash2 } from 'lucide-vue-next'
import { apiClient, ApiError } from '@/api'
import { useToastStore } from '@/stores'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

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
    const res = await apiClient.get<{ items: UserComment[]; total: number; page: number; page_size: number; has_more: boolean }>(
      `/community/my-comments?page=${page.value}&page_size=${pageSize}`
    )

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
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays < 0) return date.toLocaleDateString()
  if (diffDays === 0) return t('common.today')
  if (diffDays === 1) return t('common.yesterday')
  if (diffDays < 7) return t('common.daysAgo', { n: diffDays })

  return date.toLocaleDateString()
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

  try {
    await apiClient.delete(`/comments/${commentId}`)
    comments.value = comments.value.filter(c => c.id !== commentId)
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

.loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.comment-skeleton {
  display: flex;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.comment-item {
  padding: var(--spacing-4);
  cursor: default;
  transition: all 0.3s var(--ease-out-cubic);
  border: 1px solid transparent;
  position: relative;
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
}

.comment-item:hover {
  transform: translateY(-2px);
  border-color: var(--color-primary-alpha);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
}

.comment-date {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.comment-content {
  margin-bottom: var(--spacing-3);
  line-height: 1.6;
}

.comment-content p {
  margin: 0;
  color: var(--color-text);
}

.comment-context {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-top: var(--spacing-3);
  padding-top: var(--spacing-3);
  border-top: 1px solid var(--color-border);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.comment-actions {
  display: flex;
  gap: var(--spacing-2);
  margin-top: var(--spacing-3);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  transition: all 0.2s ease;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.action-btn:hover {
  background: var(--color-bg-secondary);
  transform: scale(1.05);
}

.delete-btn:hover {
  border-color: var(--color-error);
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
}

.post-link {
  color: var(--color-primary);
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  text-decoration: underline;
  transition: color var(--transition-fast);
}

.post-link:hover {
  color: var(--color-primary-dark);
}

.comment-stats {
  display: flex;
  gap: var(--spacing-4);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.comment-stats span {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}
</style>
