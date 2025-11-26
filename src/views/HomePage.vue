<template>
  <MainLayout :access-current="posts.length" :access-limit="accessLimit" :show-access-indicator="true">
    <div ref="homeContainer" class="home-page">
      <!-- Hero Section - GSAP 动画版本 -->
      <HeroSection :visible="settingsStore.settings.showHeroSection" :title="$t('app.name')"
        :description="$t('app.description')" :badge-text="$t('app.tagline', 'Discover Amazing Content')"
        :primary-button-text="$t('nav.explore')" :secondary-button-text="$t('nav.login')"
        :show-secondary-button="!isAuthenticated" :stats="heroStats"
        @close="settingsStore.toggleSetting('showHeroSection')" @explore="goToExplore" @secondary-action="goToLogin" />

      <!-- Platform Stats - Modern Cards -->
      <section class="platforms-section reduce-motion">
        <div class="section-header">
          <h2>{{ $t('common.platforms', '平台统计') }}</h2>
        </div>
        <StatCardGrid :autoplay="true" :autoplay-duration="3000">
          <StatCard v-for="platform in platforms" :key="platform" :icon="getPlatformIcon(platform)"
            :icon-color="getPlatformColor(platform)" :title="$t(`platform.${platform}`)"
            :value="platformStats[platform] || 0" :label="platform === 'youtube' || platform === 'tiktok' ? $t('post.videos') : $t('post.title')
              " :loading="isStatsLoading" />
          <template v-for="(platform, index) in platforms" :key="`slide-${index}`" #[`slide-${index}`]>
            <StatCard :icon="getPlatformIcon(platform)" :icon-color="getPlatformColor(platform)"
              :title="$t(`platform.${platform}`)" :value="platformStats[platform] || 0" :label="platform === 'youtube' || platform === 'tiktok'
                ? $t('post.videos')
                : $t('post.title')
                " :loading="isStatsLoading" />
          </template>
        </StatCardGrid>
      </section>

      <!-- Latest Posts - Bento Grid Layout -->
      <section class="posts-section reduce-motion parallax-slow">
        <div class="section-header">
          <h2>{{ $t('filter.latest') }}</h2>
          <RouterLink to="/explore">
            <GlassButton variant="ghost">
              {{ $t('common.more') }}
              <ArrowRight :size="18" />
            </GlassButton>
          </RouterLink>
        </div>

        <p v-if="lastListFromFallback" class="offline-hint">
          {{ $t('offline.usingCache') }}
        </p>

        <!-- 初始加载状态 -->
        <div v-if="loading && posts.length === 0" class="home-posts-loading">
          <LoadingSpinner size="lg" :text="$t('common.loading')" />
        </div>

        <!-- Posts列表 -->
        <div v-else-if="posts.length > 0" ref="postsGrid" class="posts-grid" v-memo="[posts.length]">
          <PostCard v-for="(post, index) in posts" :key="post.id" :post="post" :index="index" :show-actions="false"
            :is-first-screen="index < 4" />
        </div>

        <!-- Empty state -->
        <EmptyState v-else-if="!loading" icon="image" :title="$t('search.noResults')"
          :description="$t('search.noResultsDesc')" />

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

/**
* 首页组件
*
* 功能描述：
* - 展示应用首页，包含Hero区域、平台统计和最新帖子列表
* - 支持无限滚动加载更多帖子
* - 根据用户登录状态限制访问数量
* - 使用瀑布流布局展示帖子卡片
*
* 主要功能：
* - Hero区域展示应用介绍和统计信息
* - 平台统计卡片展示各平台帖子数量
* - 帖子列表支持无限滚动加载
* - 访问限制：未登录40条，已登录100条，管理员无限制
*/
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
  ArrowRight,
  ImageIcon,
  Youtube,
  Twitter,
  Music2,
  Instagram,
} from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import HeroSection from '@/components/layout/HeroSection.vue'
import GlassButton from '@/components/ui/button/Button.vue'
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner.vue'
import PostCard from '@/components/business/PostCard.vue'
import EmptyState from '@/components/ui/empty/EmptyState.vue'
import StatCard from '@/components/ui/card/StatCard.vue'
import StatCardGrid from '@/components/ui/card/StatCardGrid.vue'

import { useAuthStore, useSettingsStore, usePostsStore } from '@/stores'
import { useWaterfallLayout } from '@/composables'
import { useInfiniteScroll } from '@/composables'
import { useHomePageAnimation } from '@/composables/animation/useHomePageAnimation'
import { PLATFORMS, PLATFORM_COLORS, type Post } from '@/types'
import { statsApi } from '@/api/services'
import { formatNumber } from '@/utils/format'
import { useErrorHandler } from '@/utils/error'
import { logger } from '@/utils/logger'

/** 路由实例 */
const router = useRouter()
/** 认证状态管理 */
const authStore = useAuthStore()
/** 设置状态管理 */
const settingsStore = useSettingsStore()
/** 帖子状态管理 */
const postsStore = usePostsStore()

/** 用户认证状态和用户信息 */
const { isAuthenticated, user } = storeToRefs(authStore)
/** 加载状态和离线回退标志 */
const { loading, lastListFromFallback } = storeToRefs(postsStore)

/** 首页动画系统 */
const { container: homeContainer } = useHomePageAnimation()

/** 主页使用独立的posts数组，不受explore页面筛选影响 */
const posts = ref<Post[]>([])

/**
 * 访问限制计算属性
 * 根据用户登录状态和角色返回不同的访问限制
 * @returns 未登录：40条，已登录：100条，管理员：无限制
 */
const accessLimit = computed(() => {
  if (!isAuthenticated.value) return 40
  if (user.value?.is_admin) return Infinity
  return 100
})

/**
 * 总帖子数计算属性
 * 用于Hero区域统计展示
 * @returns 所有平台帖子数量总和
 */
const totalPosts = computed(() => {
  return Object.values(platformStats.value).reduce((sum, count) => sum + count, 0)
})

/**
 * Hero统计数据
 */
const heroStats = computed(() => [
  {
    value: formatNumber(totalPosts.value),
    label: t('post.total', 'Posts'),
  },
  {
    value: platforms.length,
    label: t('common.platforms', 'Platforms'),
  },
  {
    value: t('common.live', 'Live'),
    label: t('common.updates', 'Updates'),
  },
])

/** 支持的平台列表 */
const platforms = PLATFORMS
/** 各平台帖子统计数据 */
const platformStats = ref<Record<string, number>>({})
/** 统计数据加载状态 */
const isStatsLoading = ref(true)
/** 当前页码 */
const currentPage = ref(1)
/** 是否还有更多数据 */
const hasMore = ref(true)
/** 帖子网格容器引用 */
const postsGrid = ref<HTMLElement | null>(null)
/** 已加载的卡片数量，用于追踪新增卡片 */
const loadedPostsCount = ref(0)

/** 国际化工具 */
const { t } = useI18n()
/** 错误处理工具 */
const { handleError } = useErrorHandler('HomePage')

/**
 * 瀑布流布局配置
 * 使用轻量级瀑布流布局，支持响应式断点
 */
const { updateLayout, smoothUpdateLayout } = useWaterfallLayout(postsGrid, {
  columnGap: 16,
  rowGap: 16,
  breakpoints: {
    1400: 4,
    1100: 3,
    769: 2,
    0: 2,
  },
})

/** 初始加载完成标志，用于控制无限滚动启用时机 */
const initialLoadComplete = ref(false)

/**
 * 无限滚动配置
 * 当用户滚动到底部时自动加载更多帖子
 */
const { isLoading: isLoadingMore } = useInfiniteScroll({
  onLoadMore: async () => {
    if (posts.value.length >= accessLimit.value) {
      logger.debug('已达到访问限制', { category: 'HomePage' })
      hasMore.value = false
      return
    }
    if (!hasMore.value) {
      logger.debug('没有更多数据', { category: 'HomePage' })
      return
    }
    await loadMore()
  },
  hasMore: () => hasMore.value && posts.value.length < accessLimit.value,
  threshold: 500,
  enabled: initialLoadComplete,
})

onMounted(async () => {
  try {
    // ✨ 优化：减少初始加载数量，提升首屏速度
    // 使用明确的参数，不修改全局 store filters，避免与 ExplorePage 冲突
    const result = await postsStore.fetchPosts({
      page: currentPage.value,
      page_size: 6,
      sort_by: 'scraped_at',
      sort_order: 'desc',
      ignoreFilters: true,
    })

    // ✨ 更新本地posts数组
    if (result && result.items) {
      posts.value = result.items
    }

    // 根据分页信息更新hasMore状态
    if (result && result.page && result.pages) {
      hasMore.value = result.page < result.pages
      logger.debug('初始加载分页信息', {
        category: 'HomePage',
        page: result.page,
        pages: result.pages,
        hasMore: hasMore.value,
      })
    } else if (result && result.items && result.items.length === 0) {
      hasMore.value = false
    }

    // 记录初始加载的卡片数量
    await nextTick()
    loadedPostsCount.value = posts.value.length

    // 更新瀑布流布局
    await updateLayout()

    // 标记初始加载完成，启用无限滚动
    initialLoadComplete.value = true
    logger.debug('初始加载完成，启用无限滚动', { category: 'HomePage' })

    // 后台加载统计数据（非阻塞）
    loadStatsInBackground()
  } catch (error) {
    handleError(error, { customMessage: t('common.loadFailed', 'Failed to load data') })
    // 即使失败也要启用无限滚动
    initialLoadComplete.value = true
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
})

// 页面激活时重新计算布局（解决页面切换后布局错乱）
onActivated(async () => {
  if (postsGrid.value && posts.value.length > 0) {
    await nextTick()
    await updateLayout()
    logger.debug('页面激活，重新计算布局', { category: 'HomePage' })
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
      append: false, // ❌ 不使用append模式，手动追加到本地数组
      ignoreFilters: true, // 忽略Explore页面的筛选状态
    })

    // ✨ 手动追加到本地posts数组
    if (result && result.items) {
      posts.value = [...posts.value, ...result.items]
    }

    // 使用pagination信息正确判断是否还有更多数据
    if (!result || result.items.length === 0) {
      hasMore.value = false
    } else if (result.page && result.pages) {
      // 根据分页信息判断：当前页 >= 总页数时，没有更多数据
      hasMore.value = result.page < result.pages
      logger.debug('分页信息', {
        category: 'HomePage',
        page: result.page,
        pages: result.pages,
        hasMore: hasMore.value,
      })
    }
  } catch (error) {
    // 加载失败时回退页码并显示错误
    currentPage.value--
    hasMore.value = false // 停止继续尝试
    handleError(error, {
      customMessage: t('error.api.fetchPosts'),
      silent: false, // 显示通知
    })
    return // 直接返回，跳过布局更新
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
        ; (card as HTMLElement).classList.remove('card-entering')
      })
    }
  }, 600)
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

/* Stats Section */
.platforms-section {
  padding: var(--spacing-2xl) 0;
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

.home-posts-loading {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
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
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.no-more-hint p {
  margin: 0;
}

.offline-hint {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: rgba(59, 130, 246, 0.08);
  color: var(--color-text-secondary);
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

  .platforms-section {
    padding: var(--spacing-lg) 0;
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
</style>
