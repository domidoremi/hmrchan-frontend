<template>
  <div class="history-tab">
    <div class="tab-header">
      <h2 class="tab-title">{{ $t('profile.tabs.history') }}</h2>
      <span v-if="total > 0" class="item-count">{{ total }}</span>
      <Button v-if="history.length > 0" variant="ghost" size="sm" @click="clearHistory">
        <AnimatedIcon name="sparkle" :fallback-icon="Trash2" size="sm" />
        {{ $t('profile.clearHistory') }}
      </Button>
    </div>

    <StateIndicator v-if="error" variant="error" :description="error" @action="fetchHistory" />

    <div v-else-if="isLoading && history.length === 0" class="history-skeleton">
      <div v-for="i in 5" :key="i" class="history-item glass-card">
        <div class="skeleton" style="height: 60px; width: 60px; border-radius: 8px" />
        <div style="flex: 1">
          <div class="skeleton" style="height: 18px; width: 70%; margin-bottom: 8px" />
          <div class="skeleton" style="height: 14px; width: 40%" />
        </div>
      </div>
    </div>

    <template v-else>
      <StateIndicator
        v-if="history.length === 0"
        variant="empty"
        :description="$t('profile.noHistory')"
      />

      <div v-else class="history-list">
        <article
          v-for="item in history"
          :key="item.id"
          class="history-item glass-card"
          @click="goToPost(item.post_uuid, item.post.thumbnail_url)"
        >
          <div class="history-thumbnail">
            <img
              v-if="item.post.thumbnail_url"
              :src="item.post.thumbnail_url"
              :alt="item.post.title"
              loading="lazy"
            />
            <div v-else class="thumbnail-placeholder">
              <AnimatedIcon name="explore" :fallback-icon="Clock" size="md" />
            </div>
          </div>
          <div class="history-content">
            <h3 class="history-title">{{ item.post.title }}</h3>
            <p v-if="item.post.author_name" class="history-author">{{ item.post.author_name }}</p>
            <div class="history-meta">
              <span>
                <AnimatedIcon name="explore" :fallback-icon="Clock" size="sm" />
                {{ formatDate(item.viewed_at) }}
              </span>
            </div>
          </div>
        </article>
      </div>

      <LoadMoreSection
        v-if="hasMore"
        :count="history.length"
        :total="total"
        :has-more="hasMore"
        :loading="isLoadingMore"
        @load-more="loadMore"
      />
    </template>

    <!-- Clear History Confirmation -->
    <ConfirmDialog
      v-model:is-open="showClearDialog"
      :title="$t('profile.confirmClearHistoryTitle', '清空浏览历史')"
      :message="$t('profile.confirmClearHistory')"
      :confirm-text="$t('common.confirm')"
      variant="warning"
      @confirm="confirmClearHistory"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Clock, Trash2 } from 'lucide-vue-next'
import { useToastStore } from '@/stores'
import { apiClient, ApiError } from '@/api'
import { extractMediaIdFromUrl } from '@/utils/mediaOptimizer'
import { formatRelativeTime } from '@/utils/date'
import Button from '@/components/ui/Button.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

// API 返回的原始数据结构
interface ApiHistoryItem {
  id: number
  content_type: string
  content_id: number
  content_uuid: string
  source: string
  duration_seconds: number | null
  created_at: string
  content_preview: {
    title?: string
    thumbnail_url?: string | null
    author_name?: string
  } | null
}

// 前端使用的数据结构
interface HistoryItem {
  id: number
  post_uuid: string
  post: {
    uuid: string
    title: string
    thumbnail_url?: string | null
    author_name?: string
  }
  viewed_at: string
}

// 转换 API 数据为前端格式
function transformHistoryItem(item: ApiHistoryItem): HistoryItem {
  const authorName = item.content_preview?.author_name
  return {
    id: item.id,
    post_uuid: item.content_uuid,
    post: {
      uuid: item.content_uuid,
      title: item.content_preview?.title || t('profile.unknownPost'),
      thumbnail_url: item.content_preview?.thumbnail_url || null,
      ...(authorName ? { author_name: authorName } : {}),
    },
    viewed_at: item.created_at,
  }
}

const router = useRouter()
const { t } = useI18n()
const toastStore = useToastStore()

const history = ref<HistoryItem[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const total = ref(0)
const pageSize = 20
const showClearDialog = ref(false)

const hasMore = computed(() => history.value.length < total.value)

async function fetchHistory(reset = true) {
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
      items: ApiHistoryItem[]
      total: number
      page: number
      page_size: number
      has_more: boolean
    }>(`/history/browsing?page=${page.value}&page_size=${pageSize}`)

    const transformedItems = res.items.map(transformHistoryItem)

    if (reset) {
      history.value = transformedItems
    } else {
      history.value.push(...transformedItems)
    }
    total.value = res.total
  } catch (err) {
    if (history.value.length === 0) {
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
  await fetchHistory(false)
}

function clearHistory() {
  showClearDialog.value = true
}

async function confirmClearHistory() {
  try {
    await apiClient.delete('/history/browsing')
    history.value = []
    total.value = 0
    toastStore.success(t('profile.historyCleared'))
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  }
}

function formatDate(dateStr: string): string {
  return formatRelativeTime(dateStr, t)
}

function goToPost(postId: string, thumbnailUrl?: string | null) {
  if (thumbnailUrl) {
    const mediaId = extractMediaIdFromUrl(thumbnailUrl)
    if (mediaId) {
      router.push(`/post/${postId}?mediaId=${mediaId}`)
      return
    }
  }
  router.push(`/post/${postId}`)
}

onMounted(() => {
  fetchHistory()
})
</script>

<style scoped>
.history-tab {
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
  flex: 1;
}

.item-count {
  padding: 4px 12px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.history-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.history-item {
  display: flex;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.history-item:hover {
  transform: translateX(4px);
}

.history-thumbnail {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--glass-bg-light);
}

.history-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--color-text-tertiary);
}

.history-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.history-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
}

.history-author {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.history-meta {
  display: flex;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.history-meta span {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

@media (max-width: 768px) {
  .history-thumbnail {
    width: 60px;
    height: 60px;
  }

  .history-title {
    font-size: var(--text-sm);
  }
}
</style>
