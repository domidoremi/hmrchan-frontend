<template>
  <section class="comment-section" :class="{ 'comment-section--guest': !isAuthenticated }">
    <header class="comment-header">
      <h3 class="comment-title">
        <AnimatedIcon name="sparkle" :fallback-icon="MessageSquare" size="md" />
        {{ $t('comment.title') }}
        <span v-if="commentsCount > 0" class="comment-count">{{ commentsCount }}</span>
      </h3>

      <div class="comment-sort" v-if="comments.length > 0">
        <button
          v-for="option in sortOptions"
          :key="option.value"
          class="sort-btn"
          :class="{ active: currentSort === option.value }"
          @click="changeSort(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </header>

    <!-- Comment Form -->
    <div :class="{ 'comment-form-centered': !isLoading && comments.length === 0 }">
      <CommentForm :post-id="postId" @submitted="handleCommentAdded" />
    </div>

    <!-- Comments List -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner" />
      <span>{{ $t('common.loading') }}</span>
    </div>

    <div v-else-if="comments.length === 0 && isAuthenticated" class="empty-state">
      <AnimatedIcon name="explore" :fallback-icon="MessageSquare" size="xl" class="empty-icon" />
      <h4 class="empty-title">{{ $t('comment.empty') }}</h4>
      <p class="empty-hint">{{ $t('comment.beFirst') }}</p>
    </div>

    <TransitionGroup v-else name="list" tag="div" class="comments-list">
      <CommentCard
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        :post-id="props.postId"
        @reply="handleReply"
        @deleted="handleDeleted"
      />
    </TransitionGroup>

    <!-- Load More -->
    <button v-if="hasMore && !isLoading" class="load-more-btn glass-button" @click="loadMore">
      {{ $t('common.viewMore') }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { MessageSquare } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useCommentsStore } from '@/stores'
import type { Comment } from '@/types'
import CommentCard from './CommentCard.vue'
import CommentForm from './CommentForm.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

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

async function fetchComments() {
  await commentsStore.fetchComments(props.postId, currentSort.value)
}

function changeSort(sort: 'newest' | 'oldest' | 'popular') {
  currentSort.value = sort
  fetchComments()
}

function handleCommentAdded() {
  // 评论已由 store 添加到本地状态
}

function handleReply() {
  // 回复已由子组件处理
}

function handleDeleted() {
  // 评论已由 store 从本地状态移除
}

async function loadMore() {
  // NOTE: 评论分页由 useCommentsStore 通过 fetchComments(postId, page) 支持
  // 当前版本一次性加载所有评论，分页加载将在评论量较大时启用
}

onMounted(() => {
  fetchComments()
})

watch(
  () => props.postId,
  () => {
    fetchComments()
  }
)
</script>

<style scoped>
.comment-section {
  padding: var(--spacing-6);
  background: var(--glass-bg-light);
  border-radius: var(--radius-xl);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  /* 预留最小高度防止 CLS */
  min-height: 12.5rem;
}

.comment-section--guest {
  background: var(--glass-bg);
}

.comment-form-centered {
  max-width: 480px;
  margin-inline: auto;
}

.comment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-6);
  flex-wrap: wrap;
  gap: var(--spacing-4);
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

.comment-sort {
  display: flex;
  gap: var(--spacing-1);
}

.sort-btn {
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  transition: all var(--transition-fast);
}

.sort-btn:hover {
  background: var(--glass-bg);
  color: var(--color-text-primary);
}

.sort-btn.active {
  background: var(--color-primary);
  color: var(--color-on-primary);
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
  width: 100%;
  margin-top: var(--spacing-4);
}
</style>
