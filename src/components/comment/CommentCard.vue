<template>
  <article class="comment-card surface-paper-sketch" :class="{ 'is-reply': isReply }">
    <!-- Comment Header -->
    <div class="comment-header">
      <Avatar
        :src="avatarUrl"
        :alt="getUserDisplayName(comment.user)"
        :fallback="avatarFallbackLabel"
        size="custom"
        class="comment-avatar"
      />
      <div class="comment-meta">
        <span class="comment-author">{{ getUserDisplayName(comment.user) }}</span>
        <Badge v-if="comment.is_thread_owner" variant="success" size="sm">{{
          t('comment.threadOwner')
        }}</Badge>
        <Badge
          v-if="userLevelBadge"
          :variant="comment.user.level === 'admin' ? 'destructive' : 'secondary'"
          size="sm"
        >
          {{ userLevelBadge }}
        </Badge>
        <span class="comment-time">{{ formatTime(comment.created_at) }}</span>
      </div>

      <!-- More Actions Menu -->
      <div
        v-if="showActions"
        v-click-outside="showMenu ? closeMenu : undefined"
        class="comment-menu"
      >
        <button type="button" class="menu-btn" @click="toggleMenu" :aria-label="t('common.more')">
          <AnimatedIcon name="sparkle" :fallback-icon="MoreHorizontal" size="md" />
        </button>
        <Transition name="dropdown">
          <div v-if="showMenu" class="menu-dropdown surface-paper-sketch" @click.stop>
            <button v-if="canDelete" type="button" class="menu-item danger" @click="handleDelete">
              <AnimatedIcon name="loading" :fallback-icon="Trash2" size="sm" />
              <span>{{ t('common.delete') }}</span>
            </button>
            <button type="button" class="menu-item" @click="handleShare">
              <AnimatedIcon name="explore" :fallback-icon="Share2" size="sm" />
              <span>{{ t('comment.share') }}</span>
            </button>
            <button type="button" class="menu-item" @click="openReportDialog">
              <AnimatedIcon name="sparkle" :fallback-icon="Flag" size="sm" />
              <span>{{ t('comment.report') }}</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Comment Content -->
    <div class="comment-content">
      <!-- 回复对象标识 -->
      <div v-if="comment.replied_to_user" class="reply-indicator">
        <span class="reply-icon">↩</span>
        <span class="reply-label">{{ t('comment.replyingTo') }}</span>
        <span class="reply-to-user">{{ getUserDisplayName(comment.replied_to_user) }}</span>
      </div>
      <p class="comment-copy">{{ comment.content }}</p>
      <div v-if="commentImages.length > 0" class="comment-gallery">
        <a
          v-for="image in commentImages"
          :key="image.id"
          class="comment-gallery__item"
          :href="image.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            :src="image.thumbnail_url || image.url"
            :alt="image.filename || comment.content"
            class="comment-gallery__image"
            loading="lazy"
            decoding="async"
          />
        </a>
      </div>
    </div>

    <!-- Comment Actions -->
    <div class="comment-actions" v-if="showActions">
      <button
        type="button"
        class="action-btn"
        :class="{ active: comment.is_liked }"
        :aria-label="comment.is_liked ? t('profile.unlike') : t('post.likes')"
        :aria-pressed="comment.is_liked"
        @click="handleLike"
        :disabled="!isAuthenticated"
      >
        <AnimatedIcon name="heart" :fallback-icon="Heart" size="sm" :active="comment.is_liked" />
        <span v-if="likeCount > 0">{{ likeCount }}</span>
      </button>

      <button
        type="button"
        class="action-btn"
        @click="handleReply"
        :disabled="!isAuthenticated || !canReply"
      >
        <AnimatedIcon name="sparkle" :fallback-icon="MessageCircle" size="sm" />
        <span>{{ t('comment.reply') }}</span>
      </button>

      <button
        type="button"
        class="action-btn"
        :class="{ active: comment.is_favorited }"
        :aria-label="comment.is_favorited ? t('post.unfavorite') : t('post.favorite')"
        :aria-pressed="comment.is_favorited"
        @click="handleFavorite"
        :disabled="!isAuthenticated"
      >
        <AnimatedIcon
          name="explore"
          :fallback-icon="Bookmark"
          size="sm"
          :active="comment.is_favorited"
        />
      </button>
    </div>

    <!-- Reply Form -->
    <Transition name="slide-down">
      <div v-if="showReplyForm" class="reply-form-wrapper">
        <CommentForm
          ref="replyFormRef"
          :post-id="postId"
          :reply-to="depth === 0 ? String(comment.id) : String(rootId || comment.id)"
          :reply-to-username="comment.user.username"
          @cancel="showReplyForm = false"
          @submitted="handleReplySubmitted"
        />
      </div>
    </Transition>

    <!-- Replies -->
    <div
      v-if="
        canShowNestedReplies && (replyCount > 0 || (comment.replies && comment.replies.length > 0))
      "
      class="replies-section"
    >
      <button
        v-if="!showReplies"
        type="button"
        class="show-replies-btn"
        @click="handleShowReplies"
        :disabled="isLoadingReplies"
      >
        <AnimatedIcon name="explore" :fallback-icon="ChevronDown" size="sm" />
        <span v-if="isLoadingReplies">{{ t('common.loading') }}</span>
        <span v-else>{{ t('comment.showReplies', { count: actualRepliesCount }) }}</span>
      </button>

      <Transition name="slide-down">
        <div v-if="showReplies" class="replies-list">
          <CommentCard
            v-for="reply in comment.replies"
            :key="reply.id"
            v-memo="getReplyMemo(reply)"
            :comment="reply"
            :post-id="postId"
            :is-reply="true"
            :depth="currentDepth + 1"
            :root-id="depth === 0 ? String(comment.id) : rootId || ''"
          />
        </div>
      </Transition>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model:is-open="showDeleteDialog"
      :title="t('comment.confirmDeleteTitle')"
      :message="t('comment.confirmDeleteMessage')"
      :confirm-text="t('common.delete')"
      variant="danger"
      @confirm="confirmDelete"
    />

    <Dialog v-model:isOpen="showReportDialog" :title="t('comment.reportTitle')" size="sm">
      <div class="report-form">
        <label class="report-label">{{ t('comment.reportReasonLabel') }}</label>
        <Select v-model="reportReason" size="sm">
          <option value="spam">{{ t('comment.reportReason.spam') }}</option>
          <option value="harassment">{{ t('comment.reportReason.harassment') }}</option>
          <option value="inappropriate">{{ t('comment.reportReason.inappropriate') }}</option>
          <option value="other">{{ t('comment.reportReason.other') }}</option>
        </Select>

        <label class="report-label">{{ t('comment.reportDescriptionLabel') }}</label>
        <Textarea v-model="reportDescription" size="sm" :maxlength="200" />
      </div>

      <template #footer>
        <Button variant="ghost" size="sm" @click="showReportDialog = false">
          {{ t('common.cancel') }}
        </Button>
        <Button size="sm" :loading="isSubmittingReport" @click="submitReport">
          {{ t('comment.reportSubmit') }}
        </Button>
      </template>
    </Dialog>
  </article>
</template>

<script setup lang="ts" vapor>
import { ref, computed, inject, nextTick, onUnmounted, useTemplateRef } from 'vue'
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
import { getAvatarFallbackLabel } from '@/utils/avatarPresentation'
import { getUserDisplayName } from '@/utils/user'
import { getUserAvatarUrl } from '@/composables/useUserAvatar'
import { formatRelativeTime } from '@/utils/date'
import { copyToClipboard } from '@/utils/modernAPIs'
import CommentForm from './CommentForm.vue'
import { commentTreeContextKey } from './commentTreeContext'
import Avatar from '@/components/ui/Avatar.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import Dialog from '@/components/ui/Dialog.vue'
import Button from '@/components/ui/Button.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Select from '@/components/ui/Select.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import Badge from '@/components/ui/Badge.vue'

interface Props {
  comment: Comment
  postId: string
  isReply?: boolean
  showActions?: boolean
  depth?: number // 当前嵌套深度
  rootId?: string // 根评论 ID，用于扁平化回复
}

const MAX_REPLY_DEPTH = 2 // 允许回复的最大深度（0层和1层可以回复）
const MAX_NESTING_DEPTH = 1 // 显示嵌套的最大深度（超过此深度不显示子回复，而是展平）

const props = withDefaults(defineProps<Props>(), {
  isReply: false,
  showActions: true,
  depth: 0,
})

const currentDepth = computed(() => props.depth || 0)

// 允许回复：只要深度小于最大回复深度
const canReply = computed(() => currentDepth.value < MAX_REPLY_DEPTH)

// 显示嵌套回复：只有深度小于最大嵌套深度时才渲染子组件
const canShowNestedReplies = computed(() => currentDepth.value < MAX_NESTING_DEPTH)

const { t } = useI18n()
const authStore = useAuthStore()
const commentsStore = useCommentsStore()
const toastStore = useToastStore()
const commentTreeContext = inject(commentTreeContextKey, null)

const { user, isAuthenticated } = storeToRefs(authStore)

const showMenu = ref(false)
const showReplyForm = ref(false)
const showReplies = ref(false)
const isLoadingReplies = ref(false)
const showDeleteDialog = ref(false)
const showReportDialog = ref(false)
const isSubmittingReport = ref(false)
const reportReason = ref('spam')
const reportDescription = ref('')
const replyFormRef = useTemplateRef<InstanceType<typeof CommentForm>>('replyFormRef')
let fetchRepliesController: AbortController | null = null
let fetchRepliesToken = 0

function abortFetchReplies() {
  fetchRepliesController?.abort()
  fetchRepliesController = null
}

async function handleShowReplies() {
  if (!props.comment.replies || props.comment.replies.length === 0) {
    abortFetchReplies()
    const controller = new AbortController()
    fetchRepliesController = controller
    const requestToken = ++fetchRepliesToken
    isLoadingReplies.value = true
    try {
      const result = await commentsStore.fetchReplies(props.comment.id, 1, props.postId, {
        signal: controller.signal,
      })
      if (controller.signal.aborted || requestToken !== fetchRepliesToken) return
      if (!result.success && result.error !== 'aborted') {
        toastStore.error(t('comment.error.fetchRepliesFailed'))
        return
      }
    } finally {
      if (requestToken === fetchRepliesToken) {
        isLoadingReplies.value = false
        if (fetchRepliesController === controller) {
          fetchRepliesController = null
        }
      }
    }
  }
  showReplies.value = true
}

const avatarUrl = computed(() => {
  return getUserAvatarUrl(props.comment.user.avatar_url, props.comment.user.username)
})

const avatarFallbackLabel = computed(() =>
  getAvatarFallbackLabel(props.comment.user.username, getUserDisplayName(props.comment.user))
)

const userLevelBadge = computed(() => {
  const badges: Record<string, string> = {
    vip: 'VIP',
    moderator: 'MOD',
    admin: 'ADMIN',
  }
  return badges[props.comment.user.level] || null
})

const commentImages = computed(() => props.comment.images ?? [])

const likeCount = computed(() => props.comment.like_count ?? props.comment.likes_count ?? 0)
const replyCount = computed(() => props.comment.reply_count ?? props.comment.replies_count ?? 0)
const isAdmin = computed(() => {
  const roles = (user.value as { roles?: string[] } | null)?.roles
  return Boolean(user.value?.is_admin || roles?.includes('admin') || roles?.includes('moderator'))
})

const canDelete = computed(() => {
  if (!user.value) return false
  // 用户可以删除自己的评论，管理员/版主可以删除任何评论
  return isAdmin.value || user.value.id === props.comment.user.id
})

const actualRepliesCount = computed(() => {
  // 优先使用本地已加载的回复数量，其次使用后端返回的计数
  const localCount = props.comment.replies?.length || 0
  const serverCount = replyCount.value
  return Math.max(localCount, serverCount)
})

function getReplyMemo(comment: Comment) {
  return [
    comment.id,
    comment.updated_at ?? comment.created_at,
    comment.likes_count ?? comment.like_count ?? 0,
    comment.replies_count ?? comment.reply_count ?? 0,
    Boolean(comment.is_liked),
    Boolean(comment.is_favorited),
  ]
}

function formatTime(dateStr: string): string {
  return formatRelativeTime(dateStr, t)
}

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function closeMenu() {
  showMenu.value = false
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
    // 如果是在第二层回复（depth=1），需要手动添加 @用户名
    if (props.depth > 0 && replyFormRef.value) {
      const mentionText = `@${props.comment.user.username} `
      replyFormRef.value.setContent(mentionText)
    }
    replyFormRef.value?.focus()
  })
}

function handleReplySubmitted() {
  showReplyForm.value = false
  // 自动展开回复列表以显示新回复
  showReplies.value = true
  // 如果是扁平化回复，实际上是回复了 Root，所以 Root 的列表应该更新
  commentTreeContext?.onReplySubmitted(props.rootId || String(props.comment.id))
}

function handleDelete() {
  closeMenu()
  showDeleteDialog.value = true
}

async function confirmDelete() {
  const result = await commentsStore.deleteComment(props.postId, String(props.comment.id))
  if (result.success) {
    toastStore.success(t('comment.deleteSuccess'))
    commentTreeContext?.onDeleted(String(props.comment.id))
  } else {
    toastStore.error(t('comment.error.deleteFailed'))
  }
}

async function handleShare() {
  closeMenu()

  const url = `${window.location.origin}/post/${props.postId}#comment-${props.comment.id}`
  if (await copyToClipboard(url)) {
    toastStore.success(t('comment.shareSuccess'))
    return
  }

  toastStore.error(t('common.error'))
}

function openReportDialog() {
  closeMenu()
  showReportDialog.value = true
}

async function submitReport() {
  if (!reportReason.value) return

  isSubmittingReport.value = true
  try {
    const result = await commentsStore.reportComment(
      String(props.comment.id),
      reportReason.value,
      reportDescription.value || undefined
    )

    if (!result.success) {
      toastStore.error(t(result.error || 'comment.error.reportFailed'))
      return
    }

    toastStore.success(t('comment.reportSubmitted'))
    showReportDialog.value = false
    reportReason.value = 'spam'
    reportDescription.value = ''
  } finally {
    isSubmittingReport.value = false
  }
}

onUnmounted(() => {
  abortFetchReplies()
})
</script>

<style scoped>
.comment-card {
  display: grid;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  transition:
    transform var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out);
}

.comment-card:hover {
  transform: translateY(-0.08rem);
}

.comment-card.is-reply {
  margin-inline-start: var(--spacing-8);
  padding: var(--spacing-3);
  background: color-mix(in srgb, var(--surface-paper-bg) 62%, transparent);
  border-inline-start: 0.125rem solid var(--surface-paper-border-strong);
}

.comment-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-3);
}

.comment-avatar.ui-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 1rem;
  border: 0.0625rem solid var(--surface-paper-border);
  background: transparent;
}

.is-reply .comment-avatar.ui-avatar {
  width: 2rem;
  height: 2rem;
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
  color: var(--surface-paper-ink);
  font-size: var(--text-sm);
}

.floor-badge {
  padding: var(--spacing-0) var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  background: var(--color-primary);
  color: var(--color-on-primary);
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
  color: var(--surface-paper-ink-soft);
}

.comment-menu {
  position: relative;
}

.menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-md);
  color: var(--surface-paper-ink-soft);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.menu-btn:hover {
  background: color-mix(in srgb, var(--surface-paper-bg) 84%, rgba(255, 255, 255, 0.4));
  color: var(--surface-paper-ink);
}

.menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--spacing-1);
  min-width: 9.5rem;
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
  color: var(--surface-paper-ink);
  transition: background var(--transition-fast);
}

.menu-item:hover {
  background: color-mix(in srgb, var(--surface-paper-bg) 82%, rgba(255, 255, 255, 0.44));
}

.menu-item.danger {
  color: var(--color-error);
}

.comment-content {
  display: grid;
  gap: var(--spacing-2);
}

.comment-copy {
  margin: 0;
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--surface-paper-ink);
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
  gap: var(--spacing-2);
}

.comment-gallery__item {
  display: block;
  overflow: hidden;
  border: 0.0625rem solid var(--surface-paper-border);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--surface-paper-bg) 84%, rgba(255, 255, 255, 0.42));
}

.comment-gallery__image {
  display: block;
  inline-size: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.reply-indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  margin-bottom: var(--spacing-2);
  background: color-mix(in srgb, var(--surface-paper-bg) 86%, rgba(255, 255, 255, 0.4));
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

.reply-icon {
  color: var(--color-primary);
  font-weight: bold;
  font-size: var(--text-base);
}

.reply-label {
  color: var(--surface-paper-ink-soft);
}

.reply-to-user {
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.reply-to {
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.comment-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  padding-block-start: var(--spacing-2);
  border-top: 0.0625rem solid var(--surface-paper-border);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: 999rem;
  font-size: var(--text-xs);
  color: var(--surface-paper-ink-soft);
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    opacity var(--transition-fast);
}

.action-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--surface-paper-bg) 86%, rgba(255, 255, 255, 0.4));
  color: var(--surface-paper-ink);
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
  background: color-mix(in srgb, var(--surface-paper-bg) 84%, rgba(255, 255, 255, 0.4));
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
}

.report-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.report-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .comment-card.is-reply {
    margin-inline-start: var(--spacing-4);
  }

  .reply-form-wrapper {
    padding-left: var(--spacing-4);
  }

  .comment-actions {
    flex-wrap: wrap;
  }

  .action-btn {
    font-size: var(--text-xs);
    padding: var(--spacing-1);
  }
}
</style>
