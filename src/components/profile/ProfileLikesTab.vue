<template>
  <div class="likes-tab">
    <div class="tab-header">
      <h2 class="tab-title">{{ $t('profile.tabs.likes') }}</h2>
      <span v-if="total > 0" class="item-count">{{ total }}</span>
    </div>

    <StateIndicator v-if="error" variant="error" :description="error" @action="fetchLikes" />

    <div v-else-if="isLoading && comments.length === 0" class="comments-skeleton">
      <div v-for="i in 5" :key="i" class="comment-skeleton glass-card">
        <Skeleton variant="avatar" />
        <div style="flex: 1">
          <Skeleton width="30%" height="16px" />
          <Skeleton width="100%" height="14px" />
        </div>
      </div>
    </div>

    <template v-else>
      <StateIndicator
        v-if="comments.length === 0"
        variant="empty"
        :description="$t('profile.noLikes')"
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
            <AnimatedIcon name="heart" :fallback-icon="Heart" size="sm" />
            <span>{{ $t('profile.likedOn') }}: </span>
            <button class="post-link" @click="goToPost(comment.post_uuid)">
              {{ comment.post_title }}
            </button>
          </div>
          <div class="comment-footer">
            <div class="comment-stats">
              <span>
                <AnimatedIcon name="heart" :fallback-icon="Heart" size="sm" />
                {{ comment.like_count || 0 }}
              </span>
              <span v-if="comment.reply_count"
                ><AnimatedIcon name="sparkle" :fallback-icon="MessageCircle" size="sm" />
                {{ comment.reply_count }}</span
              >
            </div>
            <button
              class="unlike-btn"
              @click.stop="handleUnlike(comment)"
              :disabled="unlikingId === comment.id"
            >
              <AnimatedIcon name="sparkle" :fallback-icon="HeartOff" size="sm" />
              <span>{{ $t('profile.unlike') }}</span>
            </button>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Heart, MessageCircle, HeartOff } from 'lucide-vue-next'
import { apiClient, ApiError } from '@/api'
import { useToastStore } from '@/stores'
import { formatRelativeTime } from '@/utils/date'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { defineAsyncComponent } from 'vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

// 动态导入对话框组件以减少初始包体积
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
const pageSize = 20

const hasMore = computed(() => comments.value.length < total.value)

async function fetchLikes(reset = true) {
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
      items: LikedComment[]
      total: number
      page: number
      page_size: number
      has_more: boolean
    }>(`/history/my-likes?page=${page.value}&page_size=${pageSize}`)

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
  await fetchLikes(false)
}

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
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    unlikingId.value = null
    pendingUnlikeComment.value = null
  }
}

onMounted(() => {
  fetchLikes()
})
</script>

<style scoped>
.likes-tab {
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
  padding: 0.25rem 0.75rem;
  background: var(--glass-bg-light);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-4);
}

.posts-masonry {
  --masonry-columns: 4;
  --masonry-gap: var(--spacing-4);

  column-count: var(--masonry-columns);
  column-gap: var(--masonry-gap);
}

.posts-masonry > * {
  break-inside: avoid;
  margin-bottom: var(--masonry-gap);
}

@media (min-width: 1600px) {
  .posts-masonry {
    --masonry-columns: 5;
  }
}

@media (min-width: 1200px) and (max-width: 1599px) {
  .posts-masonry {
    --masonry-columns: 4;
  }
}

@media (min-width: 900px) and (max-width: 1199px) {
  .posts-masonry {
    --masonry-columns: 3;
  }
}

@media (min-width: 600px) and (max-width: 899px) {
  .posts-masonry {
    --masonry-columns: 2;
  }
}

@media (max-width: 599px) {
  .posts-masonry {
    --masonry-columns: 1;
  }
}

.post-card {
  cursor: pointer;
  transition: all var(--transition-base);
  overflow: hidden;
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.post-image {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--glass-bg-light);
}

.post-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--color-text-tertiary);
}

.comment-item {
  padding: var(--spacing-4);
  cursor: default;
  transition: all var(--transition-base);
  border: 1px solid transparent;
}

.comment-item:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--color-primary-rgb), 0.3);
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
  font-weight: var(--font-medium);
}

.comment-content p {
  margin: 0;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  line-height: 1.5;
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

.post-link {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
  font-weight: var(--font-medium);
  transition: color 0.2s ease;
  text-decoration: underline;
  text-decoration-color: transparent;
}

.post-link:hover {
  color: var(--color-primary-dark);
  text-decoration-color: currentColor;
}

.post-stats {
  display: flex;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.comment-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-3);
  padding-top: var(--spacing-3);
  border-top: 1px solid var(--color-border);
}

.comment-stats {
  display: flex;
  gap: var(--spacing-4);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  align-items: center;
}

.comment-stats span {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

.unlike-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.unlike-btn:hover:not(:disabled) {
  border-color: var(--color-error);
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
  transform: scale(1.02);
}

.unlike-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

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

  .comment-content p {
    font-size: var(--text-sm);
  }

  .comment-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
  }

  .comment-context {
    width: 100%;
    flex-wrap: wrap;
  }

  .unlike-btn {
    align-self: flex-end;
  }
}
</style>
