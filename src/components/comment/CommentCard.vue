<template>
  <article class="comment-card" :class="{ 'is-reply': isReply }">
    <!-- Comment Header -->
    <div class="comment-header">
      <img :src="avatarUrl" :alt="comment.user.username" class="comment-avatar" />
      <div class="comment-meta">
        <span class="comment-author">{{ comment.user.username }}</span>
        <span v-if="userLevelBadge" class="user-level-badge" :class="comment.user.level">
          {{ userLevelBadge }}
        </span>
        <span class="comment-time">{{ formatTime(comment.created_at) }}</span>
      </div>

      <!-- More Actions Menu -->
      <div class="comment-menu" v-if="showActions">
        <button class="menu-btn" @click="toggleMenu" :aria-label="$t('common.more')">
          <MoreHorizontal :size="18" />
        </button>
        <Transition name="dropdown">
          <div v-if="showMenu" class="menu-dropdown glass-dropdown" @click.stop>
            <button v-if="canDelete" class="menu-item danger" @click="handleDelete">
              <Trash2 :size="16" />
              <span>{{ $t('common.delete') }}</span>
            </button>
            <button class="menu-item" @click="handleShare">
              <Share2 :size="16" />
              <span>{{ $t('comment.share') }}</span>
            </button>
            <button class="menu-item" @click="handleReport">
              <Flag :size="16" />
              <span>{{ $t('comment.report') }}</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Comment Content -->
    <div class="comment-content">
      <p>{{ comment.content }}</p>
    </div>

    <!-- Comment Actions -->
    <div class="comment-actions" v-if="showActions">
      <button
        class="action-btn"
        :class="{ active: comment.is_liked }"
        @click="handleLike"
        :disabled="!isAuthenticated"
      >
        <Heart :size="16" :fill="comment.is_liked ? 'currentColor' : 'none'" />
        <span v-if="comment.likes_count > 0">{{ comment.likes_count }}</span>
      </button>

      <button class="action-btn" @click="handleReply" :disabled="!isAuthenticated">
        <MessageCircle :size="16" />
        <span>{{ $t('comment.reply') }}</span>
      </button>

      <button
        class="action-btn"
        :class="{ active: comment.is_favorited }"
        @click="handleFavorite"
        :disabled="!isAuthenticated"
      >
        <Bookmark :size="16" :fill="comment.is_favorited ? 'currentColor' : 'none'" />
      </button>
    </div>

    <!-- Reply Form -->
    <Transition name="slide-down">
      <div v-if="showReplyForm" class="reply-form-wrapper">
        <CommentForm
          ref="replyFormRef"
          :post-id="comment.post_id"
          :reply-to="comment.id"
          :reply-to-username="comment.user.username"
          @cancel="showReplyForm = false"
          @submitted="handleReplySubmitted"
        />
      </div>
    </Transition>

    <!-- Replies -->
    <div v-if="comment.replies && comment.replies.length > 0" class="replies-section">
      <button
        v-if="!showReplies && comment.replies_count > 0"
        class="show-replies-btn"
        @click="showReplies = true"
      >
        <ChevronDown :size="16" />
        {{ $t('comment.showReplies', { count: comment.replies_count }) }}
      </button>

      <Transition name="slide-down">
        <div v-if="showReplies" class="replies-list">
          <CommentCard
            v-for="reply in comment.replies"
            :key="reply.id"
            :comment="reply"
            :is-reply="true"
            @reply="$emit('reply', $event)"
            @deleted="$emit('deleted', $event)"
          />
        </div>
      </Transition>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import {
  Heart,
  MessageCircle,
  Bookmark,
  MoreHorizontal,
  Trash2,
  Share2,
  Flag,
  ChevronDown,
} from 'lucide-vue-next'
import { useAuthStore, useCommentsStore, useToastStore } from '@/stores'
import type { Comment } from '@/types'
import CommentForm from './CommentForm.vue'

interface Props {
  comment: Comment
  isReply?: boolean
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isReply: false,
  showActions: true,
})

const emit = defineEmits<{
  reply: [commentId: string]
  deleted: [commentId: string]
}>()

const { t } = useI18n()
const authStore = useAuthStore()
const commentsStore = useCommentsStore()
const toastStore = useToastStore()

const { user, isAuthenticated } = storeToRefs(authStore)

const showMenu = ref(false)
const showReplyForm = ref(false)
const showReplies = ref(false)
const replyFormRef = ref<InstanceType<typeof CommentForm>>()

const avatarUrl = computed(() => {
  if (props.comment.user.avatar_url) return props.comment.user.avatar_url
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${props.comment.user.username}`
})

const userLevelBadge = computed(() => {
  const badges: Record<string, string> = {
    vip: 'VIP',
    moderator: 'MOD',
    admin: 'ADMIN',
  }
  return badges[props.comment.user.level] || null
})

const canDelete = computed(() => {
  if (!user.value) return false
  // 用户可以删除自己的评论，管理员/版主可以删除任何评论
  return user.value.id === props.comment.user.id
})

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return t('common.justNow')
  if (diffMins < 60) return t('common.minutesAgo', { n: diffMins })
  if (diffHours < 24) return t('common.hoursAgo', { n: diffHours })
  if (diffDays < 7) return t('common.daysAgo', { n: diffDays })

  return date.toLocaleDateString()
}

function toggleMenu() {
  showMenu.value = !showMenu.value
}

async function handleLike() {
  if (!isAuthenticated.value) {
    toastStore.warning(t('comment.loginRequired'))
    return
  }

  if (props.comment.is_liked) {
    await commentsStore.unlikeComment(props.comment.id)
  } else {
    await commentsStore.likeComment(props.comment.id)
  }
}

async function handleFavorite() {
  if (!isAuthenticated.value) {
    toastStore.warning(t('comment.loginRequired'))
    return
  }

  if (props.comment.is_favorited) {
    await commentsStore.unfavoriteComment(props.comment.id)
  } else {
    await commentsStore.favoriteComment(props.comment.id)
    toastStore.success(t('comment.favoriteSuccess'))
  }
}

function handleReply() {
  if (!isAuthenticated.value) {
    toastStore.warning(t('comment.loginRequired'))
    return
  }

  showReplyForm.value = true
  nextTick(() => {
    replyFormRef.value?.focus()
  })
}

function handleReplySubmitted() {
  showReplyForm.value = false
  showReplies.value = true
  emit('reply', props.comment.id)
}

async function handleDelete() {
  showMenu.value = false

  const confirmed = window.confirm(t('comment.confirmDelete'))
  if (!confirmed) return

  const result = await commentsStore.deleteComment(props.comment.post_id, props.comment.id)
  if (result.success) {
    toastStore.success(t('comment.deleteSuccess'))
    emit('deleted', props.comment.id)
  } else {
    toastStore.error(t('comment.error.deleteFailed'))
  }
}

function handleShare() {
  showMenu.value = false

  const url = `${window.location.origin}/post/${props.comment.post_id}#comment-${props.comment.id}`
  navigator.clipboard.writeText(url)
  toastStore.success(t('comment.shareSuccess'))
}

function handleReport() {
  showMenu.value = false
  // TODO: 打开举报对话框
  toastStore.info(t('comment.reportSubmitted'))
}

// 点击外部关闭菜单
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.comment-menu')) {
    showMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.comment-card {
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-light);
  transition: background var(--transition-fast);
}

.comment-card:hover {
  background: var(--glass-bg);
}

.comment-card.is-reply {
  margin-left: var(--spacing-8);
  padding: var(--spacing-3);
  background: transparent;
  border-left: 2px solid var(--glass-border);
}

.comment-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-3);
}

.comment-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.is-reply .comment-avatar {
  width: 28px;
  height: 28px;
}

.comment-meta {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.comment-author {
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
}

.user-level-badge {
  padding: var(--spacing-0) var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.user-level-badge.vip {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
}

.user-level-badge.moderator {
  background: var(--color-info);
  color: white;
}

.user-level-badge.admin {
  background: var(--color-error);
  color: white;
}

.comment-time {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.comment-menu {
  position: relative;
}

.menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
  transition: all var(--transition-fast);
}

.menu-btn:hover {
  background: var(--glass-bg);
  color: var(--color-text-primary);
}

.menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--spacing-1);
  min-width: 150px;
  padding: var(--spacing-1);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  width: 100%;
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  transition: background var(--transition-fast);
}

.menu-item:hover {
  background: var(--glass-bg-light);
}

.menu-item.danger {
  color: var(--color-error);
}

.comment-content {
  margin-bottom: var(--spacing-3);
}

.comment-content p {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-actions {
  display: flex;
  gap: var(--spacing-2);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  transition: all var(--transition-fast);
}

.action-btn:hover:not(:disabled) {
  background: var(--glass-bg);
  color: var(--color-text-primary);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.active {
  color: var(--color-primary);
}

.reply-form-wrapper {
  margin-top: var(--spacing-4);
  padding-left: var(--spacing-10);
}

.replies-section {
  margin-top: var(--spacing-4);
}

.show-replies-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2);
  font-size: var(--text-sm);
  color: var(--color-primary);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.show-replies-btn:hover {
  background: var(--glass-bg-light);
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
}
</style>
