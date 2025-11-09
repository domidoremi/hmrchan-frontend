<template>
  <RouterLink :to="`/posts/${post.id}`" custom v-slot="{ navigate, href }">
    <article
      :href="href"
      class="post-card"
      :data-post-id="post.id"
      @click="handleClick($event, navigate)"
    >
      <!-- 缩略图区域 -->
      <div class="card-media">
        <!-- 图片/视频缩略图 -->
        <div class="media-wrapper">
          <OptimizedImage
            v-if="post.thumbnail_url"
            :src="thumbnailUrl"
            :alt="post.title || 'Post thumbnail'"
            :lazy="!isFirstScreen"
          />
          <div v-else class="media-placeholder">
            <ImageIcon :size="48" />
          </div>
        </div>

        <!-- 平台标签 -->
        <div class="platform-badge" :style="{ backgroundColor: platformColor }">
          {{ platformName }}
        </div>

        <!-- 视频时长 -->
        <div v-if="post.duration" class="duration-badge">
          <Play :size="14" />
          {{ formatDuration(post.duration) }}
        </div>

        <!-- 媒体数量 -->
        <div v-if="post.media_count > 1" class="media-count-badge">
          <ImageIcon :size="14" />
          {{ post.media_count }}
        </div>

        <!-- 转发/引用标记 -->
        <div v-if="isRetweet" class="retweet-badge">
          <Repeat2 :size="14" />
        </div>
        <div v-else-if="isQuote" class="quote-badge">
          <Quote :size="14" />
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="card-body">
        <!-- 标题 -->
        <h3 class="card-title">
          {{ post.title || 'Untitled' }}
        </h3>

        <!-- 描述 -->
        <p v-if="showDescription" class="card-description">
          {{ truncateText(post.description || '', 80) }}
        </p>

        <!-- 作者信息 -->
        <div class="card-author">
          <User :size="14" />
          <span v-if="isRetweet && post.original_author_name">
            {{ post.author_name }}
            <Repeat2 :size="12" class="inline-rt-icon" />
            {{ post.original_author_name }}
          </span>
          <span v-else>
            {{ post.author_name || 'Anonymous' }}
          </span>
        </div>

        <!-- 统计信息 -->
        <div class="card-stats">
          <div v-if="post.view_count" class="stat-item">
            <Eye :size="16" />
            <span>{{ formatNumber(post.view_count) }}</span>
          </div>
          <div v-if="post.like_count" class="stat-item">
            <Heart :size="16" />
            <span>{{ formatNumber(post.like_count) }}</span>
          </div>
          <div v-if="post.comment_count" class="stat-item">
            <MessageCircle :size="16" />
            <span>{{ formatNumber(post.comment_count) }}</span>
          </div>
        </div>

        <!-- 发布时间 -->
        <div v-if="post.published_at" class="card-footer">
          <Clock :size="14" />
          <time :datetime="post.published_at || undefined">{{ formatRelativeTime(post.published_at) }}</time>
        </div>
      </div>
    </article>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  User,
  Eye,
  Heart,
  MessageCircle,
  Clock,
  ImageIcon,
  Play,
  Repeat2,
  Quote,
} from 'lucide-vue-next'

import OptimizedImage from '@/components/ui/OptimizedImage.vue'
import type { Post } from '@/types'
import { API_BASE_URL } from '@/config/api'

interface Props {
  post: Post
  isFirstScreen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isFirstScreen: false,
})

// 缩略图URL
const thumbnailUrl = computed(() => {
  const url = props.post.thumbnail_url
  if (!url) return ''
  if (url.startsWith('http')) {
    return url
  }
  return `${API_BASE_URL}${url}`
})

// 平台颜色映射
const platformColors: Record<string, string> = {
  twitter: '#1DA1F2',
  x: '#000000',
  bilibili: '#FB7299',
  pixiv: '#0096FA',
  youtube: '#FF0000',
  weibo: '#E6162D',
  default: '#8B5CF6',
}

const platformColor = computed(() => {
  const platform = props.post.platform?.toLowerCase() || 'default'
  return platformColors[platform] || platformColors.default
})

const platformName = computed(() => {
  return props.post.platform || 'Unknown'
})

// 是否为转发/引用
const isRetweet = computed(() => {
  return props.post.original_author_name && props.post.original_author_name !== props.post.author_name
})

// 是否为引用（暂时使用相同逻辑）
const isQuote = computed(() => {
  return false // Post类型中没有post_type字段
})

// 是否显示描述
const showDescription = computed(() => {
  const desc = props.post.description
  if (!desc) return false
  // 如果描述与标题相同，不显示
  if (desc === props.post.title) return false
  // 如果描述包含在标题中，不显示
  if (props.post.title && props.post.title.includes(desc)) return false
  return true
})

// 截断文本
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// 格式化数字
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// 格式化时长
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// 格式化相对时间
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString()
}

// 处理点击事件
const handleClick = (event: MouseEvent, navigate: () => void) => {
  // 允许 Ctrl/Cmd + Click 在新标签页打开
  if (!event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    navigate()
  }
}
</script>

<style scoped>
/* ==================== 卡片容器 ==================== */
.post-card {
  display: flex;
  flex-direction: column;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  text-decoration: none;
  height: 100%;
  /* 确保卡片占满grid cell */
  will-change: transform;
}

.post-card:hover {
  transform: translateY(-6px);
  border-color: rgba(139, 92, 246, 0.5);
  box-shadow: 
    0 20px 40px rgba(139, 92, 246, 0.15),
    0 8px 16px rgba(0, 0, 0, 0.1);
}

.post-card:active {
  transform: translateY(-2px);
}

/* ==================== 媒体区域 ==================== */
.card-media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.1) 0%,
    rgba(6, 182, 212, 0.1) 50%,
    rgba(244, 114, 182, 0.1) 100%
  );
}

.media-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-wrapper :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.post-card:hover .media-wrapper :deep(img) {
  transform: scale(1.05);
}

.media-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  opacity: 0.3;
}

/* ==================== 标签徽章 ==================== */
.platform-badge,
.duration-badge,
.media-count-badge,
.retweet-badge,
.quote-badge {
  position: absolute;
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  color: white;
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  z-index: 10;
}

.platform-badge {
  top: var(--spacing-3);
  left: var(--spacing-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.duration-badge {
  bottom: var(--spacing-3);
  right: var(--spacing-3);
  background: rgba(0, 0, 0, 0.75);
}

.media-count-badge {
  bottom: var(--spacing-3);
  left: var(--spacing-3);
  background: rgba(0, 0, 0, 0.75);
}

.retweet-badge {
  top: var(--spacing-3);
  right: var(--spacing-3);
  background: rgba(34, 197, 94, 0.9);
}

.quote-badge {
  top: var(--spacing-3);
  right: var(--spacing-3);
  background: rgba(59, 130, 246, 0.9);
}

/* ==================== 内容区域 ==================== */
.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  flex: 1;
}

.card-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-author {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: auto;
}

.inline-rt-icon {
  color: rgba(34, 197, 94, 0.8);
  margin: 0 var(--spacing-1);
}

/* ==================== 统计信息 ==================== */
.card-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  transition: color var(--transition-fast);
}

.post-card:hover .stat-item {
  color: var(--color-text-primary);
}

/* ==================== 页脚 ==================== */
.card-footer {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  padding-top: var(--spacing-2);
  border-top: 1px solid var(--glass-border);
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
  .card-media {
    aspect-ratio: 4 / 3;
  }

  .card-body {
    padding: var(--spacing-3);
    gap: var(--spacing-2);
  }

  .card-title {
    font-size: var(--text-base);
    -webkit-line-clamp: 2;
  }

  .card-description {
    font-size: var(--text-xs);
    -webkit-line-clamp: 1;
  }

  .card-stats {
    gap: var(--spacing-3);
  }

  .stat-item {
    font-size: var(--text-xs);
  }
}

/* ==================== 暗色主题增强 ==================== */
[data-theme='dark'] .post-card {
  background: rgba(15, 23, 42, 0.8);
  border-color: rgba(139, 92, 246, 0.2);
}

[data-theme='dark'] .post-card:hover {
  background: rgba(15, 23, 42, 0.95);
  border-color: rgba(139, 92, 246, 0.6);
}

/* ==================== 亮色主题增强 ==================== */
[data-theme='light'] .post-card {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(139, 92, 246, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

[data-theme='light'] .post-card:hover {
  background: white;
  box-shadow: 
    0 20px 40px rgba(139, 92, 246, 0.15),
    0 8px 16px rgba(0, 0, 0, 0.08);
}
</style>
