<template>
  <MainLayout :disable-container="true" :enable-back-to-top="false">
    <div class="posts-page" :class="{ 'mobile-preview-open': previewVisible && !isDesktop }">
      <!-- Hero 区域 -->
      <PostsHero :total-posts="totalPosts" :platform-count="activePlatformCount" />

      <!-- 工具栏 -->
      <PostsToolbar
        v-model:search-query="searchQuery"
        v-model:selected-platform="selectedPlatform"
        v-model:sort-by="sortBy"
        v-model:view-mode="viewMode"
        :platforms="platformOptions"
        :is-sticky="isToolbarSticky"
        @search="handleSearch"
        @clear-search="handleClearSearch"
        @platform-change="handlePlatformChange"
      />

      <!-- 主内容区域 -->
      <div class="posts-layout">
        <!-- 帖子列表 -->
        <section class="feed-column">
          <!-- 离线提示 -->
          <p v-if="lastListFromFallback" class="offline-hint">
            {{ $t('offline.usingCache') }}
          </p>

          <!-- 骨架屏 -->
          <div v-if="loading && posts.length === 0" class="skeleton-grid">
            <div v-for="i in 8" :key="i" class="skeleton-card">
              <div class="skeleton-image"></div>
              <div class="skeleton-lines">
                <div class="line"></div>
                <div class="line short"></div>
              </div>
            </div>
          </div>

          <!-- 帖子网格 -->
          <div
            v-else-if="posts.length > 0"
            ref="postsGridRef"
            :class="['posts-grid', viewMode === 'list' ? 'is-list' : 'is-grid']"
          >
            <PostCard
              v-for="(post, index) in posts"
              :key="post.id"
              :post="post"
              :is-first-screen="index < 6"
              :preview-enabled="true"
              :show-actions="false"
              @open="openPreview"
            />
          </div>

          <!-- 空状态 -->
          <EmptyState
            v-else-if="!loading"
            icon="image"
            :title="$t('search.noResults')"
            :description="$t('search.noResultsDesc')"
          />

          <!-- 加载更多 -->
          <Transition name="fade">
            <div v-if="isLoadingMore" class="loading-more">
              <div class="spinner spinner-md"></div>
              <span>{{ $t('common.loading') }}</span>
            </div>
          </Transition>

          <!-- 无更多内容 -->
          <Transition name="fade">
            <div v-if="!hasMore && posts.length > 0" class="end-of-feed">
              <div class="end-icon">
                <CheckCircle2 :size="24" />
              </div>
              <span>{{ $t('common.noMore') }}</span>
            </div>
          </Transition>
        </section>

        <!-- 桌面端预览面板 -->
        <aside v-if="isDesktop" class="preview-column">
          <Transition name="preview-fade" mode="out-in">
            <PostPreviewPanel
              v-if="previewVisible"
              :key="previewPost?.id || 'preview-panel'"
              :post="previewPost"
              :loading="previewLoading"
              :error="previewError"
              @close="closePreview"
            />
            <div v-else class="preview-placeholder" key="preview-empty">
              <p>{{ $t('post.media') }}</p>
              <span>{{ $t('common.select') }}</span>
            </div>
          </Transition>
        </aside>
      </div>

      <!-- 移动端抽屉 -->
      <PostsMobileDrawer
        :visible="previewVisible && !isDesktop"
        :post="previewPost"
        :loading="previewLoading"
        :error="previewError"
        @close="closePreview"
      />

      <!-- 回到顶部按钮 -->
      <Transition name="fab">
        <button
          v-show="showScrollTop"
          class="scroll-top"
          type="button"
          @click="scrollToTop"
          :aria-label="$t('common.backToTop')"
        >
          <ArrowUp :size="24" />
          <div class="fab-ripple"></div>
        </button>
      </Transition>

      <!-- 激活的筛选器提示 -->
      <Transition name="slide-up">
        <div v-if="hasActiveFilters" class="active-filters">
          <div class="active-filters-content">
            <span>{{ activeFiltersText }}</span>
            <button class="clear-filters-btn" type="button" @click="handleClearAllFilters">
              <X :size="16" />
              {{ $t('filter.clearAll') }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
/**
 * PostsView - 帖子列表页面
 *
 * 职责：
 * 1. 整合所有子组件
 * 2. 管理页面级状态
 * 3. 处理数据加载和分页
 * 4. 管理预览面板状态
 */

import { ref, computed, onMounted, onUnmounted, watch, nextTick, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowUp, X, CheckCircle2 } from 'lucide-vue-next'

// Layout & Components
import MainLayout from '@/components/layout/MainLayout.vue'
import PostCard from '@/components/business/PostCard.vue'
import EmptyState from '@/components/ui/empty/EmptyState.vue'
import PostPreviewPanel from '@/components/business/PostPreviewPanel.vue'

// Local Components
import { PostsHero, PostsToolbar, PostsMobileDrawer } from './components'

// Composables
import { usePostsFilters } from './composables'
import { useInfiniteScroll } from '@/composables'
import { useWaterfallLayout } from '@/composables'

// Stores & Utils
import { usePostsStore, useSettingsStore } from '@/stores'
import { withLogging } from '@/utils/error'
import type { PostDetail } from '@/types'

// ============================================================================
// GSAP Setup
// ============================================================================

gsap.registerPlugin(ScrollTrigger)

// ============================================================================
// Stores & i18n
// ============================================================================

const { t } = useI18n()
const postsStore = usePostsStore()
const settingsStore = useSettingsStore()
const { posts, loading, lastListFromFallback, pagination } = storeToRefs(postsStore)
const { settings } = storeToRefs(settingsStore)

// ============================================================================
// Filters Composable
// ============================================================================

const {
  searchQuery,
  selectedPlatform,
  sortBy,
  viewMode,
  platformOptions,
  hasActiveFilters,
  activeFiltersText,
  activePlatformCount,
  apiSortParams,
  apiPlatformParam,
  clearSearch,
  clearAllFilters,
} = usePostsFilters()

// ============================================================================
// Refs
// ============================================================================

const postsGridRef = ref<HTMLElement | null>(null)

// ============================================================================
// UI State
// ============================================================================

const showScrollTop = ref(false)
const isToolbarSticky = ref(false)
const isDesktop = ref(true)

// ============================================================================
// Pagination State
// ============================================================================

const currentPage = ref(1)
const hasMore = ref(true)

// ============================================================================
// Preview State
// ============================================================================

const previewVisible = ref(false)
const previewPost = ref<PostDetail | null>(null)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)

// ============================================================================
// Computed
// ============================================================================

const totalPosts = computed(() => pagination.value?.total || posts.value.length)

// ============================================================================
// Waterfall Layout
// ============================================================================

const { updateLayout: updateWaterfallLayout, destroy: destroyWaterfallLayout } = useWaterfallLayout(
  postsGridRef as unknown as Ref<HTMLElement | null>,
  {
    columnGap: 24,
    rowGap: 24,
    breakpoints: {
      1600: 4,
      1360: 3,
      1024: 3,
      768: 2,
      0: 1,
    },
  },
)

// ============================================================================
// Data Loading
// ============================================================================

/**
 * 加载帖子列表
 */
const loadPosts = async () => {
  try {
    const response = await withLogging(
      () =>
        postsStore.fetchPosts({
          page: currentPage.value,
          platform: apiPlatformParam.value,
          ...apiSortParams.value,
          ignoreFilters: true,
        }),
      'PostsView:LoadPosts',
    )

    if (response?.page && response?.pages) {
      hasMore.value = response.page < response.pages
    } else {
      hasMore.value = false
    }

    await nextTick()
    if (viewMode.value === 'grid' && postsGridRef.value) {
      updateWaterfallLayout()
    }
  } catch {
    hasMore.value = false
  }
}

/**
 * 加载更多帖子
 */
const loadMore = async () => {
  if (!hasMore.value || isLoadingMore.value) return

  currentPage.value++
  try {
    const response = await withLogging(
      () =>
        postsStore.fetchPosts({
          page: currentPage.value,
          platform: apiPlatformParam.value,
          ...apiSortParams.value,
          append: true,
          ignoreFilters: true,
        }),
      'PostsView:LoadMore',
    )

    if (response?.page && response?.pages) {
      hasMore.value = response.page < response.pages
    } else {
      hasMore.value = false
    }

    await nextTick()
    if (viewMode.value === 'grid' && postsGridRef.value) {
      updateWaterfallLayout()
    }
  } catch {
    hasMore.value = false
  }
}

// Infinite Scroll
const { isLoading: isLoadingMore } = useInfiniteScroll({
  onLoadMore: loadMore,
  hasMore: () => hasMore.value,
  threshold: 300,
})

// ============================================================================
// Event Handlers
// ============================================================================

const handleSearch = () => {
  currentPage.value = 1
  loadPosts()
}

const handleClearSearch = () => {
  clearSearch()
  currentPage.value = 1
  loadPosts()
}

const handlePlatformChange = () => {
  currentPage.value = 1
  loadPosts()
}

const handleClearAllFilters = () => {
  clearAllFilters()
  currentPage.value = 1
  loadPosts()
}

// ============================================================================
// Preview Handlers
// ============================================================================

const openPreview = async (postId: string) => {
  previewVisible.value = true

  if (previewPost.value?.id === postId) return

  previewLoading.value = true
  previewError.value = null

  try {
    // 优先复用Store缓存
    const cachedDetail = postsStore.currentPost
    if (cachedDetail?.id === postId) {
      previewPost.value = cachedDetail
      previewLoading.value = false
      return
    }

    // 从列表浅缓存
    const listItem = posts.value.find((p) => p.id === postId)
    if (listItem) {
      previewPost.value = {
        ...listItem,
        media_files: [],
        tags: [],
      } as PostDetail
    }

    // 获取完整详情
    const detail = await withLogging(() => postsStore.fetchPost(postId), 'PostsView:FetchPreview')
    previewPost.value = detail
  } catch (error) {
    previewError.value = error instanceof Error ? error.message : t('error.unknown')
  } finally {
    previewLoading.value = false
  }
}

const closePreview = () => {
  previewVisible.value = false
}

const ensurePreviewForDesktop = () => {
  if (!isDesktop.value || (previewVisible.value && previewPost.value)) return

  const firstPost = posts.value?.[0]
  if (firstPost) {
    openPreview(firstPost.id)
  }
}

// ============================================================================
// Scroll & Responsive
// ============================================================================

const scrollToTop = () => {
  if (settings.value.enableAnimations) {
    gsap.to(window, {
      scrollTo: { y: 0 },
      duration: 0.8,
      ease: 'power3.inOut',
    })
  } else {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
}

const handleScroll = () => {
  showScrollTop.value = window.scrollY > 600
  isToolbarSticky.value = window.scrollY > 100
}

const handleResize = () => {
  isDesktop.value = window.innerWidth > 1024
  if (isDesktop.value) {
    ensurePreviewForDesktop()
  }
}

// ============================================================================
// Watchers
// ============================================================================

watch(sortBy, () => {
  currentPage.value = 1
  loadPosts()
})

watch(viewMode, async (mode) => {
  await nextTick()
  if (mode === 'grid') {
    updateWaterfallLayout()
  } else {
    destroyWaterfallLayout()
  }

  if (settings.value.enableAnimations) {
    gsap.from('.post-card', {
      y: 20,
      opacity: 0,
      duration: 0.4,
      stagger: 0.05,
      ease: 'power2.out',
    })
  }
})

watch(
  () => posts.value.length,
  async () => {
    await nextTick()
    if (viewMode.value === 'grid') {
      updateWaterfallLayout()
    }
    ensurePreviewForDesktop()
  },
)

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(async () => {
  await loadPosts()
  await nextTick()

  // 事件监听
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleResize, { passive: true })
  handleResize()
  ensurePreviewForDesktop()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
  destroyWaterfallLayout()
})
</script>

<style scoped>
.posts-page {
  width: min(1400px, 100%);
  margin: 0 auto;
  padding: clamp(24px, 4vw, 48px) clamp(16px, 5vw, 48px);
  display: flex;
  flex-direction: column;
  gap: clamp(24px, 4vw, 40px);
  transition: padding 0.3s ease;
}

.posts-page.mobile-preview-open {
  overflow: hidden;
}

/* ========== 布局 ========== */
.posts-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
  gap: clamp(24px, 4vw, 40px);
  align-items: flex-start;
}

.feed-column {
  display: flex;
  flex-direction: column;
  gap: clamp(20px, 3vw, 32px);
}

/* ========== 帖子网格 ========== */
.posts-grid {
  position: relative;
  min-height: 200px;
}

.posts-grid.is-grid {
  padding-bottom: clamp(16px, 2.5vw, 32px);
}

.posts-grid.is-list {
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 2vw, 24px);
}

.posts-grid.is-list :deep(.post-card) {
  position: relative !important;
  left: auto !important;
  top: auto !important;
  width: 100% !important;
  display: flex;
  gap: clamp(16px, 2vw, 24px);
}

.posts-grid.is-list :deep(.card-media) {
  width: clamp(220px, 28%, 280px);
  flex-shrink: 0;
}

.posts-grid.is-list :deep(.card-content) {
  flex: 1;
}

/* ========== 骨架屏 ========== */
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: clamp(18px, 2.8vw, 28px);
}

.skeleton-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: clamp(16px, 2.4vw, 24px);
  border-radius: clamp(18px, 2.4vw, 24px);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
}

.skeleton-image,
.line {
  background: linear-gradient(
    120deg,
    rgba(148, 163, 184, 0.16),
    rgba(226, 232, 240, 0.3),
    rgba(148, 163, 184, 0.16)
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s linear infinite;
}

.skeleton-image {
  width: 100%;
  height: clamp(160px, 18vw, 220px);
  border-radius: clamp(14px, 2vw, 18px);
}

.line {
  height: 14px;
  border-radius: 999px;
}

.line.short {
  width: 40%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ========== 加载状态 ========== */
.loading-more,
.end-of-feed {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 18px;
  color: var(--color-text-tertiary);
}

.end-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.12);
  color: var(--color-primary);
}

.offline-hint {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: rgba(59, 130, 246, 0.08);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

/* ========== 预览面板 ========== */
.preview-column {
  position: sticky;
  top: calc(var(--app-navbar-height, 78px) + 24px);
  display: flex;
  align-items: stretch;
}

.preview-column > * {
  width: 100%;
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 420px;
  border-radius: clamp(20px, 2.5vw, 28px);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--color-text-tertiary);
}

/* ========== FAB 按钮 ========== */
.scroll-top {
  position: fixed;
  bottom: calc(clamp(16px, 4vw, 32px) + env(safe-area-inset-bottom, 0px));
  right: clamp(16px, 4vw, 32px);
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(192, 132, 252, 0.95));
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 20px 40px -20px rgba(139, 92, 246, 0.6),
    0 8px 16px -10px rgba(79, 70, 229, 0.35);
  overflow: hidden;
  transition: transform 0.3s ease;
  z-index: 110;
}

.scroll-top:hover {
  transform: translateY(-4px);
}

.fab-ripple {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.scroll-top:hover .fab-ripple {
  opacity: 1;
}

/* ========== 筛选器提示 ========== */
.active-filters {
  position: fixed;
  bottom: calc(clamp(16px, 5vw, 32px) + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 105;
}

.active-filters-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.85);
  color: #fff;
  box-shadow: 0 20px 40px -28px rgba(15, 23, 42, 0.45);
}

.clear-filters-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.18);
  color: inherit;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.clear-filters-btn:hover {
  background: rgba(255, 255, 255, 0.28);
}

/* ========== 动画 ========== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.preview-fade-enter-active,
.preview-fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.fab-enter-active,
.fab-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.fab-enter-from,
.fab-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

/* ========== 响应式 ========== */
@media (max-width: 1280px) {
  .posts-layout {
    grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  }
}

@media (max-width: 1024px) {
  .posts-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .preview-column {
    display: none;
  }
}

@media (max-width: 768px) {
  .posts-page {
    padding: clamp(16px, 4vw, 24px);
    gap: 24px;
  }

  .posts-grid.is-list :deep(.post-card) {
    flex-direction: column;
  }

  .posts-grid.is-list :deep(.card-media) {
    width: 100%;
  }

  .scroll-top {
    bottom: calc(clamp(12px, 6vw, 20px) + env(safe-area-inset-bottom, 0px));
    right: clamp(12px, 6vw, 20px);
    width: 48px;
    height: 48px;
  }
}
</style>
