<template>
  <div class="community-page">
    <!-- MindMarket 风格背景装饰 -->
    <div class="community-bg" aria-hidden="true">
      <div class="community-bg__blob community-bg__blob--coral" />
      <div class="community-bg__blob community-bg__blob--green" />
    </div>

    <div class="container">
      <!-- Header -->
      <header class="page-header">
        <div class="page-header-row">
          <div>
            <h1>{{ $t('community.title') }}</h1>
            <p class="page-subtitle">{{ $t('community.subtitle') }}</p>
          </div>
          <button
            type="button"
            class="guide-trigger glass-button"
            :aria-label="$t('community.guideTitle')"
            @click="showGuide = true"
          >
            <AnimatedIcon name="sparkle" :fallback-icon="HelpCircle" size="sm" />
          </button>
        </div>
      </header>

      <!-- Community Guide Dialog -->
      <Dialog v-model:isOpen="showGuide" :title="$t('community.guideTitle')" size="sm">
        <div class="guide-dialog-body">
          <p class="guide-text">{{ $t('community.guideDescription') }}</p>
          <ul class="guide-list">
            <li>{{ $t('community.guidePoint1') }}</li>
            <li>{{ $t('community.guidePoint2') }}</li>
            <li>{{ $t('community.guidePoint3') }}</li>
          </ul>
        </div>
      </Dialog>

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
          <AnimatedIcon name="explore" :fallback-icon="tab.icon" size="sm" />
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
            v-for="discussion in discussions"
            :key="discussion.id"
            class="discussion-card glass-card content-auto-sm"
            @click="goToDiscussion(discussion.id)"
            @mouseenter="prefetchDiscussionDetailPage"
          >
            <div
              class="discussion-thumbnail"
              v-if="discussion.referenced_post && discussion.referenced_post.thumbnail_url"
            >
              <img
                :src="
                  normalizeToThumbnailUrl(discussion.referenced_post.thumbnail_url, 'medium') ||
                  discussion.referenced_post.thumbnail_url
                "
                :srcset="getThumbnailSrcset(discussion.referenced_post.thumbnail_url) || undefined"
                :sizes="thumbnailSizes"
                :alt="discussion.referenced_post.title"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div class="discussion-content">
              <div class="discussion-title-row">
                <h3 class="discussion-title">{{ discussion.title }}</h3>
                <span v-if="discussion.is_pinned" class="discussion-pin">{{
                  $t('community.pinned')
                }}</span>
              </div>
              <p class="discussion-excerpt">{{ discussion.content }}</p>
              <div class="discussion-meta">
                <span class="comment-count">
                  <AnimatedIcon name="sparkle" :fallback-icon="MessageSquare" size="sm" />
                  {{ discussion.comments_count }}
                </span>
                <span class="discussion-time">{{
                  formatTime(discussion.updated_at || discussion.created_at)
                }}</span>
              </div>
              <div v-if="discussion.tags.length > 0" class="discussion-tags">
                <span v-for="tag in discussion.tags" :key="tag" class="discussion-tag glass-tag">
                  #{{ tag }}
                </span>
              </div>
              <div
                v-if="discussion.referenced_post"
                class="referenced-post"
                @click.stop="goToReferencedPost(discussion.referenced_post)"
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
          :description="$t('community.noHotTopics')"
        />
        <div v-else class="hot-topics-grid">
          <article
            v-for="(topic, index) in hotTopics"
            :key="topic.id"
            class="topic-card glass-card"
            @click="goToDiscussion(topic.id)"
          >
            <div class="topic-rank">#{{ index + 1 }}</div>
            <div class="topic-content">
              <h3 class="topic-title">{{ topic.title }}</h3>
              <div class="topic-meta">
                <span class="topic-count">
                  <AnimatedIcon name="sparkle" :fallback-icon="MessageSquare" size="sm" />
                  {{ topic.comments_count }}
                </span>
                <span class="topic-views">{{ topic.view_count }} {{ $t('post.views') }}</span>
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
import { MessageSquare, Flame, HelpCircle } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores'
import { discussionService, type Discussion, ApiError } from '@/api'
import { normalizeToThumbnailUrl, getThumbnailSrcset } from '@/utils/mediaOptimizer'
import { normalizeAvatarUrl } from '@/api/userService'
import { formatRelativeTime } from '@/utils/date'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import Button from '@/components/ui/Button.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import DiscussionComposer from '@/components/community/DiscussionComposer.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import Dialog from '@/components/ui/Dialog.vue'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

const showGuide = ref(false)
const activeTab = ref('recent')
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const discussions = ref<Discussion[]>([])

const isLoadingHot = ref(false)
const hotTopicsError = ref<string | null>(null)
const hotTopics = ref<Discussion[]>([])

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

let hasPrefetchedDiscussionDetailPage = false

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

function prefetchDiscussionDetailPage() {
  if (hasPrefetchedDiscussionDetailPage) return
  hasPrefetchedDiscussionDetailPage = true
  import('@/views/DiscussionDetailPage.vue').catch(() => {})
}

function formatTime(dateStr: string): string {
  return formatRelativeTime(dateStr, t)
}

function goToDiscussion(discussionId: string) {
  router.push(`/community/discussions/${discussionId}`)
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
    const res = await discussionService.list({
      page: page.value,
      page_size: pageSize,
      sort_by: 'created_at',
      sort_order: 'desc',
    })

    if (reset) {
      discussions.value = res.items
    } else {
      discussions.value.push(...res.items)
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
    const res = await discussionService.list({
      page: 1,
      page_size: 6,
      sort_by: 'comments_count',
      sort_order: 'desc',
    })
    hotTopics.value = res.items.slice(0, 6)
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
  position: relative;
  padding: var(--spacing-4) 0 var(--spacing-8);
  min-height: 100vh;
}

/* ========== MindMarket 风格背景 ========== */
.community-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  /* Keep page blobs behind the global contextual 3D background */
  z-index: -2;
  overflow: hidden;
}

.community-bg__blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.3;
}

.community-bg__blob--coral {
  width: 400px;
  height: 400px;
  top: 5%;
  left: -5%;
  background: radial-gradient(circle, rgba(251, 113, 133, 0.4) 0%, transparent 70%);
}

.community-bg__blob--green {
  width: 450px;
  height: 450px;
  bottom: 10%;
  right: -8%;
  background: radial-gradient(circle, rgba(74, 222, 128, 0.45) 0%, transparent 70%);
}

/* 暗色模式调整 */
[data-theme='dark'] .community-bg__blob {
  opacity: 0.15;
}

.page-header {
  margin-bottom: var(--spacing-4);
}

.page-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-3);
}

.page-header h1 {
  margin-bottom: var(--spacing-1);
  font-size: var(--text-xl);
}

@media (min-width: 768px) {
  .page-header h1 {
    font-size: var(--text-2xl);
  }
}

.page-subtitle {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.guide-trigger {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
}

.guide-trigger:hover {
  color: var(--color-text-primary);
}

.guide-dialog-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.guide-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.guide-list {
  display: grid;
  gap: var(--spacing-2);
  padding-left: var(--spacing-5);
  margin: 0;
  list-style: disc;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.composer-section {
  margin-bottom: var(--spacing-4);
}

.login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  text-align: center;
  margin-bottom: var(--spacing-4);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.community-tabs {
  display: flex;
  width: 100%;
  margin-bottom: var(--spacing-4);
  gap: var(--spacing-2);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
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
  color: var(--color-on-primary);
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
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-3);
}

@media (min-width: 768px) {
  .discussions-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1280px) {
  .discussions-list {
    grid-template-columns: repeat(3, 1fr);
  }
}

.discussion-card {
  display: flex;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
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

.discussion-title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.discussion-pin {
  font-size: var(--text-xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-primary);
}

.discussion-excerpt {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
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
  flex-wrap: wrap;
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

.discussion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
  margin-bottom: var(--spacing-2);
}

.discussion-tag {
  font-size: var(--text-xs);
}

.referenced-post {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  background: var(--glass-bg-light);
  margin-top: var(--spacing-2);
  cursor: pointer;
}

.referenced-post:hover {
  background: var(--glass-bg);
}

.referenced-thumb {
  width: 36px;
  height: 36px;
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
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.discussion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
  margin-bottom: var(--spacing-2);
}

.discussion-tag {
  font-size: var(--text-xs);
}

.referenced-post {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  background: var(--glass-bg-light);
  margin-top: var(--spacing-2);
  cursor: pointer;
}

.referenced-post:hover {
  background: var(--glass-bg);
}

.referenced-thumb {
  width: 36px;
  height: 36px;
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
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  grid-template-columns: 1fr;
  gap: var(--spacing-3);
}

@media (min-width: 640px) {
  .hot-topics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .hot-topics-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.topic-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
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
