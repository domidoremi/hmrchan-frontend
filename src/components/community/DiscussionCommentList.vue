<template>
  <section
    class="discussion-comment-section"
    :class="{ 'comment-section--guest': !isAuthenticated }"
  >
    <header class="comment-header">
      <div class="header-left">
        <h3 class="comment-title">
          <AnimatedIcon name="sparkle" :fallback-icon="MessageSquare" size="md" />
          {{ $t('comment.title') }}
          <span v-if="commentsCount > 0" class="comment-count">{{ commentsCount }}</span>
        </h3>
      </div>

      <div class="comment-controls" v-if="comments.length > 0">
        <div class="control-item">
          <span class="control-label">{{ $t('comment.filterLabel') }}</span>
          <Select v-model="currentFilter" size="sm">
            <option value="all">{{ $t('comment.filter.all') }}</option>
            <option value="author">{{ $t('comment.filter.author') }}</option>
            <option value="admin">{{ $t('comment.filter.admin') }}</option>
          </Select>
        </div>
        <div class="control-item">
          <span class="control-label">{{ $t('comment.sortLabel') }}</span>
          <Select v-model="currentSort" size="sm">
            <option value="newest">{{ $t('comment.sort.newest') }}</option>
            <option value="popular">{{ $t('comment.sort.popular') }}</option>
            <option value="oldest">{{ $t('comment.sort.oldest') }}</option>
          </Select>
        </div>
        <div class="control-item">
          <span class="control-label">{{ $t('comment.preloadLabel') }}</span>
          <Select v-model="preloadReplies" size="sm">
            <option value="0">{{ $t('comment.preloadOff') }}</option>
            <option value="2">{{ $t('comment.preloadFew') }}</option>
            <option value="5">{{ $t('comment.preloadMore') }}</option>
          </Select>
        </div>
      </div>
    </header>

    <DiscussionCommentForm :discussion-id="discussionId" @submitted="handleCommentAdded" />

    <div v-if="isLoading" class="loading-state">
      <div class="spinner" />
      <span>{{ $t('common.loading') }}</span>
    </div>

    <StateIndicator
      v-else-if="error"
      variant="error"
      :description="error"
      @action="fetchComments"
    />

    <div
      v-else-if="comments.length === 0"
      class="empty-state"
      :class="{ 'empty-state--guest': !isAuthenticated }"
    >
      <AnimatedIcon name="explore" :fallback-icon="MessageSquare" size="xl" class="empty-icon" />
      <h4 class="empty-title">{{ $t('comment.empty') }}</h4>
      <p class="empty-hint">{{ $t('comment.beFirst') }}</p>
    </div>

    <TransitionGroup v-else name="list" tag="div" class="comments-list">
      <DiscussionCommentCard
        v-for="comment in comments"
        :key="comment.id"
        v-memo="getCommentMemo(comment)"
        :comment="comment"
        :discussion-id="discussionId"
        :discussion-author-id="discussionAuthorId"
        @deleted="handleDeleted"
        @reply-submitted="handleReplySubmitted"
        @pinned-updated="handlePinnedUpdated"
      />
    </TransitionGroup>

    <button
      v-if="hasMore && !isLoadingMore"
      type="button"
      class="load-more-btn glass-button"
      @click="loadMore"
    >
      {{ $t('common.viewMore') }}
    </button>
  </section>
</template>

<script setup lang="ts" vapor>
import { ref, computed, watch, onUnmounted, onWatcherCleanup } from 'vue'
import { MessageSquare } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores'
import { discussionService, type DiscussionComment, ApiError } from '@/api'
import DiscussionCommentForm from './DiscussionCommentForm.vue'
import DiscussionCommentCard from './DiscussionCommentCard.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Select from '@/components/ui/Select.vue'

interface Props {
  discussionId: string
  discussionAuthorId?: string
}

const props = defineProps<Props>()

const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)
const { t } = useI18n()

const comments = ref<DiscussionComment[]>([])
const total = ref(0)
const totalPages = ref(0)
const page = ref(1)
const pageSize = 20
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const hasNext = ref(false)
let latestFetchId = 0
let fetchCommentsController: AbortController | null = null

const currentSort = ref<'newest' | 'oldest' | 'popular'>('newest')
const currentFilter = ref<'all' | 'author' | 'admin'>('all')
const preloadReplies = ref('2')

const commentsCount = computed(() => total.value || comments.value.length)
const hasMore = computed(() => {
  if (totalPages.value > 0) {
    return page.value < totalPages.value
  }
  if (typeof total.value === 'number' && total.value > 0) {
    return comments.value.length < total.value
  }
  return hasNext.value
})

function sortPinnedFirst(items: DiscussionComment[]) {
  const pinned = items.filter((item) => item.is_pinned)
  const rest = items.filter((item) => !item.is_pinned)
  return [...pinned, ...rest]
}

function getCommentMemo(comment: DiscussionComment) {
  return [
    comment.id,
    comment.updated_at ?? comment.created_at,
    comment.like_count ?? 0,
    comment.reply_count ?? 0,
    Boolean(comment.is_pinned),
    Boolean(comment.is_liked),
  ]
}

function resolveFilterParam() {
  if (currentFilter.value === 'author') return 'author'
  if (currentFilter.value === 'admin') return 'admin'
  return undefined
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

function abortFetchCommentsRequest() {
  fetchCommentsController?.abort()
  fetchCommentsController = null
}

async function fetchComments(reset = true, signal?: AbortSignal): Promise<boolean> {
  const externalSignal = signal
  if (!externalSignal) {
    abortFetchCommentsRequest()
  }
  const controller = externalSignal ? null : new AbortController()
  if (controller) {
    fetchCommentsController = controller
  }
  const requestSignal = externalSignal ?? controller?.signal
  const fetchId = ++latestFetchId

  if (reset) {
    isLoading.value = true
    page.value = 1
  } else {
    if (isLoadingMore.value || isLoading.value) return false
    isLoadingMore.value = true
  }

  error.value = null

  try {
    const res = await discussionService.getComments(
      props.discussionId,
      {
        page: page.value,
        page_size: pageSize,
        sort: currentSort.value,
        filter: resolveFilterParam(),
        preload_replies: Number(preloadReplies.value),
      },
      {
        skipErrorToast: true,
        ...(requestSignal ? { signal: requestSignal } : {}),
      }
    )

    if (requestSignal?.aborted || fetchId !== latestFetchId) return false

    const items = sortPinnedFirst(res.items || [])
    if (reset) {
      comments.value = items
    } else {
      comments.value = sortPinnedFirst([...comments.value, ...items])
    }

    if (reset) {
      total.value = res.total ?? 0
      totalPages.value = res.total_pages ?? 0
    } else {
      total.value = res.total ?? total.value
      totalPages.value = res.total_pages ?? totalPages.value
    }
    hasNext.value =
      Boolean((res as unknown as { has_next?: boolean; has_more?: boolean }).has_next) ||
      Boolean((res as unknown as { has_more?: boolean }).has_more)
    return true
  } catch (err) {
    if (requestSignal?.aborted || isAbortError(err) || fetchId !== latestFetchId) return false

    if (comments.value.length === 0) {
      if (err instanceof ApiError) {
        error.value = err.message
      } else {
        error.value = t('comment.error.fetchFailed')
      }
    }
    return false
  } finally {
    if (!requestSignal?.aborted && fetchId === latestFetchId) {
      isLoading.value = false
      isLoadingMore.value = false
    }
    if (controller && fetchCommentsController === controller && fetchId === latestFetchId) {
      fetchCommentsController = null
    }
  }
}

async function loadMore() {
  if (!hasMore.value || isLoading.value || isLoadingMore.value) return
  const nextPage = page.value + 1
  page.value = nextPage
  const ok = await fetchComments(false)
  if (!ok) {
    page.value = nextPage - 1
  }
}

function handleCommentAdded(newComment: DiscussionComment) {
  comments.value = sortPinnedFirst([newComment, ...comments.value])
  total.value = total.value + 1
}

function handlePinnedUpdated() {
  comments.value = sortPinnedFirst([...comments.value])
}

function handleReplySubmitted(payload: { parentId: string; comment: DiscussionComment }) {
  const { parentId, comment } = payload
  comments.value = comments.value.map((item) => {
    if (String(item.id) !== String(parentId)) return item
    const existingReplies = item.replies || []
    const updatedReplies = [...existingReplies, comment]
    const existingCount = item.reply_count ?? item.replies_count ?? existingReplies.length
    const updatedCount = existingCount + 1
    return {
      ...item,
      replies: updatedReplies,
      reply_count: updatedCount,
      replies_count: updatedCount,
    }
  })
}

function handleDeleted(commentId: string) {
  let removedTopLevel = false

  const updated = comments.value.filter((item) => {
    if (String(item.id) === String(commentId)) {
      removedTopLevel = true
      return false
    }
    if (item.replies && item.replies.length > 0) {
      const index = item.replies.findIndex((reply) => String(reply.id) === String(commentId))
      if (index !== -1) {
        item.replies.splice(index, 1)
        const updatedCount = Math.max(0, (item.reply_count ?? item.replies_count ?? 0) - 1)
        item.reply_count = updatedCount
        item.replies_count = updatedCount
      }
    }
    return true
  })

  comments.value = updated
  if (removedTopLevel) {
    total.value = Math.max(0, total.value - 1)
  }
}

watch(
  () => props.discussionId,
  () => {
    const controller = new AbortController()
    void fetchComments(true, controller.signal)
    onWatcherCleanup(() => controller.abort())
  },
  { immediate: true }
)

watch([currentSort, currentFilter, preloadReplies], () => {
  const controller = new AbortController()
  void fetchComments(true, controller.signal)
  onWatcherCleanup(() => controller.abort())
})

onUnmounted(() => {
  latestFetchId += 1
  abortFetchCommentsRequest()
  isLoading.value = false
  isLoadingMore.value = false
})
</script>

<style scoped>
.discussion-comment-section {
  padding: var(--spacing-6);
  background: var(--glass-bg-light);
  border-radius: var(--radius-xl);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  min-height: 12.5rem;
}

.comment-section--guest {
  background: var(--glass-bg);
}

.comment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-6);
  flex-wrap: wrap;
  gap: var(--spacing-4);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.comment-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.comment-count {
  padding: var(--spacing-0) var(--spacing-2);
  background: var(--color-primary-100);
  color: var(--color-primary);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
}

[data-theme='dark'] .comment-count {
  background: rgba(var(--color-primary-rgb), 0.2);
}

.comment-controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
  align-items: center;
}

.control-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.control-label {
  white-space: nowrap;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-8);
  color: var(--color-text-tertiary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-8) var(--spacing-6);
  text-align: center;
  border-radius: var(--radius-lg);
  border: 1px dashed var(--glass-border);
  background: linear-gradient(
    135deg,
    rgba(var(--color-primary-rgb), 0.08),
    rgba(var(--color-secondary-rgb), 0.04)
  );
  min-height: 13.75rem;
}

.empty-state--guest {
  border-style: solid;
  background: var(--glass-bg-light);
  box-shadow: var(--shadow-sm);
}

.empty-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.empty-icon {
  color: var(--color-text-tertiary);
  opacity: 0.5;
}

.empty-hint {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.load-more-btn {
  margin-top: var(--spacing-4);
  width: 100%;
}

@media (max-width: 768px) {
  .comment-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
