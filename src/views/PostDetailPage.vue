<template>
  <MainLayout :disable-container="true">
    <!-- 阅读进度条 -->
    <div class="reading-progress" :style="{ width: `${readingProgress}%` }"></div>

    <div class="post-detail-page">
      <!-- 骨架屏加载状态 -->
      <div v-if="loading" class="skeleton-loader">
        <div class="skeleton-back-btn"></div>
        <div class="skeleton-card">
          <div class="skeleton-thumbnail"></div>
          <div class="skeleton-content">
            <div class="skeleton-meta"></div>
            <div class="skeleton-title"></div>
            <div class="skeleton-description"></div>
            <div class="skeleton-author"></div>
            <div class="skeleton-stats"></div>
            <div class="skeleton-actions"></div>
          </div>
        </div>
      </div>

      <div v-else-if="post" class="post-detail">
        <div class="detail-topbar" :class="{ 'is-sticky': isTopbarSticky }">
          <button class="back-button glass-button" @click="goBack">
            <ArrowLeft :size="20" />
            {{ $t('common.back') }}
          </button>
          <PostCardActions :is-favorited="isFavorited" @favorite="toggleFavorite" @share="sharePost"
            @more="handleMoreOptions" />
        </div>

        <div v-if="isOfflineDetail" class="offline-hint">
          {{ $t('offline.usingCache') }}
        </div>

        <div :class="['detail-grid', { 'single-column': isTabletOrBelow }]">
          <section :class="['media-column', { 'compact-media': isMobileViewport }]">
            <div v-if="post.thumbnail_url" class="post-thumbnail-container" @click="openMediaViewer(0)">
              <!-- 模糊背景 -->
              <div class="media-backdrop" aria-hidden="true">
                <img :src="resolveMediaUrl(post.thumbnail_url)" alt="" decoding="async" />
              </div>

              <!-- 主图片 -->
              <img :src="resolveMediaUrl(post.thumbnail_url)" :alt="post.title || 'Post thumbnail'" class="main-image"
                loading="eager" decoding="async" fetchpriority="high" />

              <!-- 点击提示 -->
              <div class="thumbnail-overlay">
                <Maximize2 :size="32" />
                <span v-if="post.media_files && post.media_files.length > 1" class="media-count">
                  {{ post.media_files.length }} {{ $t('post.media') }}
                </span>
              </div>
            </div>
          </section>

          <aside :class="['info-column', { interactive: isTabletOrBelow }]">
            <div :class="['post-content-wrapper', { 'as-accordion': isTabletOrBelow }]">
              <template v-if="isTabletOrBelow">
                <details class="accordion-block" :open="accordionStates.overview"
                  @toggle="(event) => saveAccordionState('overview', (event.target as HTMLDetailsElement).open)">
                  <summary class="accordion-summary">
                    <span>{{ $t('post.overview') }}</span>
                    <ChevronRight :size="16" class="chevron" />
                  </summary>

                  <div class="accordion-body">
                    <div class="post-meta" v-memo="[post && post.id, isRetweet]">
                      <div class="meta-item">
                        <Calendar :size="18" />
                        <span>{{ formatDate(post.published_at || post.scraped_at) }}</span>
                      </div>
                      <div class="meta-item">
                        <span class="platform-badge" :style="{ background: platformColor }">
                          {{ platformName }}
                        </span>
                      </div>
                      <div v-if="isRetweet" class="meta-item retweet-indicator">
                        <Repeat2 :size="18" />
                        <span>{{ $t('post.retweet') }}</span>
                      </div>
                    </div>

                    <div v-if="isRetweet" class="retweet-info">
                      <div class="retweeter-info">
                        <div class="author-avatar">
                          <User :size="24" />
                        </div>
                        <div class="author-details">
                          <h3>{{ post.author_name }}</h3>
                          <p v-if="post.author_username">@{{ post.author_username }}</p>
                        </div>
                      </div>
                      <div class="retweet-arrow">
                        <Repeat2 :size="24" />
                      </div>
                      <div class="original-author-info">
                        <div class="author-avatar original">
                          <User :size="24" />
                        </div>
                        <div class="author-details">
                          <h3>{{ post.original_author_name }}</h3>
                          <p v-if="post.original_author_username">
                            @{{ post.original_author_username }}
                          </p>
                          <span class="original-label">{{ $t('post.originalAuthor') }}</span>
                        </div>
                      </div>
                    </div>
                    <RouterLink v-else-if="post.author_name" :to="`/authors/${post.author_id || 0}`" custom
                      v-slot="{ navigate }">
                      <div class="author-info clickable" @click="navigate" role="button" tabindex="0">
                        <div class="author-avatar">
                          <User :size="24" />
                        </div>
                        <div class="author-details">
                          <h3>{{ post.author_name }}</h3>
                          <p v-if="post.author_username">@{{ post.author_username }}</p>
                        </div>
                        <ExternalLink :size="18" class="link-icon" />
                      </div>
                    </RouterLink>

                    <div v-if="post.description || post.title" ref="descriptionSectionRef"
                      v-memo="[post && post.id, activeTag, isDescriptionExpanded]" :class="[
                        'post-description',
                        {
                          'is-collapsed': !isDescriptionExpanded && isDescriptionLong,
                          'is-expanded': isDescriptionExpanded && isDescriptionLong,
                        },
                      ]">
                      <p>
                        <template v-for="(segment, index) in descriptionSegments" :key="index">
                          <a v-if="segment.type === 'link'" class="description-link" :href="segment.href"
                            target="_blank" rel="noopener noreferrer">
                            <span class="description-link-icon" aria-hidden="true">
                              <Instagram v-if="segment.platform === 'instagram'" :size="16" />
                              <Music2 v-else-if="segment.platform === 'tiktok'" :size="16" />
                              <Twitter v-else-if="segment.platform === 'x'" :size="16" />
                              <Youtube v-else-if="segment.platform === 'youtube'" :size="16" />
                              <Ticket v-else-if="segment.platform === 'legendfes' || segment.platform === 'tiget'"
                                :size="16" />
                              <Globe v-else-if="segment.platform === 'takanenonadeshiko'" :size="16" />
                              <ExternalLink v-else :size="16" />
                            </span>
                            <span class="description-link-username">{{ segment.text }}</span>
                          </a>
                          <span v-else-if="segment.type === 'tag'" class="description-tag" :class="{
                            'is-link': isKnownTag(segment.tagName),
                            'is-active': segment.tagName === activeTag,
                          }" @click="onDescriptionTagClick(segment.tagName)">
                            <Tag :size="14" class="description-tag-icon" aria-hidden="true" />
                            <span class="description-tag-text">#{{ segment.tagName || segment.text }}</span>
                          </span>
                          <span v-else>
                            {{ segment.text }}
                          </span>
                        </template>
                      </p>
                      <button v-if="isDescriptionLong" type="button" class="description-toggle"
                        @click="isDescriptionExpanded = !isDescriptionExpanded">
                        {{
                          isDescriptionExpanded
                            ? t('post.collapseDescription', '收起')
                            : t('post.expandDescription', '展开全部')
                        }}
                      </button>
                    </div>
                  </div>
                </details>

                <details v-if="yieldedStats.length > 0" class="accordion-block" :open="accordionStates.stats"
                  @toggle="(event) => saveAccordionState('stats', (event.target as HTMLDetailsElement).open)">
                  <summary class="accordion-summary">
                    <span>{{ $t('post.stats') }}</span>
                    <ChevronRight :size="16" class="chevron" />
                  </summary>

                  <div class="accordion-body">
                    <section class="post-stats-section" aria-labelledby="post-stats-heading">
                      <h2 id="post-stats-heading" class="sr-only">{{ $t('post.stats') }}</h2>
                      <div v-if="yieldedStats.length > 0" class="post-action-stats" role="list"
                        :aria-label="$t('post.stats')">
                        <component v-for="stat in yieldedStats" :key="stat.key" :is="stat.linkAttrs ? 'a' : 'div'"
                          v-bind="stat.linkAttrs ?? {}" :class="['post-stats-row', { 'is-link': !!stat.linkAttrs }]"
                          role="listitem">
                          <div class="stat-icon">
                            <component :is="stat.icon" :size="20" />
                          </div>
                          <div class="stat-text">
                            <span class="stat-count">{{ stat.display }}</span>
                            <span class="stat-label">{{ stat.label }}</span>
                          </div>
                          <ExternalLink v-if="stat.linkAttrs" :size="16" class="link-icon" aria-hidden="true" />
                        </component>
                      </div>
                    </section>
                  </div>
                </details>

                <details v-if="post.tags && post.tags.length > 0" class="accordion-block" :open="accordionStates.tags"
                  @toggle="(event) => saveAccordionState('tags', (event.target as HTMLDetailsElement).open)">
                  <summary class="accordion-summary">
                    <span>{{ $t('post.tags') }}</span>
                    <ChevronRight :size="16" class="chevron" />
                  </summary>

                  <div class="accordion-body">
                    <div class="tags-section" ref="mobileTagsSectionRef" v-memo="[post && post.id, activeTag]">
                      <div class="tags-list">
                        <span v-for="tag in post.tags" :key="tag" class="tag glass-badge"
                          :class="{ 'is-active': tag === activeTag }" @click="onTagsListTagClick(tag)">
                          {{ tag }}
                        </span>
                      </div>
                    </div>
                  </div>
                </details>

                <details v-if="relatedPosts.length > 0" class="accordion-block" :open="accordionStates.related"
                  @toggle="(event) => saveAccordionState('related', (event.target as HTMLDetailsElement).open)">
                  <summary class="accordion-summary">
                    <span>{{ $t('post.relatedPosts') }}</span>
                    <ChevronRight :size="16" class="chevron" />
                  </summary>

                  <div class="accordion-body">
                    <div class="related-posts" v-memo="[post && post.id, relatedPosts.length]">
                      <div class="related-grid">
                        <RouterLink v-for="relatedPost in relatedPosts" :key="relatedPost.id"
                          :to="`/posts/${relatedPost.id}`" class="related-item">
                          <img v-if="relatedPost.thumbnail_url" :src="resolveMediaUrl(relatedPost.thumbnail_url)"
                            :alt="relatedPost.title || ''" loading="lazy" />
                          <div class="related-info">
                            <h4>{{ relatedPost.title || $t('post.untitled') }}</h4>
                            <div class="related-stats">
                              <span v-if="relatedPost.view_count">
                                <Eye :size="14" /> {{ formatNumber(relatedPost.view_count) }}
                              </span>
                              <span v-if="relatedPost.like_count">
                                <Heart :size="14" /> {{ formatNumber(relatedPost.like_count) }}
                              </span>
                            </div>
                          </div>
                        </RouterLink>
                      </div>
                    </div>
                  </div>
                </details>
              </template>

              <template v-else>
                <div class="post-meta">
                  <div class="meta-item">
                    <Calendar :size="18" />
                    <span>{{ formatDate(post.published_at || post.scraped_at) }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="platform-badge" :style="{ background: platformColor }">
                      {{ platformName }}
                    </span>
                  </div>
                  <div v-if="isRetweet" class="meta-item retweet-indicator">
                    <Repeat2 :size="18" />
                    <span>{{ $t('post.retweet') }}</span>
                  </div>
                </div>

                <div v-if="isRetweet" class="retweet-info">
                  <div class="retweeter-info">
                    <div class="author-avatar">
                      <User :size="24" />
                    </div>
                    <div class="author-details">
                      <h3>{{ post.author_name }}</h3>
                      <p v-if="post.author_username">@{{ post.author_username }}</p>
                    </div>
                  </div>
                  <div class="retweet-arrow">
                    <Repeat2 :size="24" />
                  </div>
                  <div class="original-author-info">
                    <div class="author-avatar original">
                      <User :size="24" />
                    </div>
                    <div class="author-details">
                      <h3>{{ post.original_author_name }}</h3>
                      <p v-if="post.original_author_username">
                        @{{ post.original_author_username }}
                      </p>
                      <span class="original-label">{{ $t('post.originalAuthor') }}</span>
                    </div>
                  </div>
                </div>
                <RouterLink v-else-if="post.author_name" :to="`/authors/${post.author_id || 0}`" custom
                  v-slot="{ navigate }">
                  <div class="author-info clickable" @click="navigate" role="button" tabindex="0">
                    <div class="author-avatar">
                      <User :size="24" />
                    </div>
                    <div class="author-details">
                      <h3>{{ post.author_name }}</h3>
                      <p v-if="post.author_username">@{{ post.author_username }}</p>
                    </div>
                    <ExternalLink :size="18" class="link-icon" />
                  </div>
                </RouterLink>
              </template>
            </div>
          </aside>

          <!-- 桌面端：媒体下方整行，放描述 + 操作按钮 + 统计 -->
          <div v-if="!isTabletOrBelow" class="detail-main full-width-section">
            <div v-if="post.description || post.title" ref="descriptionSectionRef"
              v-memo="[post && post.id, activeTag, isDescriptionExpanded]" :class="[
                'post-description',
                {
                  'is-collapsed': !isDescriptionExpanded && isDescriptionLong,
                  'is-expanded': isDescriptionExpanded && isDescriptionLong,
                },
              ]">
              <p>
                <template v-for="(segment, index) in descriptionSegments" :key="index">
                  <a v-if="segment.type === 'link'" class="description-link" :href="segment.href" target="_blank"
                    rel="noopener noreferrer">
                    <span class="description-link-icon" aria-hidden="true">
                      <Instagram v-if="segment.platform === 'instagram'" :size="16" />
                      <Music2 v-else-if="segment.platform === 'tiktok'" :size="16" />
                      <Twitter v-else-if="segment.platform === 'x'" :size="16" />
                      <Youtube v-else-if="segment.platform === 'youtube'" :size="16" />
                      <Ticket v-else-if="segment.platform === 'legendfes' || segment.platform === 'tiget'" :size="16" />
                      <Globe v-else-if="segment.platform === 'takanenonadeshiko'" :size="16" />
                      <ExternalLink v-else :size="16" />
                    </span>
                    <span class="description-link-username">{{ segment.text }}</span>
                  </a>
                  <span v-else-if="segment.type === 'tag'" class="description-tag" :class="{
                    'is-link': isKnownTag(segment.tagName),
                    'is-active': segment.tagName === activeTag,
                  }" @click="onDescriptionTagClick(segment.tagName)">
                    <Tag :size="14" class="description-tag-icon" aria-hidden="true" />
                    <span class="description-tag-text">#{{ segment.tagName || segment.text }}</span>
                  </span>
                  <span v-else>
                    {{ segment.text }}
                  </span>
                </template>
              </p>
              <button v-if="isDescriptionLong" type="button" class="description-toggle"
                @click="isDescriptionExpanded = !isDescriptionExpanded">
                {{
                  isDescriptionExpanded
                    ? t('post.collapseDescription', '收起')
                    : t('post.expandDescription', '展开全部')
                }}
              </button>
            </div>

            <section v-if="yieldedStats.length > 0" v-memo="[post && post.id]" class="post-stats"
              aria-labelledby="post-stats-heading">
              <h2 id="post-stats-heading" class="sr-only">{{ $t('post.stats') }}</h2>
              <div class="post-action-stats" role="list" :aria-label="$t('post.stats')">
                <component v-for="stat in yieldedStats" :key="stat.key" :is="stat.linkAttrs ? 'a' : 'div'"
                  v-bind="stat.linkAttrs ?? {}" :class="['post-stats-row', { 'is-link': !!stat.linkAttrs }]"
                  role="listitem">
                  <div class="stat-icon">
                    <component :is="stat.icon" :size="20" />
                  </div>
                  <div class="stat-text">
                    <span class="stat-count">{{ stat.display }}</span>
                    <span class="stat-label">{{ stat.label }}</span>
                  </div>
                  <ExternalLink v-if="stat.linkAttrs" :size="16" class="link-icon" aria-hidden="true" />
                </component>
              </div>
            </section>
          </div>

          <div v-if="!isTabletOrBelow && post.tags && post.tags.length > 0"
            class="tags-section glass-card full-width-section" ref="desktopTagsSectionRef"
            v-memo="[post && post.id, activeTag]">
            <h3>{{ $t('post.tags') }}</h3>
            <div class="tags-list">
              <span v-for="tag in post.tags" :key="tag" class="tag glass-badge"
                :class="{ 'is-active': tag === activeTag }" @click="onTagsListTagClick(tag)">
                {{ tag }}
              </span>
            </div>
          </div>

          <div v-if="!isTabletOrBelow && relatedPosts.length > 0" class="related-posts glass-card full-width-section"
            v-memo="[post && post.id, relatedPosts.length]">
            <h3 class="related-title">
              <Sparkles :size="20" />
              {{ $t('post.relatedPosts') }}
            </h3>
            <div class="related-grid">
              <RouterLink v-for="relatedPost in relatedPosts" :key="relatedPost.id" :to="`/posts/${relatedPost.id}`"
                class="related-item">
                <img v-if="relatedPost.thumbnail_url" :src="resolveMediaUrl(relatedPost.thumbnail_url)"
                  :alt="relatedPost.title || ''" loading="lazy" />
                <div class="related-info">
                  <h4>{{ relatedPost.title || $t('post.untitled') }}</h4>
                  <div class="related-stats">
                    <span v-if="relatedPost.view_count">
                      <Eye :size="14" /> {{ formatNumber(relatedPost.view_count) }}
                    </span>
                    <span v-if="relatedPost.like_count">
                      <Heart :size="14" /> {{ formatNumber(relatedPost.like_count) }}
                    </span>
                  </div>
                </div>
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- 媒体文件 -->
        <div v-if="post.media_files && post.media_files.length > 0" class="media-section">
          <h2>{{ $t('post.media') }} ({{ post.media_files.length }})</h2>
          <div class="media-grid">
            <div v-for="(media, index) in post.media_files" :key="media.id" class="media-item glass-card">
              <img v-if="media.file_type === 'image'" :src="mediaApi.getStreamUrl(media.id)" :alt="post.title || ''"
                loading="lazy" decoding="async" @click="openMediaViewer(getMediaIndex(index))"
                class="clickable-image" />
              <div v-else-if="media.file_type === 'video'" class="video-thumbnail-container"
                @click="openMediaViewer(getMediaIndex(index))">
                <img v-if="media.thumbnail_path" :src="mediaApi.getStreamUrl(media.id) + '/thumbnail'"
                  :alt="post.title || ''" loading="lazy" decoding="async" class="video-thumbnail" />
                <div v-else class="video-placeholder">
                  <Play :size="48" />
                </div>
                <div class="video-overlay">
                  <Play :size="48" />
                  <span class="video-duration" v-if="media.duration">{{
                    formatDuration(media.duration)
                    }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="error-state glass-card">
        <AlertCircle :size="64" />
        <h3>{{ $t('common.error') }}</h3>
        <p>Post not found</p>
        <GlassButton @click="goBack">
          {{ $t('common.back') }}
        </GlassButton>
      </div>
    </div>

    <!-- 回到顶部按钮（带进度环） -->
    <button v-show="showBackToTop" class="back-to-top-btn" @click="scrollToTop"
      :aria-label="$t('common.backToTop', '回到顶部')">
      <svg viewBox="0 0 100 100" class="progress-ring">
        <circle cx="50" cy="50" r="45" class="progress-ring-bg" />
        <circle cx="50" cy="50" r="45" class="progress-ring-progress"
          :style="{ strokeDashoffset: progressRingOffset }" />
      </svg>
      <ArrowUp :size="20" class="arrow-icon" />
    </button>

    <!-- 媒体查看器 -->
    <PhotoSwipeViewer :show="showMediaViewer" :items="viewerMediaItems" :initial-index="viewerInitialIndex"
      @close="closeMediaViewer" />
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMediaPreload } from '@/composables/media/useSmartPreload'
import { hasViewedPost, markPostAsViewed } from '@/utils/viewTracking'
import { useErrorHandler } from '@/utils/error'
import { resolveMediaUrl, validateMediaId } from '@/utils/format'
import { logger } from '@/utils/logger'
import {
  ArrowLeft,
  ArrowUp,
  Calendar,
  User,
  Eye,
  Heart,
  MessageCircle,
  ExternalLink,
  AlertCircle,
  Maximize2,
  Repeat2,
  Sparkles,
  Play,
  ChevronRight,
  Instagram,
  Twitter,
  Youtube,
  Ticket,
  Globe,
  Tag,
  Music2,
} from 'lucide-vue-next'
import dayjs from 'dayjs'

import MainLayout from '@/components/layout/MainLayout.vue'
import GlassButton from '@/components/ui/button/Button.vue'
import PostCardActions from '@/components/business/PostCard/PostCardActions.vue'
import PhotoSwipeViewer from '@/components/ui/viewer/PhotoSwipeViewer.vue'

import { usePostsStore, useAuthStore, useToastStore } from '@/stores'
import { api } from '@/api/client'
import { favoritesApi, mediaApi } from '@/api/services'
import { indexedDB } from '@/utils/storage'
import { offlineQueue } from '@/utils/storage'
import type { PostDetail, Post, UUID, PostListParams, PaginatedResponse } from '@/types'
import { PLATFORM_NAMES, PLATFORM_COLORS } from '@/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { handleError } = useErrorHandler('PostDetailPage')
const toastStore = useToastStore()
const postsStore = usePostsStore()
const authStore = useAuthStore()

const post = ref<PostDetail | null>(null)
const loading = ref(true)
const isFavorited = ref(false)
const favoriteId = ref<UUID | null>(null)
const favoriteLoading = ref(false)
const showMediaViewer = ref(false)
const viewerMediaItems = ref<
  Array<{
    url: string
    type: 'image' | 'video'
    width?: number
    height?: number
    subtitle?: string // 保留向后兼容
    subtitles?: Array<{ language: string; format: string; label: string }> // 新增：多语言字幕
  }>
>([])
const viewerInitialIndex = ref(0)
const currentThumbnailIndex = ref(0)
const relatedPosts = ref<Post[]>([])
const isTabletViewport = ref(false)
const isMobileViewport = ref(false)
const isTopbarSticky = ref(false)

// 阅读进度相关
const readingProgress = ref(0)
const showBackToTop = ref(false)

const isTabletOrBelow = computed(() => isTabletViewport.value || isMobileViewport.value)

const isOfflineDetail = computed(() => postsStore.lastDetailFromFallback)

interface StatEntry {
  key: string
  icon: Component
  display: string
  label: string
  linkAttrs?: Record<string, string>
}

const platformName = computed(
  () => PLATFORM_NAMES[post.value?.platform as keyof typeof PLATFORM_NAMES] || post.value?.platform,
)
const platformColor = computed(
  () => PLATFORM_COLORS[post.value?.platform as keyof typeof PLATFORM_COLORS] || '#666',
)

// 判断是否为转发
const isRetweet = computed(() => {
  return !!post.value?.original_author_id && !!post.value?.original_author_name
})

const isDescriptionExpanded = ref(false)

const isDescriptionLong = computed(() => {
  const length = post.value?.description?.length ?? 0
  return length > 260
})

const rawDescription = computed(() => post.value?.description || post.value?.title || '')

type SupportedPlatform =
  | 'instagram'
  | 'tiktok'
  | 'x'
  | 'youtube'
  | 'legendfes'
  | 'tiget'
  | 'takanenonadeshiko'

type DescriptionSegmentType = 'text' | 'link' | 'tag'

interface DescriptionSegment {
  type: DescriptionSegmentType
  text: string
  href?: string
  platform?: SupportedPlatform
  tagName?: string
}

const descriptionSegments = computed<DescriptionSegment[]>(() => {
  const text = rawDescription.value
  if (!text) return []
  const tags = post.value?.tags || []
  return parseDescriptionText(text, tags)
})

const activeTag = ref<string | null>(null)
const mobileTagsSectionRef = ref<HTMLElement | null>(null)
const desktopTagsSectionRef = ref<HTMLElement | null>(null)
const descriptionSectionRef = ref<HTMLElement | null>(null)

function parseDescriptionText(text: string, tags: string[] = []): DescriptionSegment[] {
  const segments: DescriptionSegment[] = []
  // 同时识别 URL 和 {#+tag} 形式的标签
  const tokenRegex = /(\{\#\+[^}]+\}|https?:\/\/[^\s]+)/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(text)) !== null) {
    const token = match[0]
    const index = match.index

    if (index > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, index) })
    }

    if (token.startsWith('{#+')) {
      // 标签语法：{#+tagName}
      const inner = token.slice(3, -1).trim()
      if (inner) {
        segments.push({
          type: 'tag',
          text: inner,
          tagName: inner,
        })
      }
    } else {
      // URL 链接
      const url = token
      const label = getShortLinkLabel(url)
      const platform = getPlatformFromUrl(url)
      segments.push({ type: 'link', text: label, href: url, platform })
    }

    lastIndex = index + token.length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) })
  }

  // 第二次处理：在文本段中查找并高亮已有的标签
  if (tags.length > 0) {
    const finalSegments: DescriptionSegment[] = []

    for (const segment of segments) {
      if (segment.type !== 'text') {
        // 保留非文本段（链接和已有的标签）
        finalSegments.push(segment)
        continue
      }

      // 对文本段进行标签匹配和替换
      const textSegments = splitTextByTags(segment.text, tags)
      finalSegments.push(...textSegments)
    }

    return finalSegments
  }

  return segments
}

/**
 * 将文本按照标签分割，将匹配的标签转换为tag类型的segment
 */
function splitTextByTags(text: string, tags: string[]): DescriptionSegment[] {
  if (!text || tags.length === 0) return [{ type: 'text', text }]

  const segments: DescriptionSegment[] = []

  // 创建一个正则表达式匹配所有标签
  // 需要对标签进行转义以处理特殊字符，并按长度降序排序以优先匹配长标签
  const sortedTags = [...tags].sort((a, b) => b.length - a.length)
  const escapedTags = sortedTags.map(tag => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  // 移除 \b 单词边界，改用更灵活的匹配方式
  const tagPattern = new RegExp(`(${escapedTags.join('|')})`, 'gi')

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tagPattern.exec(text)) !== null) {
    const matchedTag = match[0]
    const index = match.index

    // 添加匹配前的文本
    if (index > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, index) })
    }

    // 找到原始标签（保持原始大小写）
    const originalTag = tags.find(t => t.toLowerCase() === matchedTag.toLowerCase()) || matchedTag

    // 添加标签段
    segments.push({
      type: 'tag',
      text: matchedTag,
      tagName: originalTag,
    })

    lastIndex = index + matchedTag.length
  }

  // 添加剩余的文本
  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) })
  }

  // 如果没有匹配到任何标签，返回原始文本
  if (segments.length === 0) {
    return [{ type: 'text', text }]
  }

  return segments
}

function getShortLinkLabel(urlStr: string): string {
  try {
    const url = new URL(urlStr)
    const hostname = url.hostname.replace(/^www\./, '')
    const trimmedPath = url.pathname.replace(/\/+$/, '')

    // 如果有路径，优先使用最后一段路径作为标签（例如 Instagram/TikTok 用户名）
    if (trimmedPath && trimmedPath !== '/') {
      const parts = trimmedPath.split('/').filter(Boolean)
      const rawLast = parts[parts.length - 1] || ''
      // 去掉前缀 @（如 TikTok 的 @username），统一显示为 username
      const cleanedLast = rawLast.startsWith('@') ? rawLast.slice(1) : rawLast
      if (cleanedLast) return cleanedLast
    }

    // 否则使用主域名去掉后缀（例如 takanenonadeshiko.jp -> takanenonadeshiko）
    const hostParts = hostname.split('.')
    if (hostParts.length >= 2) {
      const label = hostParts[hostParts.length - 2] || hostname
      return label
    }
    return hostname
  } catch {
    // 如果 URL 解析失败，退回到去除协议的原始字符串
    return urlStr.replace(/^https?:\/\//, '')
  }
}

function getPlatformFromUrl(urlStr: string): SupportedPlatform | undefined {
  try {
    const url = new URL(urlStr)
    const hostname = url.hostname.replace(/^www\./, '')

    if (hostname === 'instagram.com') return 'instagram'
    if (hostname === 'tiktok.com') return 'tiktok'
    if (hostname === 'x.com' || hostname === 'twitter.com') return 'x'
    if (hostname === 'youtube.com' || hostname === 'youtu.be') return 'youtube'
    if (hostname.includes('legendfes')) return 'legendfes'
    if (hostname.includes('tiget')) return 'tiget'
    if (hostname.includes('takanenonadeshiko')) return 'takanenonadeshiko'
  } catch {
    // ignore
  }
  return undefined
}

function isKnownTag(tagName?: string): boolean {
  if (!tagName || !post.value?.tags) return false
  return post.value.tags.includes(tagName)
}

function scrollToTagsSection() {
  const target = isTabletOrBelow.value ? mobileTagsSectionRef.value : desktopTagsSectionRef.value
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function scrollToDescriptionSection() {
  const target = descriptionSectionRef.value
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onDescriptionTagClick(tagName?: string) {
  if (!tagName || !isKnownTag(tagName)) return
  // 切换选中状态：再次点击取消选中
  if (activeTag.value === tagName) {
    activeTag.value = null
    return
  }
  activeTag.value = tagName
  // 展开 tags 手风琴面板
  accordionStates.value.tags = true
  nextTick(() => {
    scrollToTagsSection()
  })
}

function onTagsListTagClick(tagName: string) {
  if (!tagName) return
  // 切换选中状态：再次点击取消选中
  if (activeTag.value === tagName) {
    activeTag.value = null
    return
  }
  activeTag.value = tagName
  nextTick(() => {
    scrollToDescriptionSection()
  })
}

// Accordion 状态持久化
const ACCORDION_KEY = 'hmrchan:accordion-states'

const accordionStates = ref({
  overview: true,
  stats: true,
  tags: true,
  related: true
})

// 保存 accordion 状态
const saveAccordionState = (key: keyof typeof accordionStates.value, isOpen: boolean) => {
  accordionStates.value[key] = isOpen
  const postId = route.params.id
  try {
    sessionStorage.setItem(
      `${ACCORDION_KEY}:${postId}`,
      JSON.stringify(accordionStates.value)
    )
  } catch {
    // Silently ignore sessionStorage errors
  }
}

// 恢复 accordion 状态
const restoreAccordionStates = () => {
  const postId = route.params.id
  try {
    const saved = sessionStorage.getItem(`${ACCORDION_KEY}:${postId}`)
    if (saved) {
      Object.assign(accordionStates.value, JSON.parse(saved))
    }
  } catch {
    // Silently ignore sessionStorage errors
  }
}

// 判断描述长度以确定是否需要展开/收起功能
// 注意：已移除showDescription，现在始终显示description或title

// 所有媒体项（包括缩略图、图片和视频）
const allMediaItems = computed(() => {
  if (!post.value) return []

  const items: Array<{
    url: string
    type: 'image' | 'video'
    width?: number
    height?: number
    subtitle?: string
    subtitles?: Array<{ language: string; format: string; label: string }>
    mediaId?: UUID // 添加mediaId用于生成字幕URL
  }> = []
  const hasThumbnail = !!post.value.thumbnail_url
  const thumbnailUrl = hasThumbnail ? resolveMediaUrl(post.value.thumbnail_url) : null

  // 检查第一个media_file是否与thumbnail重复
  const firstMediaUrl = post.value.media_files?.[0]
    ? mediaApi.getStreamUrl(post.value.media_files[0].id)
    : null
  const isThumbnailDuplicate = thumbnailUrl && firstMediaUrl &&
    (thumbnailUrl === firstMediaUrl || thumbnailUrl.includes(post.value.media_files?.[0]?.id || ''))

  // 1. 添加缩略图（如果存在且不与第一个媒体文件重复）
  if (hasThumbnail && !isThumbnailDuplicate) {
    items.push({
      url: thumbnailUrl!,
      type: 'image',
      // 缩略图通常没有固定尺寸，让PhotoSwipe自动检测
    })
  }

  // 2. 添加媒体文件中的图片和视频
  // 不跳过任何媒体，保持与模板显示的一致性
  if (post.value.media_files && post.value.media_files.length > 0) {
    post.value.media_files.forEach((media) => {
      if (media.file_type === 'image' || media.file_type === 'video') {
        const mediaUrl = mediaApi.getStreamUrl(media.id)

        const item: {
          url: string
          type: 'image' | 'video'
          width?: number
          height?: number
          subtitle?: string
          subtitles?: Array<{ language: string; format: string; label: string }>
          mediaId?: UUID
        } = {
          url: mediaUrl,
          type: media.file_type as 'image' | 'video',
          width: media.width || undefined,
          height: media.height || undefined,
          mediaId: media.id,
        }

        // 如果是视频且有字幕，添加字幕信息
        if (media.file_type === 'video') {
          // 优先使用新的subtitles数组（多语言支持）
          if (media.subtitles && Array.isArray(media.subtitles) && media.subtitles.length > 0) {
            item.subtitles = media.subtitles
            // 向后兼容：保留subtitle字段（默认语言）
            item.subtitle = mediaApi.getSubtitleUrl(media.id)
          } else if (media.has_subtitle) {
            // 回退到旧的单字幕模式
            item.subtitle = mediaApi.getSubtitleUrl(media.id)
          }
        }

        items.push(item)
      }
    })
  }

  return items
})

const yieldedStats = computed<StatEntry[]>(() => {
  if (!post.value) return []

  const stats: StatEntry[] = []
  const baseLink = post.value.url
    ? {
      href: post.value.url,
      target: '_blank',
      rel: 'noopener noreferrer',
    }
    : undefined

  const pushStat = (
    key: string,
    value: number | null | undefined,
    icon: Component,
    labelKey: string,
  ) => {
    if (!value) return
    stats.push({
      key,
      icon,
      display: formatNumber(value),
      label: t(labelKey),
      linkAttrs: baseLink ? { ...baseLink } : undefined,
    })
  }

  pushStat('views', post.value.view_count, Eye, 'post.views')
  pushStat('likes', post.value.like_count, Heart, 'post.likes')
  pushStat('comments', post.value.comment_count, MessageCircle, 'post.comments')

  return stats
})

// 进度环偏移量计算
const progressRingOffset = computed(() => {
  const circumference = 2 * Math.PI * 45 // r=45
  return circumference - (readingProgress.value / 100) * circumference
})

const updateViewportBreakpoints = () => {
  if (typeof window === 'undefined') return

  const mobileQuery = window.matchMedia('(max-width: 767px)')
  const tabletQuery = window.matchMedia('(max-width: 1023px)')

  isMobileViewport.value = mobileQuery.matches
  isTabletViewport.value = !mobileQuery.matches && tabletQuery.matches
}

onMounted(async () => {
  const postId = route.params.id as UUID
  try {
    // 🔧 临时修复：强制刷新绕过所有缓存，确保获取最新数据（包含media_files）
    // 原因：旧缓存可能缺少media_files字段
    const forceFresh = true

    if (!forceFresh) {
      // 优先复用当前 Store 中的详情，避免重复加载
      const cachedDetail = postsStore.currentPost
      if (cachedDetail && cachedDetail.id === postId) {
        post.value = cachedDetail
        // 已有完整详情，立刻取消骨架屏
        loading.value = false
      } else {
        // 从列表中做浅缓存，先展示基础信息
        const listItem = postsStore.posts?.find((p: Post) => p.id === postId)
        if (listItem) {
          post.value = {
            ...listItem,
            media_files: [],
            tags: [],
          } as PostDetail
          // 有列表数据时也立刻渲染，剩余字段靠后台刷新
          loading.value = false
        }
      }
    }

    // 强制从网络获取最新数据
    post.value = await postsStore.fetchPost(postId, { forceFresh })

    // 验证媒体文件ID格式（诊断用）
    if (import.meta.env.DEV && post.value?.media_files && post.value.media_files.length > 0) {
      logger.group('[PostDetailPage] Media ID Validation', () => {
        post.value!.media_files!.forEach((media, index) => {
          const isValid = validateMediaId(media.id, `PostDetailPage(post=${postId}, media[${index}])`)
          if (!isValid) {
            logger.debug('Media File Details', { category: 'PostDetailPage' }, {
              index,
              id: media.id,
              id_type: typeof media.id,
              file_type: media.file_type,
              file_path: media.file_path,
            })
          }
        })
      }, { category: 'PostDetailPage' })
    }

    // 增加浏览计数（如果该帖子未被浏览过）
    if (post.value && !hasViewedPost(postId)) {
      try {
        await api.post(`/posts/${postId}/increment-view`)
        markPostAsViewed(postId)
        logger.debug('Post view counted', { category: 'PostDetailPage', postId })
      } catch (error) {
        logger.debug('Failed to increment view count', { category: 'PostDetailPage' }, error)
      }
    }

    // 检查是否已收藏
    if (authStore.isAuthenticated && post.value) {
      try {
        const result = await favoritesApi.checkFavorite(post.value.id)
        isFavorited.value = result.is_favorited
        favoriteId.value = result.favorite_id
      } catch {
        // 忽略错误
      }
    }

    // 加载相关推荐（异步，不阻塞页面）
    loadRelatedPosts()

    // 恢复 accordion 状态
    restoreAccordionStates()
  } catch (error) {
    handleError(error, { customMessage: t('post.loadFailed', 'Failed to load post') })
  } finally {
    // 确保在没有任何本地数据的情况下也能关闭骨架屏
    loading.value = false
  }
})

const goBack = () => {
  router.back()
}

const toggleFavorite = async () => {
  // 检查登录状态
  if (!authStore.isAuthenticated) {
    toastStore.warning(t('favorite.loginRequired'))
    router.push('/login')
    return
  }

  if (!post.value || favoriteLoading.value) return

  favoriteLoading.value = true
  try {
    const postId = post.value.id
    const userId = authStore.user?.id

    const updateLocalFavorite = async (favorited: boolean) => {
      if (!userId) return
      try {
        if (favorited) {
          await indexedDB.addFavorite({
            user_id: userId,
            post_id: postId,
            created_at: Date.now(),
          })
        } else {
          await indexedDB.removeFavorite(userId, postId)
        }
      } catch (e) {
        handleError(e, { silent: true, customMessage: 'Failed to update local favorite in IndexedDB' })
      }
    }

    if (!navigator.onLine) {
      // 离线模式：使用离线队列并乐观更新UI
      if (isFavorited.value) {
        await offlineQueue.addAction('unfavorite', { post_id: postId })
        isFavorited.value = false
        favoriteId.value = null
        await updateLocalFavorite(false)
        toastStore.info(t('offline.unfavoriteQueued'))
      } else {
        await offlineQueue.addAction('favorite', { post_id: postId })
        isFavorited.value = true
        // favoriteId 将在同步后由服务端生成
        await updateLocalFavorite(true)
        toastStore.info(t('offline.favoriteQueued'))
      }
      return
    }

    // 在线模式：直接调用API并保持本地状态同步
    if (isFavorited.value) {
      await favoritesApi.deleteFavorite(postId)
      isFavorited.value = false
      favoriteId.value = null
      await updateLocalFavorite(false)
      toastStore.success(t('favorite.removeSuccess'))
    } else {
      const favorite = await favoritesApi.addFavorite({ post_id: postId })
      isFavorited.value = true
      favoriteId.value = favorite.id
      await updateLocalFavorite(true)
      toastStore.success(t('favorite.addSuccess'))
    }
  } catch (error) {
    const errorMsg =
      (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
      t('common.operationFailed')
    handleError(error, { customMessage: errorMsg })
  } finally {
    favoriteLoading.value = false
  }
}

const formatDate = (dateStr: string): string => {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const openMediaViewer = (mediaIndex: number) => {
  if (!post.value) return

  logger.debug('Opening media viewer', {
    category: 'PostDetailPage',
    mediaIndex,
    itemsCount: allMediaItems.value.length,
    postId: post.value.id,
    hasThumbnail: !!post.value.thumbnail_url,
    mediaFilesCount: post.value.media_files?.length || 0,
  })

  viewerMediaItems.value = allMediaItems.value
  viewerInitialIndex.value = mediaIndex
  showMediaViewer.value = true
}

const getMediaIndex = (mediaFileIndex: number): number => {
  // 计算媒体文件在allMediaItems中的实际索引
  // 如果thumbnail存在且不重复，它占用索引0，media_files从索引1开始
  // 如果thumbnail与第一个media_file重复，则不添加单独的thumbnail，media_files从索引0开始
  if (!post.value?.thumbnail_url) return mediaFileIndex

  const thumbnailUrl = resolveMediaUrl(post.value.thumbnail_url)
  const firstMediaUrl = post.value.media_files?.[0]
    ? mediaApi.getStreamUrl(post.value.media_files[0].id)
    : null
  const isThumbnailDuplicate = thumbnailUrl && firstMediaUrl &&
    (thumbnailUrl === firstMediaUrl || thumbnailUrl.includes(post.value.media_files?.[0]?.id || ''))

  const offset = isThumbnailDuplicate ? 0 : 1
  return offset + mediaFileIndex
}

const closeMediaViewer = () => {
  showMediaViewer.value = false
}

// 媒体预加载
useMediaPreload(allMediaItems, currentThumbnailIndex, {
  lookahead: 2,
  enabled: true,
})

// 加载相关推荐（直接调用API，不污染全局posts状态）
const loadRelatedPosts = async () => {
  if (!post.value) return

  try {
    // 基于标签和平台获取相关帖子
    const baseParams: PostListParams = {
      page: 1,
      page_size: 6,
      sort_by: 'view_count',
      sort_order: 'desc',
    }

    // 优先使用相同平台
    if (post.value.platform) {
      baseParams.platform = post.value.platform
    }

    // 直接调用API，不通过store避免污染全局状态
    const response = await api.get<PaginatedResponse<Post>>('/posts', {
      params: baseParams,
    })

    // 过滤掉当前帖子
    relatedPosts.value = (response?.items || [])
      .filter((p: Post) => p.id !== post.value!.id)
      .slice(0, 4) // 最多显示4个
  } catch (error) {
    logger.debug('Failed to load related posts', { category: 'PostDetailPage' }, error)
  }
}

// 分享功能
const sharePost = async () => {
  if (!post.value) return

  const shareData = {
    title: post.value.title || 'Post',
    text: post.value.description || '',
    url: window.location.href,
  }

  try {
    if (navigator.share) {
      await navigator.share(shareData)
      toastStore.success(t('post.shareSuccess', 'Shared successfully'))
    } else {
      // 降级：复制链接
      await copyLink(window.location.href)
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      logger.debug('Share failed', { category: 'PostDetailPage' }, error)
    }
  }
}

// 复制链接
const copyLink = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url)
    toastStore.success(t('post.copySuccess', 'Link copied to clipboard'))
  } catch (error) {
    logger.debug('Copy failed', { category: 'PostDetailPage' }, error)
    toastStore.error(t('post.copyFailed', 'Failed to copy link'))
  }
}

// 更多选项菜单
const handleMoreOptions = () => {
  // 可以在这里实现更多选项的菜单，例如：举报、下载等
  logger.debug('More options clicked', { category: 'PostDetailPage' })
}

// 键盘快捷键
const handleKeydown = (e: KeyboardEvent) => {
  // ESC: 返回
  if (e.key === 'Escape' && !showMediaViewer.value) {
    goBack()
    return
  }

  // Ctrl/Cmd + D: 切换收藏
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault()
    toggleFavorite()
  }

  // S: 分享
  if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    sharePost()
  }
}

// 滚动检测，用于 topbar 粘性效果和阅读进度 - 统一移动/桌面端
const handleScroll = () => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight

  // 计算阅读进度
  const scrollableHeight = documentHeight - windowHeight
  readingProgress.value = scrollableHeight > 0
    ? Math.min((scrollTop / scrollableHeight) * 100, 100)
    : 0

  // 显示/隐藏回到顶部按钮
  showBackToTop.value = scrollTop > 300

  // 根据不同视口大小设置不同的导航栏高度
  let navbarHeight = 78 // 默认桌面端
  if (isMobileViewport.value) {
    navbarHeight = 66 // 移动端导航栏高度
  } else if (isTabletViewport.value) {
    navbarHeight = 72 // 平板端导航栏高度
  }
  isTopbarSticky.value = scrollTop > navbarHeight
}

// 回到顶部
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

onMounted(() => {
  updateViewportBreakpoints()
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', updateViewportBreakpoints, { passive: true })
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', updateViewportBreakpoints)
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
/* ========================================
   阅读进度条
   ======================================== */

.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-primary), #c084fc);
  z-index: 9999;
  transition: width 0.1s ease-out;
  box-shadow:
    0 1px 3px rgba(139, 92, 246, 0.5),
    0 0 10px rgba(139, 92, 246, 0.3);
}

/* ========================================
   回到顶部按钮（带进度环）
   ======================================== */

.back-to-top-btn {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: var(--glass-blur);
  cursor: pointer;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.1),
    0 8px 24px rgba(139, 92, 246, 0.2);
  animation: fadeInUp 0.3s ease-out;
}

.back-to-top-btn:hover {
  transform: translateY(-4px);
  background: rgba(139, 92, 246, 0.1);
  box-shadow:
    0 8px 20px rgba(139, 92, 246, 0.3),
    0 12px 32px rgba(139, 92, 246, 0.2);
}

.back-to-top-btn:active {
  transform: translateY(-2px);
}

.progress-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-ring-bg {
  fill: none;
  stroke: rgba(139, 92, 246, 0.1);
  stroke-width: 2;
}

.progress-ring-progress {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 283;
  /* 2 * π * 45 */
  transition: stroke-dashoffset 0.3s ease;
  filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.6));
}

.arrow-icon {
  position: relative;
  z-index: 1;
  color: var(--color-primary);
  transition: transform 0.3s ease;
}

.back-to-top-btn:hover .arrow-icon {
  transform: translateY(-2px);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .back-to-top-btn {
    bottom: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
  }
}

/* ========================================
   Post Detail Page - Modern Layout
   Material Design + Apple Style
   ======================================== */

.post-detail-page {
  margin: 0 auto;
  padding: clamp(24px, 4vw, 48px) clamp(16px, 5vw, 48px);
  width: min(1440px, 100%);
  min-height: calc(100vh - 120px);
  animation: fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  content-visibility: auto;
  contain: layout style paint;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.detail-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: 12px 0;
  margin-bottom: clamp(16px, 3vw, 28px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 粘性布局 - 移动端和桌面端统一设计 */
.detail-topbar.is-sticky {
  position: sticky;
  z-index: 999;
  /* 低于导航栏(1000)避免遮挡 */
  /* 移除背景，保持透明 */
  background: transparent;
  backdrop-filter: none;
  border-bottom: none;
  padding: 10px clamp(16px, 5vw, 48px);
  margin-left: calc(-1 * clamp(16px, 5vw, 48px));
  margin-right: calc(-1 * clamp(16px, 5vw, 48px));
  box-shadow: none;
  /* 所有宽度统一：导航栏高度 + 安全间距 */
  top: calc(var(--navbar-height, 66px) + 16px);
}

/* 移动端 (< 768px) */
@media (max-width: 767px) {
  .detail-topbar.is-sticky {
    --navbar-height: 66px;
  }
}

/* 平板端和桌面端 (>= 768px) - 保持sticky行为 */
@media (min-width: 768px) {
  .detail-topbar.is-sticky {
    position: sticky !important;
    top: 16px !important;
    /* 桌面端导航栏不是fixed，直接设置top偏移即可 */
  }
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 24px;
  font-weight: 600;
  font-size: 14px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  color: var(--color-text-primary);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 3px 6px -2px rgba(0, 0, 0, 0.12),
    0 6px 12px -3px rgba(0, 0, 0, 0.08);
}

.detail-topbar.is-sticky .back-button {
  box-shadow: none;
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
}

.back-button:hover {
  transform: translateY(-2px);
  box-shadow:
    0 6px 12px -3px rgba(139, 92, 246, 0.2),
    0 12px 24px -6px rgba(0, 0, 0, 0.12);
  border-color: rgba(139, 92, 246, 0.4);
}

.detail-topbar.is-sticky .back-button:hover {
  transform: translateY(0);
  background: rgba(139, 92, 246, 0.15);
}

.back-button:active {
  transform: translateY(0);
  transition-duration: 0.1s;
}

/* PostCardActions 在 topbar 中的样式调整 */
.detail-topbar :deep(.card-actions) {
  position: static;
  opacity: 1;
  transform: none;
  gap: 12px;
  display: flex;
  align-items: center;
}

.detail-topbar :deep(.action-button) {
  background: rgba(139, 92, 246, 0.1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.detail-topbar :deep(.action-button:hover) {
  background: rgba(139, 92, 246, 0.2);
  border-color: rgba(139, 92, 246, 0.4);
}

.detail-topbar.is-sticky :deep(.action-button) {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
  gap: clamp(24px, 4vw, 40px);
  align-items: flex-start;
}

.detail-grid.single-column {
  grid-template-columns: minmax(0, 1fr);
}

.detail-grid>.full-width-section {
  grid-column: 1 / -1;
}

.detail-main {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

@media (min-width: 1024px) {
  .detail-grid>.full-width-section {
    margin-top: clamp(8px, 1.5vw, 16px);
  }
}

.media-column {
  display: flex;
  flex-direction: column;
  gap: clamp(18px, 3vw, 28px);
  position: relative;
}

.media-column.compact-media .post-thumbnail-container {
  width: 100%;
}

.info-column {
  display: flex;
  flex-direction: column;
  gap: clamp(18px, 3vw, 28px);
}

.info-column.interactive {
  gap: var(--spacing-lg);
}

.post-thumbnail-container {
  position: relative;
  width: clamp(320px, 42vw, 520px);
  /* 固定显示比例，避免不同图片尺寸导致高度剧烈变化 */
  aspect-ratio: 16 / 9;
  min-height: 320px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: clamp(20px, 3.5vw, 32px);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  /* 修复：防止背景模糊(scale 1.28)超出容器 */
  box-shadow: 0 16px 40px -20px rgba(15, 23, 42, 0.28);
  transition:
    transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  flex: 0 0 auto;
}

.post-thumbnail-container:hover {
  transform: translateY(-3px);
  box-shadow: 0 26px 54px -26px rgba(76, 29, 149, 0.42);
}

.post-thumbnail-container .main-image {
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 1;
  border-radius: 16px;
  cursor: zoom-in;
}

.media-backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  filter: blur(16px) saturate(110%) brightness(0.96);
  transform: scale(1.28);
  opacity: 0.45;
  background: radial-gradient(circle at center, rgba(24, 22, 36, 0.42), rgba(11, 9, 24, 0.78));
  transition: opacity 0.32s ease;
  pointer-events: none;
  z-index: 0;
}

.media-backdrop img {
  width: 120%;
  height: 120%;
  object-fit: cover;
  opacity: 0.82;
  filter: blur(6px) saturate(108%);
  transform: scale(1.06);
}

.media-backdrop::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(140deg, rgba(18, 16, 32, 0.22) 0%, rgba(32, 22, 44, 0.4) 100%);
  mix-blend-mode: soft-light;
}

.thumbnail-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.75) 0%, rgba(192, 132, 252, 0.75) 100%);
  backdrop-filter: blur(8px) saturate(160%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  opacity: 0;
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  color: white;
  z-index: 2;
  pointer-events: none;
  border-radius: 16px;
}

.post-thumbnail-container:hover .thumbnail-overlay {
  opacity: 1;
}

.media-count {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin-top: var(--spacing-2);
}

.offline-hint {
  margin: 0 0 var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: rgba(59, 130, 246, 0.08);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.thumbnail-overlay::after {
  content: '点击查看完整大图';
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  opacity: 0.9;
}

.thumbnail-overlay.is-video {
  background: rgba(0, 0, 0, 0.45);
}

.thumbnail-overlay.is-video::after {
  content: '点击播放视频';
}

.post-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 2.5vw, 28px);
  padding: clamp(16px, 2.5vw, 28px);
  border-radius: var(--radius-2xl);
  width: 100%;
  align-self: stretch;
  min-width: 0;
  background:
    linear-gradient(135deg, rgba(139, 92, 246, 0.04) 0%, rgba(192, 132, 252, 0.06) 100%),
    var(--glass-bg-light);
  border: 1px solid rgba(139, 92, 246, 0.08);
  box-shadow:
    0 12px 32px -16px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(18px);
  animation: contentFadeIn 0.5s ease;
  content-visibility: auto;
  contain: layout paint style;
}

.post-content-wrapper.as-accordion {
  gap: var(--spacing-lg);
  padding: var(--spacing-md);
}

@media (max-width: 767px) {
  .post-content-wrapper.as-accordion {
    gap: var(--spacing-md);
    padding: var(--spacing-sm);
  }
}

.accordion-block {
  border-radius: var(--radius-xl);
  border: 1px solid rgba(139, 92, 246, 0.14);
  background:
    linear-gradient(135deg, rgba(139, 92, 246, 0.04) 0%, rgba(192, 132, 252, 0.08) 100%),
    var(--glass-bg);
  box-shadow:
    0 12px 24px -18px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  overflow: hidden;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.accordion-summary {
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  cursor: pointer;
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.accordion-summary::-webkit-details-marker {
  display: none;
}

.accordion-summary .chevron {
  transition: transform 0.2s ease;
}

.accordion-block[open] .accordion-summary .chevron {
  transform: rotate(90deg);
}

.accordion-body {
  padding: 0 var(--spacing-lg) var(--spacing-lg);
  display: grid;
  gap: var(--spacing-lg);
}

.accordion-body .post-actions {
  padding: 0;
  background: transparent;
  box-shadow: none;
  border: none;
}

@keyframes contentFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.thumbnail-counter {
  position: absolute;
  bottom: var(--spacing-lg);
  right: var(--spacing-lg);
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(16px) saturate(180%);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-full);
  color: white;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  z-index: 5;
  letter-spacing: 0.05em;
}

.thumbnail-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 52px;
  height: 52px;
  border-radius: var(--radius-full);
  background: rgba(139, 92, 246, 0.9);
  backdrop-filter: blur(20px) saturate(180%);
  border: 2px solid rgba(255, 255, 255, 0.25);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 10px 30px rgba(139, 92, 246, 0.4),
    0 4px 12px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  z-index: 10;
}

.thumbnail-nav-btn:hover:not(:disabled) {
  background: rgba(139, 92, 246, 1);
  transform: translateY(-50%) scale(1.1);
  box-shadow:
    0 14px 40px rgba(139, 92, 246, 0.5),
    0 6px 16px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.35);
}

.thumbnail-nav-btn.nav-btn-disabled {
  opacity: 0.3;
  cursor: not-allowed;
  background: rgba(139, 92, 246, 0.3);
}

.thumbnail-nav-btn:disabled {
  cursor: not-allowed;
}

.prev-thumbnail-btn {
  left: var(--spacing-md);
}

.next-thumbnail-btn {
  right: var(--spacing-md);
}

.post-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-md);
}

.retweet-indicator {
  color: #22c55e !important;
  font-weight: var(--font-semibold);
}

.retweet-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: rgba(34, 197, 94, 0.05);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(34, 197, 94, 0.2);
  flex-wrap: wrap;
}

.retweet-arrow {
  color: #22c55e;
  display: flex;
  align-items: center;
}

.original-author-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.author-avatar.original {
  background: rgba(139, 92, 246, 0.2);
}

.original-label {
  display: inline-block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #22c55e;
  font-weight: var(--font-semibold);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.platform-badge {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-sm);
  color: white;
  font-weight: var(--font-semibold);
}

.author-info {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  flex-wrap: wrap;
  min-width: 0;
  background:
    linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(192, 132, 252, 0.03) 100%),
    var(--glass-bg-light);
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(139, 92, 246, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: relative;
}

.author-info.clickable {
  cursor: pointer;
}

.author-info.clickable:hover {
  background:
    linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(192, 132, 252, 0.08) 100%),
    var(--glass-bg-light);
  border-color: rgba(139, 92, 246, 0.3);
  transform: translateY(-2px);
  box-shadow:
    0 8px 24px rgba(139, 92, 246, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.author-info .link-icon {
  margin-left: auto;
  color: var(--color-primary);
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

.author-info.clickable:hover .link-icon {
  opacity: 1;
}

.author-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 auto;
  min-width: 0;
}

.author-avatar {
  width: 60px;
  height: 60px;
  min-width: 60px;
  /* 防止被压缩 */
  min-height: 60px;
  border-radius: var(--radius-full);
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  /* 防止flex布局压缩 */
  aspect-ratio: 1 / 1;
  /* 保持圆形 */
}

.author-details h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-details p {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-link {
  text-decoration: none;
  display: block;
}

.stat-count {
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  font-size: 1.05rem;
}

.stat-label {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.post-description {
  padding: var(--spacing-lg);
  background:
    linear-gradient(135deg, rgba(139, 92, 246, 0.02) 0%, rgba(192, 132, 252, 0.02) 100%),
    var(--glass-bg-light);
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(139, 92, 246, 0.08);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.03),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.post-description p {
  color: var(--color-text-primary);
  font-size: var(--text-2xl);
  font-weight: 700;
  line-height: 1.4;
  margin: 0;
  word-break: break-word;
  background: linear-gradient(135deg, var(--color-text-primary) 0%, rgba(139, 92, 246, 0.9) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.post-description .description-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 700;
  color: var(--color-primary);
  -webkit-text-fill-color: currentColor;
  background: none;
  text-decoration: none;
}

.post-description .description-link:hover {
  color: var(--color-secondary);
}

.description-link-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.description-link-username {
  font-weight: 600;
}

.description-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.7rem;
  margin-inline: 0.15rem;
  border-radius: 999px;
  background: rgba(129, 140, 248, 0.18);
  border: 1px solid rgba(129, 140, 248, 0.4);
  color: var(--color-primary);
  -webkit-text-fill-color: currentColor;
  box-shadow: 0 2px 6px rgba(129, 140, 248, 0.15);
  transition: all 0.2s ease;
}

.description-tag.is-link {
  cursor: pointer;
}

.description-tag.is-link:hover {
  background: rgba(129, 140, 248, 0.25);
  border-color: rgba(129, 140, 248, 0.6);
  box-shadow: 0 4px 10px rgba(129, 140, 248, 0.25);
  transform: translateY(-1px);
}

.description-tag.is-active {
  background: rgba(129, 140, 248, 0.25);
  border-color: rgba(129, 140, 248, 0.9);
  box-shadow:
    0 0 0 2px rgba(129, 140, 248, 0.9),
    0 4px 12px rgba(15, 23, 42, 0.25);
}

[data-theme='dark'] .description-tag {
  background: rgba(129, 140, 248, 0.25);
}

.description-tag-icon {
  flex-shrink: 0;
}

.description-tag-text {
  font-size: var(--text-xs);
  font-weight: 500;
}

.post-description.is-collapsed {
  max-height: 18em;
  /* 固定em值，桌面端 */
}

.post-description.is-collapsed::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 72px;
  background: linear-gradient(to top, var(--glass-bg-light), transparent);
  pointer-events: none;
}

.post-description.is-expanded {
  max-height: none !important;
}

.description-toggle {
  position: absolute;
  bottom: var(--spacing-sm);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  /* 渐变背景 */
  background: linear-gradient(135deg,
      rgba(139, 92, 246, 0.2),
      rgba(192, 132, 252, 0.2));
  border: 1px solid rgba(139, 92, 246, 0.5);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  /* 增强阴影层次 */
  box-shadow:
    0 2px 8px rgba(139, 92, 246, 0.25),
    0 4px 16px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.description-toggle:hover {
  color: var(--color-text-primary);
  background: linear-gradient(135deg,
      rgba(139, 92, 246, 0.3),
      rgba(192, 132, 252, 0.3));
  border-color: rgba(129, 140, 248, 0.7);
  transform: translateX(-50%) translateY(-4px) scale(1.02);
  box-shadow:
    0 4px 16px rgba(139, 92, 246, 0.4),
    0 8px 24px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.description-toggle:active {
  transform: translateX(-50%) translateY(-2px) scale(1);
  box-shadow:
    0 2px 8px rgba(139, 92, 246, 0.3),
    0 4px 12px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .post-description.is-collapsed {
    max-height: 14em;
    /* 移动端更小的固定值 */
  }

  .description-toggle {
    padding: 4px 12px;
    font-size: var(--text-xs);
  }
}

@media (min-width: 1200px) {
  .post-description {
    padding: var(--spacing-xl);
  }

  .post-description p {
    font-size: var(--text-3xl);
    line-height: 1.3;
  }
}

@media (min-width: 1280px) {
  .post-description.is-expanded p {
    column-count: 2;
    column-gap: var(--spacing-xl);
  }
}

.post-stats {
  margin: var(--spacing-lg) 0;
}

.post-action-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background:
    linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(192, 132, 252, 0.05) 100%),
    var(--glass-bg-light);
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(139, 92, 246, 0.1);
  box-shadow:
    0 4px 16px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.post-stats-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-xl);
  border: 1px solid transparent;
  min-height: 48px;
  transition: all 0.25s ease;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(10px);
}

[data-theme='dark'] .post-stats-row {
  background: rgba(31, 24, 56, 0.45);
}

.post-stats-row.is-link {
  cursor: pointer;
}

.post-stats-row.is-link:hover {
  transform: translateY(-1px);
  border-color: rgba(139, 92, 246, 0.35);
  box-shadow:
    0 8px 20px rgba(76, 29, 149, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.post-stats-row .link-icon {
  margin-left: auto;
  color: var(--color-primary);
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.post-stats-row.is-link:hover .link-icon {
  opacity: 1;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.18), rgba(192, 132, 252, 0.18));
  color: var(--color-primary);
  flex-shrink: 0;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 添加发光效果 */
.post-stats-row.is-link:hover .stat-icon {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.35), rgba(192, 132, 252, 0.35));
  box-shadow:
    0 0 20px rgba(139, 92, 246, 0.4),
    0 0 40px rgba(139, 92, 246, 0.2),
    inset 0 0 10px rgba(255, 255, 255, 0.1);
  transform: scale(1.1);
}

[data-theme='dark'] .stat-icon {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.28), rgba(192, 132, 252, 0.28));
}

.stat-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.media-section {
  margin-top: var(--spacing-2xl);
  margin-bottom: var(--spacing-xl);
}

.media-section h2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-lg);
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .media-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

/* 移动端瀑布流使用单列但保持自然高度 */
@media (max-width: 768px) {
  .media-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
}

.media-item {
  overflow: hidden;
}

.media-item img,
.media-item video {
  width: 100%;
  height: auto;
  display: block;
  border-radius: var(--radius-lg);
  /* 添加圆角与compact-media一致 */
}

.video-thumbnail {
  position: relative;
  cursor: pointer;
  overflow: hidden;
}

.video-thumbnail video {
  pointer-events: none;
}

.video-play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.video-thumbnail:hover .video-play-overlay {
  background: rgba(0, 0, 0, 0.5);
}

.play-button {
  transition: transform 0.3s ease;
}

.video-thumbnail:hover .play-button {
  transform: scale(1.1);
}

.video-thumbnail-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.video-thumbnail-container:hover {
  transform: scale(1.02);
}

.video-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background-secondary);
  color: var(--color-text-secondary);
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.video-thumbnail-container:hover .video-overlay {
  opacity: 1;
}

.video-overlay svg {
  color: white;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
}

.video-duration {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.tags-section {
  padding: var(--spacing-xl);
}

.tags-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tags-section h3::before {
  content: '#';
  color: var(--color-primary);
  font-weight: 700;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag {
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.tag.is-active {
  box-shadow:
    0 0 0 2px rgba(129, 140, 248, 0.9),
    0 4px 12px rgba(15, 23, 42, 0.25);
  transform: translateY(-1px);
  background: linear-gradient(135deg, rgba(129, 140, 248, 0.2), rgba(165, 180, 252, 0.2));
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl);
  text-align: center;
  color: var(--color-text-tertiary);
}

/* 平板优化 (769px-1199px) */
@media (min-width: 769px) and (max-width: 1199px) {
  .post-detail-page {
    max-width: 100%;
    padding: 16px var(--spacing-md);
  }

  .post-header {
    grid-template-columns: 1fr;
    padding: clamp(24px, 4vw, 36px);
  }

  .post-thumbnail-container {
    width: 100%;
    min-height: min(70vh, 720px);
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .post-detail-page {
    max-width: 100%;
    padding: 12px var(--spacing-sm);
  }

  .post-header {
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
    border-radius: 20px;
    margin-bottom: var(--spacing-md);
  }

  .post-thumbnail-container {
    width: 100%;
    min-height: 60vh;
    max-height: 70vh;
  }

  .post-thumbnail {
    min-height: inherit;
  }

  .post-description {
    padding: var(--spacing-md);
  }

  .post-action-stats {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }

  .post-stats-row {
    min-height: 52px;
  }

  /* iPhone 14 Pro Max (430x932) 优化 */
  @media (max-width: 430px) {
    .post-stats-row {
      flex-direction: row;
      gap: var(--spacing-sm);
      min-height: 48px;
      padding: var(--spacing-sm) var(--spacing-sm);
    }

    .stat-icon {
      width: 38px;
      height: 38px;
    }
  }

  .author-avatar {
    width: 48px;
    height: 48px;
    min-width: 48px;
    min-height: 48px;
  }

  .back-button {
    position: sticky;
    top: calc(var(--app-navbar-height, 60px) + 12px);
    /* 移动端安全距离 */
    padding: 8px 16px;
    margin-top: 8px;
    margin-bottom: var(--spacing-md);
    z-index: 200;
  }

  .thumbnail-nav-btn {
    width: 40px;
    height: 40px;
  }

  .prev-thumbnail-btn {
    left: var(--spacing-sm);
  }

  .next-thumbnail-btn {
    right: var(--spacing-sm);
  }

  .back-button {
    margin-bottom: var(--spacing-md);
  }
}

/* ========================================
   骨架屏加载状态
   ======================================== */

.skeleton-loader {
  width: min(1120px, 100% - 32px);
  margin: 0 auto;
  padding: clamp(20px, 4vw, 36px);
}

.skeleton-back-btn {
  width: 100px;
  height: 40px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-card {
  background: var(--glass-bg);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-xl);
  border: 1px solid var(--glass-border);
}

.skeleton-thumbnail {
  width: 100%;
  height: 400px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-xl);
  margin-bottom: var(--spacing-lg);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.skeleton-meta {
  width: 200px;
  height: 20px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-title {
  width: 80%;
  height: 32px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  animation-delay: 0.1s;
}

.skeleton-description {
  width: 100%;
  height: 60px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  animation-delay: 0.2s;
}

.skeleton-author {
  width: 150px;
  height: 24px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  animation-delay: 0.3s;
}

.skeleton-stats {
  width: 250px;
  height: 24px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  animation-delay: 0.4s;
}

.skeleton-actions {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.skeleton-actions::before,
.skeleton-actions::after {
  content: '';
  width: 120px;
  height: 40px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-lg);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  animation-delay: 0.5s;
}

/* 改进后的骨架屏 - Shimmer 加载效果 */
@keyframes skeleton-pulse {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }

  100% {
    opacity: 1;
  }
}

@keyframes skeleton-shimmer {
  0% {
    background-position: -1000px 0;
  }

  100% {
    background-position: 1000px 0;
  }
}

.skeleton-back-btn,
.skeleton-thumbnail,
.skeleton-meta,
.skeleton-title,
.skeleton-description,
.skeleton-author,
.skeleton-stats {
  position: relative;
  overflow: hidden;
  background: linear-gradient(90deg,
      var(--glass-bg-light) 0%,
      rgba(139, 92, 246, 0.08) 20%,
      rgba(192, 132, 252, 0.12) 40%,
      rgba(139, 92, 246, 0.08) 60%,
      var(--glass-bg-light) 100%);
  background-size: 1000px 100%;
  animation: skeleton-shimmer 2s ease-in-out infinite,
    skeleton-pulse 1.5s ease-in-out infinite;
}

/* ========================================
   相关推荐
   ======================================== */

.related-posts {
  margin-top: var(--spacing-2xl);
  padding: var(--spacing-xl);
}

.related-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-lg);
}

.related-title svg {
  color: var(--color-primary);
  animation: sparkle 2s ease-in-out infinite;
}

@keyframes sparkle {

  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.related-item {
  display: flex;
  flex-direction: column;
  background: var(--glass-bg-light);
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid var(--glass-border);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  cursor: pointer;
}

.related-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.15);
  border-color: var(--color-primary);
}

.related-item img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.related-item:hover img {
  transform: scale(1.05);
}

.related-info {
  padding: var(--spacing-md);
  flex: 1;
}

.related-info h4 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-sm) 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.related-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.related-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 768px) {
  .related-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }

  .related-posts {
    padding: var(--spacing-lg);
  }

  .related-item img {
    height: 120px;
  }

  .related-info {
    padding: var(--spacing-sm);
  }

  .related-info h4 {
    font-size: var(--text-sm);
  }
}

@media (max-width: 480px) {
  .related-grid {
    grid-template-columns: 1fr;
  }
}
</style>
