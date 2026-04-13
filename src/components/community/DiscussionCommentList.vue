<template>
  <section
    class="discussion-comment-section surface-paper-sketch analog-dot-grid"
    :class="{ 'comment-section--guest': !isAuthenticated }"
  >
    <CommentThreadHeader
      :title="$t('comment.title')"
      :count="commentsCount"
      :subtitle="$t('comment.beFirst')"
    >
      <template #actions>
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
      </template>
    </CommentThreadHeader>

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
      />
    </TransitionGroup>

    <ControlButton v-if="hasMore && !isLoadingMore" class="load-more-btn" @click="loadMore">
      {{ $t('common.viewMore') }}
    </ControlButton>
  </section>
</template>

<script setup lang="ts" vapor>
import { ref, computed, provide, watch, onUnmounted, onWatcherCleanup } from 'vue'
import { MessageSquare } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores'
import { discussionService, type DiscussionComment, ApiError } from '@/api'
import DiscussionCommentForm from './DiscussionCommentForm.vue'
import DiscussionCommentCard from './DiscussionCommentCard.vue'
import { discussionCommentTreeContextKey } from './discussionCommentTreeContext'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import ControlButton from '@/components/appearance/ControlButton.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Select from '@/components/ui/Select.vue'
import CommentThreadHeader from '@/components/comment/shared/CommentThreadHeader.vue'

interface Props {
  discussionId: string
  discussionAuthorId?: string
}

const props = defineProps<Props>()

const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)
const { t } = useI18n()

const comments = ref<DiscussionComment[]>([])
const nextCursor = ref<string | null>(null)
const hasMoreState = ref(false)
const pageSize = 20
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
let latestFetchId = 0
let fetchCommentsController: AbortController | null = null

const currentSort = ref<'newest' | 'oldest' | 'popular'>('newest')
const currentFilter = ref<'all' | 'author' | 'admin'>('all')
const preloadReplies = ref('2')

const commentsCount = computed(() => comments.value.length)
const hasMore = computed(() => hasMoreState.value)

function sortPinnedFirst(items: DiscussionComment[]) {
  const pinned = items.filter((item) => item.is_pinned)
  const rest = items.filter((item) => !item.is_pinned)
  return [...pinned, ...rest]
}

function patchCommentById(
  list: DiscussionComment[],
  commentId: string,
  patcher: (comment: DiscussionComment) => DiscussionComment
): { items: DiscussionComment[]; updated: boolean } {
  let updated = false
  const items = list.map((item) => {
    if (String(item.id) === commentId) {
      updated = true
      return patcher(item)
    }
    if (item.replies && item.replies.length > 0) {
      const child = patchCommentById(item.replies, commentId, patcher)
      if (child.updated) {
        updated = true
        return { ...item, replies: child.items }
      }
    }
    return item
  })
  return { items: updated ? items : list, updated }
}

function removeNestedComment(
  list: DiscussionComment[],
  commentId: string
): { items: DiscussionComment[]; removedCount: number } {
  let removedCount = 0
  const items: DiscussionComment[] = []

  for (const item of list) {
    if (String(item.id) === commentId) {
      removedCount += 1
      continue
    }

    let nextItem = item
    if (item.replies && item.replies.length > 0) {
      const nested = removeNestedComment(item.replies, commentId)
      if (nested.removedCount > 0) {
        const baseReplyCount = item.reply_count ?? item.replies_count ?? item.replies.length
        const nextReplyCount = Math.max(0, baseReplyCount - nested.removedCount)
        nextItem = {
          ...item,
          replies: nested.items,
          reply_count: nextReplyCount,
          replies_count: nextReplyCount,
        }
        removedCount += nested.removedCount
      }
    }

    items.push(nextItem)
  }

  return { items, removedCount }
}

function getCommentMemo(comment: DiscussionComment) {
  return [
    comment.id,
    comment.updated_at ?? comment.created_at,
    comment.like_count ?? comment.likes_count ?? 0,
    comment.reply_count ?? comment.replies_count ?? 0,
    Boolean(comment.is_pinned),
    Boolean(comment.is_featured),
    Boolean(comment.is_liked),
  ]
}

function resolveFilterParam() {
  if (currentFilter.value === 'author') return 'author'
  if (currentFilter.value === 'admin') return 'admin'
  return undefined
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === 'AbortError'
    : err instanceof Error && err.name === 'AbortError'
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
    nextCursor.value = null
    hasMoreState.value = false
  } else {
    if (isLoadingMore.value || isLoading.value) return false
    isLoadingMore.value = true
  }

  error.value = null

  try {
    const res = await discussionService.getComments(
      props.discussionId,
      {
        limit: pageSize,
        cursor: reset ? null : nextCursor.value,
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
    nextCursor.value = res.next_cursor ?? null
    hasMoreState.value = Boolean(res.has_more && res.next_cursor)
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
  const ok = await fetchComments(false)
  if (!ok) return
}

function handleCommentAdded(newComment: DiscussionComment) {
  comments.value = sortPinnedFirst([newComment, ...comments.value])
}

function handlePinnedUpdated() {
  comments.value = sortPinnedFirst([...comments.value])
}

function handleReplySubmitted(payload: { parentId: string; comment: DiscussionComment }) {
  const { parentId, comment } = payload
  const patched = patchCommentById(comments.value, String(parentId), (item) => {
    const existingReplies = item.replies || []
    const dedupedReplies = existingReplies.filter(
      (reply) => String(reply.id) !== String(comment.id)
    )
    const updatedReplies = [...dedupedReplies, comment]
    const existingCount = item.reply_count ?? item.replies_count ?? existingReplies.length
    const updatedCount = Math.max(existingCount + 1, updatedReplies.length)
    return {
      ...item,
      replies: updatedReplies,
      reply_count: updatedCount,
      replies_count: updatedCount,
    }
  })
  if (patched.updated) {
    comments.value = patched.items
  }
}

function handleDeleted(commentId: string) {
  const updated = removeNestedComment(comments.value, String(commentId))
  if (updated.removedCount === 0) return
  comments.value = sortPinnedFirst(updated.items)
}

function handleLikeUpdated(payload: { commentId: string; isLiked: boolean; likeCount: number }) {
  const patched = patchCommentById(comments.value, payload.commentId, (item) => ({
    ...item,
    is_liked: payload.isLiked,
    like_count: payload.likeCount,
    likes_count: payload.likeCount,
  }))
  if (patched.updated) {
    comments.value = patched.items
  }
}

function handleRepliesLoaded(payload: {
  commentId: string
  replies: DiscussionComment[]
  append: boolean
}) {
  const patched = patchCommentById(comments.value, payload.commentId, (item) => {
    const currentReplies = item.replies || []
    const mergedReplies = payload.append
      ? [...currentReplies, ...payload.replies]
      : [...payload.replies]
    const dedupedReplies = Array.from(
      new Map(mergedReplies.map((reply) => [String(reply.id), reply])).values()
    )
    const existingCount = item.reply_count ?? item.replies_count ?? currentReplies.length
    const updatedCount = Math.max(existingCount, dedupedReplies.length)

    return {
      ...item,
      replies: dedupedReplies,
      reply_count: updatedCount,
      replies_count: updatedCount,
    }
  })
  if (patched.updated) {
    comments.value = patched.items
  }
}

function handlePinUpdated(payload: { commentId: string; isPinned: boolean }) {
  const patched = patchCommentById(comments.value, payload.commentId, (item) => ({
    ...item,
    is_pinned: payload.isPinned,
  }))
  if (patched.updated) {
    comments.value = sortPinnedFirst(patched.items)
  }
}

function handleFeatureUpdated(payload: { commentId: string; isFeatured: boolean }) {
  const patched = patchCommentById(comments.value, payload.commentId, (item) => ({
    ...item,
    is_featured: payload.isFeatured,
  }))
  if (patched.updated) {
    comments.value = patched.items
  }
}

provide(discussionCommentTreeContextKey, {
  onDeleted: handleDeleted,
  onReplySubmitted: handleReplySubmitted,
  onPinnedUpdated: handlePinnedUpdated,
  onLikeUpdated: handleLikeUpdated,
  onRepliesLoaded: handleRepliesLoaded,
  onPinUpdated: handlePinUpdated,
  onFeatureUpdated: handleFeatureUpdated,
})

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
  display: grid;
  gap: var(--spacing-5);
  padding: clamp(1rem, 2.5vw, 1.35rem);
  min-height: 12.5rem;
  border-radius: clamp(1.1rem, 2vw, 1.35rem);
  border: 1px solid color-mix(in srgb, var(--ui-compat-border) 80%, transparent);
  background: color-mix(in srgb, var(--ui-compat-surface-elevated) 96%, transparent);
  box-shadow: 0 1rem 2.75rem rgba(15, 23, 42, 0.06);
}

.comment-section--guest {
  background: color-mix(in srgb, var(--surface-paper-bg) 84%, rgba(255, 255, 255, 0.3));
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

.list-enter-active,
.list-leave-active,
.list-move {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(0.35rem) scale(0.98);
}

.load-more-btn {
  margin-top: var(--spacing-4);
  inline-size: 100%;
  justify-content: center;
}

@media (max-width: 768px) {
  .comment-controls {
    width: 100%;
  }
}
</style>
