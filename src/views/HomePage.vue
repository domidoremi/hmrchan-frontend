<template>
  <MainLayout>
    <div class="home-page">
      <!-- Hero Section - Modern Design -->
      <Transition name="hero-fade">
        <section v-if="settingsStore.settings.showHeroSection" class="hero-section">
          <div class="hero-background">
            <div class="hero-gradient"></div>
            <div class="hero-mesh"></div>
          </div>

          <div class="hero-container">
            <button
              class="hero-close"
              @click="settingsStore.toggleSetting('showHeroSection')"
              :aria-label="$t('common.close')"
            >
              <X :size="24" />
            </button>

            <div class="hero-content animate-fade-in-up">
              <div class="hero-badge animate-scale-in stagger-1">
                <span class="badge-dot"></span>
                <span>{{ $t('app.tagline', 'Discover Amazing Content') }}</span>
              </div>

              <h1 class="hero-title animate-fade-in-up stagger-2">
                {{ $t('app.name') }}
              </h1>

              <p class="hero-description animate-fade-in-up stagger-3">
                {{ $t('app.description') }}
              </p>

              <div class="hero-actions animate-fade-in-up stagger-4">
                <button class="btn-primary" @click="goToExplore">
                  <Compass :size="20" />
                  <span>{{ $t('nav.explore') }}</span>
                  <ArrowRight :size="18" class="btn-icon" />
                </button>
                <button v-if="!isAuthenticated" class="btn-secondary" @click="goToLogin">
                  <span>{{ $t('nav.login') }}</span>
                </button>
              </div>

              <div class="hero-stats animate-fade-in-up stagger-5">
                <div class="stat-item">
                  <span class="stat-value">{{ formatNumber(totalPosts) }}</span>
                  <span class="stat-label">{{ $t('post.total', 'Posts') }}</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                  <span class="stat-value">{{ platforms.length }}</span>
                  <span class="stat-label">{{ $t('common.platforms', 'Platforms') }}</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                  <span class="stat-value">{{ $t('common.live', 'Live') }}</span>
                  <span class="stat-label">{{ $t('common.updates', 'Updates') }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Transition>

      <!-- Platform Stats - Modern Cards -->
      <section class="platforms-section">
        <!-- 加载中：显示加载状态 -->
        <div v-if="isStatsLoading" class="stats-grid stats-desktop">
          <div v-for="platform in platforms" :key="platform" class="stat-card glass-card loading">
            <div class="stat-icon" style="background: #e5e7eb">
              <div style="width: 32px; height: 32px; background: #d1d5db; border-radius: 4px"></div>
            </div>
            <div
              style="
                height: 20px;
                width: 60%;
                background: #e5e7eb;
                border-radius: 4px;
                margin: 8px 0;
              "
            ></div>
            <div
              style="
                height: 32px;
                width: 40%;
                background: #e5e7eb;
                border-radius: 4px;
                margin: 4px 0;
              "
            ></div>
            <div style="height: 16px; width: 50%; background: #e5e7eb; border-radius: 4px"></div>
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

        <!-- 移动端：轮播图（自动计时器） -->
        <div class="stats-carousel stats-mobile">
          <!-- 加载中：显示加载状态 -->
          <div v-if="isStatsLoading" class="stat-card glass-card loading">
            <div class="stat-icon" style="background: #e5e7eb">
              <div style="width: 32px; height: 32px; background: #d1d5db; border-radius: 4px"></div>
            </div>
            <div
              style="
                height: 20px;
                width: 60%;
                background: #e5e7eb;
                border-radius: 4px;
                margin: 8px 0;
              "
            ></div>
            <div
              style="
                height: 32px;
                width: 40%;
                background: #e5e7eb;
                border-radius: 4px;
                margin: 4px 0;
              "
            ></div>
            <div style="height: 16px; width: 50%; background: #e5e7eb; border-radius: 4px"></div>
          </div>

          <!-- 加载完成：显示轮播 -->
          <div v-else>
            <div
              class="carousel-container glass-card"
              @mouseenter="pauseAutoplay"
              @mouseleave="resumeAutoplay"
            >
              <button class="carousel-btn carousel-prev" @click="prevStat" aria-label="Previous">
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

              <button class="carousel-btn carousel-next" @click="nextStat" aria-label="Next">
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

            <!-- 进度条指示器（计时器样式） -->
            <div class="carousel-indicators">
              <div
                v-for="(platform, index) in platforms"
                :key="index"
                class="indicator-progress"
                :class="{ active: currentStatIndex === index }"
                @click="goToSlide(index)"
              >
                <div
                  class="progress-bar"
                  :class="{ animating: currentStatIndex === index && !isPaused }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Latest Posts - Bento Grid Layout -->
      <section class="posts-section">
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

        <!-- Empty state -->
        <EmptyState
          v-else-if="!loading"
          icon="image"
          :title="$t('search.noResults')"
          :description="$t('search.noResultsDesc')"
        />

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
import { ref, computed, nextTick, onMounted, onUnmounted, onActivated } from 'vue'
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
import EmptyState from '@/components/ui/EmptyState.vue'

import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { usePostsStore } from '@/stores/posts'
import { useWaterfallLayout } from '@/composables/useWaterfallLayout'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { PLATFORMS, PLATFORM_COLORS } from '@/types'
import { statsApi } from '@/api/services'
import { formatNumber } from '@/utils/format'
import { useErrorHandler } from '@/utils/errorHandler'

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

// 总帖子数（用于Hero统计）
const totalPosts = computed(() => {
  return Object.values(platformStats.value).reduce((sum, count) => sum + count, 0)
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
const autoplayInterval = ref<number | null>(null)
const isPaused = ref(false)
const autoplayDuration = 3000 // 3秒自动切换

// 轮播图控制函数
const prevStat = () => {
  if (currentStatIndex.value > 0) {
    currentStatIndex.value--
  } else {
    currentStatIndex.value = platforms.length - 1 // 循环到最后一个
  }
  resetAutoplay()
}

const nextStat = () => {
  if (currentStatIndex.value < platforms.length - 1) {
    currentStatIndex.value++
  } else {
    currentStatIndex.value = 0 // 循环到第一个
  }
  resetAutoplay()
}

const goToSlide = (index: number) => {
  currentStatIndex.value = index
  // 确保恢复播放状态
  isPaused.value = false
  resetAutoplay()
}

const pauseAutoplay = () => {
  isPaused.value = true
  if (autoplayInterval.value) {
    clearInterval(autoplayInterval.value)
    autoplayInterval.value = null
  }
}

const resumeAutoplay = () => {
  isPaused.value = false
  startAutoplay()
}

const resetAutoplay = () => {
  if (autoplayInterval.value) {
    clearInterval(autoplayInterval.value)
  }
  startAutoplay()
}

const startAutoplay = () => {
  if (isPaused.value) return
  autoplayInterval.value = window.setInterval(() => {
    nextStat()
  }, autoplayDuration)
}

const { t } = useI18n()
const { handleError } = useErrorHandler('HomePage')

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
      console.debug('[InfiniteScroll] 已达到访问限制')
      hasMore.value = false
      return
    }
    if (!hasMore.value) {
      console.debug('[InfiniteScroll] 没有更多数据')
      return
    }
    await loadMore()
  },
  hasMore: () => hasMore.value && posts.value.length < accessLimit.value,
  threshold: 500,
  enabled: true,
})

onMounted(async () => {
  try {
    // ✨ 优化：减少初始加载数量，提升首屏速度
    // 使用明确的参数，不修改全局 store filters，避免与 ExplorePage 冲突
    await postsStore.fetchPosts({
      page: currentPage.value,
      page_size: 6,
      sort_by: 'scraped_at',
      sort_order: 'desc',
    })

    // 记录初始加载的卡片数量
    await nextTick()
    loadedPostsCount.value = posts.value.length

    // 更新瀑布流布局
    await updateLayout()

    // 后台加载统计数据（非阻塞）
    loadStatsInBackground()

    // 启动轮播自动播放
    startAutoplay()
  } catch (error) {
    handleError(error, { customMessage: t('common.loadFailed', 'Failed to load data') })
  }
})

// 后台加载统计数据（延迟加载以优先首屏）
const loadStatsInBackground = () => {
  // 延迟1秒加载统计数据，优先保证帖子加载
  setTimeout(() => {
    statsApi
      .getPlatformStats()
      .then((data) => {
        platformStats.value = data
        isStatsLoading.value = false
      })
      .catch((err) => {
        handleError(err, {
          silent: true, // 统计数据失败不显示通知
          customMessage: 'Failed to load platform stats',
        })
        isStatsLoading.value = false
      })
  }, 1000)
}

onUnmounted(() => {
  // 清理工作由 composables 自动处理
  // 清理轮播定时器
  if (autoplayInterval.value) {
    clearInterval(autoplayInterval.value)
  }
})

// 页面激活时重新计算布局（解决页面切换后布局错乱）
onActivated(async () => {
  if (postsGrid.value && posts.value.length > 0) {
    await nextTick()
    await updateLayout()
    console.debug('[HomePage] 页面激活，重新计算布局')
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
      sort_by: 'scraped_at',
      sort_order: 'desc',
      append: true, // 追加到现有列表
    })

    // 使用pagination信息正确判断是否还有更多数据
    if (!result || result.items.length === 0) {
      hasMore.value = false
    } else if (result.page && result.pages) {
      // 根据分页信息判断：当前页 >= 总页数时，没有更多数据
      hasMore.value = result.page < result.pages
      console.debug(`[HomePage] 分页信息: 当前页 ${result.page}/${result.pages}, hasMore: ${hasMore.value}`)
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
        cards.forEach((card) => {
          ;(card as HTMLElement).classList.remove('card-entering')
        })
      }
    }, 600)
  } catch (error) {
    handleError(error, { customMessage: t('post.loadMoreFailed', 'Failed to load more posts') })
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
@import '@/styles/pages/home.css';

/* ========== Transitions ========== */
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
  max-width: 1200px;
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
  }

  .carousel-container {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    backdrop-filter: var(--glass-blur);
    border-radius: var(--radius-xl);
    box-shadow: var(--glass-shadow);
    overflow: hidden;
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
    border: none;
    background: transparent;
    box-shadow: none;
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

  .carousel-btn:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.15);
    border-color: var(--color-primary);
    transform: scale(1.05);
  }

  .carousel-btn svg {
    width: 20px;
    height: 20px;
  }

  /* 进度条指示器（计时器样式） */
  .carousel-indicators {
    display: flex;
    justify-content: center;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-lg);
    padding: 0 var(--spacing-md);
  }

  .indicator-progress {
    flex: 1;
    height: 4px;
    background: rgba(139, 92, 246, 0.2);
    border-radius: var(--radius-full);
    cursor: pointer;
    overflow: hidden;
    position: relative;
    transition: all var(--transition-fast);
  }

  .indicator-progress:hover {
    height: 6px;
    background: rgba(139, 92, 246, 0.3);
  }

  .indicator-progress.active {
    background: rgba(139, 92, 246, 0.4);
  }

  .progress-bar {
    height: 100%;
    width: 0;
    background: linear-gradient(90deg, var(--color-primary), #c084fc);
    border-radius: var(--radius-full);
    transition: width 0.3s ease;
    box-shadow: 0 0 8px rgba(139, 92, 246, 0.6);
  }

  .progress-bar.animating {
    animation: progressAnimation 3s linear forwards;
  }

  @keyframes progressAnimation {
    from {
      width: 0;
    }
    to {
      width: 100%;
    }
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
  transition:
    opacity 0.4s ease,
    transform 0.4s ease,
    left 0.3s ease,
    top 0.3s ease;
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

/* 所有屏幕尺寸都使用 JS 瀑布流（包括移动端） */
/* JS 会自动根据屏幕宽度计算列数：
   - >= 1600px: 5列
   - >= 1400px: 4列
   - >= 1100px: 3列
   - >= 769px:  2列
   - >= 481px:  2列
   - < 481px:   2列
*/
</style>
