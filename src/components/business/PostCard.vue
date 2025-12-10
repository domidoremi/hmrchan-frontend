<template>
  <RouterLink :to="`/posts/${post.id}`" custom v-slot="{ navigate, href }">
    <article
      ref="cardRef"
      :href="href"
      class="post-card"
      :data-post-id="post.id"
      :data-platform="cardData.platformName.value.toLowerCase()"
      role="article"
      :aria-label="`Post by ${post.author_name || 'Anonymous'}: ${post.title || 'Untitled'}`"
      tabindex="0"
      @click="handleClick($event, navigate)"
      @mouseenter="onHover"
      @mouseleave="onLeave"
      @keydown.enter="handleClick($event, navigate)"
      @keydown.space.prevent="handleClick($event, navigate)"
    >
      <!-- 媒体容器 -->
      <PostCardMedia
        ref="mediaComponentRef"
        :thumbnail-url="cardData.thumbnailUrl.value"
        :alt="post.title || 'Post thumbnail'"
        :is-first-screen="isFirstScreen"
        :preload-distance="preloadDistance"
        :eager="eager"
        :platform-color="cardData.platformColor.value"
        :platform-name="cardData.platformName.value"
        :duration="post.duration"
        :media-count="post.media_count"
        :is-retweet="cardData.isRetweet.value"
        :image-width="post.thumbnail_width ?? 0"
        :image-height="post.thumbnail_height ?? 0"
        @aspect-ratio-change="emit('layoutUpdate')"
      />

      <!-- 快捷操作按钮 -->
      <PostCardActions
        v-if="showActions"
        :is-favorited="isFavorited"
        @favorite="handleFavorite"
        @share="handleShare"
        @more="handleMore"
      />

      <!-- 内容区域 -->
      <PostCardContent
        :title="post.title"
        :description="post.description"
        :show-description="cardData.showDescription.value"
        :author-name="post.author_name"
        :view-count="post.view_count"
        :like-count="post.like_count"
        :published-at="post.published_at"
      />
    </article>
  </RouterLink>
</template>

<script setup lang="ts">
/**
 * 帖子卡片组件
 *
 * 业务功能：
 * - 展示社交媒体帖子的核心信息（标题、作者、统计数据等）
 * - 提供帖子的快捷操作（收藏、分享、更多选项）
 * - 支持点击跳转到帖子详情页或预览面板
 * - 提供悬停动画效果提升用户体验
 *
 * 业务场景：
 * - 在首页帖子列表中展示帖子
 * - 在搜索结果中展示匹配的帖子
 * - 在收藏列表中展示收藏的帖子
 *
 * Props:
 * - post: 帖子数据对象
 * - isFirstScreen: 是否在首屏（影响图片加载优先级）
 * - previewEnabled: 是否启用预览模式（点击打开预览面板而非跳转）
 * - showActions: 是否显示快捷操作按钮
 *
 * Emits:
 * - open: 打开帖子预览面板
 * - favorite: 收藏/取消收藏帖子
 * - share: 分享帖子
 * - more: 显示更多选项
 */

import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Post } from '@/types'
import PostCardMedia from './PostCard/PostCardMedia.vue'
import PostCardContent from './PostCard/PostCardContent.vue'
import PostCardActions from './PostCard/PostCardActions.vue'
import { usePostCardData } from '@/composables'
import { usePostCardAnimation } from '@/composables'
import { useFavorites, useToast } from '@/composables'
import { useAuthStore } from '@/stores'

interface Props {
  /** 帖子数据 */
  post: Post
  /** 是否在首屏（影响图片加载策略） */
  isFirstScreen?: boolean
  /** 预加载距离（px），0 表示使用默认动态计算 */
  preloadDistance?: number
  /** 是否立即加载图片（跳过 IntersectionObserver） */
  eager?: boolean
  /** 是否启用预览模式 */
  previewEnabled?: boolean
  /** 是否显示快捷操作按钮 */
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isFirstScreen: false,
  preloadDistance: 0,
  eager: false,
  previewEnabled: false,
  showActions: true,
})

const emit = defineEmits<{
  /** 打开帖子预览 */
  (e: 'open', postId: string): void
  /** 收藏帖子 */
  (e: 'favorite', postId: string): void
  /** 分享帖子 */
  (e: 'share', post: Post): void
  /** 更多选项 */
  (e: 'more', post: Post): void
  /** 布局需要更新（宽高比变化） */
  (e: 'layoutUpdate'): void
}>()

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const toast = useToast()

/** 使用 composable 提取卡片数据逻辑 */
const cardData = usePostCardData(props.post)
const { isFavorited: checkFavorited, addFavorite, deleteFavorite } = useFavorites()

/** 收藏状态（使用 ref 因为 isFavorited 是异步的） */
const isFavorited = ref(false)

/**
 * 加载收藏状态
 * 异步检查当前帖子是否已被收藏
 */
const loadFavoriteStatus = async () => {
  isFavorited.value = await checkFavorited(props.post.id)
}

/** 组件挂载时检查收藏状态 */
onMounted(() => {
  loadFavoriteStatus()
})

/** 卡片根元素引用 */
const cardRef = ref<HTMLElement | null>(null)

/** 媒体组件引用 */
const mediaComponentRef = ref<InstanceType<typeof PostCardMedia> | null>(null)

/**
 * 动画控制
 * 使用 composable 处理悬停动画效果
 */
const { onHover, onLeave } = usePostCardAnimation(cardRef, () => {
  const component = mediaComponentRef.value
  if (!component) return null
  return (component as unknown as { mediaRef: HTMLElement | null }).mediaRef
})

/**
 * 处理卡片点击事件
 * 根据预览模式决定是打开预览面板还是跳转到详情页
 * @param event - 鼠标或键盘事件
 * @param navigate - 路由导航函数
 */
const handleClick = (event: MouseEvent | KeyboardEvent, navigate: () => void) => {
  if (event instanceof MouseEvent && (event.ctrlKey || event.metaKey)) {
    return
  }

  event.preventDefault()

  if (props.previewEnabled) {
    emit('open', props.post.id)
    return
  }

  navigate()
}

/** 收藏操作加载中 */
const favoriteLoading = ref(false)

/**
 * 处理收藏操作
 * 直接执行收藏/取消收藏操作
 */
const handleFavorite = async () => {
  // 检查登录状态
  if (!authStore.isAuthenticated) {
    toast.warning(t('favorite.loginRequired'))
    router.push('/login')
    return
  }

  if (favoriteLoading.value) return
  favoriteLoading.value = true

  try {
    if (isFavorited.value) {
      await deleteFavorite(props.post.id)
      isFavorited.value = false
    } else {
      await addFavorite({ post_id: props.post.id })
      isFavorited.value = true
    }
  } catch {
    // Error already handled by useFavorites
  } finally {
    favoriteLoading.value = false
  }

  emit('favorite', props.post.id)
}

/**
 * 处理分享操作
 * 使用 Web Share API 或复制链接
 */
const handleShare = async () => {
  const shareUrl = `${window.location.origin}/posts/${props.post.id}`
  const shareData = {
    title: props.post.title || t('post.untitled'),
    text: props.post.description || '',
    url: shareUrl,
  }

  try {
    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData)
    } else {
      // Fallback: 复制链接到剪贴板
      await navigator.clipboard.writeText(shareUrl)
      toast.success(t('common.copyLink') + ' ' + t('common.success'))
    }
  } catch (err) {
    // 用户取消分享或复制失败
    if ((err as Error).name !== 'AbortError') {
      toast.error(t('common.operationFailed'))
    }
  }

  emit('share', props.post)
}

/**
 * 处理更多选项操作
 * 触发更多选项事件，由父组件处理具体逻辑
 */
const handleMore = () => {
  emit('more', props.post)
}
</script>

<style scoped>
/* ========================================
   Material Design + Apple Style Card
   ======================================== */

.post-card {
  position: relative;
  display: flex;
  flex-direction: column;
  /* 瀑布流布局：移除固定高度，让内容自适应 */
  width: 100%;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  text-decoration: none;

  /* Material Design Elevation 2 */
  box-shadow:
    0 3px 6px -2px rgba(0, 0, 0, 0.08),
    0 6px 12px -3px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(139, 92, 246, 0.05);

  /* Performance optimization */
  transform: translateZ(0);
  backface-visibility: hidden;
  contain: layout style paint;

  /* Smooth transitions handled by GSAP */
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

/* Hover State - Material Design Elevation 8 */
.post-card:hover,
.post-card:focus-within {
  border-color: rgba(139, 92, 246, 0.6);
  box-shadow:
    0 16px 32px -8px rgba(139, 92, 246, 0.25),
    0 32px 64px -16px rgba(0, 0, 0, 0.18),
    0 0 0 1px rgba(139, 92, 246, 0.15);
  will-change: transform, box-shadow;
}

/* Platform-specific Hover Glows */
.post-card[data-platform='youtube']:hover {
  border-color: var(--color-youtube);
  box-shadow:
    var(--glow-youtube),
    0 32px 64px -16px rgba(0, 0, 0, 0.18);
}

.post-card[data-platform='twitter']:hover,
.post-card[data-platform='x']:hover {
  border-color: var(--color-twitter);
  box-shadow:
    var(--glow-twitter),
    0 32px 64px -16px rgba(0, 0, 0, 0.18);
}

.post-card[data-platform='tiktok']:hover {
  border-color: var(--color-tiktok-accent);
  box-shadow:
    var(--glow-tiktok),
    0 32px 64px -16px rgba(0, 0, 0, 0.18);
}

.post-card[data-platform='instagram']:hover {
  border-color: var(--color-instagram);
  box-shadow:
    var(--glow-instagram),
    0 32px 64px -16px rgba(0, 0, 0, 0.18);
}

/* Active State */
.post-card:active {
  transform: translateY(-4px) scale(0.99);
  transition-duration: 0.1s;
}

/* Focus State - Accessibility */
.post-card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ========================================
   Media Section - 固定高度240px
   ======================================== */

.card-media {
  position: relative;
  width: 100%;
  /* 瀑布流：不使用padding-bottom，让图片自然高度 */
  flex-shrink: 0;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.06) 0%,
    rgba(6, 182, 212, 0.06) 50%,
    rgba(244, 114, 182, 0.06) 100%
  );
}

.media-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  /* 横向渐变模糊（媒体宽度不足时） */
  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 60px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &::before {
    left: 0;
    background: linear-gradient(to right, rgba(139, 92, 246, 0.3) 0%, transparent 100%);
  }

  &::after {
    right: 0;
    background: linear-gradient(to left, rgba(139, 92, 246, 0.3) 0%, transparent 100%);
  }
}

/* 当图片宽度不足时显示渐变 */
.media-wrapper:has(img[style*='object-fit: contain'])::before,
.media-wrapper:has(img[style*='object-fit: contain'])::after {
  opacity: 1;
}

/* 媒体图片 - 瀑布流自适应 */
.media-wrapper :deep(.media-image),
.media-wrapper :deep(img) {
  width: 100%;
  height: auto;
  max-height: 600px;
  /* 限制最大高度 */
  object-fit: cover;
  display: block;
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.post-card:hover .media-wrapper :deep(.media-image),
.post-card:hover .media-wrapper :deep(img) {
  transform: scale(1.08);
}

/* 渐变遮罩 */
.media-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.post-card:hover .media-overlay {
  opacity: 1;
}

/* Placeholder */
.media-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  opacity: 0.2;
}

/* ========================================
   Badges & Indicators
   ======================================== */

.card-badges {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  z-index: 10;
  pointer-events: none;
}

.platform-badge,
.duration-badge,
.media-count-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  gap: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.platform-badge {
  /* 颜色由平台动态设置 (backgroundColor style binding) */
  opacity: 0.95;
  transition: opacity 0.3s ease;
}

.post-card:hover .platform-badge {
  opacity: 1;
}

.duration-badge,
.media-count-badge {
  background: rgba(0, 0, 0, 0.7);
  margin-left: auto;
}

/* 转发指示器 */
.retweet-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(34, 197, 94, 0.95);
  border-radius: 50%;
  color: white;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
  z-index: 10;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.8;
  }
}

/* ========================================
   Content Section - 固定高度180px
   ======================================== */

.card-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  /* Allow flex shrink */
  padding: 18px;
  gap: 10px;
  overflow: hidden;
}

/* 标题 - 最多2行 */
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.post-card:hover .card-title,
.post-card:focus-within .card-title {
  color: var(--color-primary);
}

/* 描述 - 最多1行 */
.card-description {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 底部区域 - 自动占据剩余空间 */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 8px;
  gap: 8px;
}

/* 作者信息 */
.card-author {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  min-width: 0;
  flex: 1;
}

.author-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--glass-bg-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.author-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 统计信息 */
.card-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.stat-item:hover {
  color: var(--color-primary);
  transform: scale(1.05);
}

/* 时间戳 */
.card-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--color-text-tertiary);
  padding-top: 4px;
  border-top: 1px solid var(--glass-border);
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.post-card:hover .card-time,
.post-card:focus-within .card-time {
  opacity: 1;
}

/* ========================================
   Responsive Design
   ======================================== */

@media (max-width: 768px) {
  .card-content {
    padding: 14px;
  }

  .media-wrapper :deep(img) {
    max-height: 400px;
    /* 移动端降低最大高度 */
  }

  .card-title {
    font-size: 15px;
  }

  .card-description {
    font-size: 12px;
  }

  .card-author,
  .stat-item {
    font-size: 12px;
  }

  .card-time {
    font-size: 10px;
  }

  /* 移动端标签 */
  .platform-badge,
  .duration-badge,
  .media-count-badge {
    font-size: 10px;
    padding: 3px 8px;
  }
}

/* ========================================
   Theme Adaptations
   ======================================== */

/* Dark Theme - Deep Contrast */
[data-theme='dark'] .post-card {
  background: rgba(15, 23, 42, 0.85);
  border-color: rgba(139, 92, 246, 0.25);
}

[data-theme='dark'] .post-card:hover {
  background: rgba(15, 23, 42, 0.98);
  border-color: rgba(139, 92, 246, 0.7);
}

[data-theme='dark'] .author-avatar {
  background: rgba(139, 92, 246, 0.15);
}

/* Light Theme - Clean & Bright */
[data-theme='light'] .post-card {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(139, 92, 246, 0.12);
}

[data-theme='light'] .post-card:hover {
  background: white;
  box-shadow:
    0 12px 24px -6px rgba(139, 92, 246, 0.18),
    0 24px 48px -12px rgba(0, 0, 0, 0.12);
}

[data-theme='light'] .media-overlay {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%);
}

[data-theme='light'] .author-avatar {
  background: rgba(139, 92, 246, 0.08);
  color: var(--color-primary);
}

/* ========================================
   CSS Container Queries - 组件级响应式
   使卡片能够根据容器宽度而非视口宽度调整布局
   ======================================== */

/* 定义容器上下文 */
.post-card {
  container-type: inline-size;
  container-name: post-card;
}

/* 容器宽度小于 200px 时的紧凑布局 */
@container post-card (max-width: 200px) {
  .card-content {
    padding: 12px;
    gap: 6px;
  }

  .card-title {
    font-size: 13px;
    -webkit-line-clamp: 1;
    line-clamp: 1;
  }

  .card-description {
    display: none;
  }

  .card-stats {
    display: none;
  }

  .card-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* 容器宽度在 200px - 280px 时的中等布局 */
@container post-card (min-width: 200px) and (max-width: 280px) {
  .card-content {
    padding: 14px;
  }

  .card-title {
    font-size: 14px;
  }

  .card-stats {
    gap: 8px;
  }

  .stat-item {
    font-size: 11px;
  }
}
</style>
