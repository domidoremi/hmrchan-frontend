<template>
  <section class="comment-section">
    <header class="comment-header">
      <h3 class="comment-title">
        <MessageSquare :size="20" />
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
          {{ $t(`comment.sort.${option.value}`) }}
        </button>
      </div>
    </header>

    <!-- Comment Form -->
    <CommentForm :post-id="postId" @submitted="handleCommentAdded" />

    <!-- Comments List -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner" />
      <span>{{ $t('common.loading') }}</span>
    </div>

    <div v-else-if="comments.length === 0" class="empty-state">
      <MessageSquare :size="48" class="empty-icon" />
      <p>{{ $t('comment.empty') }}</p>
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
import { useCommentsStore } from '@/stores'
import type { Comment } from '@/types'
import CommentForm from './CommentForm.vue'
import CommentCard from './CommentCard.vue'

interface Props {
  postId: string
}

const props = defineProps<Props>()

const commentsStore = useCommentsStore()

const currentSort = ref<'newest' | 'oldest' | 'popular'>('newest')
const hasMore = ref(false)

const sortOptions = [
  { value: 'newest' as const },
  { value: 'popular' as const },
  { value: 'oldest' as const },
]

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
  // TODO: 实现分页加载
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
  background: rgba(139, 92, 246, 0.2);
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
  color: var(--color-white);
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
  gap: var(--spacing-2);
  padding: var(--spacing-8);
  text-align: center;
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
