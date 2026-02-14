<template>
  <div class="comment-favorites-tab">
    <div class="tab-header">
      <h2 class="tab-title">{{ $t('profile.tabs.commentFavorites') }}</h2>
      <span v-if="total > 0" class="item-count">{{ total }}</span>
    </div>

    <StateIndicator v-if="error" variant="error" :description="error" @action="fetchFavorites" />

    <div v-else-if="isLoading && items.length === 0" class="comments-skeleton">
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
        v-if="items.length === 0"
        variant="empty"
        :description="$t('profile.noCommentFavorites')"
      />

      <div v-else class="comments-list">
        <article v-for="item in items" :key="item.id" class="comment-item glass-card">
          <div class="comment-header">
            <span v-if="item.author_username" class="comment-author">
              @{{ item.author_username }}
            </span>
            <span class="comment-date">{{ formatDate(item.created_at) }}</span>
          </div>
          <div class="comment-content">
            <p>{{ item.content }}</p>
          </div>
          <div v-if="item.post_title" class="comment-context">
            <AnimatedIcon name="heart" :fallback-icon="Bookmark" size="sm" />
            <span>{{ $t('profile.commentOn') }}: </span>
            <button class="post-link" @click="goToPost(item.post_uuid || item.post_id)">
              {{ item.post_title }}
            </button>
          </div>
          <div class="comment-footer">
            <div class="comment-stats">
              <span>
                <AnimatedIcon name="heart" :fallback-icon="Heart" size="sm" />
                {{ item.likes_count || 0 }}
              </span>
            </div>
            <button
              class="unfavorite-btn"
              :disabled="unfavoritingId === item.id"
              @click.stop="handleUnfavorite(item)"
            >
              <AnimatedIcon name="sparkle" :fallback-icon="BookmarkMinus" size="sm" />
              <span>{{ $t('profile.unfavorite') }}</span>
            </button>
          </div>
        </article>
      </div>

      <LoadMoreSection
        v-if="hasMore"
        :count="items.length"
        :total="total"
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
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Heart, Bookmark, BookmarkMinus } from 'lucide-vue-next'
import { apiClient, ApiError } from '@/api'
import type { MyCommentFavoriteItem } from '@/api'
import { useToastStore } from '@/stores'
import { formatRelativeTime } from '@/utils/date'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

const ConfirmDialog = defineAsyncComponent(() => import('@/components/ui/ConfirmDialog.vue'))

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
const page = ref(1)
const total = ref(0)
const pageSize = 20

const hasMore = computed(() => items.value.length < total.value)

async function fetchFavorites(reset = true) {
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
      items: MyCommentFavoriteItem[]
      total: number
      page: number
      page_size: number
      has_more: boolean
    }>(`/history/my-comment-favorites?page=${page.value}&page_size=${pageSize}`)

    if (reset) {
      items.value = res.items
    } else {
      items.value.push(...res.items)
    }
    total.value = res.total
  } catch (err) {
    if (items.value.length === 0) {
      error.value = err instanceof ApiError ? err.message : t('common.error')
    }
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || isLoading.value || isLoadingMore.value) return
  page.value++
  await fetchFavorites(false)
}

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
    total.value = Math.max(0, total.value - 1)
    toastStore.success(t('profile.unfavoriteSuccess'))
  } catch (err) {
    toastStore.error(err instanceof ApiError ? err.message : t('common.error'))
  } finally {
    unfavoritingId.value = null
    pendingUnfavoriteItem.value = null
  }
}

onMounted(() => {
  fetchFavorites()
})
</script>

<style scoped>
.comment-favorites-tab {
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

.comments-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.comment-item {
  padding: var(--spacing-4);
  transition: all var(--transition-base);
  border: 1px solid transparent;
}

.comment-item:hover {
  border-color: rgba(var(--color-primary-rgb), 0.3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
}

.comment-author {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-primary);
}

.comment-date {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
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
}

.post-link:hover {
  color: var(--color-primary-dark);
  text-decoration: underline;
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

.unfavorite-btn {
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

.unfavorite-btn:hover:not(:disabled) {
  border-color: var(--color-warning);
  color: var(--color-warning);
  background: rgba(245, 158, 11, 0.1);
}

.unfavorite-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
