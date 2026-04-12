<template>
  <div class="history-tab">
    <ProfileTabHeader :title="$t('profile.tabs.history')" :count="displayTotal">
      <template #actions>
        <Button v-if="history.length > 0" variant="ghost" size="sm" @click="clearHistory">
          <Trash2 :size="14" />
          {{ $t('profile.clearHistory') }}
        </Button>
      </template>
    </ProfileTabHeader>

    <StateIndicator v-if="error" variant="error" :description="error" @action="fetchHistory" />

    <div v-else-if="isLoading && history.length === 0" class="history-skeleton">
      <div v-for="i in 4" :key="i" class="skeleton-row">
        <div class="skeleton-thumb skeleton-enhanced" />
        <div class="skeleton-info">
          <Skeleton width="70%" height="1rem" />
          <Skeleton width="40%" height="0.75rem" />
        </div>
      </div>
    </div>

    <template v-else>
      <StateIndicator
        v-if="history.length === 0"
        variant="empty"
        :description="$t('profile.noHistory')"
      />

      <div v-else class="history-groups">
        <section v-for="group in groupedHistory" :key="group.label" class="history-group">
          <div class="group-header">
            <span class="group-label">{{ group.label }}</span>
            <span class="group-count">{{ group.items.length }}</span>
            <span class="group-line" />
          </div>

          <div class="group-grid">
            <article
              v-for="(item, idx) in group.items"
              :key="item.id"
              class="history-card glass-surface--elevated"
              :style="{ '--stagger': idx }"
              role="button"
              tabindex="0"
              @click="goToPost(item.post_uuid, item.post.thumbnail_url)"
              @keydown.enter.prevent="goToPost(item.post_uuid, item.post.thumbnail_url)"
              @keydown.space.prevent="goToPost(item.post_uuid, item.post.thumbnail_url)"
            >
              <div class="card-thumb">
                <ThumbnailImage
                  :src="item.post.thumbnail_url"
                  :alt="item.post.title"
                  loading="lazy"
                  decoding="async"
                >
                  <template #fallback>
                    <div class="thumb-placeholder">
                      <Clock :size="20" />
                    </div>
                  </template>
                </ThumbnailImage>
                <span class="card-time">
                  {{ formatTime(item.viewed_at) }}
                </span>
              </div>
              <div class="card-info">
                <h3 class="card-title">{{ item.post.title }}</h3>
                <p v-if="item.post.author_name" class="card-author">
                  {{ item.post.author_name }}
                </p>
              </div>
            </article>
          </div>
        </section>
      </div>

      <LoadMoreSection
        v-if="hasMore"
        :count="history.length"
        :total="displayTotal"
        :has-more="hasMore"
        :loading="isLoadingMore"
        @load-more="loadMore"
      />
    </template>

    <ConfirmDialog
      v-model:is-open="showClearDialog"
      :title="$t('profile.confirmClearHistoryTitle')"
      :message="$t('profile.confirmClearHistory')"
      :confirm-text="$t('common.confirm')"
      variant="warning"
      @confirm="confirmClearHistory"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Clock, Trash2 } from '@lucide/vue'
import { useToastStore } from '@/stores'
import { apiClient, ApiError, historyService, type BrowsingHistoryItem } from '@/api'
import { normalizeHistorySummaryCounts } from '@/api/summaryCounts'
import { usePreferredPageSize } from '@/composables/usePreferredPageSize'
import { extractMediaIdFromUrl } from '@/utils/mediaOptimizer'
import { cachePostThumbnailPreview } from '@/utils/thumbnailPresentation'
import ProfileTabHeader from '@/components/profile/ProfileTabHeader.vue'
import Button from '@/components/ui/Button.vue'
import ThumbnailImage from '@/components/ui/ThumbnailImage.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

interface HistoryItem {
  id: string | number
  post_uuid: string
  post: {
    uuid: string
    title: string
    thumbnail_url?: string | null
    author_name?: string
  }
  viewed_at: string
}

interface HistoryGroup {
  label: string
  items: HistoryItem[]
}

function transformHistoryItem(
  item: BrowsingHistoryItem & {
    content_preview?: {
      title?: string
      thumbnail_url?: string | null
      author_name?: string
    } | null
  }
): HistoryItem {
  const previewTitle = item.content_preview?.title ?? item.post_title
  const previewThumb = item.content_preview?.thumbnail_url ?? item.post_thumbnail_url
  const authorName = item.content_preview?.author_name ?? item.author_name
  const contentUuid = item.content_uuid ?? item.post_id ?? ''
  return {
    id: item.id,
    post_uuid: contentUuid,
    post: {
      uuid: contentUuid,
      title: previewTitle || t('profile.unknownPost'),
      thumbnail_url: previewThumb || null,
      ...(authorName ? { author_name: authorName } : {}),
    },
    viewed_at: item.created_at ?? item.viewed_at ?? '',
  }
}

const router = useRouter()
const { t } = useI18n()
const toastStore = useToastStore()

const history = ref<HistoryItem[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const nextCursor = ref<string | null>(null)
const total = ref<number | null>(null)
const pageSize = usePreferredPageSize({ fallback: 20, min: 10, max: 50 })
const showClearDialog = ref(false)
let historyController: AbortController | null = null
let historyRequestToken = 0

const hasMoreState = ref(false)
const hasMore = computed(() => hasMoreState.value)
const displayTotal = computed(() => total.value ?? (history.value.length || undefined))

const groupedHistory = computed<HistoryGroup[]>(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  const groups: Record<string, HistoryItem[]> = {}
  const order: string[] = []

  for (const item of history.value) {
    const d = new Date(item.viewed_at)
    let label: string
    if (d >= today) {
      label = t('common.today')
    } else if (d >= yesterday) {
      label = t('common.yesterday')
    } else if (d >= weekAgo) {
      label = t('common.thisWeek')
    } else {
      label = t('common.earlier')
    }
    if (!groups[label]) {
      groups[label] = []
      order.push(label)
    }
    groups[label]!.push(item)
  }

  return order.map((label) => ({ label, items: groups[label]! }))
})

async function fetchHistory(reset = true): Promise<boolean> {
  if (reset) {
    historyController?.abort()
    historyController = null
    isLoading.value = true
    nextCursor.value = null
  } else {
    if (isLoadingMore.value || isLoading.value) return false
    isLoadingMore.value = true
  }
  error.value = null
  const controller = new AbortController()
  historyController = controller
  const requestToken = ++historyRequestToken

  try {
    const res = await historyService.getBrowsingHistory(
      {
        limit: pageSize.value,
        cursor: reset ? null : nextCursor.value,
        include_preview: true,
      },
      {
        signal: controller.signal,
        skipErrorToast: true,
      }
    )
    if (controller.signal.aborted || requestToken !== historyRequestToken) return false

    const transformedItems = (Array.isArray(res.items) ? res.items : []).map(transformHistoryItem)
    if (reset) {
      history.value = transformedItems
    } else {
      const existingIds = new Set(history.value.map((item) => String(item.id)))
      history.value.push(...transformedItems.filter((item) => !existingIds.has(String(item.id))))
    }
    nextCursor.value = res.next_cursor ?? null
    hasMoreState.value = Boolean(res.has_more && res.next_cursor)
    if (reset) {
      void refreshHistorySummary()
    }
    return true
  } catch (err) {
    if (controller.signal.aborted || requestToken !== historyRequestToken) return false
    if (history.value.length === 0) {
      error.value = err instanceof ApiError ? err.message : t('common.error')
    }
    return false
  } finally {
    if (requestToken === historyRequestToken) {
      isLoading.value = false
      isLoadingMore.value = false
      if (historyController === controller) {
        historyController = null
      }
    }
  }
}

async function loadMore() {
  if (!hasMore.value || isLoading.value || isLoadingMore.value) return
  await fetchHistory(false)
}

async function refreshHistorySummary() {
  try {
    const stats = await historyService.getStats()
    total.value = normalizeHistorySummaryCounts(stats).history
    if (total.value === null) {
      const summary = await historyService.getSummary()
      total.value = normalizeHistorySummaryCounts(summary).history
    }
  } catch {
    total.value = history.value.length > 0 ? history.value.length : null
  }
}

function clearHistory() {
  showClearDialog.value = true
}

async function confirmClearHistory() {
  try {
    await apiClient.delete('/history/browsing')
    history.value = []
    total.value = 0
    nextCursor.value = null
    hasMoreState.value = false
    toastStore.success(t('profile.historyCleared'))
  } catch (err) {
    toastStore.error(err instanceof ApiError ? err.message : t('common.error'))
  }
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function goToPost(postId: string, thumbnailUrl?: string | null) {
  cachePostThumbnailPreview(postId, thumbnailUrl)
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
  void fetchHistory()
})

watch(pageSize, () => {
  if (history.value.length === 0 && !isLoading.value) return
  void fetchHistory(true)
})

onUnmounted(() => {
  historyController?.abort()
  historyController = null
})
</script>

<style scoped>
.history-tab {
  min-height: 20rem;
}

/* ===== Skeleton ===== */
.history-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 10rem), 1fr));
  gap: var(--spacing-3);
}

.skeleton-row {
  border-radius: var(--profile-section-radius);
  overflow: hidden;
  background: var(--profile-surface-bg-soft);
  border: 1px solid var(--profile-surface-border);
  box-shadow: var(--profile-surface-shadow);
}

.skeleton-thumb {
  width: 100%;
  aspect-ratio: 1;
  background: var(--glass-bg-medium);
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

.skeleton-info {
  padding: var(--spacing-3);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

/* ===== Grouped History ===== */
.history-groups {
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 4vw, 2.5rem);
}

.group-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: clamp(0.75rem, 2vw, 1rem);
}

.group-label {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
}

.group-count {
  font-size: var(--text-xs);
  color: var(--profile-chip-text);
  padding: 0.0625rem 0.375rem;
  background: var(--profile-chip-bg);
  border: 1px solid var(--profile-chip-border);
  border-radius: var(--radius-full);
}

.group-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, var(--profile-muted-border), transparent);
}

/* ===== Grid ===== */
.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 10rem), 1fr));
  gap: clamp(0.625rem, 1.5vw, 1rem);
}

/* ===== History Card ===== */
.history-card {
  cursor: pointer;
  overflow: hidden;
  border-radius: var(--profile-section-radius);
  border: 1px solid var(--profile-surface-border);
  background: var(--profile-surface-bg-soft);
  box-shadow: var(--profile-surface-shadow);
  animation: stagger-fade-in var(--duration-slow) var(--ease-out-smooth) forwards;
  animation-delay: calc(var(--stagger) * 50ms);
  opacity: 0;
  transition:
    transform var(--duration-fast) var(--ease-out-smooth),
    box-shadow var(--duration-fast) var(--ease-smooth),
    border-color var(--duration-fast) var(--ease-smooth);
}

.history-card:hover {
  transform: var(--lift-sm);
  box-shadow: var(--profile-surface-shadow-hover);
  border-color: var(--profile-surface-border-strong);
}

.history-card:focus-visible {
  outline: none;
  transform: var(--lift-sm);
  box-shadow:
    var(--glass-shadow-hover),
    0 0 0 2px rgba(var(--color-primary-rgb), 0.35);
}

/* Thumbnail */
.card-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--profile-muted-bg);
}

.card-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--duration-slow) var(--ease-smooth);
}

.history-card:hover .card-thumb img {
  transform: scale(1.01);
}

.history-card:focus-visible .card-thumb img {
  transform: scale(1.01);
}

.thumb-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--profile-muted-bg);
  color: var(--color-text-tertiary);
}

.card-time {
  position: absolute;
  bottom: var(--spacing-1);
  right: var(--spacing-1);
  padding: 0.0625rem 0.375rem;
  background: rgba(0, 0, 0, 0.6);
  color: var(--color-white);
  font-size: 0.625rem;
  font-weight: var(--font-medium);
  border-radius: var(--radius-sm);
  backdrop-filter: blur(0.25rem);
  font-variant-numeric: tabular-nums;
}

/* Info */
.card-info {
  padding: var(--spacing-2);
}

.card-title {
  font-size: var(--text-xs);
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

.card-author {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin: var(--spacing-1) 0 0;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .group-grid {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 8rem), 1fr));
    gap: var(--spacing-2);
  }
}

@media (max-width: 480px) {
  .group-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
