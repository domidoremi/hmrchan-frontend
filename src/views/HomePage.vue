<template>
  <MainLayout>
    <div class="home-page">
      <!-- Hero Section with transition -->
      <Transition name="hero-fade">
        <section v-if="settingsStore.settings.showHeroSection" class="hero-section">
          <div class="hero-content glass-card">
            <!-- 关闭按钮 -->
            <button
              class="hero-close-btn"
              @click="settingsStore.toggleSetting('showHeroSection')"
              :aria-label="$t('common.close')"
              :title="$t('settings.hideHeroSection')"
            >
              <X :size="20" />
            </button>

            <h1 class="hero-title fade-in">
              {{ $t('app.name') }}
            </h1>
            <p class="hero-subtitle slide-up">
              {{ $t('app.description') }}
            </p>
            <div class="hero-actions slide-up">
              <GlassButton size="lg" @click="goToExplore">
                <Compass :size="20" />
                {{ $t('nav.explore') }}
              </GlassButton>
              <GlassButton v-if="!isAuthenticated" size="lg" variant="secondary" @click="goToLogin">
                {{ $t('nav.login') }}
              </GlassButton>
            </div>
          </div>
        </section>
      </Transition>

      <!-- Platform Stats - 桌面端网格 / 移动端轮播 -->
      <section class="stats-section">
        <!-- 加载中：显示加载状态 -->
        <div v-if="isStatsLoading" class="stats-grid stats-desktop">
          <div v-for="platform in platforms" :key="platform" class="stat-card glass-card loading">
            <div class="stat-icon" style="background: #e5e7eb">
              <div style="width: 32px; height: 32px; background: #d1d5db; border-radius: 4px;"></div>
            </div>
            <div style="height: 20px; width: 60%; background: #e5e7eb; border-radius: 4px; margin: 8px 0;"></div>
            <div style="height: 32px; width: 40%; background: #e5e7eb; border-radius: 4px; margin: 4px 0;"></div>
            <div style="height: 16px; width: 50%; background: #e5e7eb; border-radius: 4px;"></div>
          </div>
        </div>
        
        <!-- 加载完成：显示真实数据 -->
        <div v-else class="stats-grid stats-desktop">
          <div v-for="platform in platforms" :key="platform" class="stat-card glass-card">
            <div class="stat-icon" :style="{ background: getPlatformColor(platform) }">
              <component :is="getPlatformIcon(platform)" :size="32" />
            </div>
            <h3>{{ $t(`platform.${platform}`) }}</h3>
            <p class="stat-count">{{ formatNumber(platformStats[platform] || 0) }}</p>
            <p class="stat-label">{{ $t('post.title') }}</p>
          </div>
        </div>

        <!-- 移动端：轮播图 -->
        <div class="stats-carousel stats-mobile">
          <!-- 加载中：显示加载状态 -->
          <div v-if="isStatsLoading" class="stat-card glass-card loading">
            <div class="stat-icon" style="background: #e5e7eb">
              <div style="width: 32px; height: 32px; background: #d1d5db; border-radius: 4px;"></div>
            </div>
            <div style="height: 20px; width: 60%; background: #e5e7eb; border-radius: 4px; margin: 8px 0;"></div>
            <div style="height: 32px; width: 40%; background: #e5e7eb; border-radius: 4px; margin: 4px 0;"></div>
            <div style="height: 16px; width: 50%; background: #e5e7eb; border-radius: 4px;"></div>
          </div>
          
          <!-- 加载完成：显示轮播 -->
          <div v-else>
            <div class="carousel-container">
            <button
              class="carousel-btn carousel-prev"
              @click="prevStat"
              :disabled="currentStatIndex === 0"
              aria-label="Previous"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            <div class="carousel-track-container">
              <div
                class="carousel-track"
                :style="{ transform: `translateX(-${currentStatIndex * 100}%)` }"
              >
                <div v-for="platform in platforms" :key="platform" class="carousel-slide">
                  <div class="stat-card glass-card">
                    <div class="stat-icon" :style="{ background: getPlatformColor(platform) }">
                      <component :is="getPlatformIcon(platform)" :size="32" />
                    </div>
                    <h3>{{ $t(`platform.${platform}`) }}</h3>
                    <p class="stat-count">{{ formatNumber(platformStats[platform] || 0) }}</p>
                    <p class="stat-label">{{ $t('post.title') }}</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              class="carousel-btn carousel-next"
              @click="nextStat"
              :disabled="currentStatIndex === platforms.length - 1"
              aria-label="Next"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
            </div>

            <!-- 指示器 -->
            <div class="carousel-indicators">
              <button
                v-for="(platform, index) in platforms"
                :key="index"
                class="indicator-dot"
                :class="{ active: currentStatIndex === index }"
                @click="currentStatIndex = index"
                :aria-label="`Go to ${platform}`"
              ></button>
            </div>
          </div>
        </div>
      </section>

      <!-- Latest Posts -->
      <section class="latest-section">
        <div class="section-header">
          <h2>{{ $t('filter.latest') }}</h2>
          <RouterLink to="/explore">
            <GlassButton variant="ghost">
              {{ $t('common.more') }}
              <ArrowRight :size="18" />
            </GlassButton>
          </RouterLink>
        </div>

        <!-- Access Limit Banner -->
        <AccessLimitBanner :current-count="posts.length" :total-limit="accessLimit" />

        <!-- 初始加载状态 -->
        <LoadingSpinner
          v-if="loading && posts.length === 0"
          size="lg"
          :text="$t('common.loading')"
        />

        <!-- Posts列表 -->
        <div v-else-if="posts.length > 0" ref="postsGrid" class="posts-grid">
          <PostCard v-for="(post, index) in posts" :key="post.id" :post="post" :index="index" />
        </div>

        <!-- 空状态 -->
        <div v-else-if="!loading" class="empty-state glass-card">
          <ImageIcon :size="64" />
          <p>{{ $t('search.noResults') }}</p>
        </div>

        <!-- 加载更多指示器 -->
        <div v-if="isLoadingMore" class="loading-more">
          <LoadingSpinner size="sm" :text="$t('common.loading')" />
        </div>

        <!-- 没有更多数据提示 -->
        <div v-if="!hasMore && posts.length > 0" class="no-more-hint">
          <p>{{ $t('common.noMore') }}</p>
        </div>
      </section>
    </div>
  </MainLayout>
</template>

<script lang="ts">
export default {
  name: 'HomePage',
}
</script>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import {
  Compass,
  ArrowRight,
  ImageIcon,
  Youtube,
  Twitter,
  Music2,
  Instagram,
  X,
} from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import GlassButton from '@/components/ui/GlassButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import PostCard from '@/components/features/PostCard.vue'
import AccessLimitBanner from '@/components/AccessLimitBanner.vue'

import type { Post } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { usePostsStore } from '@/stores/posts'
import { useWaterfallLayout } from '@/composables/useWaterfallLayout'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { throttle } from '@/utils/throttle'
import { PLATFORMS, PLATFORM_COLORS } from '@/types'
import { postsApi, statsApi } from '@/api/services'
import toast from '@/utils/toast'
import { formatNumber } from '@/utils/format'
import logger from '@/utils/logger'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const postsStore = usePostsStore()

const { isAuthenticated, user } = storeToRefs(authStore)
const { posts, loading } = storeToRefs(postsStore)

// 访问限制
const accessLimit = computed(() => {
  if (!isAuthenticated.value) return 40 // 未登录：40条
  if (user.value?.is_admin) return Infinity // 管理员：无限制
  return 100 // 已登录：100条
})

const platforms = PLATFORMS
const platformStats = ref<Record<string, number>>({})
const isStatsLoading = ref(true)
const currentPage = ref(1)
const hasMore = ref(true)
const postsGrid = ref<HTMLElement | null>(null)
const loadedPostsCount = ref(0) // 追踪已加载的卡片数量

// 移动端轮播图状态
const currentStatIndex = ref(0)

// 轮播图控制函数
const prevStat = () => {
  if (currentStatIndex.value > 0) {
    currentStatIndex.value--
  }
}

const nextStat = () => {
  if (currentStatIndex.value < platforms.length - 1) {
    currentStatIndex.value++
  }
}

const { t } = useI18n()

// 使用轻量级瀑布流布局
const { updateLayout, smoothUpdateLayout } = useWaterfallLayout(postsGrid, {
  columnGap: 16,
  rowGap: 16,
  breakpoints: {
    1400: 4, // >= 1400px: 4列
    1100: 3, // >= 1100px: 3列
    769: 2, // >= 769px: 2列
    0: 2, // < 769px: 2列
  },
})


// 无限滚动
const { isLoading: isLoadingMore } = useInfiniteScroll({
  onLoadMore: async () => {
    if (posts.value.length >= accessLimit.value) {
      logger.log('[InfiniteScroll] 已达到访问限制')
      return
    }
    await loadMore()
  },
  hasMore: () => posts.value.length < accessLimit.value && posts.value.length % 8 === 0,
  threshold: 500,
  enabled: true,
})

onMounted(async () => {
  try {
    // 重置筛选条件，确保首页总是显示最新内容
    postsStore.resetFilters()

    // ✨ 优化：只等待关键内容（帖子），统计数据后台加载
    await postsStore.fetchPosts({ page: currentPage.value, page_size: 8 })

    // 记录初始加载的卡片数量
    await nextTick()
    loadedPostsCount.value = posts.value.length
    
    // 更新瀑布流布局
    await updateLayout()

    // 后台加载统计数据（非阻塞）
    loadStatsInBackground()
  } catch (error) {
    logger.error('Failed to load data:', error)
    toast.error(t('common.loadFailed'))
  }
})

// 后台加载统计数据
const loadStatsInBackground = () => {
  statsApi
    .getPlatformStats()
    .then((stats) => {
      platformStats.value = stats.by_platform || {}
      isStatsLoading.value = false
      logger.info('统计数据加载完成')
    })
    .catch((err) => {
      logger.error('Failed to load stats:', err)
      isStatsLoading.value = false
      // 统计数据失败不影响主内容
    })
}

onUnmounted(() => {
  // 清理工作由 composables 自动处理
})

// 页面激活时重新计算布局（解决页面切换后布局错乱）
onActivated(async () => {
  if (postsGrid.value && posts.value.length > 0) {
    await nextTick()
    await updateLayout()
    logger.info('页面激活，重新计算布局')
  }
})

// 加载更多帖子
const loadMore = async () => {
  if (!hasMore.value) return
  if (!isAuthenticated.value && posts.value.length >= accessLimit.value) return

  currentPage.value++

  try {
    const result = await postsStore.fetchPosts({
      page: currentPage.value,
      page_size: 8,
      append: true, // 追加到现有列表
    })

    // 检查是否还有更多数据
    if (!result || result.items.length === 0) {
      hasMore.value = false
    }

    // 等待 DOM 更新
    await nextTick()
    
    // 获取所有卡片，只对新卡片添加动画
    if (postsGrid.value) {
      const allCards = postsGrid.value.querySelectorAll('a.post-card')
      const previousCount = loadedPostsCount.value
      
      // 只对新增的卡片添加进入动画
      for (let i = previousCount; i < allCards.length; i++) {
        const card = allCards[i] as HTMLElement
        card.classList.add('card-entering')
      }
      
      // 更新已加载数量
      loadedPostsCount.value = allCards.length
    }
    
    // 使用平滑更新，减少现有卡片重排
    await smoothUpdateLayout()
    
    // 延迟后移除进入动画类
    setTimeout(() => {
      if (postsGrid.value) {
        const cards = postsGrid.value.querySelectorAll('a.post-card.card-entering')
        cards.forEach(card => {
          (card as HTMLElement).classList.remove('card-entering')
        })
      }
    }, 600)
  } catch (error) {
    logger.error('Failed to load more posts:', error)
    currentPage.value-- // 恢复页码
  }
}

const goToExplore = () => {
  router.push('/explore')
}

const goToLogin = () => {
  router.push('/login')
}

// 轮播功能已移除，Stats Section改为横向网格展示

const getPlatformColor = (platform: string) => {
  return PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS] || '#666'
}

// posts变化的监听由 useSmartPreload 和 useInfiniteScroll 处理

const getPlatformIcon = (platform: string) => {
  const icons = {
    youtube: Youtube,
    twitter: Twitter,
    tiktok: Music2,
    instagram: Instagram,
  } as const
  return icons[platform as keyof typeof icons] || ImageIcon
}
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3xl);
}

/* Hero Section Transition */
.hero-fade-enter-active,
.hero-fade-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.hero-fade-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.hero-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Hero Section */
.hero-section {
  text-align: center;
  padding: var(--spacing-xl) 0 var(--spacing-md) 0;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-3xl);
  position: relative;
}

.hero-close-btn {
  position: absolute;
  top: var(--spacing-lg);
  right: var(--spacing-lg);
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
  z-index: 10;
}

.hero-close-btn:hover {
  background: rgba(139, 92, 246, 0.1);
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: rotate(90deg) scale(1.1);
}

.hero-close-btn:active {
  transform: rotate(90deg) scale(0.95);
}

.hero-title {
  font-size: 4rem;
  font-weight: var(--font-bold);
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--spacing-lg);
}

.hero-subtitle {
  font-size: var(--text-xl);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-2xl);
  animation-delay: 0.1s;
}

.hero-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  animation-delay: 0.2s;
}

/* Stats Section - 桌面端网格布局 */
.stats-section {
  padding: var(--spacing-2xl) 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
}

/* 移动端默认隐藏轮播图 */
.stats-mobile {
  display: none;
}

.stat-card {
  text-align: center;
  padding: var(--spacing-2xl);
  transition: all var(--transition-base);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--glass-shadow), var(--glass-glow);
}

.stat-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--spacing-md);
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.stat-card h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
}

.stat-count {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
  margin-bottom: var(--spacing-xs);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Latest Section */
.latest-section {
  padding: var(--spacing-md) 0 var(--spacing-xl) 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-xl);
}

.section-header h2 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}

.posts-grid {
  /* 瀑布流容器 - 由 useWaterfallLayout 动态控制 columns */
  width: 100%;
  max-width: 100%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl);
  text-align: center;
  color: var(--color-text-secondary);
}

.loading-more {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-2xl) var(--spacing-xl);
  margin-top: var(--spacing-lg);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  min-height: 80px;
  animation: fadeInLoading 0.3s ease;
}

@keyframes fadeInLoading {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.no-more-hint {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

/* ========== 响应式优化 ========== */

/* 平板端/小笔记本优化 (780px-1100px) - 2列布局 */
@media (min-width: 780px) and (max-width: 1100px) {
  .hero-section {
    padding: var(--spacing-xl) 0 var(--spacing-md) 0;
  }

  .hero-content {
    padding: var(--spacing-2xl);
  }

  .hero-title {
    font-size: 3rem;
  }

  .hero-subtitle {
    font-size: var(--text-xl);
  }

  .stats-section {
    padding: var(--spacing-xl) 0;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }

  .stat-card {
    padding: var(--spacing-xl);
  }

  .stat-icon {
    width: 56px;
    height: 56px;
  }

  .stat-icon svg {
    width: 28px;
    height: 28px;
  }

  .latest-section {
    padding: var(--spacing-lg) 0 var(--spacing-xl) 0;
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .hero-section {
    padding: var(--spacing-lg) 0 var(--spacing-sm) 0;
  }

  .hero-content {
    padding: var(--spacing-xl);
  }

  .hero-close-btn {
    top: var(--spacing-md);
    right: var(--spacing-md);
    width: 32px;
    height: 32px;
  }

  .hero-close-btn svg {
    width: 16px;
    height: 16px;
  }

  .hero-title {
    font-size: 2.5rem;
    margin-bottom: var(--spacing-md);
  }

  .hero-subtitle {
    font-size: var(--text-lg);
    margin-bottom: var(--spacing-lg);
  }

  .hero-actions {
    flex-direction: column;
    width: 100%;
  }

  .stats-section {
    padding: var(--spacing-lg) 0;
  }

  /* 移动端隐藏桌面端布局 */
  .stats-desktop {
    display: none;
  }

  /* 移动端显示轮播图 */
  .stats-mobile {
    display: block;
  }

  /* 轮播图容器 */
  .stats-carousel {
    position: relative;
    width: 100%;
    overflow: hidden;
  }

  .carousel-container {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .carousel-track-container {
    flex: 1;
    overflow: hidden;
    border-radius: var(--radius-lg);
  }

  .carousel-track {
    display: flex;
    transition: transform 0.3s ease-in-out;
  }

  .carousel-slide {
    min-width: 100%;
    flex-shrink: 0;
  }

  .carousel-slide .stat-card {
    margin: 0;
    padding: var(--spacing-xl) var(--spacing-lg);
  }

  /* 轮播按钮 */
  .carousel-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    color: var(--color-text-primary);
    cursor: pointer;
    transition: all var(--transition-fast);
    backdrop-filter: blur(10px);
    flex-shrink: 0;
  }

  .carousel-btn:active:not(:disabled) {
    transform: scale(0.95);
    background: var(--glass-bg-light);
  }

  .carousel-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .carousel-btn svg {
    width: 20px;
    height: 20px;
  }

  /* 指示器 */
  .carousel-indicators {
    display: flex;
    justify-content: center;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-md);
  }

  .indicator-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background: var(--color-text-tertiary);
    border: none;
    cursor: pointer;
    transition: all var(--transition-fast);
    padding: 0;
  }

  .indicator-dot.active {
    width: 24px;
    background: var(--color-primary);
  }

  .stat-card {
    padding: var(--spacing-lg) var(--spacing-md);
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    margin-bottom: var(--spacing-sm);
  }

  .stat-icon svg {
    width: 24px;
    height: 24px;
  }

  .stat-card h3 {
    font-size: var(--text-base);
  }

  .stat-count {
    font-size: var(--text-2xl);
  }

  .stat-label {
    font-size: var(--text-xs);
  }

  .latest-section {
    padding: var(--spacing-sm) 0 var(--spacing-lg) 0;
  }

  .section-header {
    margin-bottom: var(--spacing-md);
  }
}

/* 小屏手机适配 */
@media (max-width: 480px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-content {
    padding: var(--spacing-xl);
  }
}
</style>

<!-- 瀑布流全局样式 - 手动定位实现 -->
<style>
/* 桌面端：手动定位瀑布流 */
.posts-grid {
  width: 100%;
  position: relative;
  /* 高度由 JS 动态设置 */
}

/* 卡片样式 - 绝对定位 */
.posts-grid .post-card {
  /* position, left, top, width 由 JS 动态设置 */
  box-sizing: border-box;
  transition: opacity 0.4s ease, transform 0.4s ease, left 0.3s ease, top 0.3s ease;
}

/* 新卡片进入动画 */
.posts-grid .post-card.card-entering {
  animation: cardFadeIn 0.5s ease forwards;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 移动端（<=768px）- 使用 flex 布局 */
@media (max-width: 768px) {
  .posts-grid {
    display: flex !important;
    flex-wrap: wrap !important;
    column-gap: var(--spacing-md) !important;
    row-gap: var(--spacing-md) !important;
    height: auto !important; /* 覆盖 JS 设置的高度 */
  }

  .posts-grid .post-card {
    position: relative !important; /* 覆盖绝对定位 */
    left: auto !important;
    top: auto !important;
    flex: 0 0 calc((100% - var(--spacing-md)) / 2) !important;
    width: calc((100% - var(--spacing-md)) / 2) !important;
    margin-bottom: 0 !important;
  }
}

/* 小屏手机（<=480px）*/
@media (max-width: 480px) {
  .posts-grid {
    column-gap: var(--spacing-sm) !important;
    row-gap: var(--spacing-sm) !important;
  }

  .posts-grid .post-card {
    flex: 0 0 calc((100% - var(--spacing-sm)) / 2) !important;
    width: calc((100% - var(--spacing-sm)) / 2) !important;
  }
}
</style>
