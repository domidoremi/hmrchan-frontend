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
        <!-- 桌面端：Grid布局 -->
        <div class="stats-grid stats-desktop">
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
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
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
import { useSmartPreload } from '@/composables/useSmartPreload'
import { usePageMasonry } from '@/composables/usePageMasonry'
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
const currentPage = ref(1)
const isLoadingMore = ref(false)
const hasMore = ref(true)
const postsGrid = ref<HTMLElement | null>(null)

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

// 使用页面级Masonry管理
const masonry = usePageMasonry(postsGrid, { posts })

const { t } = useI18n()

// 智能预加载
useSmartPreload(posts, {
  batchSize: 10,
  rootMargin: '400px 0px',
  enabled: true,
})

onMounted(async () => {
  try {
    // 初始化Masonry管理
    masonry.mount()

    // 重置筛选条件，确保首页总是显示最新内容
    postsStore.resetFilters()

    // 并行加载帖子和统计数据（不互相阻塞）
    await Promise.all([
      postsStore.fetchPosts({ page: 1, page_size: 8 }),
      statsApi
        .getPlatformStats()
        .then((stats) => {
          platformStats.value = stats.by_platform || {}
        })
        .catch((err) => {
          logger.error('Failed to load stats:', err)
          // 统计数据失败不影响主内容
        }),
    ])

    // Posts加载完成后，初始化Masonry（自动判断桌面端/移动端）
    await masonry.initialize()

    // 监听滚动事件
    window.addEventListener('scroll', handleScroll)
  } catch (error) {
    logger.error('Failed to load data:', error)
    toast.error(t('common.loadFailed'))
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  masonry.unmount()
})

// 滚动加载更多（使用节流优化）
const handleScroll = throttle(
  () => {
    if (isLoadingMore.value || !hasMore.value) return
    if (!isAuthenticated.value && posts.value.length >= accessLimit.value) return

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight

    // 距离底部200px时触发加载
    if (scrollTop + windowHeight >= documentHeight - 200) {
      loadMore()
    }
  },
  100,
  { leading: true, trailing: true },
)

// 加载更多帖子
const loadMore = async () => {
  if (isLoadingMore.value || !hasMore.value) return
  if (!isAuthenticated.value && posts.value.length >= accessLimit.value) return

  isLoadingMore.value = true
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
  } catch (error) {
    logger.error('Failed to load more posts:', error)
    currentPage.value-- // 恢复页码
  } finally {
    isLoadingMore.value = false
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

// posts变化的监听已在usePageMasonry中处理

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
  /* Masonry布局容器 - 由全局样式和Masonry控制 */
  width: 100%;
  max-width: 100%;
  min-height: 400px; /* 防止初始化前内容塌陷导致页脚跳动 */
  transition: min-height 0.3s ease; /* 平滑过渡 */
}

/* 桌面端：Masonry初始化时平衡CLS和LCP */
@media (min-width: 769px) {
  .posts-grid {
    /* 使用min-height保持空间，但不隐藏内容 */
    /* 让Masonry尽快工作，牺牲一点CLS换取更好的LCP */
  }
}

/* 移动端flexbox布局 - 由全局样式控制，这里不重复定义 */

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
  padding: var(--spacing-xl);
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

<!-- Masonry瀑布流全局样式 -->
<style>
/* 桌面端：Masonry完全控制布局 */
.posts-grid {
  width: 100%;
  position: relative; /* Masonry需要relative定位作为absolute的容器 */
  /* 不设置display，让Masonry或flex控制 */
}

/* 桌面端卡片基础样式 */
.posts-grid .post-card {
  box-sizing: border-box;
  /* Masonry会用absolute定位，不需要margin-bottom */
}

/* 大屏幕（>=1400px）- 4列 */
@media (min-width: 1400px) {
  .posts-grid .post-card {
    width: calc(25% - 12px);
  }
}

/* 中型屏幕（1101px-1399px）- 3列 */
@media (min-width: 1101px) and (max-width: 1399px) {
  .posts-grid .post-card {
    width: calc(33.333% - 11px);
  }
}

/* 小型桌面/平板横屏（769px-1100px）- 2列 */
@media (min-width: 769px) and (max-width: 1100px) {
  .posts-grid .post-card {
    width: calc(50% - 8px);
  }
}

/* 移动端（<=768px）- 使用flex布局 */
@media (max-width: 768px) {
  .posts-grid {
    display: flex !important;
    flex-wrap: wrap !important;
    /* 明确设置行间距和列间距 */
    column-gap: var(--spacing-md) !important; /* 水平间距16px */
    row-gap: var(--spacing-md) !important; /* 垂直间距16px */
    width: 100% !important;
  }

  .posts-grid .post-card {
    /* flex的gap自动处理间距，所以宽度计算为(100% - gap) / 2 */
    flex: 0 0 calc((100% - var(--spacing-md)) / 2) !important;
    width: calc((100% - var(--spacing-md)) / 2) !important;
    max-width: calc((100% - var(--spacing-md)) / 2) !important;
    margin: 0 !important;
    position: relative !important;
    left: auto !important;
    top: auto !important;
    /* 确保没有transform干扰布局 */
    transform: none !important;
  }
}

/* 小屏手机（<=480px）*/
@media (max-width: 480px) {
  .posts-grid {
    column-gap: var(--spacing-sm) !important; /* 水平间距12px */
    row-gap: var(--spacing-sm) !important; /* 垂直间距12px */
  }

  .posts-grid .post-card {
    flex: 0 0 calc((100% - var(--spacing-sm)) / 2) !important;
    width: calc((100% - var(--spacing-sm)) / 2) !important;
    max-width: calc((100% - var(--spacing-sm)) / 2) !important;
  }
}
</style>
