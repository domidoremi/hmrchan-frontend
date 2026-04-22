<template>
  <div class="discussion-detail-page">
    <div class="container">
      <Button variant="ghost" size="sm" class="back-btn" @click="goBack">
        <AnimatedIcon name="explore" :fallback-icon="ArrowLeft" size="sm" />
        {{ $t('common.back') }}
      </Button>

      <StateIndicator
        v-if="error && !isUsingFallback"
        variant="error"
        :description="error"
        @action="fetchDiscussion"
      />

      <div v-else>
        <div v-if="isLoading" class="discussion-skeleton empty-surface">
          <Skeleton variant="title" width="60%" />
          <Skeleton width="40%" height="1rem" />
          <Skeleton width="100%" height="7.5rem" />
        </div>

        <article
          v-else-if="discussion"
          class="discussion-card surface-paper-sketch analog-dot-grid"
        >
          <header class="discussion-header">
            <div class="title-row">
              <h1 class="discussion-title">{{ discussion.title }}</h1>
              <span v-if="discussion.is_pinned" class="discussion-pin">
                {{ $t('community.pinned') }}
              </span>
            </div>
            <div class="discussion-meta">
              <span class="meta-item">
                <AnimatedIcon name="sparkle" :fallback-icon="MessageSquare" size="sm" />
                {{ discussion.comments_count }}
              </span>
              <span class="meta-item">
                <AnimatedIcon name="explore" :fallback-icon="Eye" size="sm" />
                {{ discussion.view_count }} {{ $t('post.views') }}
              </span>
              <span class="meta-item">{{
                formatTime(discussion.updated_at || discussion.created_at)
              }}</span>
            </div>
            <div class="discussion-author">
              <Avatar
                :src="resolvedDiscussionAuthorAvatarSrc"
                :alt="discussion.author.username"
                class="author-avatar"
                size="custom"
                loading="eager"
                decoding="async"
                fetch-priority="high"
                :fallback="discussionAuthorFallbackLabel"
              />
              <span class="author-name">{{ discussion.author.username }}</span>
              <span class="category-pill">{{ formatCategory(discussion.category) }}</span>
            </div>
            <div v-if="discussion.tags.length > 0" class="discussion-tags">
              <span v-for="tag in discussion.tags" :key="tag" class="discussion-tag glass-tag">
                #{{ tag }}
              </span>
            </div>

            <div v-if="canDelete" class="discussion-actions">
              <Button
                variant="ghost"
                size="sm"
                class="action-danger"
                @click="showDeleteDialog = true"
              >
                <AnimatedIcon name="loading" :fallback-icon="Trash2" size="sm" />
                {{ $t('community.deleteDiscussion') }}
              </Button>
            </div>
          </header>

          <div class="discussion-content paper-rule">
            {{ discussion.content }}
          </div>

          <ReferencedPostPreview
            v-if="discussion.referenced_post"
            :post="discussion.referenced_post"
            class="discussion-reference page-list-card"
          />
        </article>

        <section v-if="discussion" class="discussion-comments">
          <DiscussionCommentList
            :discussion-id="discussion.id"
            :discussion-author-id="discussion.author.id"
          />
        </section>
      </div>
    </div>

    <ConfirmDialog
      v-model:is-open="showDeleteDialog"
      :title="$t('community.confirmDeleteTitle')"
      :message="$t('community.confirmDeleteMessage')"
      :confirm-text="$t('common.delete')"
      variant="danger"
      :loading="isDeleting"
      @confirm="handleDeleteDiscussion"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'DiscussionDetailPage' })

import { ref, computed, watch, onWatcherCleanup } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Eye, MessageSquare, Trash2 } from '@lucide/vue'
import { useAuthStore, useToastStore, useDiscussionsStore } from '@/stores'
import { discussionService, ApiError } from '@/api'
import { getAvatarFallbackLabel, resolveAvatarSrc } from '@/utils/avatarPresentation'
import { formatRelativeTime } from '@/utils/date'
import Button from '@/components/ui/Button.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import Avatar from '@/components/ui/Avatar.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import DiscussionCommentList from '@/components/community/DiscussionCommentList.vue'
import ReferencedPostPreview from '@/components/community/ReferencedPostPreview.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()
const discStore = useDiscussionsStore()
const { user } = storeToRefs(authStore)

const discussionId = computed(() => route.params['id'] as string)
const discussion = computed(() => discStore.currentDiscussion)
const isLoading = ref(false)
const error = ref<string | null>(null)
const showDeleteDialog = ref(false)
const isDeleting = ref(false)
let fetchDiscussionToken = 0
const isUsingFallback = computed(() => discStore.source === 'fallback')
const resolvedDiscussionAuthorAvatarSrc = computed(() =>
  resolveAvatarSrc(discussion.value?.author.avatar_url)
)
const discussionAuthorFallbackLabel = computed(() =>
  getAvatarFallbackLabel(discussion.value?.author.username)
)

const isAdmin = computed(() => {
  return Boolean(user.value?.is_admin || user.value?.roles?.includes('admin'))
})

const canDelete = computed(() => {
  if (!user.value || !discussion.value) return false
  return isAdmin.value || String(user.value.id) === String(discussion.value.author.id)
})

function formatTime(dateStr: string): string {
  return formatRelativeTime(dateStr, t)
}

function formatCategory(category: string): string {
  return category ? category.charAt(0).toUpperCase() + category.slice(1) : ''
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/community')
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

async function fetchDiscussion(targetDiscussionId = discussionId.value, signal?: AbortSignal) {
  if (!targetDiscussionId) return
  const requestToken = ++fetchDiscussionToken

  isLoading.value = true
  error.value = null

  try {
    await discStore.fetchDiscussion(targetDiscussionId, signal ? { signal } : undefined)
    if (signal?.aborted || requestToken !== fetchDiscussionToken) return
    if (discStore.error) {
      error.value = t(discStore.error)
    }
  } catch (err) {
    if (signal?.aborted || isAbortError(err) || requestToken !== fetchDiscussionToken) return
    if (err instanceof ApiError) {
      error.value = err.message
    } else {
      error.value = t('common.error')
    }
  } finally {
    if (!signal?.aborted && requestToken === fetchDiscussionToken) {
      isLoading.value = false
    }
  }
}

async function handleDeleteDiscussion() {
  if (!discussion.value || isDeleting.value) return
  isDeleting.value = true
  try {
    await discussionService.delete(discussion.value.id)
    toastStore.success(t('community.deleteSuccess'))
    router.replace('/community')
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isDeleting.value = false
  }
}

watch(
  discussionId,
  (nextDiscussionId) => {
    const controller = new AbortController()
    void fetchDiscussion(nextDiscussionId, controller.signal)
    onWatcherCleanup(() => controller.abort())
  },
  { immediate: true }
)
</script>

<style scoped>
.discussion-detail-page {
  padding: var(--spacing-4) 0 var(--spacing-8);
}

.container {
  display: grid;
  gap: var(--spacing-4);
}

.fallback-preview {
  display: grid;
  gap: var(--spacing-2);
}

.fallback-preview__label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.fallback-preview p {
  margin: 0;
  max-width: 52ch;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.fallback-preview__detail {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  justify-self: start;
}

.discussion-card {
  display: grid;
  gap: var(--spacing-4);
  padding: var(--spacing-5);
}

.discussion-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.discussion-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  margin: 0;
  color: var(--surface-paper-ink);
}

.discussion-pin {
  font-size: var(--text-xs);
  display: inline-flex;
  align-items: center;
  min-block-size: calc(var(--appearance-chip-min-block-size) - 0.75rem);
  padding-block: 0.1875rem;
  padding-inline: max(0.6875rem, calc(var(--appearance-chip-padding-inline) * 0.68));
  border-radius: var(--radius-full);
  background: rgba(var(--color-primary-rgb), 0.12);
  line-height: var(--appearance-ui-line-height);
  color: var(--color-primary);
}

.discussion-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
  color: var(--surface-paper-ink-soft);
  font-size: var(--text-xs);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
}

.discussion-author {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.author-avatar {
  --avatar-size: 2rem;
  border: 0;
}

.author-name {
  font-size: var(--text-sm);
  color: var(--surface-paper-ink-soft);
}

.category-pill {
  margin-left: auto;
  font-size: var(--text-xs);
  display: inline-flex;
  align-items: center;
  min-block-size: calc(var(--appearance-chip-min-block-size) - 0.6875rem);
  padding-block: 0.25rem;
  padding-inline: max(0.75rem, calc(var(--appearance-chip-padding-inline) * 0.72));
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--surface-paper-bg) 80%, rgba(255, 255, 255, 0.42));
  line-height: var(--appearance-ui-line-height);
  color: var(--surface-paper-ink-soft);
}

.discussion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
}

.discussion-tag {
  font-size: var(--text-xs);
}

.discussion-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  padding-top: var(--spacing-3);
  border-top: 0.0625rem solid var(--surface-paper-border);
}

.action-danger {
  color: var(--color-error);
}

.action-danger:hover {
  background: var(--color-error-alpha);
}

.discussion-content {
  padding-top: var(--spacing-3);
  white-space: pre-wrap;
  font-size: var(--text-base);
  color: var(--surface-paper-ink);
  line-height: var(--leading-relaxed);
}

.discussion-comments {
  margin-top: var(--spacing-6);
}

.discussion-reference {
  margin-top: var(--spacing-4);
}

@media (max-width: 640px) {
  .discussion-title {
    font-size: var(--text-lg);
  }

  .category-pill {
    margin-left: 0;
  }
}
</style>
