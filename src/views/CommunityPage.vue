<template>
  <div class="community-page">
    <div class="container">
      <!-- Header -->
      <header class="page-header">
        <h1>{{ $t('community.title') }}</h1>
        <p class="page-subtitle">{{ $t('community.subtitle') }}</p>
      </header>

      <!-- Tabs -->
      <div class="community-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" :size="18" />
          <span>{{ $t(tab.label) }}</span>
        </button>
      </div>

      <!-- Recent Discussions -->
      <section v-if="activeTab === 'recent'" class="community-section">
        <div v-if="isLoading" class="loading-state">
          <div class="spinner" />
        </div>
        <div v-else-if="discussions.length === 0" class="empty-state glass-card">
          <MessageSquare :size="48" class="empty-icon" />
          <p>{{ $t('common.noResults') }}</p>
        </div>
        <div v-else class="discussions-list">
          <article
            v-for="discussion in discussions"
            :key="discussion.id"
            class="discussion-card glass-card"
            @click="goToPost(discussion.post_id)"
          >
            <div class="discussion-thumbnail" v-if="discussion.post_thumbnail">
              <img
                :src="normalizeToThumbnailUrl(discussion.post_thumbnail, 'medium') || discussion.post_thumbnail"
                :alt="discussion.post_title"
              />
            </div>
            <div class="discussion-content">
              <h3 class="discussion-title">{{ discussion.post_title }}</h3>
              <div class="discussion-meta">
                <span class="comment-count">
                  <MessageSquare :size="14" />
                  {{ discussion.comments_count }}
                </span>
                <span class="discussion-time">{{ formatTime(discussion.created_at) }}</span>
              </div>
              <div v-if="discussion.latest_comment" class="latest-comment">
                <img
                  :src="getAvatarUrl(discussion.latest_comment.user)"
                  :alt="discussion.latest_comment.user.username"
                  class="comment-avatar"
                />
                <div class="comment-preview">
                  <span class="comment-author">{{ discussion.latest_comment.user.username }}</span>
                  <p class="comment-text">{{ truncate(discussion.latest_comment.content, 100) }}</p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- Hot Topics -->
      <section v-if="activeTab === 'hot'" class="community-section">
        <div class="hot-topics-grid">
          <article
            v-for="i in 6"
            :key="i"
            class="topic-card glass-card"
          >
            <div class="topic-rank">#{{ i }}</div>
            <div class="topic-content">
              <div class="skeleton" style="height: 20px; width: 80%;" />
              <div class="skeleton" style="height: 14px; width: 50%; margin-top: 8px;" />
            </div>
          </article>
        </div>
      </section>

      <!-- My Comments (requires auth) -->
      <section v-if="activeTab === 'my'" class="community-section">
        <div v-if="!isAuthenticated" class="empty-state glass-card">
          <User :size="48" class="empty-icon" />
          <p>{{ $t('comment.loginRequired') }}</p>
          <Button @click="goToLogin">{{ $t('nav.login') }}</Button>
        </div>
        <div v-else class="my-comments-list">
          <div v-for="i in 3" :key="i" class="comment-item glass-card">
            <div class="skeleton" style="height: 60px;" />
          </div>
        </div>
      </section>

      <!-- Saved Comments (requires auth) -->
      <section v-if="activeTab === 'saved'" class="community-section">
        <div v-if="!isAuthenticated" class="empty-state glass-card">
          <Bookmark :size="48" class="empty-icon" />
          <p>{{ $t('comment.loginRequired') }}</p>
          <Button @click="goToLogin">{{ $t('nav.login') }}</Button>
        </div>
        <div v-else class="saved-comments-list">
          <div v-for="i in 3" :key="i" class="comment-item glass-card">
            <div class="skeleton" style="height: 60px;" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { MessageSquare, Flame, User, Bookmark } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores'
import type { CommunityPost, CommentUser } from '@/types'
import { normalizeToThumbnailUrl } from '@/utils/mediaOptimizer'
import Button from '@/components/ui/Button.vue'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

const activeTab = ref('recent')
const isLoading = ref(false)
const discussions = ref<CommunityPost[]>([])

const tabs = [
  { id: 'recent', label: 'community.recentDiscussions', icon: MessageSquare },
  { id: 'hot', label: 'community.hotTopics', icon: Flame },
  { id: 'my', label: 'community.myComments', icon: User },
  { id: 'saved', label: 'community.savedComments', icon: Bookmark },
]

function getAvatarUrl(user: CommentUser): string {
  if (user.avatar_url) return user.avatar_url
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

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

function goToPost(postId: string) {
  router.push(`/post/${postId}`)
}

function goToLogin() {
  router.push('/login')
}

async function fetchDiscussions() {
  isLoading.value = true
  try {
    // TODO: Implement actual API call
    const response = await fetch('/api/v1/community/discussions', {
      credentials: 'include',
    })
    if (response.ok) {
      const data = await response.json()
      discussions.value = data.items || []
    }
  } catch {
    // Silently fail for now
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchDiscussions()
})
</script>

<style scoped>
.community-page {
  padding: var(--spacing-8) 0;
}

.page-header {
  text-align: center;
  margin-bottom: var(--spacing-8);
}

.page-header h1 {
  margin-bottom: var(--spacing-2);
}

.page-subtitle {
  color: var(--color-text-tertiary);
}

.community-tabs {
  display: flex;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-6);
  overflow-x: auto;
  padding-bottom: var(--spacing-2);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.tab-btn.active {
  background: var(--color-primary);
  color: var(--color-white);
}

.community-section {
  min-height: 300px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: var(--spacing-12);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-12);
  text-align: center;
}

.empty-icon {
  color: var(--color-text-tertiary);
  opacity: 0.5;
}

.discussions-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.discussion-card {
  display: flex;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.discussion-card:hover {
  transform: translateY(-2px);
}

.discussion-thumbnail {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
}

.discussion-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.discussion-content {
  flex: 1;
  min-width: 0;
}

.discussion-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.discussion-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-3);
}

.comment-count {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

.latest-comment {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-2);
  padding: var(--spacing-2);
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
}

.comment-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.comment-preview {
  flex: 1;
  min-width: 0;
}

.comment-author {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.comment-text {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--spacing-1);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hot-topics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-4);
}

.topic-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
}

.topic-rank {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
  min-width: 40px;
}

.topic-content {
  flex: 1;
}

.my-comments-list,
.saved-comments-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.comment-item {
  padding: var(--spacing-4);
}

@media (max-width: 640px) {
  .discussion-thumbnail {
    width: 60px;
    height: 60px;
  }
}
</style>
