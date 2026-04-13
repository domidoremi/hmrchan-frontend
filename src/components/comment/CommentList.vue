<template>
  <section
    class="comment-section surface-paper-sketch analog-dot-grid"
    :class="{ 'comment-section--guest': !isAuthenticated }"
  >
    <CommentThreadHeader
      :title="t('comment.title')"
      :count="commentsCount"
      :subtitle="t('comment.beFirst')"
    >
      <template #actions>
        <ControlGroup v-if="comments.length > 0" class="comment-sort">
          <ControlButton
            v-for="option in sortOptions"
            :key="option.value"
            class="sort-btn"
            size="compact"
            :pressed="currentSort === option.value"
            @click="changeSort(option.value)"
          >
            {{ option.label }}
          </ControlButton>
        </ControlGroup>
      </template>
    </CommentThreadHeader>

    <!-- Comment Form -->
    <div :class="{ 'comment-form-centered': !isLoading && comments.length === 0 }">
      <CommentForm :post-id="postId" @submitted="handleCommentAdded" />
    </div>

    <!-- Comments List -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner" />
      <span>{{ t('common.loading') }}</span>
    </div>

    <div v-else-if="comments.length === 0 && isAuthenticated" class="empty-state">
      <AnimatedIcon name="explore" :fallback-icon="MessageSquare" size="xl" class="empty-icon" />
      <h4 class="empty-title">{{ t('comment.empty') }}</h4>
      <p class="empty-hint">{{ t('comment.beFirst') }}</p>
    </div>

    <TransitionGroup v-else name="list" tag="div" class="comments-list">
      <CommentCard
        v-for="comment in comments"
        :key="comment.id"
        v-memo="getCommentMemo(comment)"
        :comment="comment"
        :post-id="props.postId"
      />
    </TransitionGroup>

    <!-- Load More -->
    <ControlButton v-if="hasMore && !isLoading" class="load-more-btn" @click="loadMore">
      {{ t('common.viewMore') }}
    </ControlButton>
  </section>
</template>

<script setup lang="ts" vapor>
import { ref, computed, provide, watch, onWatcherCleanup } from 'vue'
import { MessageSquare } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useCommentsStore } from '@/stores'
import type { Comment } from '@/types'
import CommentCard from './CommentCard.vue'
import CommentForm from './CommentForm.vue'
import { commentTreeContextKey } from './commentTreeContext'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import ControlButton from '@/components/appearance/ControlButton.vue'
import ControlGroup from '@/components/appearance/ControlGroup.vue'
import CommentThreadHeader from '@/components/comment/shared/CommentThreadHeader.vue'

interface Props {
  postId: string
}

const props = defineProps<Props>()

const commentsStore = useCommentsStore()
const authStore = useAuthStore()
const { t } = useI18n()
const { isAuthenticated } = storeToRefs(authStore)

const currentSort = ref<'newest' | 'oldest' | 'popular'>('popular')
const hasMore = ref(false)

const sortOptions = computed(() => [
  { value: 'newest' as const, label: t('comment.sort.newest') },
  { value: 'popular' as const, label: t('comment.sort.popular') },
  { value: 'oldest' as const, label: t('comment.sort.oldest') },
])

const comments = computed<Comment[]>(() => {
  return commentsStore.getCommentsByPostId(props.postId)
})

const commentsCount = computed(() => {
  return commentsStore.getCommentsCount(props.postId)
})

const isLoading = computed(() => commentsStore.isLoading)

async function fetchComments(signal?: AbortSignal) {
  await commentsStore.fetchComments(
    props.postId,
    currentSort.value,
    signal ? { signal } : undefined
  )
}

function changeSort(sort: 'newest' | 'oldest' | 'popular') {
  currentSort.value = sort
}

function getCommentMemo(comment: Comment) {
  return [
    comment.id,
    comment.updated_at ?? comment.created_at,
    comment.like_count ?? comment.likes_count ?? 0,
    comment.reply_count ?? comment.replies_count ?? 0,
    Boolean(comment.is_liked),
  ]
}

function handleCommentAdded() {
  // 评论已由 store 添加到本地状态
}

function handleReplySubmitted() {
  // 回复已由子组件处理
}

function handleDeleted() {
  // 评论已由 store 从本地状态移除
}

provide(commentTreeContextKey, {
  onDeleted: handleDeleted,
  onReplySubmitted: handleReplySubmitted,
})

async function loadMore() {
  // NOTE: 评论分页由 useCommentsStore 通过 fetchComments(postId, page) 支持
  // 当前版本一次性加载所有评论，分页加载将在评论量较大时启用
}

watch(
  [() => props.postId, currentSort],
  () => {
    const controller = new AbortController()
    void fetchComments(controller.signal)
    onWatcherCleanup(() => controller.abort())
  },
  { immediate: true }
)
</script>

<style scoped>
.comment-section {
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

.comment-form-centered {
  inline-size: 100%;
  max-inline-size: min(100%, 42rem);
  margin-inline: auto;
}

.comment-sort {
  display: flex;
  gap: var(--spacing-1);
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

.sort-btn.page-control {
  box-shadow: none;
}

.sort-btn.page-control:hover,
.sort-btn.page-control:focus-visible {
  background: var(--glass-bg);
  color: var(--color-text-primary);
}

.sort-btn.page-control--active,
.sort-btn[aria-pressed='true'] {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-color: transparent;
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

@media (max-width: 768px) {
  .empty-state {
    padding: var(--spacing-7) var(--spacing-4);
    min-height: 11.25rem;
  }
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
  gap: var(--spacing-4);
}

.load-more-btn {
  inline-size: 100%;
  margin-top: var(--spacing-4);
  justify-content: center;
}
</style>
