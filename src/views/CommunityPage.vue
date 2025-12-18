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

      <!-- Discussion Composer -->
      <DiscussionComposer
        v-if="isAuthenticated"
        class="composer-section"
        @created="handleDiscussionCreated"
      />
      <div v-else class="login-prompt glass-card">
        <p>{{ $t('community.loginToPost') }}</p>
        <Button @click="goToLogin">{{ $t('nav.login') }}</Button>
      </div>

      <!-- Recent Discussions -->
      <section v-if="activeTab === 'recent'" class="community-section">
        <div v-if="isLoading" class="loading-state">
          <div class="spinner" />
        </div>
        <StateIndicator
          v-else-if="error"
          variant="error"
          :description="error"
          @action="fetchDiscussions"
        />
        <StateIndicator
          v-else-if="discussions.length === 0"
          variant="empty"
          :description="$t('common.noResults')"
        />
        <div v-else class="discussions-list">
          <article
            v-for="post in discussions"
            :key="post.id"
            class="discussion-card glass-card"
            @click="goToPost(post.id)"
          >
            <div class="discussion-thumbnail" v-if="post.thumbnail_url">
              <img
                :src="normalizeToThumbnailUrl(post.thumbnail_url, 'medium') || post.thumbnail_url"
                :alt="post.title"
                loading="lazy"
              />
            </div>
            <div class="discussion-content">
              <h3 class="discussion-title">{{ post.title }}</h3>
              <div class="discussion-meta">
                <span class="comment-count">
                  <MessageSquare :size="14" />
                  {{ post.comment_count }}
                </span>
                <span class="discussion-time">{{ formatTime(post.published_at) }}</span>
              </div>
              <div class="discussion-author">
                <img
                  v-if="post.author_avatar_url"
                  :src="post.author_avatar_url"
                  :alt="post.author_name"
                  class="author-avatar"
                />
                <span class="author-name">{{ post.author_name }}</span>
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
defineOptions({ name: 'CommunityPage' })

import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { MessageSquare, Flame, User, Bookmark } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores'
import { postService, type PostListItem, ApiError } from '@/api'
import { normalizeToThumbnailUrl } from '@/utils/mediaOptimizer'
import Button from '@/components/ui/Button.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import DiscussionComposer from '@/components/community/DiscussionComposer.vue'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

const activeTab = ref('recent')
const isLoading = ref(false)
const error = ref<string | null>(null)
const discussions = ref<PostListItem[]>([])

const tabs = [
  { id: 'recent', label: 'community.recentDiscussions', icon: MessageSquare },
  { id: 'hot', label: 'community.hotTopics', icon: Flame },
  { id: 'my', label: 'community.myComments', icon: User },
  { id: 'saved', label: 'community.savedComments', icon: Bookmark },
]

function handleDiscussionCreated() {
  fetchDiscussions()
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
  error.value = null
  try {
    const res = await postService.listPosts({
      page: 1,
      page_size: 20,
      sort_by: 'published_at',
      sort_order: 'desc',
    })
    discussions.value = res.items.filter(p => p.comment_count > 0)
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

.composer-section {
  margin-bottom: var(--spacing-6);
}

.login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-6);
  text-align: center;
  margin-bottom: var(--spacing-6);
  color: var(--color-text-secondary);
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

.discussion-author {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
}

.author-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.author-name {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
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
