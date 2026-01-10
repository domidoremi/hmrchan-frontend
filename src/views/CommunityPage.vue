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
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="switchTab(tab.id)"
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
        <div v-if="isLoading && discussions.length === 0" class="loading-state">
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
            class="discussion-card glass-card content-auto-sm"
            @click="goToPost(post.id, post.thumbnail_url)"
            @mouseenter="prefetchPostDetailPage"
          >
            <div class="discussion-thumbnail" v-if="post.thumbnail_url">
              <img
                :src="normalizeToThumbnailUrl(post.thumbnail_url, 'medium') || post.thumbnail_url"
                :srcset="getThumbnailSrcset(post.thumbnail_url) || undefined"
                :sizes="thumbnailSizes"
                :alt="post.title"
                loading="lazy"
                decoding="async"
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
                  decoding="async"
                />
                <span class="author-name">{{ post.author_name }}</span>
              </div>
            </div>
          </article>

          <LoadMoreSection
            v-if="discussions.length > 0"
            :count="discussions.length"
            :total="total"
            :has-more="hasMore"
            :loading="isLoadingMore"
            :sentinel-ref="setSentinelRef"
            @load-more="loadMore"
          />
        </div>
      </section>

      <!-- Hot Topics -->
      <section v-if="activeTab === 'hot'" class="community-section">
        <div v-if="isLoadingHot && hotTopics.length === 0" class="hot-topics-grid">
          <article v-for="i in 6" :key="i" class="topic-card glass-card">
            <div class="topic-rank">#{{ i }}</div>
            <div class="topic-content">
              <div class="skeleton" style="height: 20px; width: 80%" />
              <div class="skeleton" style="height: 14px; width: 50%; margin-top: 8px" />
            </div>
          </article>
        </div>
        <StateIndicator
          v-else-if="hotTopicsError"
          variant="error"
          :description="hotTopicsError"
          @action="fetchHotTopics"
        />
        <StateIndicator
          v-else-if="hotTopics.length === 0"
          variant="empty"
          :description="$t('community.noHotTopics', '暂无热门话题')"
        />
        <div v-else class="hot-topics-grid">
          <article
            v-for="(topic, index) in hotTopics"
            :key="topic.id"
            class="topic-card glass-card"
            @click="goToPost(topic.id, topic.thumbnail_url)"
          >
            <div class="topic-rank">#{{ index + 1 }}</div>
            <div class="topic-content">
              <h3 class="topic-title">{{ topic.title }}</h3>
              <div class="topic-meta">
                <span class="topic-count">
                  <MessageSquare :size="14" />
                  {{ topic.comment_count }}
                </span>
                <span class="topic-views">{{ topic.view_count }} 浏览</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'CommunityPage' })

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { MessageSquare, Flame } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores'
import { postService, type PostListItem, ApiError } from '@/api'
import {
  normalizeToThumbnailUrl,
  getThumbnailSrcset,
} from '@/utils/mediaOptimizer'
import { formatRelativeTime } from '@/utils/date'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import Button from '@/components/ui/Button.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import DiscussionComposer from '@/components/community/DiscussionComposer.vue'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

const activeTab = ref('recent')
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const discussions = ref<PostListItem[]>([])

const isLoadingHot = ref(false)
const hotTopicsError = ref<string | null>(null)
const hotTopics = ref<PostListItem[]>([])

const page = ref(1)
const total = ref(0)
const totalPages = ref(0)
const pageSize = 20

const hasMore = computed(() => page.value < totalPages.value)

const sentinelRef = ref<HTMLElement | null>(null)

const setSentinelRef = (el: Element | null) => {
  sentinelRef.value = el as HTMLElement | null
}

const thumbnailSizes = '(max-width: 640px) 60px, 80px'

let hasPrefetchedPostDetailPage = false

const tabs = [
  { id: 'recent', label: 'community.recentDiscussions', icon: MessageSquare },
  { id: 'hot', label: 'community.hotTopics', icon: Flame },
]

function switchTab(tabId: string) {
  activeTab.value = tabId
  if (tabId === 'hot' && hotTopics.value.length === 0) {
    fetchHotTopics()
  }
}

function handleDiscussionCreated() {
  fetchDiscussions(true)
}

function prefetchPostDetailPage() {
  if (hasPrefetchedPostDetailPage) return
  hasPrefetchedPostDetailPage = true
  import('@/views/PostDetailPage.vue').catch(() => {})
}

function formatTime(dateStr: string): string {
  return formatRelativeTime(dateStr, t)
}

function goToPost(postId: string, thumbnailUrl?: string | null) {
  if (thumbnailUrl) {
    sessionStorage.setItem(
      `post-thumbnail-${postId}`,
      normalizeToThumbnailUrl(thumbnailUrl, 'medium') || thumbnailUrl
    )
  }
  router.push(`/post/${postId}`)
}

function goToLogin() {
  router.push('/login')
}

async function fetchDiscussions(reset = true): Promise<boolean> {
  const hadData = discussions.value.length > 0

  if (reset) {
    if (isLoading.value) return false
    isLoading.value = true
    page.value = 1
    if (!hadData) {
      discussions.value = []
    }
  } else {
    if (isLoadingMore.value) return false
    isLoadingMore.value = true
  }

  error.value = null

  try {
    const res = await postService.listPosts({
      page: page.value,
      page_size: pageSize,
      sort_by: 'published_at',
      sort_order: 'desc',
    })

    const items = res.items.filter((p) => p.comment_count > 0)

    if (reset) {
      discussions.value = items
    } else {
      discussions.value.push(...items)
    }

    total.value = res.total
    totalPages.value = res.total_pages

    return true
  } catch (err) {
    if (discussions.value.length === 0) {
      if (err instanceof ApiError) {
        error.value = err.message
      } else {
        error.value = t('common.error')
      }
    }

    return false
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

async function loadMore(): Promise<boolean> {
  if (!hasMore.value || isLoading.value || isLoadingMore.value) return false

  const nextPage = page.value + 1
  page.value = nextPage
  const ok = await fetchDiscussions(false)
  if (!ok) {
    page.value = nextPage - 1
  }
  return ok
}

async function fetchHotTopics() {
  isLoadingHot.value = true
  hotTopicsError.value = null

  try {
    const res = await postService.listPosts({
      page: 1,
      page_size: 10,
      sort_by: 'view_count',
      sort_order: 'desc',
    })

    // 过滤出有评论的热门帖子
    hotTopics.value = res.items.filter((p) => p.comment_count > 0).slice(0, 6)
  } catch (err) {
    if (err instanceof ApiError) {
      hotTopicsError.value = err.message
    } else {
      hotTopicsError.value = t('common.error')
    }
  } finally {
    isLoadingHot.value = false
  }
}

useInfiniteScroll(sentinelRef, loadMore, {
  rootMargin: '800px', // 提前 800px 开始加载
  enabled: () =>
    activeTab.value === 'recent' && hasMore.value && !isLoading.value && !isLoadingMore.value,
})

onMounted(() => {
  if (discussions.value.length === 0) {
    fetchDiscussions()
  }
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
  width: 100%;
  margin-bottom: var(--spacing-6);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  text-align: center;
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

.topic-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.topic-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.topic-count {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

.topic-views {
  color: var(--color-text-tertiary);
}

.topic-card:hover {
  transform: translateY(-2px);
  cursor: pointer;
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
