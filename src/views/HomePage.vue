<template>
  <div class="home-page">
    <!-- Hero + 今日入口 -->
    <div class="home-fold">
      <!-- Hero Section -->
      <section
        v-if="settings.showHeroSection"
        class="hero home-screen"
        :class="{ 'hero--animated': shouldAnimate }"
      >
        <div class="container hero-layout">
          <div class="hero-copy">
            <div class="hero-copy__left">
              <p class="hero-kicker hero-copy__line hero-copy__line--kicker">
                {{ $t('home.hero.kicker') }}
              </p>
              <h1 class="hero-title gradient-text hero-copy__line hero-copy__line--title">
                {{ $t('home.hero.title') }}
              </h1>
              <p class="hero-subtitle hero-copy__line hero-copy__line--subtitle">
                {{ $t('home.hero.subtitle') }}
              </p>
            </div>

            <span class="hero-copy__divider" aria-hidden="true" />

            <div class="hero-copy__right">
              <div
                class="hero-editorial glass-card"
                :class="{ 'hero-editorial--loaded': Boolean(heroEditorialCard) }"
              >
                <template v-if="heroEditorialCard">
                  <div class="hero-editorial__kicker">
                    <span class="hero-editorial__dot" />
                    {{ $t('home.hero.editorialLabel') }}
                  </div>
                  <strong class="hero-editorial__title">{{ heroEditorialCard.title }}</strong>
                  <p class="hero-editorial__text">{{ heroEditorialCard.text }}</p>
                  <div class="hero-editorial__meta">
                    <span class="hero-editorial__author">{{ heroEditorialCard.author }}</span>
                    <span v-if="heroEditorialCard.time" class="hero-editorial__time">
                      {{ heroEditorialCard.time }}
                    </span>
                  </div>
                </template>
                <template v-else>
                  <div class="hero-editorial__kicker">
                    <span class="hero-editorial__dot" />
                    {{ $t('home.hero.editorialLabel') }}
                  </div>
                  <span
                    class="hero-editorial__skeleton hero-editorial__skeleton--title glass-skeleton"
                  />
                  <span class="hero-editorial__skeleton glass-skeleton" />
                  <span
                    class="hero-editorial__skeleton hero-editorial__skeleton--short glass-skeleton"
                  />
                </template>
              </div>

              <div class="hero-actions">
                <Button size="lg" variant="primary" class="hero-btn" @click="goToExplore">
                  <AnimatedIcon name="explore" :fallback-icon="Compass" size="md" />
                  {{ $t('home.hero.primaryAction') }}
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  class="hero-btn hero-btn--secondary"
                  @click="scrollToFeatured"
                >
                  <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="md" />
                  {{ $t('home.hero.secondaryAction') }}
                </Button>
              </div>

              <div class="hero-tags">
                <span class="hero-tags__label">{{ $t('home.hero.trendingLabel') }}</span>
                <div v-if="heroTags.length > 0" class="hero-tag-list">
                  <RouterLink
                    v-for="tag in heroTags"
                    :key="`hero-tag-${tag}`"
                    :to="{ name: 'search', query: { q: tag } }"
                    class="glass-tag hero-tag"
                  >
                    #{{ tag }}
                  </RouterLink>
                </div>
                <span v-else class="hero-tags__empty">{{ $t('home.hero.tagsEmpty') }}</span>
              </div>

              <div class="hero-stats" :aria-label="$t('home.hero.stats.ariaLabel')">
                <div v-for="item in heroStats" :key="item.key" class="hero-stat glass-card">
                  <span class="hero-stat__label">{{ item.label }}</span>
                  <strong class="hero-stat__value">{{ item.value }}</strong>
                  <span class="hero-stat__note">{{ item.note }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    <!-- /.home-fold -->

    <!-- Horizontal Rail -->
    <section ref="featuredSectionRef" class="rail home-screen" :style="featuredSceneStyle">
      <div class="rail-sticky">
        <div class="rail-stage">
          <div class="rail-stage__chrome">
            <div class="rail-stage__eyebrow">
              <span class="rail-stage__index">{{
                String(activeRailIndex + 1).padStart(2, '0')
              }}</span>
              <span class="rail-stage__label">{{ activeRailSlide?.label }}</span>
            </div>
            <div class="rail-stage__dots" aria-hidden="true">
              <span
                v-for="slide in railSlides"
                :key="slide.key"
                class="rail-stage__dot"
                :class="{ 'is-active': slide.key === activeRailSlide?.key }"
              />
            </div>
          </div>

          <div class="rail-track" :style="railTrackStyle" role="list">
            <article class="rail-panel rail-panel--portal">
              <div class="rail-panel__content">
                <header class="section-header section-header--stage">
                  <div class="section-title">
                    <p class="section-kicker">{{ $t('home.portal.kicker') }}</p>
                    <h2>{{ $t('home.portal.title') }}</h2>
                    <p>{{ $t('home.portal.subtitle') }}</p>
                  </div>
                  <RouterLink to="/explore" class="section-link">
                    <AnimatedIcon name="explore" :fallback-icon="ArrowUpRight" size="sm" />
                    {{ $t('home.portal.action') }}
                  </RouterLink>
                </header>

                <div class="portal-grid">
                  <RouterLink to="/explore" class="portal-card portal-card--primary glass-card">
                    <div class="portal-card__icon portal-card__icon--primary">
                      <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="lg" />
                    </div>
                    <div class="portal-card__body">
                      <h3>{{ $t('home.portal.items.recommend.title') }}</h3>
                      <p>{{ $t('home.portal.items.recommend.desc') }}</p>
                    </div>
                    <AnimatedIcon
                      name="explore"
                      :fallback-icon="ArrowUpRight"
                      size="sm"
                      class="portal-card__arrow"
                    />
                  </RouterLink>

                  <RouterLink to="/authors" class="portal-card glass-card">
                    <div class="portal-card__icon portal-card__icon--authors">
                      <AnimatedIcon name="user" :fallback-icon="Users" size="lg" />
                    </div>
                    <div class="portal-card__body">
                      <h3>{{ $t('home.portal.items.authors.title') }}</h3>
                      <p>{{ $t('home.portal.items.authors.desc') }}</p>
                    </div>
                  </RouterLink>

                  <RouterLink to="/schedule" class="portal-card glass-card">
                    <div class="portal-card__icon portal-card__icon--schedule">
                      <AnimatedIcon name="calendar" :fallback-icon="Calendar" size="lg" />
                    </div>
                    <div class="portal-card__body">
                      <h3>{{ $t('home.portal.items.schedule.title') }}</h3>
                      <p>{{ $t('home.portal.items.schedule.desc') }}</p>
                    </div>
                  </RouterLink>

                  <RouterLink to="/community" class="portal-card glass-card">
                    <div class="portal-card__icon portal-card__icon--community">
                      <AnimatedIcon name="sparkle" :fallback-icon="MessageSquare" size="lg" />
                    </div>
                    <div class="portal-card__body">
                      <h3>{{ $t('home.portal.items.community.title') }}</h3>
                      <p>{{ $t('home.portal.items.community.desc') }}</p>
                    </div>
                  </RouterLink>
                </div>
              </div>
            </article>

            <article class="rail-panel rail-panel--spotlight">
              <div class="rail-panel__content rail-panel__content--highlight">
                <header class="section-header section-header--stage">
                  <div class="section-title">
                    <p class="section-kicker">{{ $t('home.hero.spotlightLabel') }}</p>
                    <h2>{{ heroEditorialTitle }}</h2>
                    <p>{{ heroEditorialText }}</p>
                  </div>
                  <span class="rail-panel__meta">{{ heroSpotlightMeta }}</span>
                </header>

                <div class="rail-highlight">
                  <div class="hero-collage">
                    <div class="hero-collage-grid">
                      <template v-if="heroHighlightCards.length > 0">
                        <button
                          v-for="(card, index) in heroHighlightCards"
                          :key="`hero-highlight-${card.post.id}`"
                          type="button"
                          class="hero-collage-card glass-card"
                          :class="{ 'hero-collage-card--primary': index === 0 }"
                          @click="openPostPreview(card.post, card.thumbnail)"
                        >
                          <img
                            v-if="card.thumbnail"
                            class="hero-collage-image"
                            :src="card.thumbnail"
                            :alt="card.title"
                            loading="lazy"
                            decoding="async"
                          />
                          <div v-else class="hero-collage-placeholder">
                            <AnimatedIcon name="image" :fallback-icon="Image" size="lg" />
                          </div>
                          <div class="hero-collage-overlay">
                            <span class="hero-collage-title">{{ card.title }}</span>
                            <span class="hero-collage-meta">{{ card.author }}</span>
                          </div>
                        </button>
                      </template>
                      <template v-else>
                        <div
                          v-for="i in 5"
                          :key="`hero-placeholder-${i}`"
                          class="hero-collage-card hero-collage-card--placeholder glass-skeleton"
                        />
                      </template>
                    </div>
                  </div>

                  <div class="hero-spotlight glass-card">
                    <span class="hero-spotlight__label">{{ $t('home.hero.spotlightLabel') }}</span>
                    <strong class="hero-spotlight__title">{{ heroEditorialTitle }}</strong>
                    <p class="hero-spotlight__summary">{{ heroEditorialText }}</p>
                    <span class="hero-spotlight__meta">{{ heroSpotlightMeta }}</span>
                  </div>
                </div>
              </div>
            </article>

            <article class="rail-panel rail-panel--featured">
              <div class="rail-panel__content">
                <header class="section-header section-header--stage">
                  <div class="section-title">
                    <p class="section-kicker">{{ $t('home.featured.kicker') }}</p>
                    <h2>{{ $t('home.featured.title') }}</h2>
                    <p>{{ $t('home.featured.subtitle') }}</p>
                  </div>
                  <RouterLink to="/explore" class="section-link">
                    <AnimatedIcon name="explore" :fallback-icon="ArrowUpRight" size="sm" />
                    {{ $t('home.featured.action') }}
                  </RouterLink>
                </header>

                <div class="rail-featured-grid">
                  <template v-if="featuredPosts.length > 0">
                    <PostCard
                      v-for="(post, index) in featuredPosts"
                      :key="`featured-rail-${post.id}`"
                      :post="post"
                      :priority="index < 2"
                      :show-excerpt="false"
                      @click="(_id, thumb) => openPostPreview(post, thumb)"
                    />
                  </template>
                  <template v-else>
                    <PostCardSkeleton v-for="i in 4" :key="`featured-rail-skeleton-${i}`" />
                  </template>
                </div>
              </div>
            </article>

            <article class="rail-panel rail-panel--trends">
              <div class="rail-panel__content">
                <header class="section-header section-header--stage">
                  <div class="section-title">
                    <p class="section-kicker">{{ $t('home.trends.tagsTitle') }}</p>
                    <h2>{{ $t('home.trends.authorsTitle') }}</h2>
                    <p>{{ $t('home.trends.scheduleHint') }}</p>
                  </div>
                </header>

                <div class="trends-grid">
                  <div class="trends-card trends-card--authors glass-card">
                    <div class="trends-card__header">
                      <h3>{{ $t('home.trends.authorsTitle') }}</h3>
                      <RouterLink to="/authors" class="trends-link">
                        {{ $t('home.trends.authorsAction') }}
                      </RouterLink>
                    </div>
                    <div v-if="trendingAuthors.length > 0" class="trends-list">
                      <RouterLink
                        v-for="author in trendingAuthors"
                        :key="`trend-author-${author.key}`"
                        :to="author.link"
                        class="trend-author"
                      >
                        <img
                          v-if="author.avatar"
                          class="trend-author__avatar"
                          :src="author.avatar"
                          :alt="author.name"
                          loading="lazy"
                          decoding="async"
                        />
                        <div v-else class="trend-author__avatar trend-author__avatar--fallback">
                          <AnimatedIcon name="user" :fallback-icon="Users" size="sm" />
                        </div>
                        <div class="trend-author__meta">
                          <span class="trend-author__name">{{ author.name }}</span>
                          <span class="trend-author__count">
                            {{ $t('home.trends.authorCount', { n: author.count }) }}
                          </span>
                        </div>
                      </RouterLink>
                    </div>
                    <div v-else class="trends-empty">{{ $t('home.trends.authorsEmpty') }}</div>
                  </div>

                  <div class="trends-card trends-card--tags glass-card">
                    <div class="trends-card__header">
                      <h3>{{ $t('home.trends.tagsTitle') }}</h3>
                      <RouterLink to="/search" class="trends-link">
                        {{ $t('home.trends.tagsAction') }}
                      </RouterLink>
                    </div>
                    <div v-if="trendingTags.length > 0" class="trend-tags">
                      <RouterLink
                        v-for="tag in trendingTags"
                        :key="`trend-tag-${tag}`"
                        :to="{ name: 'search', query: { q: tag } }"
                        class="glass-tag trend-tag"
                      >
                        #{{ tag }}
                      </RouterLink>
                    </div>
                    <div v-else class="trends-empty">{{ $t('home.trends.tagsEmpty') }}</div>
                  </div>

                  <div class="trends-card trends-card--schedule glass-card">
                    <div class="trends-card__header">
                      <h3>{{ $t('home.trends.scheduleTitle') }}</h3>
                      <RouterLink to="/schedule" class="trends-link">
                        {{ $t('home.trends.scheduleAction') }}
                      </RouterLink>
                    </div>
                    <div class="schedule-cta">
                      <p>{{ $t('home.trends.scheduleHint') }}</p>
                      <Button
                        size="sm"
                        variant="secondary"
                        class="schedule-btn"
                        @click="goToSchedule"
                      >
                        <AnimatedIcon name="calendar" :fallback-icon="Calendar" size="sm" />
                        {{ $t('home.trends.scheduleAction') }}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <!-- Latest Posts -->
    <section
      ref="postsSectionRef"
      class="posts posts--bubble home-screen"
      :class="{ 'posts--revealed': hasTriggeredBubbleBurst }"
    >
      <div class="container">
        <header class="posts-header">
          <div class="posts-header__title">
            <h2>{{ $t('home.latest') }}</h2>
            <p class="posts-subtitle">{{ $t('home.latestSubtitle') }}</p>
          </div>
          <div class="posts-header__actions">
            <RouterLink to="/explore" class="section-link">
              <AnimatedIcon name="explore" :fallback-icon="ArrowUpRight" size="sm" />
              {{ $t('home.latestAction') }}
            </RouterLink>
            <span v-if="isLoading && posts.length > 0" class="spinner spinner-sm" />
          </div>
        </header>

        <div class="posts-toolbar">
          <div class="posts-toolbar__panel posts-toolbar__panel--tags">
            <span class="tags-label">{{ $t('home.tags.label') }}</span>
            <div v-if="trendingTags.length > 0" class="tags-list">
              <RouterLink
                v-for="tag in trendingTags"
                :key="`latest-tag-${tag}`"
                :to="{ name: 'search', query: { q: tag } }"
                class="glass-tag"
              >
                #{{ tag }}
              </RouterLink>
            </div>
            <span v-else class="tags-empty">{{ $t('home.tags.empty') }}</span>
          </div>

          <div class="posts-toolbar__panel posts-toolbar__panel--filters">
            <span class="filters-label">{{ $t('home.filters.label') }}</span>
            <div class="filters-list">
              <RouterLink
                v-for="filter in quickFilters"
                :key="`quick-filter-${filter.key}`"
                :to="filter.to"
                class="filter-pill"
              >
                {{ filter.label }}
              </RouterLink>
            </div>
          </div>
        </div>

        <StateIndicator
          v-if="error"
          variant="error"
          :description="error"
          @action="fetchLatestPosts"
        />

        <template v-else>
          <div class="bubble-stage">
            <div class="bubble-stage__origin" aria-hidden="true">
              <span class="bubble-stage__pulse" />
            </div>
            <div v-if="isLoading && bubbleItems.length === 0" class="bubble-empty glass-card">
              <span class="spinner spinner-sm" />
              <span>{{ $t('common.loading') }}</span>
            </div>
            <template v-else-if="bubbleItems.length > 0">
              <button
                v-for="(bubble, index) in bubbleItems"
                :key="`bubble-${bubble.post.id}-${index}`"
                type="button"
                class="latest-bubble glass-card"
                :style="bubble.style"
                @click="openPostPreview(bubble.post, bubble.thumbnail)"
              >
                <span class="latest-bubble__inner">
                  <span class="latest-bubble__text">{{ bubble.text }}</span>
                  <span class="latest-bubble__meta">
                    <span class="latest-bubble__author">{{ bubble.author }}</span>
                    <span v-if="bubble.time" class="latest-bubble__time">{{ bubble.time }}</span>
                  </span>
                </span>
              </button>
            </template>
            <div v-else class="bubble-empty glass-card">
              <span>{{ $t('common.noResults') }}</span>
            </div>
          </div>
        </template>
      </div>
    </section>

    <section ref="storyDeckRef" class="media-slices home-screen" :style="storySceneStyle">
      <div class="container story-stage">
        <header class="section-header section-header--stage">
          <div class="section-title">
            <p class="section-kicker">{{ $t('home.featured.kicker') }}</p>
            <h2>{{ $t('home.featured.title') }}</h2>
            <p>{{ $t('home.featured.subtitle') }}</p>
          </div>
          <div class="story-progress">
            <span>{{ String(activeStoryIndex + 1).padStart(2, '0') }}</span>
            <span>/</span>
            <span>{{ String(Math.max(storyCardCount, 1)).padStart(2, '0') }}</span>
          </div>
        </header>

        <div class="media-slice-list">
          <template v-if="storyCards.length > 0">
            <article
              v-for="(card, index) in storyCards"
              :key="`media-${card.post.id}`"
              class="media-slice"
              :class="{ 'is-active': activeStoryIndex === index }"
              :style="getStoryCardStyle(index)"
            >
              <div class="media-slice__sticky glass-card">
                <div class="media-slice__visual">
                  <PostCard
                    :post="card.post"
                    :priority="index === 0"
                    @click="(_id, thumb) => openPostPreview(card.post, thumb)"
                  />
                </div>
                <div class="media-slice__copy">
                  <p class="media-slice__eyebrow">{{ card.eyebrow }}</p>
                  <h3>{{ card.title }}</h3>
                  <p>{{ card.excerpt }}</p>
                  <div class="media-slice__meta">
                    <span class="media-slice__author">{{ card.author }}</span>
                    <span v-if="card.time" class="media-slice__time">{{ card.time }}</span>
                  </div>
                  <div class="media-slice__actions">
                    <Button
                      size="sm"
                      variant="primary"
                      class="media-slice__button"
                      @click="openPostPreview(card.post, card.thumbnail)"
                    >
                      <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="sm" />
                      {{ $t('home.featured.action') }}
                    </Button>
                    <RouterLink :to="card.detailLink" class="section-link media-slice__link">
                      <AnimatedIcon name="explore" :fallback-icon="ArrowUpRight" size="sm" />
                      {{ $t('home.latestAction') }}
                    </RouterLink>
                  </div>
                </div>
              </div>
            </article>
          </template>
          <div v-else class="media-empty glass-card">
            <span>{{ $t('common.noResults') }}</span>
          </div>
        </div>
      </div>
    </section>

    <div :ref="setSentinelRef" class="media-sentinel" aria-hidden="true">
      <span v-if="isLoadingMore" class="spinner spinner-sm" />
    </div>

    <PostPreviewModal
      v-model:isOpen="isPreviewOpen"
      :post-id="previewPostId"
      :initial-post="previewPost"
      :initial-thumbnail-src="previewThumbnailSrc"
      @open-detail="openDetailFromPreview"
    />

    <ScrollDownFab />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'HomePage' })

import {
  ref,
  computed,
  nextTick,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  watch,
  watchSyncEffect,
  useTemplateRef,
} from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ArrowUpRight,
  Calendar,
  Compass,
  Image,
  MessageSquare,
  Sparkles,
  Users,
} from 'lucide-vue-next'
import { useSettingsStore } from '@/stores'
import {
  postService,
  type PostListItem,
  ApiError,
  type ThumbnailQuality,
  normalizeAvatarUrl,
} from '@/api'
import { useCachedPostList } from '@/composables/useCachedPosts'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useForwardedElementRef } from '@/composables/useForwardedElementRef'
import { usePreferredPageSize } from '@/composables/usePreferredPageSize'
import { prefersReducedMotion } from '@/utils/performance'
import { isFilteredAuthor } from '@/config/filters'
import { storePostNavigationContext } from '@/utils/postNavigation'
import { normalizeToThumbnailUrl } from '@/utils/mediaOptimizer'
import { formatRelativeTime } from '@/utils/date'
import Button from '@/components/ui/Button.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import PostCard from '@/components/business/PostCard.vue'
import PostCardSkeleton from '@/components/business/PostCardSkeleton.vue'
import PostPreviewModal from '@/components/business/PostPreviewModal.vue'
import ScrollDownFab from '@/components/ui/ScrollDownFab.vue'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const router = useRouter()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const { t } = useI18n()

const shouldAnimate = computed(() => settings.value.enableAnimations && !prefersReducedMotion())

// Posts state
const posts = ref<PostListItem[]>([])
const allPosts = ref<PostListItem[]>([])

// Home click → preview modal
const isPreviewOpen = ref(false)
const previewPostId = ref<string | null>(null)
const previewThumbnailSrc = ref<string | null>(null)
const previewPost = ref<PostListItem | null>(null)

// Loading & error state
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)

// Pagination state
const page = ref(1)
const pageSize = usePreferredPageSize({ fallback: 20, min: 10, max: 50, mobileCap: 16 })

// 使用缓存感知的帖子列表加载
const { total, load: loadCachedPosts } = useCachedPostList<PostListItem>(
  async (params, config) => {
    const result = await postService.listPosts(
      params as Parameters<typeof postService.listPosts>[0],
      {
        ...config,
        skipErrorToast: true,
      }
    )
    return { data: result.items, total: result.total }
  },
  { revalidate: false } // 不自动后台更新，减少重复请求
)

// DOM refs
const postsSectionRef = useTemplateRef<HTMLElement>('postsSectionRef')
const featuredSectionRef = useTemplateRef<HTMLElement>('featuredSectionRef')
const storyDeckRef = useTemplateRef<HTMLElement>('storyDeckRef')
const { elementRef: sentinelRef, setElementRef: setSentinelRef } =
  useForwardedElementRef<HTMLElement>()

const hasMore = computed(() => posts.value.length < total.value)
const railProgress = ref(0)
const storyProgress = ref(0)
const hasTriggeredBubbleBurst = ref(false)

let featuredTrigger: ScrollTrigger | null = null
let storyTrigger: ScrollTrigger | null = null
let bubbleBurstTrigger: ScrollTrigger | null = null
let sceneSetupFrame: number | null = null
let sceneSetupQueued = false
let scenesEnabled = false
let sceneInteractionBound = false
let sceneScrollLockTimer: number | null = null
let sceneScrollLocked = false
let sceneResizeObserver: ResizeObserver | null = null
let sceneObservedSizes = new WeakMap<HTMLElement, { width: number; height: number }>()

type SceneStepKey = 'featured' | 'story'

const SCENE_INPUT_TOLERANCE = 18
const SCENE_SCROLL_LOCK_MS = 0.42 * 1000

const getResponsiveThumbnailQuality = (): ThumbnailQuality => {
  if (typeof window === 'undefined') return 'medium'
  const width = window.innerWidth
  if (width < 640) return 'medium'
  return 'large'
}

const featuredPosts = computed(() => allPosts.value.slice(0, 4))

const heroHighlightPosts = computed(() => {
  const source = allPosts.value.length > 0 ? allPosts.value : posts.value
  const withThumb = source.filter((post) => !!post.thumbnail_url)
  return (withThumb.length > 0 ? withThumb : source).slice(0, 5)
})

const heroHighlightCards = computed(() =>
  heroHighlightPosts.value.map((post) => ({
    post,
    thumbnail: normalizeToThumbnailUrl(post.thumbnail_url, 'medium'),
    title: formatHeroTitle(post),
    author: formatHeroAuthor(post),
  }))
)

const trendingTags = computed(() => {
  const tagCounts = new Map<string, number>()
  for (const post of allPosts.value) {
    const tags = post.tags ?? []
    for (const rawTag of tags) {
      const tag = normalizeTag(rawTag)
      if (!tag) continue
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }
  }
  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag)
})

const heroTags = computed(() => trendingTags.value.slice(0, 6))

const uniqueAuthorCount = computed(() => {
  const keys = new Set<string>()
  for (const post of allPosts.value) {
    const key =
      post.author_id || post.author_username || post.author_name || post.original_author_id || ''
    if (key) keys.add(key)
  }
  return keys.size
})

const trendingAuthors = computed(() => {
  const authorMap = new Map<
    string,
    { key: string; name: string; avatar: string | null; count: number; link: string }
  >()
  for (const post of allPosts.value) {
    const key =
      post.author_id || post.author_username || post.author_name || post.original_author_id || ''
    if (!key) continue
    const name = formatAuthorName(post)
    const avatar = normalizeAvatarUrl(post.author_avatar_url) || post.author_avatar_url || null
    const entry = authorMap.get(key)
    if (entry) {
      entry.count += 1
      if (!entry.name && name) entry.name = name
      if (!entry.avatar && avatar) entry.avatar = avatar
    } else {
      authorMap.set(key, {
        key,
        name: name || t('home.hero.fallbackAuthor'),
        avatar,
        count: 1,
        link: post.author_id ? `/author/${post.author_id}` : '/authors',
      })
    }
  }
  return Array.from(authorMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
})

const bubbleOrbits = Array.from({ length: 10 }, (_value, index) => ({
  angle: `${-108 + index * 36}deg`,
  radius: index % 2 === 0 ? 'clamp(10rem, 18vw, 14rem)' : 'clamp(13rem, 24vw, 18rem)',
  delay: `${(index * 0.08).toFixed(2)}s`,
}))

const textPosts = computed(() => allPosts.value.filter((post) => isTextPost(post)))
const mediaPosts = computed(() => allPosts.value.filter((post) => isMediaPost(post)))
const latestTextPost = computed(() => textPosts.value[0] ?? null)

const heroEditorialCard = computed(() => {
  const post = latestTextPost.value
  if (!post) return null

  const rawText = normalizeText(post.content ?? post.description ?? post.title)
  const rawTitle = normalizeText(post.title)
  const author = formatAuthorName(post) || t('home.hero.fallbackAuthor')
  const time = post.published_at ? formatRelativeTime(post.published_at, t) : ''

  return {
    title:
      rawTitle && rawTitle !== rawText
        ? rawTitle.length > 40
          ? `${rawTitle.slice(0, 40)}…`
          : rawTitle
        : author,
    text:
      rawText.length > 120 ? `${rawText.slice(0, 120)}…` : rawText || t('home.hero.fallbackTitle'),
    author,
    time,
  }
})

const bubbleItems = computed(() => {
  const items = textPosts.value.slice(0, bubbleOrbits.length)
  return items.map((post, index) => {
    const orbit = bubbleOrbits[index]
    const scale = 0.94 + (index % 3) * 0.06
    return {
      post,
      thumbnail: post.thumbnail_url ? normalizeToThumbnailUrl(post.thumbnail_url, 'medium') : null,
      text: formatBubbleText(post),
      author: formatAuthorName(post) || t('home.hero.fallbackAuthor'),
      time: post.published_at ? formatRelativeTime(post.published_at, t) : '',
      style: {
        '--bubble-angle': orbit.angle,
        '--bubble-radius': orbit.radius,
        '--bubble-delay': orbit.delay,
        '--bubble-scale': String(scale),
      } as Record<string, string>,
    }
  })
})

const storyCards = computed(() => {
  const source = mediaPosts.value.length > 0 ? mediaPosts.value : allPosts.value
  return source.slice(0, 5).map((post) => {
    const firstTag = normalizeTag(post.tags?.[0] ?? '')
    const author = formatAuthorName(post) || t('home.hero.fallbackAuthor')
    return {
      post,
      thumbnail: post.thumbnail_url ? normalizeToThumbnailUrl(post.thumbnail_url, 'large') : null,
      eyebrow: firstTag ? `#${firstTag}` : author,
      title: formatStoryTitle(post),
      excerpt: formatStoryExcerpt(post),
      author,
      time: post.published_at ? formatRelativeTime(post.published_at, t) : '',
      detailLink: `/post/${post.id}`,
    }
  })
})

const storyCardCount = computed(() => storyCards.value.length)
const storyTravel = computed(() => Math.max(storyCardCount.value - 1, 0))
const storyProgressIndex = computed(() => storyProgress.value * storyTravel.value)
const activeStoryIndex = computed(() =>
  storyCardCount.value > 1 ? Math.round(storyProgressIndex.value) : 0
)

const railSlides = computed(() => [
  { key: 'portal', label: t('home.portal.title') },
  { key: 'spotlight', label: t('home.hero.spotlightLabel') },
  { key: 'featured', label: t('home.featured.title') },
  { key: 'trends', label: t('home.trends.authorsTitle') },
])

const railSlideCount = computed(() => railSlides.value.length)
const activeRailIndex = computed(() =>
  railSlideCount.value > 1 ? Math.round(railProgress.value * (railSlideCount.value - 1)) : 0
)
const activeRailSlide = computed(
  () => railSlides.value[activeRailIndex.value] ?? railSlides.value[0]
)

const featuredSceneStyle = computed(() => ({
  '--rail-slide-count': String(Math.max(railSlideCount.value, 1)),
}))

const railTrackStyle = computed(() => ({
  transform: `translate3d(-${
    railProgress.value *
    Math.max(railSlideCount.value - 1, 0) *
    (100 / Math.max(railSlideCount.value, 1))
  }%, 0, 0)`,
}))

const storySceneStyle = computed(() => ({
  '--story-card-count': String(Math.max(storyCardCount.value, 1)),
  '--story-progress': String(storyProgress.value),
  '--story-footer-fade': String(clamp((storyProgress.value - 0.74) / 0.22)),
}))

const heroEditorialTitle = computed(
  () => heroHighlightCards.value[0]?.title || t('home.hero.editorialFallbackTitle')
)

const heroEditorialText = computed(() => {
  const author = heroHighlightCards.value[0]?.author || t('home.hero.fallbackAuthor')
  const tag = heroTags.value[0]
  return tag
    ? t('home.hero.editorialTextWithTag', { author, tag: `#${tag}` })
    : t('home.hero.editorialText', { author })
})

const heroSpotlightMeta = computed(() => {
  const author = heroHighlightCards.value[0]?.author || t('home.hero.fallbackAuthor')
  const tag = heroTags.value[0]
  return tag ? `${author} · #${tag}` : author
})

const heroStats = computed(() => [
  {
    key: 'updates',
    label: t('home.hero.stats.updates'),
    value: formatMetricValue(total.value || allPosts.value.length),
    note: t('home.hero.stats.updatesHint'),
  },
  {
    key: 'authors',
    label: t('home.hero.stats.authors'),
    value: formatMetricValue(uniqueAuthorCount.value),
    note: t('home.hero.stats.authorsHint'),
  },
  {
    key: 'tags',
    label: t('home.hero.stats.tags'),
    value: formatMetricValue(trendingTags.value.length),
    note: t('home.hero.stats.tagsHint'),
  },
])

const quickFilters = computed(() => [
  { key: 'newest', label: t('explore.newest'), to: { name: 'explore' } },
  {
    key: 'popular',
    label: t('explore.popular'),
    to: { name: 'explore', query: { sort: 'popular' } },
  },
  {
    key: 'trending',
    label: t('explore.trending'),
    to: { name: 'explore', query: { sort: 'trending' } },
  },
])

watchSyncEffect(() => {
  // 确保全量加载和分页加载状态不会并存，减少 UI 状态抖动。
  if (isLoading.value && isLoadingMore.value) {
    isLoadingMore.value = false
  }
})

onActivated(() => {
  scenesEnabled = true
  bindSceneInteractions()
  setupInitialPostsFetchTriggers()
  observeSceneLayout()
  scheduleSceneSetup()
})

onDeactivated(() => {
  scenesEnabled = false
  unbindSceneInteractions()
  disconnectSceneLayoutObserver()
  abortLatestPostsRequest()
  clearInitialPostsFetchTriggers()
  cleanupSceneTriggers()
  hasTriggeredBubbleBurst.value = false
})
let postsFetchObserver: IntersectionObserver | null = null
let initialPostsFetchTimer: number | null = null
let hasTriggeredInitialFetch = false
const INITIAL_POSTS_FETCH_DELAY_MS = 2200
let latestPostsController: AbortController | null = null
let latestPostsRequestToken = 0

function abortLatestPostsRequest() {
  latestPostsController?.abort()
  latestPostsController = null
}

function clearInitialPostsFetchTriggers() {
  if (postsFetchObserver) {
    postsFetchObserver.disconnect()
    postsFetchObserver = null
  }
  if (initialPostsFetchTimer !== null) {
    clearTimeout(initialPostsFetchTimer)
    initialPostsFetchTimer = null
  }
}

function triggerInitialPostsFetch() {
  if (hasTriggeredInitialFetch || posts.value.length > 0 || isLoading.value) return
  hasTriggeredInitialFetch = true
  clearInitialPostsFetchTriggers()
  void fetchLatestPosts()
}

function setupInitialPostsFetchTriggers() {
  if (hasTriggeredInitialFetch || posts.value.length > 0 || isLoading.value) return
  if (typeof window === 'undefined') {
    triggerInitialPostsFetch()
    return
  }
  const el = postsSectionRef.value
  if (el && 'IntersectionObserver' in window) {
    postsFetchObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          triggerInitialPostsFetch()
        }
      },
      { rootMargin: '600px 0px' }
    )
    postsFetchObserver.observe(el)
  }
  initialPostsFetchTimer = window.setTimeout(() => {
    triggerInitialPostsFetch()
  }, INITIAL_POSTS_FETCH_DELAY_MS)
}

async function fetchLatestPosts(reset = true): Promise<boolean> {
  const hadData = posts.value.length > 0

  if (reset) {
    abortLatestPostsRequest()
    isLoading.value = true
    page.value = 1
    if (!hadData) {
      posts.value = []
      allPosts.value = []
    }
  } else {
    if (isLoadingMore.value) return false
    isLoadingMore.value = true
  }

  error.value = null
  const controller = new AbortController()
  latestPostsController = controller
  const requestToken = ++latestPostsRequestToken

  const params = {
    page: page.value,
    page_size: pageSize.value,
    sort_by: 'published_at' as const,
    sort_order: 'desc' as const,
    thumbnail_quality: getResponsiveThumbnailQuality(),
  }

  try {
    // 使用缓存感知加载，避免重复请求
    const result = await loadCachedPosts(params, { signal: controller.signal })
    if (controller.signal.aborted || requestToken !== latestPostsRequestToken) return false
    const filtered = result.data.filter((p: PostListItem) => !isFilteredAuthor(p.author_name))

    if (reset) {
      posts.value = result.data
      allPosts.value = filtered
    } else {
      posts.value.push(...result.data)
      allPosts.value.push(...filtered)
    }
    return true
  } catch (err) {
    if (controller.signal.aborted || requestToken !== latestPostsRequestToken) return false
    if (posts.value.length === 0) {
      error.value = err instanceof ApiError ? err.message : t('common.error')
    }
    return false
  } finally {
    if (requestToken === latestPostsRequestToken) {
      isLoading.value = false
      isLoadingMore.value = false
      if (latestPostsController === controller) {
        latestPostsController = null
      }
      scheduleSceneSetup()
    }
  }
}

async function loadMore(): Promise<boolean> {
  if (!hasMore.value || isLoading.value || isLoadingMore.value) return false
  const nextPage = page.value + 1
  page.value = nextPage
  const ok = await fetchLatestPosts(false)
  if (!ok) page.value = nextPage - 1
  return ok
}

useInfiniteScroll(sentinelRef, loadMore, {
  rootMargin: '800px',
  enabled: () => hasMore.value && !isLoading.value && !isLoadingMore.value,
})

function normalizeTag(tag: string): string {
  return String(tag ?? '')
    .replace(/^#/, '')
    .trim()
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasMedia(post: PostListItem): boolean {
  if (post.thumbnail_url) return true
  if ((post.media_count ?? 0) > 0) return true
  if (post.media_type === 'video' || post.media_type === 'image') return true
  return false
}

function isTextPost(post: PostListItem): boolean {
  if (hasMedia(post)) return false
  const candidate = normalizeText(post.content ?? post.description ?? post.title)
  return Boolean(candidate)
}

function isMediaPost(post: PostListItem): boolean {
  return hasMedia(post)
}

function formatBubbleText(post: PostListItem): string {
  const candidate = normalizeText(post.content ?? post.description ?? post.title)
  if (!candidate) return t('home.hero.fallbackTitle')
  return candidate.length > 90 ? `${candidate.slice(0, 90)}…` : candidate
}

function formatStoryTitle(post: PostListItem): string {
  const candidate = normalizeText(post.title) || normalizeText(post.description)
  const fallback = t('home.hero.fallbackTitle')
  const text = candidate || fallback
  return text.length > 52 ? `${text.slice(0, 52)}…` : text
}

function formatStoryExcerpt(post: PostListItem): string {
  const candidate = normalizeText(post.description ?? post.content ?? post.title)
  if (!candidate) return t('home.hero.editorialFallbackTitle')
  return candidate.length > 160 ? `${candidate.slice(0, 160)}…` : candidate
}

function formatAuthorName(post: PostListItem): string {
  const name = normalizeText(post.author_name)
  if (name) return name
  const username = normalizeText(post.author_username)
  if (!username) return ''
  return username.startsWith('@') ? username : `@${username}`
}

function formatHeroTitle(post: PostListItem): string {
  const candidate = normalizeText(post.title) || normalizeText(post.description)
  const fallback = t('home.hero.fallbackTitle')
  const text = candidate || fallback
  return text.length > 28 ? `${text.slice(0, 28)}…` : text
}

function formatHeroAuthor(post: PostListItem): string {
  return formatAuthorName(post) || t('home.hero.fallbackAuthor')
}

function formatMetricValue(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
  }
  return String(Math.max(0, value))
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value))
}

function snapSceneProgress(progress: number, count: number): number {
  const safeProgress = clamp(progress)
  if (count <= 1) return safeProgress
  const maxIndex = count - 1
  return Math.round(safeProgress * maxIndex) / maxIndex
}

function resolveSceneProgress(element: HTMLElement | null): number {
  if (typeof window === 'undefined' || !element) return 0
  const travel = Math.max(element.offsetHeight - window.innerHeight, 1)
  const distance = window.scrollY - element.offsetTop
  return clamp(distance / travel)
}

function cleanupScrollTrigger(trigger: ScrollTrigger | null) {
  trigger?.animation?.kill()
  trigger?.kill()
}

function clearSceneScrollTween() {
  sceneScrollLocked = false
  if (typeof window === 'undefined' || sceneScrollLockTimer === null) return
  window.clearTimeout(sceneScrollLockTimer)
  sceneScrollLockTimer = null
}

function jumpToWindowY(top: number) {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  const body = document.body
  const previousRootBehavior = root.style.scrollBehavior
  const previousBodyBehavior = body.style.scrollBehavior

  root.style.scrollBehavior = 'auto'
  body.style.scrollBehavior = 'auto'
  window.scrollTo(0, top)
  root.scrollTop = top
  body.scrollTop = top

  window.requestAnimationFrame(() => {
    root.style.scrollBehavior = previousRootBehavior
    body.style.scrollBehavior = previousBodyBehavior
  })
}

function clearPinnedStageStyles(element: HTMLElement | null) {
  if (!element) return

  element.style.removeProperty('position')
  element.style.removeProperty('top')
  element.style.removeProperty('left')
  element.style.removeProperty('width')
  element.style.removeProperty('height')
  element.style.removeProperty('max-width')
  element.style.removeProperty('max-height')
  element.style.removeProperty('margin')
  element.style.removeProperty('padding')
  element.style.removeProperty('box-sizing')
  element.style.removeProperty('transform')
  element.style.removeProperty('translate')
  element.style.removeProperty('rotate')
  element.style.removeProperty('scale')
}

function isSceneActiveRange(element: HTMLElement | null): boolean {
  if (typeof window === 'undefined' || !element) return false
  const start = element.offsetTop
  const end = start + Math.max(element.offsetHeight - window.innerHeight, 0)
  const current = window.scrollY
  return current >= start - 1 && current <= end + 1
}

function getActiveSceneKey(): SceneStepKey | null {
  if (railSlideCount.value > 1 && isSceneActiveRange(featuredSectionRef.value)) return 'featured'
  if (storyCardCount.value > 1 && isSceneActiveRange(storyDeckRef.value)) return 'story'
  return null
}

function getSceneState(scene: SceneStepKey) {
  if (scene === 'featured') {
    return {
      element: featuredSectionRef.value,
      count: railSlideCount.value,
      index: activeRailIndex.value,
    }
  }

  return {
    element: storyDeckRef.value,
    count: storyCardCount.value,
    index: activeStoryIndex.value,
  }
}

function setSceneProgress(scene: SceneStepKey, index: number, count: number) {
  const progress = count > 1 ? index / (count - 1) : 0
  if (scene === 'featured') {
    railProgress.value = progress
    return
  }
  storyProgress.value = progress
}

function releaseScene(scene: SceneStepKey, direction: -1 | 1): boolean {
  if (typeof window === 'undefined') return false
  if (scene !== 'story' || direction < 0) return false

  const { element, count, index } = getSceneState(scene)
  if (!element || count <= 1) return false

  const edgeIndex = direction > 0 ? count - 1 : 0
  if (index !== edgeIndex) return false

  const sceneTravel = Math.max(element.offsetHeight - window.innerHeight, 0)
  const maxScrollY = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
  const targetY = Math.min(
    element.offsetTop + sceneTravel + Math.max(window.innerHeight * 0.65, 1),
    maxScrollY
  )

  setSceneProgress(scene, edgeIndex, count)

  clearPinnedStageStyles(storyDeckRef.value?.querySelector<HTMLElement>('.story-stage') ?? null)

  jumpToWindowY(targetY)

  window.setTimeout(() => {
    setSceneProgress(scene, edgeIndex, count)
  }, 120)

  return true
}

function animateSceneStep(scene: SceneStepKey, direction: -1 | 1): boolean {
  if (typeof window === 'undefined') return false

  const { element, count, index } = getSceneState(scene)
  if (!element || count <= 1) return false

  const nextIndex = Math.min(Math.max(index + direction, 0), count - 1)
  if (nextIndex === index) return false

  const targetY = element.offsetTop + nextIndex * window.innerHeight
  clearSceneScrollTween()
  sceneScrollLocked = true
  setSceneProgress(scene, nextIndex, count)
  jumpToWindowY(targetY)

  if (!shouldAnimate.value) {
    setSceneProgress(scene, nextIndex, count)
    sceneScrollLocked = false
    return true
  }

  sceneScrollLockTimer = window.setTimeout(() => {
    sceneScrollLockTimer = null
    sceneScrollLocked = false
    setSceneProgress(scene, nextIndex, count)
    jumpToWindowY(targetY)
  }, SCENE_SCROLL_LOCK_MS)

  return true
}

function handleSceneWheel(event: WheelEvent) {
  if (!scenesEnabled || typeof window === 'undefined') return
  if (Math.abs(event.deltaY) < SCENE_INPUT_TOLERANCE) return

  const scene = getActiveSceneKey()
  if (!scene) return

  if (sceneScrollLocked) {
    event.preventDefault()
    return
  }

  const { count, index } = getSceneState(scene)
  const direction = event.deltaY > 0 ? 1 : -1
  const edgeIndex = direction > 0 ? count - 1 : 0
  if (index === edgeIndex) {
    if (releaseScene(scene, direction)) {
      event.preventDefault()
    }
    return
  }

  if (animateSceneStep(scene, direction)) {
    event.preventDefault()
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return /^(input|textarea|select|button)$/i.test(target.tagName)
}

function handleSceneKeydown(event: KeyboardEvent) {
  if (!scenesEnabled) return
  if (event.defaultPrevented || isEditableTarget(event.target)) return

  let direction: -1 | 1 | null = null
  if (
    event.key === 'ArrowDown' ||
    event.key === 'PageDown' ||
    (!event.shiftKey && event.key === ' ')
  ) {
    direction = 1
  } else if (
    event.key === 'ArrowUp' ||
    event.key === 'PageUp' ||
    (event.shiftKey && event.key === ' ')
  ) {
    direction = -1
  }

  if (!direction) return

  const scene = getActiveSceneKey()
  if (!scene) return

  if (sceneScrollLocked) {
    event.preventDefault()
    return
  }

  const { count, index } = getSceneState(scene)
  const edgeIndex = direction > 0 ? count - 1 : 0
  if (index === edgeIndex) {
    if (releaseScene(scene, direction)) {
      event.preventDefault()
    }
    return
  }

  if (animateSceneStep(scene, direction)) {
    event.preventDefault()
  }
}

function bindSceneInteractions() {
  if (sceneInteractionBound || typeof window === 'undefined') return
  sceneInteractionBound = true
  window.addEventListener('wheel', handleSceneWheel, { passive: false })
  window.addEventListener('keydown', handleSceneKeydown)
}

function unbindSceneInteractions() {
  if (!sceneInteractionBound || typeof window === 'undefined') return
  sceneInteractionBound = false
  clearSceneScrollTween()
  window.removeEventListener('wheel', handleSceneWheel)
  window.removeEventListener('keydown', handleSceneKeydown)
}

function cancelScheduledSceneSetup() {
  sceneSetupQueued = false
  if (typeof window === 'undefined' || sceneSetupFrame === null) return
  window.cancelAnimationFrame(sceneSetupFrame)
  sceneSetupFrame = null
}

function cleanupSceneTriggers() {
  cancelScheduledSceneSetup()
  clearSceneScrollTween()
  cleanupScrollTrigger(featuredTrigger)
  cleanupScrollTrigger(storyTrigger)
  cleanupScrollTrigger(bubbleBurstTrigger)
  featuredTrigger = null
  storyTrigger = null
  bubbleBurstTrigger = null
}

function disconnectSceneLayoutObserver() {
  sceneResizeObserver?.disconnect()
  sceneResizeObserver = null
  sceneObservedSizes = new WeakMap()
}

function observeSceneLayout() {
  if (typeof window === 'undefined' || !('ResizeObserver' in window)) return

  disconnectSceneLayoutObserver()

  const trackedElements = [
    featuredSectionRef.value,
    postsSectionRef.value,
    storyDeckRef.value,
  ].filter((element): element is HTMLElement => Boolean(element))

  if (trackedElements.length === 0) return

  sceneResizeObserver = new ResizeObserver((entries) => {
    let shouldRefresh = false

    for (const entry of entries) {
      if (!(entry.target instanceof HTMLElement)) continue

      const nextSize = {
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      }
      const previousSize = sceneObservedSizes.get(entry.target)

      sceneObservedSizes.set(entry.target, nextSize)

      if (
        previousSize &&
        (previousSize.width !== nextSize.width || previousSize.height !== nextSize.height)
      ) {
        shouldRefresh = true
      }
    }

    if (shouldRefresh) {
      scheduleSceneSetup()
    }
  })

  for (const element of trackedElements) {
    sceneObservedSizes.set(element, {
      width: Math.round(element.getBoundingClientRect().width),
      height: Math.round(element.getBoundingClientRect().height),
    })
    sceneResizeObserver.observe(element)
  }
}

function setupSceneTriggers() {
  cleanupSceneTriggers()
  railProgress.value = snapSceneProgress(
    resolveSceneProgress(featuredSectionRef.value),
    railSlideCount.value
  )
  storyProgress.value = snapSceneProgress(
    resolveSceneProgress(storyDeckRef.value),
    storyCardCount.value
  )

  if (typeof window === 'undefined' || !scenesEnabled) return

  const featuredElement = featuredSectionRef.value
  const featuredStage = featuredElement?.querySelector<HTMLElement>('.rail-sticky') ?? null
  if (featuredElement) {
    featuredTrigger = ScrollTrigger.create({
      trigger: featuredElement,
      start: 'top top',
      end: 'bottom bottom',
      pin: featuredStage,
      pinSpacing: false,
      anticipatePin: 1,
      snap: false,
      invalidateOnRefresh: true,
      fastScrollEnd: true,
      onLeave: () => {
        railProgress.value = 1
      },
      onLeaveBack: () => {
        railProgress.value = 0
      },
      onUpdate: (self) => {
        railProgress.value = clamp(self.progress)
      },
      onRefresh: (self) => {
        railProgress.value = snapSceneProgress(self.progress, railSlideCount.value)
      },
    })
  }

  const storyElement = storyDeckRef.value
  const storyStage = storyElement?.querySelector<HTMLElement>('.story-stage') ?? null
  if (storyElement) {
    storyTrigger = ScrollTrigger.create({
      trigger: storyElement,
      start: 'top top',
      end: 'bottom bottom',
      pin: storyStage,
      pinSpacing: false,
      anticipatePin: 1,
      snap: false,
      invalidateOnRefresh: true,
      fastScrollEnd: true,
      onLeave: () => {
        storyProgress.value = 1
        clearPinnedStageStyles(storyStage)
      },
      onLeaveBack: () => {
        storyProgress.value = 0
        clearPinnedStageStyles(storyStage)
      },
      onUpdate: (self) => {
        storyProgress.value = clamp(self.progress)
      },
      onRefresh: (self) => {
        storyProgress.value = snapSceneProgress(self.progress, storyCardCount.value)
      },
    })
  }

  const postsElement = postsSectionRef.value
  if (postsElement && !hasTriggeredBubbleBurst.value) {
    bubbleBurstTrigger = ScrollTrigger.create({
      trigger: postsElement,
      start: 'top 72%',
      once: true,
      onEnter: () => {
        hasTriggeredBubbleBurst.value = true
      },
    })
  }

  ScrollTrigger.refresh()
}

function scheduleSceneSetup() {
  if (typeof window === 'undefined' || !scenesEnabled || sceneSetupQueued) return
  sceneSetupQueued = true
  void nextTick(() => {
    if (typeof window === 'undefined' || !scenesEnabled) {
      sceneSetupQueued = false
      return
    }
    sceneSetupFrame = window.requestAnimationFrame(() => {
      sceneSetupFrame = null
      sceneSetupQueued = false
      if (!scenesEnabled) return
      setupSceneTriggers()
    })
  })
}

function getStoryCardStyle(index: number): Record<string, string> {
  const offset = index - storyProgressIndex.value
  const distance = Math.abs(offset)
  const outro = index === storyCardCount.value - 1 ? clamp((storyProgress.value - 0.82) / 0.18) : 0
  const translateY = `${(Math.max(-2.6, Math.min(2.6, offset)) * 9.5 + outro * 7).toFixed(2)}rem`
  const translateZ = `${(-distance * 13 - outro * 4).toFixed(2)}rem`
  const rotateX = `${(offset > 0 ? -8.5 : 11) * Math.min(distance, 1.28) + outro * 5}deg`
  const rotateY = `${(-offset * 8.5).toFixed(2)}deg`
  const scale = Math.max(0.8, 1 - distance * 0.09 - outro * 0.05)
  const opacity = Math.max(0.28, 1 - distance * 0.2 - outro * 0.14)
  const blur = `${Math.max(0, distance - 0.5) * 0.28 + outro * 0.08}rem`
  const zIndex = String(Math.max(1, storyCardCount.value - Math.round(distance * 10)))

  return {
    '--story-translate-y': translateY,
    '--story-translate-z': translateZ,
    '--story-rotate-x': rotateX,
    '--story-rotate-y': rotateY,
    '--story-scale': String(scale),
    '--story-opacity': String(opacity),
    '--story-blur': blur,
    'z-index': zIndex,
  }
}

function goToExplore() {
  router.push('/explore')
}

function goToSchedule() {
  router.push('/schedule')
}

function scrollToFeatured() {
  featuredSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function openPostPreview(post: PostListItem, thumbnailSrc: string | null) {
  previewPostId.value = post.id
  previewPost.value = post
  previewThumbnailSrc.value = thumbnailSrc
  isPreviewOpen.value = true
}

function openDetailFromPreview(postId: string) {
  storePostNavigationContext(allPosts.value, postId, 'home')
  if (previewThumbnailSrc.value) {
    sessionStorage.setItem(`post-thumbnail-${postId}`, previewThumbnailSrc.value)
  }
  isPreviewOpen.value = false
  router.push(`/post/${postId}`)
}

watch(pageSize, () => {
  if (posts.value.length === 0 && !isLoading.value) return
  void fetchLatestPosts(true)
})

watch([railSlideCount, storyCardCount, () => bubbleItems.value.length, shouldAnimate], () => {
  scheduleSceneSetup()
})

onMounted(() => {
  scenesEnabled = true
  bindSceneInteractions()
  triggerInitialPostsFetch()
  setupInitialPostsFetchTriggers()
  observeSceneLayout()
  scheduleSceneSetup()
})

onBeforeUnmount(() => {
  scenesEnabled = false
  unbindSceneInteractions()
  disconnectSceneLayoutObserver()
  abortLatestPostsRequest()
  clearInitialPostsFetchTriggers()
  cleanupSceneTriggers()
})
</script>

<style scoped>
.home-page {
  position: relative;
  min-height: 100svh;
  min-height: 100dvh;
  --home-stage-safe-top: calc(var(--navbar-height, 4rem) + clamp(0.875rem, 1.8vw, 1.5rem));
  --home-blush-rgb: 246, 218, 229;
  --home-mist-rgb: 199, 220, 244;
  --home-lilac-rgb: 219, 211, 245;
  --home-ink: #1f2b44;
  --home-section-bg:
    radial-gradient(circle at top left, rgba(var(--home-mist-rgb), 0.42) 0%, transparent 34%),
    radial-gradient(circle at top right, rgba(var(--home-blush-rgb), 0.34) 0%, transparent 28%),
    radial-gradient(circle at 50% 18%, rgba(var(--home-lilac-rgb), 0.24) 0%, transparent 24%),
    linear-gradient(
      180deg,
      rgba(250, 247, 243, 0.98) 0%,
      rgba(245, 246, 251, 0.96) 52%,
      #f6f4f1 100%
    );
  --home-card-shadow: 0 1.25rem 3.5rem -2.25rem rgba(83, 103, 144, 0.35);
  --home-soft-border: rgba(255, 255, 255, 0.7);
  --home-pill-bg: rgba(255, 255, 255, 0.72);
  --home-pill-border: rgba(148, 163, 184, 0.16);
  --home-tag-hover: rgba(255, 255, 255, 0.9);
  --home-accent: #6a88b8;
  --home-accent-soft: #d792aa;
}

:global([data-theme='dark'] .home-page) {
  --home-section-bg:
    radial-gradient(circle at top left, rgba(var(--home-mist-rgb), 0.08) 0%, transparent 30%),
    radial-gradient(circle at top right, rgba(var(--home-blush-rgb), 0.08) 0%, transparent 24%),
    linear-gradient(180deg, rgba(8, 10, 18, 0.98) 0%, rgba(10, 13, 23, 0.96) 56%, #070910 100%);
  --home-card-shadow: 0 1.5rem 4rem -2rem rgba(0, 0, 0, 0.6);
  --home-soft-border: rgba(255, 255, 255, 0.08);
  --home-pill-bg: rgba(15, 20, 31, 0.76);
  --home-pill-border: rgba(255, 255, 255, 0.08);
  --home-tag-hover: rgba(18, 24, 38, 0.92);
  --home-ink: #f8fafc;
}

.home-page::before {
  content: '';
  position: fixed;
  inset: 0;
  background: var(--home-section-bg);
  pointer-events: none;
  z-index: 0;
}

.home-page::after {
  content: '';
  position: fixed;
  inset: 0;
  background: radial-gradient(
    circle at 50% 0%,
    rgba(var(--home-mist-rgb), 0.16) 0%,
    transparent 30%
  );
  pointer-events: none;
  z-index: 0;
  opacity: 0.6;
}

.home-screen {
  min-height: 100svh;
  min-height: 100dvh;
  box-sizing: border-box;
}

.home-fold {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  position: relative;
  z-index: 1;
}

.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-5);
}

.section-title {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.section-kicker {
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.section-header h2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin: 0;
}

.section-header p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
  max-width: 46ch;
}

.section-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-full);
  background: var(--home-pill-bg);
  border: 1px solid var(--home-pill-border);
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.section-link:hover {
  color: var(--color-text-primary);
  border-color: var(--home-soft-border);
  background: var(--home-tag-hover);
}

/* ========== Hero ========== */
.hero {
  position: relative;
  z-index: 1;
  min-height: 100dvh;
  padding-block: clamp(2rem, 6vh, 4rem);
  display: flex;
  align-items: center;
}

.hero::before {
  content: '';
  position: absolute;
  inset: -10% auto auto -6%;
  width: clamp(14rem, 30vw, 24rem);
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--home-blush-rgb), 0.24) 0%, transparent 72%);
  filter: blur(1rem);
  pointer-events: none;
}

.hero-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: clamp(1.5rem, 4vw, 3rem);
  align-items: center;
}

.hero-copy {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: var(--spacing-4);
  align-items: start;
  max-width: min(52rem, 100%);
}

.hero-copy__left,
.hero-copy__right {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.hero-copy__divider {
  align-self: stretch;
  width: 0.125rem;
  border-radius: var(--radius-full);
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(var(--color-primary-rgb), 0.35) 40%,
    rgba(var(--color-primary-rgb), 0.2) 60%,
    transparent 100%
  );
  opacity: 0.6;
}

.hero-kicker {
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--home-accent) 70%, var(--color-text-secondary));
}

.hero-title {
  font-size: clamp(2.25rem, 4vw + 0.75rem, 3.5rem);
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-weight: var(--font-bold);
  margin: 0;
  color: var(--home-ink);
}

.hero-subtitle {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  max-width: 44ch;
  line-height: 1.6;
}

.hero-editorial {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--spacing-2);
  max-width: 32rem;
  min-block-size: 12.5rem;
  padding: var(--spacing-4);
  border-color: var(--home-soft-border);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.66)),
    var(--home-pill-bg);
  box-shadow: var(--home-card-shadow);
  transition:
    opacity 260ms ease,
    transform 260ms ease;
}

.hero-editorial--loaded {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.hero-editorial__kicker {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.hero-editorial__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--home-accent) 0%, var(--home-accent-soft) 100%);
  box-shadow: 0 0 0.75rem rgba(215, 146, 170, 0.38);
}

.hero-editorial__title {
  font-size: var(--text-lg);
  line-height: 1.4;
  color: var(--color-text-primary);
}

.hero-editorial__text {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.hero-editorial__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.hero-editorial__author {
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
}

.hero-editorial__time {
  opacity: 0.84;
}

.hero-editorial__skeleton {
  display: block;
  inline-size: 100%;
  block-size: 0.875rem;
  border-radius: var(--radius-full);
}

.hero-editorial__skeleton--title {
  inline-size: 72%;
  block-size: 1.5rem;
}

.hero-editorial__skeleton--short {
  inline-size: 54%;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
  margin-top: var(--spacing-2);
}

.hero-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
}

.hero-tags__label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.hero-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.hero-tag {
  background: var(--home-pill-bg);
  border-color: var(--home-pill-border);
  text-decoration: none;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.hero-tag:hover {
  transform: translateY(-0.125rem);
  background: var(--home-tag-hover);
  border-color: var(--home-soft-border);
}

.hero-tags__empty {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-3);
}

.hero-stat {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: var(--spacing-3);
  min-height: 100%;
  border-color: var(--home-soft-border);
  box-shadow: var(--home-card-shadow);
}

.hero-stat__label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.hero-stat__value {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--home-ink);
}

.hero-stat__note {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.hero--animated .hero-copy__left {
  animation: heroSplitLeft 1.1s var(--ease-out) both;
}

.hero--animated .hero-copy__right {
  animation: heroSplitRight 1.1s var(--ease-out) both;
}

.hero--animated .hero-copy__divider {
  transform-origin: center;
  animation: heroSplitLine 1.1s var(--ease-out) both;
}

@keyframes heroSplitLeft {
  from {
    opacity: 0;
    transform: translateX(12%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes heroSplitRight {
  from {
    opacity: 0;
    transform: translateX(-12%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes heroSplitLine {
  from {
    opacity: 0;
    transform: scaleY(0.2);
  }
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

.hero-collage {
  position: relative;
  padding-bottom: var(--spacing-8);
}

.hero-collage-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-template-rows: repeat(6, minmax(0, 1fr));
  gap: var(--spacing-3);
  min-height: clamp(18rem, 40vh, 26rem);
}

.hero-collage-card {
  position: relative;
  padding: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  overflow: hidden;
  border-color: var(--home-soft-border);
  box-shadow: var(--home-card-shadow);
}

.hero-collage-card:focus-visible {
  outline: 0.125rem solid rgba(var(--color-primary-rgb), 0.7);
  outline-offset: 0.125rem;
}

.hero-collage-card:nth-child(1) {
  grid-column: 1 / span 4;
  grid-row: 1 / span 4;
}

.hero-collage-card:nth-child(2) {
  grid-column: 5 / span 2;
  grid-row: 1 / span 3;
}

.hero-collage-card:nth-child(3) {
  grid-column: 1 / span 3;
  grid-row: 5 / span 2;
}

.hero-collage-card:nth-child(4) {
  grid-column: 4 / span 3;
  grid-row: 4 / span 3;
}

.hero-collage-card:nth-child(5) {
  grid-column: 5 / span 2;
  grid-row: 4 / span 3;
}

.hero-collage-card--placeholder {
  border-radius: var(--radius-xl);
}

.hero-collage-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform var(--transition-base);
}

.hero-collage-card:hover .hero-collage-image {
  transform: scale(1.04);
}

.hero-collage-placeholder {
  height: 100%;
  width: 100%;
  display: grid;
  place-items: center;
  color: var(--color-text-tertiary);
  background: var(--glass-bg-light);
}

.hero-collage-overlay {
  position: absolute;
  inset: auto 0 0 0;
  padding: var(--spacing-3);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.55) 100%);
  color: var(--color-text-inverse);
}

.hero-collage-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.hero-collage-meta {
  font-size: var(--text-xs);
  opacity: 0.85;
}

.hero-spotlight {
  position: absolute;
  inset: auto 0 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: clamp(0.5rem, 1.2vw, 0.875rem);
  max-width: min(18rem, 75%);
  padding: var(--spacing-3) var(--spacing-4);
  transform: translateY(35%);
  border-color: var(--home-soft-border);
  box-shadow: var(--home-card-shadow);
}

.hero-spotlight__label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.hero-spotlight__title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.hero-spotlight__summary {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.65;
  color: var(--color-text-secondary);
}

.hero-spotlight__meta {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* ========== Rail ========== */
.rail {
  position: relative;
  z-index: 1;
  padding: clamp(2rem, 6vh, 4rem) 0;
  display: flex;
  flex-direction: column;
}

.rail > .container {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.rail-track {
  display: flex;
  align-items: stretch;
  gap: var(--spacing-4);
  overflow-x: auto;
  padding: var(--spacing-4) clamp(1.5rem, 4vw, 3.5rem);
  margin-inline: calc(50% - 50vw);
  flex: 1;
  min-height: 0;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: var(--spacing-4);
  scroll-snap-stop: always;
  overscroll-behavior-x: contain;
}

.rail-track::-webkit-scrollbar {
  height: 0.4rem;
}

.rail-track::-webkit-scrollbar-thumb {
  background: rgba(var(--color-primary-rgb), 0.2);
  border-radius: var(--radius-full);
}

.rail-item {
  flex: 0 0 100%;
  scroll-snap-align: start;
}

.rail-item--post {
  flex-basis: 100%;
}

.rail-item--trend {
  flex-basis: 100%;
}

.portal-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  min-height: 100%;
  border-color: var(--home-soft-border);
  box-shadow: var(--home-card-shadow);
}

.portal-card--primary {
  flex-basis: 100%;
}

.portal-card__icon {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--radius-lg);
  display: grid;
  place-items: center;
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.portal-card__icon--primary {
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-primary);
}

.portal-card__icon--authors {
  background: rgba(var(--color-warning-rgb), 0.12);
  color: var(--color-warning);
}

.portal-card__icon--schedule {
  background: rgba(var(--color-info-rgb), 0.12);
  color: var(--color-info);
}

.portal-card__icon--community {
  background: rgba(168, 85, 247, 0.12);
  color: #a855f7;
}

.portal-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  flex: 1;
}

.portal-card__body h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin: 0;
}

.portal-card__body p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.portal-card__arrow {
  align-self: flex-end;
  color: var(--color-text-tertiary);
  opacity: 0;
  transform: translate(-0.25rem, 0.25rem);
  transition: all var(--transition-fast);
}

.portal-card:hover .portal-card__arrow {
  opacity: 1;
  transform: translate(0, 0);
}

.trends-card {
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  border-color: var(--home-soft-border);
  box-shadow: var(--home-card-shadow);
}

.trends-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
}

.trends-card__header h3 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin: 0;
}

.trends-link {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-decoration: none;
}

.trends-link:hover {
  color: var(--color-text-primary);
}

.trends-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.trend-author {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: var(--color-text-primary);
  background: var(--glass-bg-subtle);
  border: 1px solid var(--glass-border-subtle);
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.trend-author:hover {
  background: var(--glass-bg-light);
  border-color: var(--glass-border);
}

.trend-author__avatar {
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 1px solid var(--glass-border);
}

.trend-author__avatar--fallback {
  display: grid;
  place-items: center;
  background: var(--glass-bg-light);
  color: var(--color-text-tertiary);
}

.trend-author__meta {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.trend-author__name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.trend-author__count {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.trend-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.trends-empty {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.schedule-cta {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.schedule-btn {
  align-self: flex-start;
}

/* ========== Posts Section ========== */
.posts {
  position: relative;
  padding: var(--spacing-8) 0 var(--spacing-12);
  z-index: 1;
  content-visibility: auto;
  contain-intrinsic-size: 120rem;
}

.posts-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.posts-header__title {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.posts-header h2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin: 0;
}

.posts-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.posts-header__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.posts-toolbar {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
  padding: var(--spacing-4);
  border-radius: var(--radius-2xl);
  background: var(--home-pill-bg);
  border: 1px solid var(--home-pill-border);
  box-shadow: var(--home-card-shadow);
}

.tags-row,
.filters-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.tags-label,
.filters-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.tags-list,
.filters-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.tags-empty {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  text-decoration: none;
  color: var(--color-text-secondary);
  border: 1px solid var(--home-pill-border);
  background: rgba(255, 255, 255, 0.66);
  transition: all var(--transition-fast);
}

.filter-pill:hover {
  color: var(--color-text-primary);
  border-color: var(--home-soft-border);
  background: var(--home-tag-hover);
}

.posts--bubble {
  padding: clamp(2rem, 6vh, 4rem) 0;
}

.posts--bubble > .container {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.bubble-stage {
  position: relative;
  margin-top: var(--spacing-6);
  flex: 1;
  min-height: clamp(24rem, 72svh, 40rem);
  border-radius: var(--radius-2xl);
  border: 1px solid var(--home-pill-border);
  background:
    radial-gradient(circle at 50% 0%, rgba(var(--home-mist-rgb), 0.18) 0%, transparent 55%),
    var(--home-pill-bg);
  overflow: hidden;
  box-shadow: var(--home-card-shadow);
}

.latest-bubble {
  position: absolute;
  left: 50%;
  top: 50%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  max-width: min(22rem, 78vw);
  padding: var(--spacing-3) var(--spacing-4);
  text-align: left;
  border-color: var(--home-soft-border);
  box-shadow: var(--home-card-shadow);
  transform: translate(calc(-50% + var(--bubble-x)), calc(-50% + var(--bubble-y)))
    scale(var(--bubble-scale, 1)) rotate(var(--bubble-rotate, 0deg));
  animation:
    bubbleOut 1.2s var(--bubble-delay, 0s) var(--ease-out) both,
    bubbleFloat 6s calc(var(--bubble-delay, 0s) + 1.2s) ease-in-out infinite;
}

.latest-bubble__text {
  font-size: var(--text-base);
  color: var(--color-text-primary);
  line-height: 1.5;
}

.latest-bubble__meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.latest-bubble__author {
  font-weight: var(--font-medium);
}

.latest-bubble__time {
  opacity: 0.8;
}

.bubble-empty {
  position: absolute;
  inset: var(--spacing-4);
  display: grid;
  place-items: center;
  text-align: center;
  gap: var(--spacing-2);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

@keyframes bubbleOut {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.6);
  }
  to {
    opacity: 1;
    transform: translate(calc(-50% + var(--bubble-x)), calc(-50% + var(--bubble-y)))
      scale(var(--bubble-scale, 1)) rotate(var(--bubble-rotate, 0deg));
  }
}

@keyframes bubbleFloat {
  0%,
  100% {
    transform: translate(calc(-50% + var(--bubble-x)), calc(-50% + var(--bubble-y)))
      scale(var(--bubble-scale, 1)) rotate(var(--bubble-rotate, 0deg)) translateY(0);
  }
  50% {
    transform: translate(calc(-50% + var(--bubble-x)), calc(-50% + var(--bubble-y)))
      scale(var(--bubble-scale, 1)) rotate(var(--bubble-rotate, 0deg)) translateY(-0.4rem);
  }
}

/* ========== Media Slices ========== */
.media-slices {
  position: relative;
  z-index: 1;
  padding: clamp(2rem, 6vh, 4rem) 0;
}

.media-slice-list {
  display: flex;
  flex-direction: column;
  gap: clamp(3rem, 12vh, 6rem);
}

.media-slice {
  min-height: 100dvh;
  display: flex;
  align-items: center;
}

.media-slice__sticky {
  position: sticky;
  top: clamp(1.5rem, 12vh, 5rem);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  max-width: min(40rem, 92vw);
  border-color: var(--home-soft-border);
  box-shadow: var(--home-card-shadow);
}

.media-slice__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.media-slice__author {
  font-weight: var(--font-medium);
}

.media-empty {
  padding: var(--spacing-6);
  text-align: center;
  color: var(--color-text-secondary);
}

@media (max-width: 1024px) {
  .hero-layout {
    grid-template-columns: 1fr;
  }

  .hero-copy {
    grid-template-columns: 1fr;
  }

  .hero-copy__divider {
    display: none;
  }

  .hero-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero-collage-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: none;
  }

  .hero-collage-card:nth-child(1),
  .hero-collage-card:nth-child(2),
  .hero-collage-card:nth-child(3),
  .hero-collage-card:nth-child(4),
  .hero-collage-card:nth-child(5) {
    grid-column: auto;
    grid-row: auto;
  }

  .hero-collage-card {
    grid-column: auto;
    grid-row: auto;
    min-height: clamp(7rem, 22vh, 10rem);
  }

  .hero-collage-card--primary {
    grid-column: span 2;
  }

  .hero-spotlight {
    position: static;
    max-width: none;
    margin-top: var(--spacing-4);
    transform: none;
  }

  .rail-item {
    flex-basis: 100%;
  }

  .rail-item--post {
    flex-basis: 100%;
  }
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .rail-track {
    gap: var(--spacing-3);
  }

  .portal-card--primary {
    flex-basis: min(22rem, 90vw);
  }

  .bubble-stage {
    min-height: clamp(20rem, 64svh, 30rem);
  }

  .latest-bubble {
    max-width: min(16rem, 80vw);
  }

  .media-slice__sticky {
    position: static;
    max-width: none;
  }
}

@media (max-width: 480px) {
  .posts-header {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-copy__left,
  .hero-copy__right,
  .hero-copy__divider,
  .latest-bubble {
    animation: none;
  }

  .latest-bubble {
    transform: translate(calc(-50% + var(--bubble-x)), calc(-50% + var(--bubble-y)))
      scale(var(--bubble-scale, 1)) rotate(var(--bubble-rotate, 0deg));
  }

  .hero-collage-image {
    transition: none;
  }
  .portal-card,
  .filter-pill,
  .section-link {
    transition: none;
  }
}

/* ========== Scroll Narrative Overrides ========== */
.hero {
  padding-block: clamp(4.5rem, 9vw, 7rem);
}

.hero-layout {
  display: flex;
  justify-content: center;
}

.hero-copy {
  max-inline-size: min(100%, 90rem);
  min-block-size: calc(100dvh - clamp(9rem, 18vw, 14rem));
  margin-inline: auto;
  align-items: center;
}

.hero-copy__left {
  max-inline-size: 34rem;
}

.hero-copy__line {
  margin: 0;
}

.hero--animated .hero-copy__left,
.hero--animated .hero-copy__right,
.hero--animated .hero-copy__divider {
  animation: none;
}

.hero--animated .hero-copy__line {
  opacity: 0;
  animation: heroLineStageIn 900ms cubic-bezier(0.2, 0.9, 0.25, 1) forwards;
}

.hero--animated .hero-copy__line--kicker {
  --hero-entry-x: 0rem;
  --hero-entry-y: -2.75rem;
  animation-delay: 0.08s;
}

.hero--animated .hero-copy__line--title {
  --hero-entry-x: -3.5rem;
  --hero-entry-y: 0rem;
  animation-delay: 0.16s;
}

.hero--animated .hero-copy__line--subtitle {
  --hero-entry-x: 2.75rem;
  --hero-entry-y: 2.5rem;
  animation-delay: 0.28s;
}

.hero--animated .hero-copy__right > * {
  opacity: 0;
  animation: heroMetaRise 820ms cubic-bezier(0.2, 0.9, 0.25, 1) forwards;
}

.hero--animated .hero-copy__right > :nth-child(1) {
  animation-delay: 0.34s;
}

.hero--animated .hero-copy__right > :nth-child(2) {
  animation-delay: 0.44s;
}

.hero--animated .hero-copy__right > :nth-child(3) {
  animation-delay: 0.54s;
}

.hero--animated .hero-copy__right > :nth-child(4) {
  animation-delay: 0.62s;
}

.rail {
  min-block-size: calc(var(--rail-slide-count, 1) * 100dvh);
  padding: 0;
}

.rail-sticky {
  position: relative;
  block-size: 100dvh;
  overflow: clip;
}

.rail-stage {
  position: relative;
  block-size: 100%;
}

.rail-stage__chrome {
  position: absolute;
  inset-block-start: var(--home-stage-safe-top);
  inset-inline: clamp(1rem, 3vw, 2.5rem);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.rail-stage__eyebrow,
.story-progress {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.54);
  border: 0.0625rem solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(1rem);
}

.rail-stage__index {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.12em;
}

.rail-stage__label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.rail-stage__dots {
  display: inline-flex;
  gap: 0.5rem;
}

.rail-stage__dot {
  inline-size: 2rem;
  block-size: 0.1875rem;
  border-radius: var(--radius-full);
  background: rgba(var(--color-primary-rgb), 0.18);
  transition:
    transform var(--transition-fast),
    background-color var(--transition-fast);
}

.rail-stage__dot.is-active {
  transform: scaleX(1.1);
  background: linear-gradient(135deg, var(--home-accent) 0%, var(--home-accent-soft) 100%);
}

.rail-track {
  display: flex;
  inline-size: calc(var(--rail-slide-count, 1) * 100%);
  block-size: 100%;
  gap: 0;
  overflow: visible;
  padding: 0;
  margin: 0;
  scroll-snap-type: none;
  will-change: transform;
  transition: transform 360ms cubic-bezier(0.2, 0.9, 0.25, 1);
}

.rail-track::-webkit-scrollbar {
  display: none;
}

.rail-panel {
  flex: 0 0 calc(100% / var(--rail-slide-count, 1));
  block-size: 100%;
  display: grid;
  padding: calc(var(--home-stage-safe-top) + clamp(3rem, 4.8vw, 4.5rem)) clamp(1rem, 3vw, 2.5rem)
    clamp(2rem, 4vw, 3rem);
  overflow: clip;
}

.rail-panel__content {
  inline-size: min(100%, 90rem);
  block-size: 100%;
  margin-inline: auto;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  align-content: stretch;
  min-block-size: 0;
  gap: clamp(1.5rem, 3vw, 2.5rem);
  overflow: clip;
}

.section-header--stage {
  margin-block-end: clamp(1.5rem, 3vw, 2.5rem);
}

.rail-panel__meta {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.portal-grid,
.trends-grid,
.rail-featured-grid {
  gap: clamp(1rem, 2.2vw, 1.5rem);
}

.portal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.rail-panel--portal .portal-grid {
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
  grid-template-rows: repeat(3, minmax(0, 1fr));
}

.rail-panel--portal .portal-card--primary {
  grid-row: 1 / span 3;
  min-block-size: 100%;
}

.rail-panel--portal .portal-card:nth-child(2) {
  grid-row: 1;
}

.rail-panel--portal .portal-card:nth-child(3) {
  grid-row: 2;
}

.rail-panel--portal .portal-card:nth-child(4) {
  grid-row: 3;
}

.portal-card {
  min-height: clamp(14rem, 24vw, 18rem);
}

.rail-highlight {
  display: grid;
  grid-template-columns: minmax(0, 1.28fr) minmax(18rem, 0.72fr);
  gap: clamp(1rem, 2vw, 1.5rem);
  align-items: stretch;
  min-block-size: 0;
}

.hero-collage {
  display: block;
}

.rail-highlight > .hero-collage {
  block-size: 100%;
  min-block-size: 0;
  padding-bottom: 0;
}

.rail-highlight .hero-collage-grid {
  block-size: 100%;
  min-height: 0;
}

.rail-highlight > .hero-spotlight {
  position: relative;
  inset: auto;
  align-self: stretch;
  min-block-size: 100%;
  max-width: none;
  margin: 0;
  transform: none;
  padding: clamp(1.25rem, 2.5vw, 2rem);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.74) 0%, rgba(255, 255, 255, 0.94) 100%),
    var(--home-pill-bg);
}

.rail-featured-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.rail-panel--featured .rail-featured-grid {
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  grid-template-rows: repeat(2, minmax(0, 1fr));
}

.rail-panel--featured .rail-featured-grid > :first-child {
  grid-row: 1 / span 2;
}

.trends-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.rail-panel--trends .trends-grid {
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr) minmax(0, 0.92fr);
  align-items: stretch;
}

.trends-card {
  display: grid;
  align-content: start;
  gap: var(--spacing-4);
  min-block-size: clamp(19rem, 34vw, 28rem);
}

.trends-card--tags {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.74)),
    var(--home-pill-bg);
}

.trends-empty {
  display: grid;
  place-items: center;
  min-block-size: 100%;
  color: var(--color-text-tertiary);
  text-align: center;
}

.posts--bubble {
  display: flex;
  align-items: center;
  padding-block: clamp(4rem, 7vw, 6rem);
}

.posts-header {
  margin-block-end: clamp(1rem, 2vw, 1.5rem);
}

.posts-toolbar {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: clamp(0.875rem, 1.8vw, 1.25rem);
  margin-bottom: 0;
  padding: clamp(0.875rem, 1.6vw, 1.25rem);
  border-radius: clamp(1.25rem, 2vw, 1.75rem);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.62)),
    var(--home-pill-bg);
  border: 1px solid rgba(255, 255, 255, 0.48);
  box-shadow: var(--home-card-shadow);
  overflow: clip;
}

.posts-toolbar::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 12% 50%, rgba(var(--home-mist-rgb), 0.2), transparent 42%),
    radial-gradient(circle at 88% 50%, rgba(var(--home-blush-rgb), 0.18), transparent 40%);
  pointer-events: none;
}

.posts-toolbar__panel {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.5rem;
  align-content: start;
  padding: 0.875rem 1rem;
  border-radius: 1.25rem;
  background: rgba(255, 255, 255, 0.4);
  border: 0.0625rem solid rgba(255, 255, 255, 0.34);
}

.posts-toolbar__panel--tags {
  min-inline-size: 0;
}

.posts-toolbar__panel--filters {
  justify-self: start;
  justify-items: start;
  inline-size: fit-content;
  max-inline-size: min(100%, 24rem);
}

.bubble-stage {
  position: relative;
  margin-top: clamp(1.25rem, 2.6vw, 1.75rem);
  min-height: min(68dvh, 42rem);
  border-radius: var(--radius-2xl);
  background:
    radial-gradient(circle at center, rgba(255, 255, 255, 0.34) 0%, transparent 22rem),
    radial-gradient(circle at center, rgba(var(--home-mist-rgb), 0.2) 0%, transparent 30rem),
    linear-gradient(160deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04));
  isolation: isolate;
  overflow: clip;
}

.bubble-stage::before,
.bubble-stage::after {
  content: '';
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 50%;
  border-radius: 50%;
  pointer-events: none;
}

.bubble-stage::before {
  inline-size: clamp(8rem, 18vw, 14rem);
  block-size: clamp(8rem, 18vw, 14rem);
  background: radial-gradient(circle, rgba(255, 255, 255, 0.48), transparent 72%);
  transform: translate3d(-50%, -50%, 0);
  opacity: 0.9;
}

.bubble-stage::after {
  inline-size: clamp(20rem, 48vw, 34rem);
  block-size: clamp(20rem, 48vw, 34rem);
  background: conic-gradient(
    from 0deg,
    rgba(var(--home-mist-rgb), 0.08),
    rgba(var(--home-blush-rgb), 0.16),
    rgba(var(--home-lilac-rgb), 0.1),
    rgba(var(--home-mist-rgb), 0.08)
  );
  transform: translate3d(-50%, -50%, 0) rotate(12deg);
  filter: blur(2rem);
  opacity: 0.64;
}

.bubble-stage__origin {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 50%;
  inline-size: clamp(4rem, 8vw, 6rem);
  block-size: clamp(4rem, 8vw, 6rem);
  transform: translate3d(-50%, -50%, 0);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.72) 0%,
    rgba(255, 255, 255, 0.16) 62%,
    transparent 100%
  );
  filter: blur(0.1rem);
}

.bubble-stage__pulse {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  border-radius: inherit;
  animation: bubbleOriginBreath 3.6s ease-in-out infinite;
}

.latest-bubble {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 50%;
  background: transparent;
  border: 0;
  box-shadow: none;
  padding: 0;
  max-width: none;
  transform: translate3d(-50%, -50%, 0) rotate(var(--bubble-angle)) translateX(0rem)
    rotate(calc(var(--bubble-angle) * -1)) scale(0.24);
  animation: none;
  opacity: 0;
}

.latest-bubble::after {
  content: '';
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 50%;
  inline-size: clamp(0.95rem, 1.8vw, 1.2rem);
  block-size: clamp(0.95rem, 1.8vw, 1.2rem);
  border-radius: 0 0 0.25rem 0;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 0.65rem 1.8rem rgba(15, 23, 42, 0.12);
  transform: translate3d(-50%, -50%, 0) rotate(calc(var(--bubble-angle) + 180deg)) translateX(1rem)
    rotate(45deg);
}

.latest-bubble__inner {
  display: grid;
  gap: 0.625rem;
  max-inline-size: min(22ch, 20rem);
  padding: 0.875rem 1rem;
  border-radius: clamp(1rem, 2vw, 1.4rem);
  border: 0.0625rem solid rgba(255, 255, 255, 0.54);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 1.5rem 3rem -1.8rem rgba(40, 58, 89, 0.42);
  text-shadow: 0 0.5rem 1.5rem rgba(15, 23, 42, 0.12);
}

.latest-bubble__text {
  font-size: clamp(1rem, 1.55vw, 1.35rem);
  font-weight: var(--font-semibold);
  line-height: 1.5;
  text-wrap: pretty;
}

.posts--revealed .latest-bubble {
  animation: bubbleBurstFromCenter 980ms cubic-bezier(0.16, 0.88, 0.22, 1) forwards;
  animation-delay: var(--bubble-delay, 0s);
}

.posts--revealed .latest-bubble__inner {
  animation: bubbleTextDrift 6s ease-in-out infinite;
  animation-delay: calc(1s + var(--bubble-delay, 0s));
}

.media-slices {
  min-block-size: calc(var(--story-card-count, 1) * 100dvh);
  padding: 0;
}

.story-stage {
  position: relative;
  block-size: 100dvh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: clamp(1rem, 2.2vw, 1.5rem);
  padding-block: calc(var(--home-stage-safe-top) + clamp(1.75rem, 3vw, 2.5rem))
    clamp(1.5rem, 3vw, 2.5rem);
  overflow: clip;
}

.media-slices::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  block-size: min(28dvh, 18rem);
  background: linear-gradient(180deg, rgba(246, 244, 241, 0), rgba(246, 244, 241, 0.92));
  opacity: var(--story-footer-fade, 0);
  pointer-events: none;
}

.media-slice-list {
  position: relative;
  block-size: 100%;
  min-block-size: 0;
  gap: 0;
  perspective: 96rem;
  transform-style: preserve-3d;
}

.media-slice {
  position: absolute;
  inset: 0;
  block-size: 100%;
  min-height: 0;
  display: block;
  transform-origin: 50% 82%;
  opacity: var(--story-opacity, 1);
  transform: translate3d(0, var(--story-translate-y, 0rem), var(--story-translate-z, 0rem))
    rotateX(var(--story-rotate-x, 0deg)) rotateY(var(--story-rotate-y, 0deg))
    scale(var(--story-scale, 1));
  filter: blur(var(--story-blur, 0rem));
  transition:
    transform 220ms linear,
    opacity 220ms linear,
    filter 220ms linear;
  pointer-events: none;
}

.media-slice.is-active {
  pointer-events: auto;
}

.media-slice__sticky {
  position: relative;
  top: auto;
  max-width: min(100%, 84rem);
  min-height: min(70dvh, 44rem);
  margin-inline: auto;
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(18rem, 0.8fr);
  gap: clamp(1rem, 2vw, 1.5rem);
  padding: clamp(1.25rem, 2vw, 1.5rem);
  border: 0.0625rem solid rgba(255, 255, 255, 0.54);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.58)),
    var(--home-pill-bg);
  box-shadow: 0 2rem 4.5rem -2.4rem rgba(35, 53, 85, 0.48);
  backdrop-filter: blur(1.25rem);
}

.media-slice__visual,
.media-slice__copy {
  min-height: 0;
}

.media-slice__copy {
  display: grid;
  align-content: center;
  gap: 1rem;
}

.media-slice__eyebrow {
  margin: 0;
  font-size: var(--text-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.media-slice__copy h3 {
  margin: 0;
  font-size: clamp(1.5rem, 2.2vw, 2rem);
  line-height: 1.1;
}

.media-slice__copy > p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.65;
}

.media-slice__meta {
  justify-content: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.media-slice__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.media-slice__link {
  color: var(--color-text-primary);
}

.media-empty {
  position: relative;
  display: grid;
  place-items: center;
  min-height: min(62dvh, 30rem);
}

.media-sentinel {
  min-height: 4rem;
  display: grid;
  place-items: center;
  color: var(--color-text-secondary);
}

@keyframes heroLineStageIn {
  from {
    opacity: 0;
    filter: blur(0.75rem);
    transform: translate3d(var(--hero-entry-x), var(--hero-entry-y), 0);
  }

  to {
    opacity: 1;
    filter: blur(0rem);
    transform: translate3d(0, 0, 0);
  }
}

@keyframes heroMetaRise {
  from {
    opacity: 0;
    transform: translate3d(0, 1.75rem, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes bubbleBurstFromCenter {
  0% {
    opacity: 0;
    transform: translate3d(-50%, -50%, 0) rotate(var(--bubble-angle)) translateX(0rem)
      rotate(calc(var(--bubble-angle) * -1)) scale(0.16);
  }

  58% {
    opacity: 1;
    transform: translate3d(-50%, -50%, 0) rotate(var(--bubble-angle))
      translateX(calc(var(--bubble-radius) * 0.74)) rotate(calc(var(--bubble-angle) * -1))
      scale(calc(var(--bubble-scale, 1) * 1.06));
  }

  100% {
    opacity: 1;
    transform: translate3d(-50%, -50%, 0) rotate(var(--bubble-angle))
      translateX(var(--bubble-radius)) rotate(calc(var(--bubble-angle) * -1))
      scale(var(--bubble-scale, 1));
  }
}

@keyframes bubbleTextDrift {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(0, -0.85rem, 0);
  }
}

@keyframes bubbleOriginBreath {
  0%,
  100% {
    transform: scale(0.86);
    opacity: 0.6;
  }

  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

@media (max-width: 1200px) {
  .rail-highlight,
  .media-slice__sticky {
    grid-template-columns: minmax(0, 1fr);
  }

  .posts-toolbar {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 1024px) {
  .hero-copy {
    grid-template-columns: 1fr;
    min-block-size: auto;
  }

  .portal-grid,
  .rail-featured-grid,
  .trends-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .rail-panel--portal .portal-grid,
  .rail-panel--featured .rail-featured-grid,
  .rail-panel--trends .trends-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: none;
  }

  .rail-panel--portal .portal-card--primary,
  .rail-panel--featured .rail-featured-grid > :first-child {
    grid-row: auto;
    min-block-size: clamp(15rem, 30vw, 20rem);
  }

  .trends-card {
    min-block-size: auto;
  }
}

@media (max-width: 768px) {
  .rail-stage__chrome,
  .section-header,
  .posts-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .rail-stage__dot {
    inline-size: 1.75rem;
  }

  .bubble-stage {
    min-height: 34rem;
  }

  .latest-bubble__inner {
    max-inline-size: min(18ch, 12rem);
  }

  .posts-toolbar__panel {
    padding: 0.75rem 0.875rem;
  }

  .hero-editorial {
    min-block-size: 10.5rem;
  }
}

@media (max-width: 560px) {
  .hero-actions,
  .media-slice__actions {
    inline-size: 100%;
  }

  .hero-btn,
  .media-slice__button {
    inline-size: 100%;
  }

  .bubble-stage {
    min-height: 30rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero--animated .hero-copy__line,
  .hero--animated .hero-copy__right > *,
  .posts--revealed .latest-bubble,
  .posts--revealed .latest-bubble__inner,
  .bubble-stage__pulse {
    animation: none;
  }

  .rail-track {
    transition: none;
  }

  .latest-bubble {
    opacity: 1;
    transform: translate3d(-50%, -50%, 0) rotate(var(--bubble-angle))
      translateX(var(--bubble-radius)) rotate(calc(var(--bubble-angle) * -1))
      scale(var(--bubble-scale, 1));
  }

  .media-slice {
    transition: none;
  }
}
</style>
