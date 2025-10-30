<template>
  <MainLayout>
    <div class="home-page">
      <!-- Hero Section with transition -->
      <Transition name="hero-fade">
        <section v-if="settingsStore.settings.showHeroSection" class="hero-section">
          <div class="hero-content glass-card">
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

      <!-- Platform Stats -->
      <section class="stats-section">
        <div class="stats-wrapper">
          <div
            ref="statsGrid"
            class="stats-grid"
            @mouseenter="pauseAutoScroll"
            @mouseleave="resumeAutoScroll"
          >
            <div v-for="platform in platforms" :key="platform" class="stat-card glass-card">
              <div class="stat-icon" :style="{ background: getPlatformColor(platform) }">
                <component :is="getPlatformIcon(platform)" :size="32" />
              </div>
              <h3>{{ $t(`platform.${platform}`) }}</h3>
              <p class="stat-count">{{ formatNumber(platformStats[platform] || 0) }}</p>
              <p class="stat-label">{{ $t('post.title') }}</p>
            </div>
          </div>
          <div class="scroll-indicator">← {{ $t('common.swipeToView') }} →</div>
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
          <PostCard v-for="post in posts" :key="post.id" :post="post" />
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
} from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import GlassButton from '@/components/ui/GlassButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import PostCard from '@/components/features/PostCard.vue'
import AccessLimitBanner from '@/components/AccessLimitBanner.vue'

import type { Post } from '@/types'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { usePostsStore } from '@/stores/posts'
import { useSmartPreload } from '@/composables/useSmartPreload'
import { useMasonry } from '@/composables/useMasonry'
import { PLATFORMS, PLATFORM_COLORS } from '@/types'
import { postsApi, statsApi } from '@/api/services'
import toast from '@/utils/toast'
import { formatNumber } from '@/utils/format'
import logger from '@/utils/logger'

const router = useRouter()
const themeStore = useThemeStore()
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
const statsGrid = ref<HTMLElement | null>(null)
const postsGrid = ref<HTMLElement | null>(null)
let autoScrollInterval: ReturnType<typeof setInterval> | null = null
let isAutoScrollPaused = ref(false)

// Masonry瀑布流 - 使用响应式gutter（函数形式）
const getGutter = () => {
  const width = window.innerWidth
  console.log('[HomePage] Calculating gutter for width:', width)
  if (width <= 480) return 12  // 小屏：12px
  if (width <= 768) return 16  // 移动端：16px
  return 16  // 桌面端：16px
}

const { reloadItems, destroy, initMasonry } = useMasonry(postsGrid, {
  itemSelector: 'a.post-card',
  columnWidth: 'a.post-card',
  gutter: getGutter,  // 传递函数而不是调用结果
  percentPosition: false,
  horizontalOrder: false,
  fitWidth: false
})

// 监听窗口大小变化，重新初始化Masonry以应用新的gutter
let resizeTimer: ReturnType<typeof setTimeout> | null = null
const handleResize = () => {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(async () => {
    console.log('[HomePage] Window resized, reinitializing Masonry...')
    destroy()
    await nextTick()
    setTimeout(initMasonry, 300)
  }, 300)
}

const { t } = useI18n()

// 智能预加载
const { refresh: refreshPreload } = useSmartPreload(posts, {
  batchSize: 10,
  rootMargin: '400px 0px',
  enabled: true,
})

onMounted(async () => {
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
  
  // 初始化其他功能
  try {
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

    // 监听滚动事件
    window.addEventListener('scroll', handleScroll)

    // 在移动端启动自动滚动
    if (window.innerWidth <= 768) {
      startAutoScroll()
    }
  } catch (error) {
    logger.error('Failed to load data:', error)
    toast.error(t('common.loadFailed'))
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
  stopAutoScroll()
  if (resizeTimer) clearTimeout(resizeTimer)
})

// 滚动加载更多
const handleScroll = () => {
  if (isLoadingMore.value || !hasMore.value) return
  if (!isAuthenticated.value && posts.value.length >= accessLimit.value) return

  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight

  // 距离底部200px时触发加载
  if (scrollTop + windowHeight >= documentHeight - 200) {
    loadMore()
  }
}

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

// 自动滚动功能（仅移动端）
const startAutoScroll = () => {
  if (!statsGrid.value || autoScrollInterval) return

  autoScrollInterval = setInterval(() => {
    if (isAutoScrollPaused.value || !statsGrid.value) return

    const scrollContainer = statsGrid.value
    const scrollAmount = 180 // 每次滚动一个卡片宽度
    const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth

    if (scrollContainer.scrollLeft >= maxScroll) {
      // 滚动到尽头，回到起点
      scrollContainer.scrollTo({ left: 0, behavior: 'smooth' })
    } else {
      // 继续向右滚动
      scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }, 3000) // 每3秒滚动一次
}

const stopAutoScroll = () => {
  if (autoScrollInterval) {
    clearInterval(autoScrollInterval)
    autoScrollInterval = null
  }
}

const pauseAutoScroll = () => {
  isAutoScrollPaused.value = true
}

const resumeAutoScroll = () => {
  isAutoScrollPaused.value = false
}

const getPlatformColor = (platform: string) => {
  return PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS] || '#666'
}

// 监听posts变化，重新布局Masonry
watch(posts, async () => {
  await nextTick()
  // 延迟执行，确保DOM和图片已更新
  setTimeout(() => {
    console.log('[HomePage] Posts changed, reloading Masonry...')
    reloadItems()
  }, 300)
}, { deep: true })

const getPlatformIcon = (platform: string) => {
  const icons: Record<string, any> = {
    youtube: Youtube,
    twitter: Twitter,
    tiktok: Music2,
    instagram: Instagram,
  }
  return icons[platform] || ImageIcon
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

/* Stats Section */
.stats-section {
  padding: var(--spacing-md) 0;
}

.stats-wrapper {
  position: relative;
}

.scroll-indicator {
  display: none; /* 桌面端隐藏 */
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-lg);
}

.stat-card {
  padding: var(--spacing-xl);
  text-align: center;
  transition: all var(--transition-base);
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--spacing-md);
  border-radius: var(--radius-2xl);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
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
  /* Masonry布局容器 */
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
  padding: var(--spacing-xl);
}

.no-more-hint {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

/* Masonry布局，不需要这些样式 */

/* 移动端适配 */
@media (max-width: 768px) {
  .hero-section {
    padding: var(--spacing-lg) 0 var(--spacing-sm) 0;
  }

  .hero-content {
    padding: var(--spacing-xl);
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
    padding: var(--spacing-sm) 0;
  }

  .latest-section {
    padding: var(--spacing-sm) 0 var(--spacing-lg) 0;
  }

  .section-header {
    margin-bottom: var(--spacing-md);
  }

  .stats-wrapper {
    margin: 0 calc(-1 * var(--spacing-lg));
    padding: 0 var(--spacing-lg);
  }

  .stats-grid {
    display: flex;
    gap: var(--spacing-md);
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: var(--spacing-sm) 0;
    scroll-behavior: smooth;
  }

  .stats-grid::-webkit-scrollbar {
    display: none;
  }

  .scroll-indicator {
    display: block;
    text-align: center;
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    margin-top: var(--spacing-sm);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
  }

  .stat-card {
    flex: 0 0 160px;
    scroll-snap-align: center;
    padding: var(--spacing-lg);
    transition: transform 0.2s ease;
  }

  .stat-card:active {
    transform: scale(0.98);
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    margin-bottom: var(--spacing-xs);
  }

  .stat-icon svg {
    width: 20px;
    height: 20px;
  }

  .stat-card h3 {
    font-size: var(--text-sm);
    margin-bottom: var(--spacing-xs);
  }

  .stat-count {
    font-size: var(--text-lg);
  }

  .stat-label {
    font-size: var(--text-xs);
  }

  /* Masonry布局在移动端也生效 */
}

/* 小屏手机适配 */
@media (max-width: 480px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-content {
    padding: var(--spacing-xl);
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<!-- Masonry瀑布流全局样式 -->
<style>
/* Masonry瀑布流卡片样式 */
.posts-grid .post-card {
  width: calc(25% - 12px); /* 4列 */
  margin-bottom: 16px;
}

/* 大屏幕 */
@media (min-width: 1400px) {
  .posts-grid .post-card {
    width: calc(25% - 12px); /* 4列 */
  }
}

/* 中型屏幕 */
@media (min-width: 1024px) and (max-width: 1399px) {
  .posts-grid .post-card {
    width: calc(33.333% - 11px); /* 3列 */
  }
}

/* 平板端 */
@media (min-width: 769px) and (max-width: 1023px) {
  .posts-grid .post-card {
    width: calc(50% - 8px); /* 2列 */
  }
}

/* 移动端 */
@media (max-width: 768px) {
  .posts-grid .post-card {
    width: calc(50% - 8px); /* 2列 */
    margin-bottom: 16px;
  }
}

/* 小屏手机 */
@media (max-width: 480px) {
  .posts-grid .post-card {
    width: calc(50% - 6px); /* 2列 */
    margin-bottom: 12px;
  }
}
</style>
