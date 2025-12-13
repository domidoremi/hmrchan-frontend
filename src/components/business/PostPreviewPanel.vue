<template>
  <div class="preview-panel" role="dialog" aria-modal="true">
    <header class="preview-header">
      <div class="badge-group">
        <span class="platform-badge" :style="{ backgroundColor: platformColor }">
          {{ platformName }}
        </span>
        <span v-if="post?.media_count && post.media_count > 1" class="media-count-badge">
          <ImageIcon :size="14" />
          {{ post.media_count }}
        </span>
        <span v-if="post?.duration" class="duration-badge">
          <Play :size="12" />
          {{ formatDuration(post.duration) }}
        </span>
      </div>
      <button class="close-btn" type="button" @click="emit('close')" aria-label="Close preview">
        <X :size="18" />
      </button>
    </header>

    <section class="preview-body">
      <div class="media-area" :class="{ 'is-loading': loading }">
        <div v-if="loading" key="media-loading" class="media-loader">
          <div class="spinner spinner-lg"></div>
          <span>{{ $t('common.loading') }}</span>
        </div>
        <div v-else-if="error" key="media-error" class="media-error">
          <AlertTriangle :size="28" />
          <p>{{ error }}</p>
        </div>
        <div v-else-if="activeMedia" key="media-active" class="media-display">
          <video
            v-if="activeMedia.file_type === 'video'"
            key="media-video"
            :src="activeMediaSrc"
            controls
            playsinline
            preload="metadata"
          ></video>
          <img
            v-else
            key="media-image"
            :src="activeMediaSrc"
            :alt="post?.title || 'Post media preview'"
            loading="lazy"
          />
        </div>
        <div v-else key="media-empty" class="media-empty">
          <ImageIcon :size="32" />
          <p>{{ $t('post.media') }}</p>
        </div>
      </div>

      <div v-if="mediaItems.length > 1" class="media-thumbnails" role="tablist">
        <button
          v-for="(media, index) in mediaItems"
          :key="media.id"
          type="button"
          :class="['thumbnail-btn', { active: index === activeIndex }]"
          @click="setActive(index)"
          :aria-selected="index === activeIndex"
          role="tab"
        >
          <img
            v-if="media.thumbnail_path || media.file_type === 'image'"
            :src="resolveThumb(media)"
            alt=""
            loading="lazy"
          />
          <span v-else class="thumbnail-placeholder">
            <Play v-if="media.file_type === 'video'" :size="16" />
            <ImageIcon v-else :size="16" />
          </span>
        </button>
      </div>

      <div class="content-area">
        <h2 class="preview-title">{{ post?.title || $t('post.untitled') }}</h2>
        <p v-if="post?.description" class="preview-description">
          {{ post.description }}
        </p>

        <div class="author-row" v-if="post">
          <div class="author-avatar">
            <User :size="18" />
          </div>
          <div class="author-meta">
            <span class="author-name">{{ post.author_name || 'Unknown' }}</span>
            <span v-if="post.author_username" class="author-handle"
              >@{{ post.author_username }}</span
            >
          </div>
        </div>

        <div class="stats-row">
          <div v-if="post?.view_count" class="stat-item">
            <Eye :size="16" />
            <span>{{ formatNumber(post.view_count) }}</span>
          </div>
          <div v-if="post?.like_count" class="stat-item">
            <Heart :size="16" />
            <span>{{ formatNumber(post.like_count) }}</span>
          </div>
          <div v-if="post?.comment_count" class="stat-item">
            <MessageCircle :size="16" />
            <span>{{ formatNumber(post.comment_count) }}</span>
          </div>
          <div v-if="post?.published_at" class="stat-item">
            <Clock :size="16" />
            <time :datetime="post.published_at">{{ formatRelativeTime(post.published_at) }}</time>
          </div>
        </div>

        <div class="actions-row" v-if="post?.url">
          <a :href="post.url" target="_blank" rel="noopener noreferrer" class="glass-button">
            <ExternalLink :size="16" />
            {{ $t('post.viewOriginal') }}
          </a>
          <RouterLink :to="`/posts/${post.id}`" class="glass-button primary" @click="emit('close')">
            <ExternalLink :size="16" />
            {{ $t('post.viewOriginal') }}
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * 帖子预览面板组件
 *
 * 业务功能：
 * - 在侧边面板中预览帖子的完整内容
 * - 支持多媒体文件的切换和预览
 * - 显示帖子的详细信息和统计数据
 * - 提供跳转到原始链接和详情页的功能
 *
 * 业务场景：
 * - 用户快速预览帖子内容而不离开当前页面
 * - 浏览帖子的多个媒体文件
 * - 查看帖子的完整描述和统计信息
 * - 决定是否访问原始链接或详情页
 *
 * Props:
 * - post: 帖子详情数据
 * - loading: 加载状态
 * - error: 错误信息
 *
 * Emits:
 * - close: 关闭预览面板
 */

import { computed, watch, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  X,
  User,
  Eye,
  Heart,
  MessageCircle,
  Clock,
  ImageIcon,
  Play,
  ExternalLink,
  AlertTriangle,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

import type { MediaFile, PostDetail } from '@/types'
import { useMediaStore } from '@/stores'

interface Props {
  /** 帖子详情数据 */
  post: PostDetail | null
  /** 加载状态 */
  loading?: boolean
  /** 错误信息 */
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
})

const emit = defineEmits<{
  /** 关闭预览面板事件 */
  (e: 'close'): void
}>()

const { t } = useI18n()
const mediaStore = useMediaStore()

/** 当前激活的媒体索引 */
const activeIndex = ref(0)

/**
 * 监听帖子变化
 * 切换帖子时重置媒体索引
 */
watch(
  () => props.post?.id,
  () => {
    activeIndex.value = 0
  },
)

/** 媒体文件列表 */
const mediaItems = computed<MediaFile[]>(() => props.post?.media_files || [])

/** 当前激活的媒体文件 */
const activeMedia = computed(() => mediaItems.value[activeIndex.value] || null)

/**
 * 平台颜色
 * 根据不同平台返回对应的品牌颜色
 */
const platformColor = computed(() => {
  const palette: Record<string, string> = {
    twitter: '#1DA1F2',
    x: '#000000',
    youtube: '#FF0000',
    instagram: '#E4405F',
    tiktok: '#000000',
    bilibili: '#FB7299',
    pixiv: '#0096FA',
    default: '#8B5CF6',
  }
  const key = props.post?.platform?.toLowerCase() || 'default'
  return palette[key] || palette['default']
})

/** 平台名称 */
const platformName = computed(() => props.post?.platform || 'Platform')

/** 当前激活媒体的 URL */
const activeMediaSrc = computed(() => {
  if (!activeMedia.value) return ''
  return resolveMedia(activeMedia.value)
})

/**
 * 解析媒体文件 URL
 * 使用 mediaApi 获取流式 URL
 * @param media - 媒体文件对象
 * @returns 媒体文件的流式 URL
 */
function resolveMedia(media: MediaFile): string {
  return mediaStore.getStreamUrl(media.id)
}

/**
 * 解析缩略图 URL
 * 使用 mediaApi 获取缩略图 URL
 * @param media - 媒体文件对象
 * @returns 缩略图 URL
 */
function resolveThumb(media: MediaFile): string {
  return `${mediaStore.getStreamUrl(media.id)}/thumbnail`
}

/**
 * 设置激活的媒体
 * @param index - 媒体索引
 */
function setActive(index: number) {
  activeIndex.value = index
}

/**
 * 格式化数字
 * 将大数字转换为 K/M 格式
 * @param num - 数字
 * @returns 格式化后的字符串
 */
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

/**
 * 格式化视频时长
 * 将秒数转换为 HH:MM:SS 或 MM:SS 格式
 * @param seconds - 秒数
 * @returns 格式化后的时长字符串
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * 格式化相对时间
 * 将日期转换为相对时间格式（如 "2h ago"）
 * @param dateString - 日期字符串
 * @returns 相对时间字符串
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return t('common.justNow') || 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`
  return date.toLocaleDateString()
}
</script>

<style scoped>
.preview-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  overflow: hidden;
  box-shadow:
    0 24px 64px -32px rgba(15, 23, 42, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
}

.badge-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.platform-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  text-transform: capitalize;
}

.media-count-badge,
.duration-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
}

.close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(15, 23, 42, 0.4);
  color: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(15, 23, 42, 0.65);
}

.preview-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  overflow-y: auto;
}

.media-area {
  position: relative;
  width: 100%;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.65);
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-area video,
.media-area img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.media-loader,
.media-error,
.media-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.85);
}

/* Spinner styles moved to base.css and utilities.css - use .spinner.spinner-lg */

.media-thumbnails {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.thumbnail-btn {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  overflow: hidden;
  border: 2px solid transparent;
  background: rgba(255, 255, 255, 0.08);
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease;
}

.thumbnail-btn.active {
  border-color: var(--color-primary, #8b5cf6);
  transform: translateY(-2px);
}

.thumbnail-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  display: inline-flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
}

.content-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-title {
  font-size: clamp(20px, 2vw, 24px);
  font-weight: 700;
  color: var(--color-text-primary);
}

.preview-description {
  font-size: 15px;
  line-height: 1.6;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
}

.author-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.author-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.author-name {
  font-weight: 600;
  color: var(--color-text-primary);
}

.author-handle {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-text-primary);
}

.actions-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.glass-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  color: var(--color-text-primary);
  text-decoration: none;
  transition: all 0.2s ease;
}

.glass-button.primary {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.65), rgba(192, 132, 252, 0.65));
  color: #fff;
  border-color: transparent;
}

.glass-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px -12px rgba(139, 92, 246, 0.35);
}

@media (max-width: 1023px) {
  .preview-panel {
    height: 100%;
    border-radius: 24px 24px 0 0;
  }

  .preview-body {
    padding: 16px;
  }

  .media-area {
    min-height: 260px;
  }

  .actions-row {
    justify-content: stretch;
  }

  .glass-button {
    flex: 1 1 100%;
    justify-content: center;
  }
}
</style>
