<template>
  <div class="discussion-detail-page">
    <div class="container">
      <Button variant="ghost" size="sm" class="back-btn" @click="goBack">
        <AnimatedIcon name="explore" :fallback-icon="ArrowLeft" size="sm" />
        {{ $t('common.back') }}
      </Button>

      <StateIndicator v-if="error" variant="error" :description="error" @action="fetchDiscussion" />

      <div v-else>
        <div v-if="isLoading" class="discussion-skeleton glass-card">
          <Skeleton variant="title" width="60%" />
          <Skeleton width="40%" height="1rem" />
          <Skeleton width="100%" height="7.5rem" />
        </div>

        <article v-else-if="discussion" class="discussion-card glass-card">
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
              <img
                v-if="discussion.author.avatar_url"
                :src="normalizeAvatarUrl(discussion.author.avatar_url) || undefined"
                :alt="discussion.author.username"
                class="author-avatar"
                loading="lazy"
                decoding="async"
              />
              <span class="author-name">{{ discussion.author.username }}</span>
              <span class="category-pill">{{ formatCategory(discussion.category) }}</span>
            </div>
            <div v-if="discussion.tags.length > 0" class="discussion-tags">
              <span v-for="tag in discussion.tags" :key="tag" class="discussion-tag glass-tag">
                #{{ tag }}
              </span>
            </div>

            <!-- Admin / Owner Actions -->
            <div v-if="canDelete || isAdmin" class="discussion-actions">
              <Button
                v-if="isAdmin"
                variant="ghost"
                size="sm"
                @click="handleTogglePin"
                :disabled="isPinning"
              >
                <AnimatedIcon name="sparkle" :fallback-icon="Pin" size="sm" />
                {{ discussion.is_pinned ? $t('community.unpin') : $t('community.pin') }}
              </Button>
              <Button
                v-if="canDelete"
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

          <div class="discussion-content">
            {{ discussion.content }}
          </div>

          <div
            v-if="discussion.referenced_post"
            class="referenced-post"
            @click="goToReferencedPost(discussion.referenced_post)"
          >
            <img
              v-if="discussion.referenced_post.thumbnail_url"
              :src="
                normalizeToThumbnailUrl(discussion.referenced_post.thumbnail_url, 'medium') ||
                discussion.referenced_post.thumbnail_url
              "
              :alt="discussion.referenced_post.title"
              class="referenced-thumb"
              loading="lazy"
              decoding="async"
            />
            <div class="referenced-content">
              <span class="referenced-label">{{ $t('community.referencedPost') }}</span>
              <span class="referenced-title">{{ discussion.referenced_post.title }}</span>
            </div>
          </div>
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

import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Eye, MessageSquare, Trash2, Pin } from 'lucide-vue-next'
import { useAuthStore, useToastStore } from '@/stores'
import { discussionService, type Discussion, ApiError } from '@/api'
import { normalizeAvatarUrl } from '@/api/userService'
import { normalizeToThumbnailUrl } from '@/utils/mediaOptimizer'
import { formatRelativeTime } from '@/utils/date'
import Button from '@/components/ui/Button.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import DiscussionCommentList from '@/components/community/DiscussionCommentList.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { user } = storeToRefs(authStore)

const discussionId = computed(() => route.params['id'] as string)
const discussion = ref<Discussion | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const showDeleteDialog = ref(false)
const isDeleting = ref(false)
const isPinning = ref(false)

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

function goToReferencedPost(post: { id: string; thumbnail_url?: string | null }) {
  if (post.thumbnail_url) {
    sessionStorage.setItem(
      `post-thumbnail-${post.id}`,
      normalizeToThumbnailUrl(post.thumbnail_url, 'medium') || post.thumbnail_url
    )
  }
  router.push(`/post/${post.id}`)
}

async function fetchDiscussion() {
  if (!discussionId.value || isLoading.value) return
  isLoading.value = true
  error.value = null

  try {
    discussion.value = await discussionService.get(discussionId.value)
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message
    } else {
      error.value = t('common.error')
    }
  } finally {
    isLoading.value = false
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

async function handleTogglePin() {
  if (!discussion.value || isPinning.value) return
  isPinning.value = true
  try {
    if (discussion.value.is_pinned) {
      await discussionService.unpin(discussion.value.id)
      discussion.value.is_pinned = false
    } else {
      await discussionService.pin(discussion.value.id)
      discussion.value.is_pinned = true
    }
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isPinning.value = false
  }
}

onMounted(fetchDiscussion)
watch(discussionId, fetchDiscussion)
</script>

<style scoped>
.discussion-detail-page {
  padding: var(--spacing-4) 0 var(--spacing-8);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-4);
}

.discussion-card {
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
}

.discussion-pin {
  font-size: var(--text-xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-primary);
}

.discussion-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
  color: var(--color-text-tertiary);
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
}

.author-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.author-name {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.category-pill {
  margin-left: auto;
  font-size: var(--text-xs);
  padding: 2px 10px;
  border-radius: var(--radius-full);
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
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
  gap: var(--spacing-2);
  padding-top: var(--spacing-3);
  border-top: 1px solid var(--glass-border);
}

.action-danger {
  color: var(--color-error) !important;
}

.action-danger:hover {
  background: var(--color-error-alpha) !important;
}

.discussion-content {
  white-space: pre-wrap;
  font-size: var(--text-base);
  color: var(--color-text-primary);
  line-height: var(--leading-relaxed);
}

.discussion-comments {
  margin-top: var(--spacing-6);
}

.referenced-post {
  margin-top: var(--spacing-4);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  background: var(--glass-bg-light);
  cursor: pointer;
}

.referenced-post:hover {
  background: var(--glass-bg);
}

.referenced-thumb {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}

.referenced-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.referenced-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.referenced-title {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.discussion-skeleton {
  padding: var(--spacing-5);
}

@media (max-width: 640px) {
  .discussion-card {
    padding: var(--spacing-4);
  }

  .discussion-title {
    font-size: var(--text-lg);
  }

  .category-pill {
    margin-left: 0;
  }
}
</style>
