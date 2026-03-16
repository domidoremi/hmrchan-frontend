<template>
  <article
    :id="`comment-${comment.id}`"
    class="discussion-comment-card"
    :class="{ 'is-reply': isReply }"
  >
    <div class="comment-header">
      <img :src="avatarUrl" :alt="comment.user.username" class="comment-avatar" />
      <div class="comment-meta">
        <span class="comment-author">{{ comment.user.username }}</span>
        <Badge v-if="isThreadOwner" variant="success" size="sm">{{
          $t('comment.threadOwner')
        }}</Badge>
        <Badge v-if="comment.is_pinned" variant="warning" size="sm">{{
          $t('comment.pinned')
        }}</Badge>
        <Badge v-if="comment.is_featured" variant="default" size="sm">{{
          $t('comment.featured')
        }}</Badge>
        <span class="comment-time">{{ formatTime(comment.created_at) }}</span>
      </div>

      <div class="comment-menu">
        <button
          type="button"
          class="menu-btn"
          @click.stop="toggleMenu"
          :aria-label="$t('common.more')"
        >
          <AnimatedIcon name="sparkle" :fallback-icon="MoreHorizontal" size="md" />
        </button>
        <Transition name="dropdown">
          <div v-if="showMenu" class="menu-dropdown glass-dropdown" @click.stop>
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
    </div>

    <div class="comment-content">
      <p>{{ comment.content }}</p>
    </div>

    <div class="comment-actions">
      <button
        type="button"
        class="action-btn"
        :class="{ active: comment.is_liked }"
        :aria-label="comment.is_liked ? $t('profile.unlike') : $t('post.likes')"
        :aria-pressed="comment.is_liked"
        @click="handleLike"
        :disabled="!isAuthenticated"
      >
        <AnimatedIcon
          name="heart"
          :fallback-icon="Heart"
          size="sm"
          :active="comment.is_liked ? true : false"
        />
        <span v-if="likeCount > 0">{{ likeCount }}</span>
      </button>

      <button
        type="button"
        class="action-btn"
        @click="handleReply"
        :disabled="!isAuthenticated || !canReply"
      >
        <AnimatedIcon name="sparkle" :fallback-icon="MessageCircle" size="sm" />
        <span>{{ $t('comment.reply') }}</span>
      </button>
    </div>

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
        <span v-if="isLoadingReplies">{{ $t('common.loading') }}</span>
        <span v-else>{{ $t('comment.showReplies', { count: replyCount }) }}</span>
      </button>

      <Transition name="slide-down">
        <div v-if="showReplies" class="replies-list">
          <DiscussionCommentCard
            v-for="reply in comment.replies"
            :key="reply.id"
            v-memo="getReplyMemo(reply)"
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
        <Select v-model="reportReason" size="sm">
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
  </article>
</template>

<script setup lang="ts" vapor>
import {
  ref,
  computed,
  inject,
  nextTick,
  onMounted,
  onUnmounted,
  onRenderTracked,
  onRenderTriggered,
  useTemplateRef,
} from 'vue'
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
} from 'lucide-vue-next'
import { useAuthStore, useToastStore } from '@/stores'
import { discussionService, type DiscussionComment, ApiError } from '@/api'
import { getUserAvatarUrl } from '@/composables/useUserAvatar'
import { formatRelativeTime } from '@/utils/date'
import DiscussionCommentForm from './DiscussionCommentForm.vue'
import { discussionCommentTreeContextKey } from './discussionCommentTreeContext'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import Dialog from '@/components/ui/Dialog.vue'
import Button from '@/components/ui/Button.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Select from '@/components/ui/Select.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import Badge from '@/components/ui/Badge.vue'

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
const renderDebugEnabled =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  (window as Window & { __MOMI_RENDER_DEBUG__?: boolean }).__MOMI_RENDER_DEBUG__ === true

if (renderDebugEnabled) {
  onRenderTracked((event) => {
    console.debug('[render:tracked][DiscussionCommentCard]', event.type, String(event.key))
  })

  onRenderTriggered((event) => {
    console.debug('[render:triggered][DiscussionCommentCard]', event.type, String(event.key))
  })
}

const showMenu = ref(false)
const showReplyForm = ref(false)
const showReplies = ref(false)
const isLoadingReplies = ref(false)
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
const hasMoreReplies = computed(() => (props.comment.replies?.length || 0) < replyCount.value)

const replyParentId = computed(() => {
  return props.rootId || String(props.comment.id)
})

const avatarUrl = computed(() => {
  return getUserAvatarUrl(props.comment.user.avatar_url, props.comment.user.username)
})

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

function getReplyMemo(comment: DiscussionComment) {
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
  if (!props.comment.replies || props.comment.replies.length === 0) {
    await loadReplies(1)
  }
  showReplies.value = true
}

async function loadReplies(page: number) {
  abortFetchReplies()
  const controller = new AbortController()
  fetchRepliesController = controller
  const requestToken = ++fetchRepliesToken
  isLoadingReplies.value = true
  try {
    const res = await discussionService.getCommentReplies(
      String(props.comment.id),
      page,
      repliesPageSize,
      {
        signal: controller.signal,
        skipErrorToast: true,
      }
    )
    if (controller.signal.aborted || requestToken !== fetchRepliesToken) return
    discussionCommentTreeContext?.onRepliesLoaded({
      commentId: String(props.comment.id),
      replies: res.items,
      append: page > 1,
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
  const loadedCount = props.comment.replies?.length || 0
  const nextPage = Math.floor(loadedCount / repliesPageSize) + 1
  await loadReplies(nextPage)
}

function handleDelete() {
  showMenu.value = false
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

function handleShare() {
  showMenu.value = false
  const url = `${window.location.origin}/community/discussions/${props.discussionId}#comment-${props.comment.id}`
  navigator.clipboard.writeText(url)
  toastStore.success(t('comment.shareSuccess'))
}

function openReportDialog() {
  showMenu.value = false
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
  showMenu.value = false
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
  showMenu.value = false
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
  abortFetchReplies()
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.discussion-comment-card {
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-light);
  transition: background var(--transition-fast);
}

.discussion-comment-card:hover {
  background: var(--glass-bg);
}

.discussion-comment-card.is-reply {
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
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  object-fit: cover;
}

.is-reply .comment-avatar {
  width: 1.75rem;
  height: 1.75rem;
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

.comment-time {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.comment-badge {
  padding: var(--spacing-0) var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  background: var(--glass-bg);
  color: var(--color-text-secondary);
}

.comment-badge.thread-owner {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.comment-badge.pinned {
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-primary);
}

.comment-badge.featured {
  background: rgba(var(--color-warning-rgb), 0.18);
  color: var(--color-warning);
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
  color: var(--color-text-tertiary);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
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
  min-width: 160px;
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
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    opacity var(--transition-fast);
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
  .discussion-comment-card.is-reply {
    margin-left: var(--spacing-4);
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
