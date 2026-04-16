<template>
  <div :id="`comment-${comment.id}`" class="discussion-comment-card">
    <CommentItemShell
      class="discussion-comment-card__shell"
      :author="comment.user.username"
      :time="formatTime(comment.created_at)"
      :avatar-src="avatarUrl"
      :avatar-alt="comment.user.username"
      :avatar-fallback="avatarFallbackLabel"
      :is-reply="isReply"
    >
      <template #badges>
        <Badge v-if="isThreadOwner" variant="success" size="sm">
          {{ $t('comment.threadOwner') }}
        </Badge>
        <Badge v-if="comment.is_pinned" variant="warning" size="sm">
          {{ $t('comment.pinned') }}
        </Badge>
        <Badge v-if="comment.is_featured" variant="default" size="sm">
          {{ $t('comment.featured') }}
        </Badge>
      </template>

      <template #menu>
        <div v-click-outside="showMenu ? closeMenu : undefined" class="comment-menu">
          <button
            type="button"
            class="menu-btn"
            @click.stop="toggleMenu"
            :aria-label="$t('common.more')"
          >
            <AnimatedIcon name="sparkle" :fallback-icon="MoreHorizontal" size="md" />
          </button>
          <Transition name="dropdown">
            <div v-if="showMenu" class="menu-dropdown surface-paper-sketch" @click.stop>
              <button v-if="canDelete" type="button" class="menu-item danger" @click="handleDelete">
                <AnimatedIcon name="loading" :fallback-icon="Trash2" size="sm" />
                <span>{{ $t('common.delete') }}</span>
              </button>
              <button v-if="isAdmin" type="button" class="menu-item" @click="togglePin">
                <AnimatedIcon name="sparkle" :fallback-icon="Pin" size="sm" />
                <span>{{ comment.is_pinned ? $t('comment.unpin') : $t('comment.pin') }}</span>
              </button>
              <button v-if="isAdmin" type="button" class="menu-item" @click="toggleFeature">
                <AnimatedIcon name="sparkle" :fallback-icon="Star" size="sm" />
                <span>{{
                  comment.is_featured ? $t('comment.unfeature') : $t('comment.feature')
                }}</span>
              </button>
              <button type="button" class="menu-item" @click="handleShare">
                <AnimatedIcon name="explore" :fallback-icon="Share2" size="sm" />
                <span>{{ $t('comment.share') }}</span>
              </button>
              <button type="button" class="menu-item" @click="openReportDialog">
                <AnimatedIcon name="sparkle" :fallback-icon="Flag" size="sm" />
                <span>{{ $t('comment.report') }}</span>
              </button>
            </div>
          </Transition>
        </div>
      </template>

      <div class="comment-content">
        <p class="comment-copy">{{ comment.content }}</p>
      </div>

      <template #actions>
        <button
          type="button"
          class="action-btn"
          :class="{ active: comment.is_liked }"
          :aria-label="comment.is_liked ? $t('profile.unlike') : $t('post.likes')"
          :aria-pressed="comment.is_liked"
          :disabled="!isAuthenticated"
          @click="handleLike"
        >
          <AnimatedIcon
            name="heart"
            :fallback-icon="Heart"
            size="sm"
            :active="comment.is_liked ? true : false"
          />
          <span>{{ $t('post.likes') }}</span>
          <span v-if="likeCount > 0" class="action-count">{{ likeCount }}</span>
        </button>

        <button
          type="button"
          class="action-btn"
          :disabled="!isAuthenticated || !canReply"
          @click="handleReply"
        >
          <AnimatedIcon name="sparkle" :fallback-icon="MessageCircle" size="sm" />
          <span>{{ $t('comment.reply') }}</span>
        </button>
      </template>

      <template #reply>
        <Transition name="slide-down">
          <div v-if="showReplyForm" class="reply-form-wrapper">
            <DiscussionCommentForm
              ref="replyFormRef"
              :discussion-id="discussionId"
              :parent-id="replyParentId"
              :reply-to-username="comment.user.username"
              @cancel="showReplyForm = false"
              @submitted="handleReplySubmitted"
            />
          </div>
        </Transition>
      </template>

      <template
        v-if="
          canShowNestedReplies &&
          (replyCount > 0 || (comment.replies && comment.replies.length > 0))
        "
        #replies
      >
        <div class="replies-section">
          <button
            v-if="!showReplies"
            type="button"
            class="show-replies-btn"
            :disabled="isLoadingReplies"
            @click="handleShowReplies"
          >
            <AnimatedIcon name="explore" :fallback-icon="ChevronDown" size="sm" />
            <span v-if="isLoadingReplies">{{ $t('common.loading') }}</span>
            <span v-else>{{ $t('comment.showReplies', { count: replyCount }) }}</span>
          </button>

          <Transition name="slide-down">
            <div v-if="showReplies" class="replies-list">
              <DiscussionCommentCard
                v-for="reply in comment.replies"
                :key="reply.id"
                :comment="reply"
                :discussion-id="discussionId"
                v-bind="discussionAuthorId ? { discussionAuthorId } : {}"
                :is-reply="true"
                :depth="currentDepth + 1"
                :root-id="rootId || String(comment.id)"
              />

              <button
                v-if="hasMoreReplies && !isLoadingReplies"
                type="button"
                class="load-more-replies"
                @click="loadMoreReplies"
              >
                {{ $t('comment.loadMoreReplies') }}
              </button>
            </div>
          </Transition>
        </div>
      </template>
    </CommentItemShell>

    <ConfirmDialog
      v-model:is-open="showDeleteDialog"
      :title="$t('comment.confirmDeleteTitle')"
      :message="$t('comment.confirmDeleteMessage')"
      :confirm-text="$t('common.delete')"
      variant="danger"
      @confirm="confirmDelete"
    />

    <Dialog v-model:isOpen="showReportDialog" :title="$t('comment.reportTitle')" size="sm">
      <div class="report-form">
        <label class="report-label">{{ $t('comment.reportReasonLabel') }}</label>
        <Select v-model="reportReason" size="sm" :aria-label="$t('comment.reportReasonLabel')">
          <option value="spam">{{ $t('comment.reportReason.spam') }}</option>
          <option value="harassment">{{ $t('comment.reportReason.harassment') }}</option>
          <option value="inappropriate">{{ $t('comment.reportReason.inappropriate') }}</option>
          <option value="other">{{ $t('comment.reportReason.other') }}</option>
        </Select>

        <label class="report-label">{{ $t('comment.reportDescriptionLabel') }}</label>
        <Textarea v-model="reportDescription" size="sm" :maxlength="200" />
      </div>

      <template #footer>
        <Button variant="ghost" size="sm" @click="showReportDialog = false">
          {{ $t('common.cancel') }}
        </Button>
        <Button size="sm" :loading="isSubmittingReport" @click="submitReport">
          {{ $t('comment.reportSubmit') }}
        </Button>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, nextTick, onUnmounted, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  Trash2,
  Share2,
  Flag,
  ChevronDown,
  Pin,
  Star,
} from '@lucide/vue'
import { useAuthStore, useToastStore } from '@/stores'
import { discussionService, type DiscussionComment, ApiError } from '@/api'
import { getAvatarFallbackLabel } from '@/utils/avatarPresentation'
import { getUserAvatarUrl } from '@/composables/useUserAvatar'
import { formatRelativeTime } from '@/utils/date'
import { copyToClipboard } from '@/utils/modernAPIs'
import DiscussionCommentForm from './DiscussionCommentForm.vue'
import { discussionCommentTreeContextKey } from './discussionCommentTreeContext'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import Dialog from '@/components/ui/Dialog.vue'
import Button from '@/components/ui/Button.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Select from '@/components/ui/Select.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import Badge from '@/components/ui/Badge.vue'
import CommentItemShell from '@/components/comment/shared/CommentItemShell.vue'

interface Props {
  comment: DiscussionComment
  discussionId: string
  discussionAuthorId?: string
  isReply?: boolean
  depth?: number
  rootId?: string
}

const MAX_REPLY_DEPTH = 2
const MAX_NESTING_DEPTH = 1

const props = withDefaults(defineProps<Props>(), {
  isReply: false,
  depth: 0,
})

const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { user, isAuthenticated } = storeToRefs(authStore)
const discussionCommentTreeContext = inject(discussionCommentTreeContextKey, null)

const showMenu = ref(false)
const showReplyForm = ref(false)
const showReplies = ref(false)
const isLoadingReplies = ref(false)
const repliesNextCursor = ref<string | null>(null)
const repliesCursorReady = ref(false)
const hasMoreRepliesState = ref(false)
const showDeleteDialog = ref(false)
const showReportDialog = ref(false)
const isSubmittingReport = ref(false)
const reportReason = ref('spam')
const reportDescription = ref('')
const replyFormRef = useTemplateRef<InstanceType<typeof DiscussionCommentForm>>('replyFormRef')
const repliesPageSize = 20
let fetchRepliesController: AbortController | null = null
let fetchRepliesToken = 0

const currentDepth = computed(() => props.depth || 0)
const canReply = computed(() => currentDepth.value < MAX_REPLY_DEPTH)
const canShowNestedReplies = computed(() => currentDepth.value < MAX_NESTING_DEPTH)

const likeCount = computed(() => props.comment.like_count ?? props.comment.likes_count ?? 0)
const replyCount = computed(() => props.comment.reply_count ?? props.comment.replies_count ?? 0)
const hasMoreReplies = computed(() => {
  if (repliesCursorReady.value) {
    return hasMoreRepliesState.value
  }
  return (props.comment.replies?.length || 0) < replyCount.value
})

const replyParentId = computed(() => props.rootId || String(props.comment.id))

const avatarUrl = computed(() =>
  getUserAvatarUrl(props.comment.user.avatar_url, props.comment.user.username)
)

const avatarFallbackLabel = computed(() => getAvatarFallbackLabel(props.comment.user.username))

const isThreadOwner = computed(() => {
  if (!props.discussionAuthorId) return false
  return String(props.comment.user.id) === String(props.discussionAuthorId)
})

const isAdmin = computed(() => {
  return Boolean(user.value?.is_admin || user.value?.roles?.includes('admin'))
})

const canDelete = computed(() => {
  if (!user.value) return false
  return isAdmin.value || String(user.value.id) === String(props.comment.user.id)
})

function formatTime(dateStr: string): string {
  return formatRelativeTime(dateStr, t)
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === 'AbortError'
    : err instanceof Error && err.name === 'AbortError'
}

function abortFetchReplies() {
  fetchRepliesController?.abort()
  fetchRepliesController = null
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

  try {
    if (props.comment.is_liked) {
      await discussionService.unlikeComment(String(props.comment.id))
      discussionCommentTreeContext?.onLikeUpdated({
        commentId: String(props.comment.id),
        isLiked: false,
        likeCount: Math.max(0, likeCount.value - 1),
      })
    } else {
      await discussionService.likeComment(String(props.comment.id))
      discussionCommentTreeContext?.onLikeUpdated({
        commentId: String(props.comment.id),
        isLiked: true,
        likeCount: likeCount.value + 1,
      })
    }
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('comment.error.likeFailed'))
    }
  }
}

function handleReply() {
  if (!isAuthenticated.value) {
    toastStore.warning(t('comment.loginRequired'))
    return
  }

  showReplyForm.value = true
  nextTick(() => {
    if (props.depth > 0 && replyFormRef.value) {
      replyFormRef.value.setContent(`@${props.comment.user.username} `)
    }
    replyFormRef.value?.focus()
  })
}

function handleReplySubmitted(newComment: DiscussionComment) {
  showReplyForm.value = false
  showReplies.value = true
  discussionCommentTreeContext?.onReplySubmitted({
    parentId: replyParentId.value,
    comment: newComment,
  })
}

async function handleShowReplies() {
  const loadedReplies = props.comment.replies?.length || 0
  if (loadedReplies === 0 || (loadedReplies < replyCount.value && !repliesCursorReady.value)) {
    await loadReplies()
  }
  showReplies.value = true
}

async function loadReplies(options: { cursor?: string | null; append?: boolean } = {}) {
  abortFetchReplies()
  const controller = new AbortController()
  fetchRepliesController = controller
  const requestToken = ++fetchRepliesToken
  isLoadingReplies.value = true
  try {
    const append = Boolean(options.append)
    const res = await discussionService.getCommentReplies(
      String(props.comment.id),
      {
        limit: repliesPageSize,
        cursor: options.cursor ?? null,
      },
      {
        signal: controller.signal,
        skipErrorToast: true,
      }
    )
    if (controller.signal.aborted || requestToken !== fetchRepliesToken) return
    repliesNextCursor.value = res.next_cursor ?? null
    repliesCursorReady.value = true
    hasMoreRepliesState.value = Boolean(res.has_more && res.next_cursor)
    discussionCommentTreeContext?.onRepliesLoaded({
      commentId: String(props.comment.id),
      replies: res.items,
      append,
    })
  } catch (err) {
    if (controller.signal.aborted || isAbortError(err) || requestToken !== fetchRepliesToken) return
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('comment.error.fetchRepliesFailed'))
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

async function loadMoreReplies() {
  if (!hasMoreReplies.value || !repliesNextCursor.value) return
  await loadReplies({
    cursor: repliesNextCursor.value,
    append: true,
  })
}

function handleDelete() {
  closeMenu()
  showDeleteDialog.value = true
}

async function confirmDelete() {
  try {
    await discussionService.deleteComment(String(props.comment.id))
    toastStore.success(t('comment.deleteSuccess'))
    discussionCommentTreeContext?.onDeleted(String(props.comment.id))
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('comment.error.deleteFailed'))
    }
  }
}

async function handleShare() {
  closeMenu()
  const url = `${window.location.origin}/community/discussions/${props.discussionId}#comment-${props.comment.id}`
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
    await discussionService.reportComment(
      String(props.comment.id),
      reportReason.value,
      reportDescription.value
    )
    toastStore.success(t('comment.reportSubmitted'))
    showReportDialog.value = false
    reportDescription.value = ''
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('comment.error.reportFailed'))
    }
  } finally {
    isSubmittingReport.value = false
  }
}

async function togglePin() {
  closeMenu()
  try {
    if (props.comment.is_pinned) {
      await discussionService.unpinComment(String(props.comment.id))
      discussionCommentTreeContext?.onPinUpdated({
        commentId: String(props.comment.id),
        isPinned: false,
      })
    } else {
      await discussionService.pinComment(String(props.comment.id))
      discussionCommentTreeContext?.onPinUpdated({
        commentId: String(props.comment.id),
        isPinned: true,
      })
    }
    discussionCommentTreeContext?.onPinnedUpdated()
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  }
}

async function toggleFeature() {
  closeMenu()
  try {
    if (props.comment.is_featured) {
      await discussionService.unfeatureComment(String(props.comment.id))
      discussionCommentTreeContext?.onFeatureUpdated({
        commentId: String(props.comment.id),
        isFeatured: false,
      })
    } else {
      await discussionService.featureComment(String(props.comment.id))
      discussionCommentTreeContext?.onFeatureUpdated({
        commentId: String(props.comment.id),
        isFeatured: true,
      })
    }
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  }
}

onUnmounted(() => {
  abortFetchReplies()
})
</script>

<style scoped>
.discussion-comment-card {
  width: 100%;
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
  min-width: 10rem;
  padding: var(--spacing-1);
  z-index: 2;
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

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-block-size: 2rem;
  padding: 0.375rem 0.75rem;
  border-radius: 999rem;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  background: color-mix(in srgb, var(--ui-compat-surface-interactive) 88%, transparent);
  border: 1px solid color-mix(in srgb, var(--ui-compat-border) 72%, transparent);
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast),
    opacity var(--transition-fast);
}

.action-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ui-compat-surface-interactive) 96%, transparent);
  color: var(--color-text-primary);
  border-color: color-mix(in srgb, var(--ui-compat-border) 90%, transparent);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.active {
  color: var(--color-primary);
}

.action-count {
  font-variant-numeric: tabular-nums;
}

.reply-form-wrapper {
  padding-top: 0.125rem;
}

.replies-section {
  display: grid;
  gap: 0.75rem;
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
  background: color-mix(in srgb, var(--ui-compat-surface-interactive) 88%, transparent);
}

.replies-list {
  display: grid;
  gap: var(--spacing-2);
}

.load-more-replies {
  margin-top: var(--spacing-2);
  align-self: flex-start;
  font-size: var(--text-xs);
  color: var(--color-primary);
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

@media (max-width: 768px) {
  .action-btn {
    padding-inline: 0.625rem;
  }
}
</style>
