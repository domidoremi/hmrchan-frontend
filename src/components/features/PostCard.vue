<template>
  <RouterLink :to="`/posts/${post.id}`" custom v-slot="{ navigate, href }">
    <a
      :href="href"
      class="post-card glass-card"
      data-post-card
      :data-post-id="post.id"
      @click="
        (e) => {
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            navigate()
          }
        }
      "
    >
      <!-- 缩略图 -->
      <div class="card-thumbnail">
        <OptimizedImage
          v-if="post.thumbnail_url"
          :src="thumbnailUrl"
          :alt="post.title || ''"
          :lazy="!isFirstScreen"
          img-class="card-image"
        />
        <div v-else class="thumbnail-placeholder">
          <ImageIcon :size="48" />
        </div>

        <!-- 平台标签 -->
        <div class="platform-badge" :style="{ background: platformColor }">
          {{ platformName }}
        </div>

        <!-- 转发标记 -->
        <div v-if="isRetweet" class="retweet-badge">
          <Repeat2 :size="14" />
          RT
        </div>

        <!-- 引用标记 -->
        <div v-if="isQuote" class="quote-badge">
          <Quote :size="14" />
          Quote
        </div>

        <!-- 视频时长 -->
        <div v-if="post.duration" class="duration-badge">
          {{ formatDuration(post.duration) }}
        </div>

        <!-- 媒体数量 -->
        <div v-if="post.media_count > 1" class="media-count-badge">
          <ImageIcon :size="14" />
          {{ post.media_count }}
        </div>
      </div>

      <!-- 内容信息 -->
      <div class="card-content">
        <h3 class="card-title">{{ post.title || 'Untitled' }}</h3>

        <!-- 作者信息 -->
        <div v-if="isRetweet && post.original_author_name" class="card-author">
          <!-- 转发情况：显示转发者 RT 原作者 -->
          <div class="author-retweet">
            <div class="retweeter">
              <User :size="14" />
              <span>{{ post.author_name }}</span>
            </div>
            <Repeat2 :size="14" class="rt-icon" />
            <div class="original-author">
              <User :size="14" />
              <span>{{ post.original_author_name }}</span>
            </div>
          </div>
        </div>
        <div v-else-if="post.author_name" class="card-author">
          <!-- 普通帖子：只显示作者 -->
          <User :size="16" />
          <span>{{ post.author_name }}</span>
        </div>

        <!-- 描述 -->
        <!-- 只有当description与title不重复时才显示 -->
        <p v-if="showDescription" class="card-description">
          {{ truncateText(post.description || '', 100) }}
        </p>

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
        <div class="card-footer">
          <span class="publish-date">{{ formatDate(post.published_at || post.scraped_at) }}</span>
          <button
            class="favorite-button"
            @click.stop="toggleFavorite"
            :aria-label="isFavorited ? t('post.unfavorite') : t('post.addToFavorites')"
          >
            <Heart :size="18" :fill="isFavorited ? 'currentColor' : 'none'" />
          </button>
        </div>
      </div>
    </a>
  </RouterLink>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Heart, Eye, MessageCircle, User, ImageIcon, Repeat2, Quote } from 'lucide-vue-next'

import OptimizedImage from '@/components/common/OptimizedImage.vue'
import { useAuthStore } from '@/stores/auth'
import { favoritesApi } from '@/api/services'
import { formatNumber, formatRelativeTime, formatDuration, truncateText } from '@/utils/format'
import { resolveMediaUrl } from '@/utils/url'
import toast from '@/utils/toast'
import { PLATFORM_NAMES, PLATFORM_COLORS } from '@/types'
import type { Post, UUID } from '@/types'

interface Props {
  post: Post
  index?: number // 用于判断是否首屏
}

const props = defineProps<Props>()
const router = useRouter()
const { t } = useI18n()

const isFavorited = ref(false)
const favoriteId = ref<UUID | null>(null)
const loading = ref(false)

// 前6张图片认为是首屏，优先加载以优化LCP
const isFirstScreen = computed(() => {
  return props.index !== undefined && props.index < 6
})

// 转换缩略图URL为完整API URL
const thumbnailUrl = computed(() => {
  return resolveMediaUrl(props.post.thumbnail_url)
})

const platformName = computed(
  () => PLATFORM_NAMES[props.post.platform as keyof typeof PLATFORM_NAMES] || props.post.platform,
)
const platformColor = computed(
  () => PLATFORM_COLORS[props.post.platform as keyof typeof PLATFORM_COLORS] || '#666',
)

// 判断是否为转发
const isRetweet = computed(() => {
  return !!props.post.original_author_id && !!props.post.original_author_name
})

// 判断是否为引用推文
// Note: This feature requires platform_metadata field which is not yet in the Post type
// For now, we'll return false until the backend provides this data
const isQuote = computed(() => {
  return false
})

// 判断是否显示description，避免与title重复
const showDescription = computed(() => {
  if (!props.post.description) return false
  if (!props.post.title) return true

  // 如果description与title完全相同，不显示
  if (props.post.description === props.post.title) return false

  // 如果description以title开头（说明title是从description截取的），不显示
  if (props.post.description.startsWith(props.post.title.replace('...', ''))) return false

  return true
})

onMounted(async () => {
  // 只有登录后才检查收藏状态
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) {
    return
  }

  try {
    const result = await favoritesApi.checkFavorite(props.post.id)
    isFavorited.value = result.is_favorited
    favoriteId.value = result.favorite_id
  } catch {
    // 忽略错误（可能是未登录）
  }
})

const toggleFavorite = async () => {
  // 检查登录状态
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) {
    toast.warning(t('favorite.loginRequired'))
    router.push('/login')
    return
  }

  if (loading.value) return

  loading.value = true
  try {
    if (isFavorited.value && favoriteId.value) {
      // 删除收藏
      await favoritesApi.deleteFavorite(favoriteId.value)
      isFavorited.value = false
      favoriteId.value = null
      toast.success(t('favorite.removeSuccess'))
    } else {
      // 添加收藏
      const favorite = await favoritesApi.addFavorite({ post_id: props.post.id })
      isFavorited.value = true
      favoriteId.value = favorite.id
      toast.success(t('favorite.addSuccess'))
    }
  } catch (error: unknown) {
    console.error('Failed to toggle favorite:', error)
    const err = error as { response?: { data?: { message?: string } } }
    toast.error(err.response?.data?.message || t('common.operationFailed'))
  } finally {
    loading.value = false
  }
}

const formatDate = (dateStr: string): string => {
  return formatRelativeTime(dateStr)
}
</script>

<style scoped>
/* Component styles imported from @/styles/components/post-card.css */
.post-card {
  display: block;
  overflow: hidden;
  cursor: pointer;
  /* 禁用position相关的transition，防止Masonry布局时卡片乱飞 */
  transition:
    transform var(--transition-base),
    box-shadow var(--transition-base),
    opacity var(--transition-base);
  text-decoration: none;
  color: inherit;
}

.post-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--glass-shadow), var(--glass-glow);
}

.card-thumbnail {
  position: relative;
  width: 100%;
  background: var(--color-surface-variant);
  overflow: hidden;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  /* 瀑布流模式：使用最小高度，图片自然高度 */
  min-height: 180px;
}

.card-thumbnail img {
  width: 100%;
  height: auto; /* 自然高度，支持不同比例 */
  display: block;
  transition: transform var(--transition-slow);
}

.post-card:hover .card-thumbnail img {
  transform: scale(1.05);
}

.thumbnail-placeholder {
  width: 100%;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  background: var(--gradient-mesh);
}

.platform-badge {
  position: absolute;
  top: var(--spacing-sm);
  left: var(--spacing-sm);
  padding: 0.25rem 0.75rem;
  background: var(--color-primary);
  color: white;
  font-size: 0.75rem;
  font-weight: var(--font-semibold);
  border-radius: var(--radius-full);
  z-index: 2;
}

.retweet-badge {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  padding: 0.25rem 0.5rem;
  background: rgba(34, 197, 94, 0.9);
  color: white;
  font-size: 0.75rem;
  font-weight: var(--font-semibold);
  border-radius: var(--radius-full);
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.quote-badge {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  padding: 0.25rem 0.5rem;
  background: rgba(59, 130, 246, 0.9);
  color: white;
  font-size: 0.75rem;
  font-weight: var(--font-semibold);
  border-radius: var(--radius-full);
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.duration-badge {
  position: absolute;
  bottom: var(--spacing-sm);
  right: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.media-count-badge {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.card-content {
  padding: var(--spacing-md);
}

.card-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-author {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.author-retweet {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.retweeter,
.original-author {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.original-author {
  color: var(--color-text-primary);
  font-weight: var(--font-semibold);
}

.rt-icon {
  color: #22c55e;
}

.card-description {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  line-height: var(--line-normal);
  margin-bottom: var(--spacing-md);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--glass-border);
}

.publish-date {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
}

.favorite-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.favorite-button:hover {
  background: var(--glass-bg-light);
  color: var(--color-primary);
}

/* 移动端优化 */
@media (max-width: 768px) {
  .card-content {
    padding: var(--spacing-sm);
  }

  .card-title {
    font-size: var(--text-sm);
    -webkit-line-clamp: 2;
    margin-bottom: var(--spacing-xs);
  }

  .card-author {
    font-size: var(--text-xs);
    margin-bottom: var(--spacing-xs);
    gap: 0.25rem;
  }

  .card-author svg {
    flex-shrink: 0;
  }

  .author-retweet {
    gap: 0.25rem;
  }

  .retweeter,
  .original-author {
    gap: 0.125rem;
  }

  .retweeter svg,
  .original-author svg {
    width: 12px;
    height: 12px;
  }

  .rt-icon {
    width: 12px;
    height: 12px;
  }

  .card-description {
    font-size: var(--text-xs);
    -webkit-line-clamp: 2;
    margin-bottom: var(--spacing-sm);
  }

  .card-stats {
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }

  .stat-item {
    font-size: var(--text-xs);
  }

  .platform-badge {
    font-size: 0.625rem;
    padding: 0.125rem 0.5rem;
  }

  .retweet-badge,
  .quote-badge {
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
  }

  .media-count-badge,
  .duration-badge {
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
  }

  .favorite-button {
    width: 28px;
    height: 28px;
  }

  .publish-date {
    font-size: 0.625rem;
  }
}

/* 极小屏幕优化 */
@media (max-width: 480px) {
  .card-content {
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .card-title {
    -webkit-line-clamp: 1;
  }

  .card-description {
    -webkit-line-clamp: 1;
  }
}
</style>
