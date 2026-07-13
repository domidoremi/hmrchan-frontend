<template>
  <div class="hmr-route-page hmr-route-page--home">
    <header class="hmr-home-hero">
      <div class="hmr-home-hero-grid">
        <div class="hmr-home-hero-copy">
          <h1 class="hmr-title" data-hmr-text-reveal>
            <span class="hmr-title-line">MomiChan</span>
            <span class="hmr-title-line">媒体入口</span>
          </h1>
          <div class="hmr-home-platform-strip" aria-hidden="true">
            <span
              v-for="item in platformItems"
              :key="item"
              :style="{ '--hmr-platform-name': cssContent(item) }"
            >
            </span>
          </div>
          <div class="hmr-actions">
            <RouterLink class="hmr-cta" to="/explore">探索媒体</RouterLink>
            <RouterLink class="hmr-text-link" to="/community">社区讨论</RouterLink>
          </div>
        </div>

        <div class="hmr-home-hero-media">
          <RouterLink
            v-if="shouldRenderStaticHeroCard && displayHeroPost"
            class="hmr-project-card hmr-post-card hmr-post-card--hero hmr-post-card--real-poster is-linked hmr-home-static-hero-card"
            to="/explore"
            data-platform="tiktok"
            :style="staticHeroCardStyle"
          >
            <div class="hmr-project-media hmr-post-card__visual">
              <HmrPriorityImage
                class="hmr-post-card__poster"
                :src="STATIC_HOME_PRERENDER_IMAGE.href"
                :srcset="STATIC_HOME_PRERENDER_IMAGE.srcset"
                :sizes="STATIC_HOME_PRERENDER_IMAGE.sizes"
                :alt="displayHeroPost.title"
                loading="eager"
                fetch-priority="high"
              />
              <div class="hmr-post-card__shade" aria-hidden="true"></div>
              <div
                class="hmr-post-card__badge-row"
                :style="staticHeroBadgeStyle"
                aria-hidden="true"
              >
                <span class="hmr-post-card__badge"></span>
                <span class="hmr-post-card__badge hmr-post-card__badge--solid"></span>
              </div>
              <div class="hmr-post-card__stats" :style="staticHeroStatsStyle" aria-hidden="true">
                <span></span>
                <span></span>
              </div>
              <span
                class="hmr-post-card__platform-mark"
                :style="staticHeroPlatformMarkStyle"
                aria-hidden="true"
              >
              </span>
              <span class="hmr-post-card__play" aria-hidden="true">
                <span></span>
              </span>
              <div class="hmr-home-static-hero-caption" aria-hidden="true">
                <span class="hmr-home-static-hero-caption__eyebrow">{{ displayHeroPost.tag }}</span>
                <strong>{{ displayHeroPost.title }}</strong>
                <p>{{ displayHeroPost.authorName }} · {{ displayHeroPost.createdAt }}</p>
              </div>
            </div>
            <div class="hmr-project-info hmr-post-card__content">
              <p class="hmr-meta hmr-post-card__meta">
                <span>{{ displayHeroPost.authorName }}</span>
                <span>{{ displayHeroPost.createdAt }}</span>
              </p>
              <h3 class="hmr-card-title">{{ displayHeroPost.title }}</h3>
              <p class="hmr-body hmr-post-card__excerpt">{{ displayHeroPost.excerpt }}</p>
            </div>
          </RouterLink>
          <HmrPostCard
            v-else-if="heroPost"
            :post="heroPost"
            variant="hero"
            :show-footer="false"
            image-loading="eager"
            image-fetch-priority="high"
          />
          <div v-else class="hmr-media-skeleton hmr-media-skeleton--hero" aria-hidden="true"></div>
        </div>
      </div>
    </header>

    <section class="hmr-section hmr-section--tight hmr-home-featured" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-works-header">
          <div class="hmr-works-header-main">
            <p class="hmr-kicker">最新</p>
            <h2 class="hmr-section-title">最新媒体</h2>
          </div>
          <RouterLink class="hmr-text-link" to="/explore">全部</RouterLink>
        </div>

        <div
          v-if="secondaryFeaturedPosts.length"
          class="hmr-featured-grid hmr-featured-grid--cinematic"
        >
          <HmrPostCard
            v-for="(post, index) in secondaryFeaturedPosts"
            :key="`featured-${post.id}-${index}`"
            :post="post"
            :index="index"
            :to="`/posts/${post.id}`"
            variant="grid"
          />
        </div>
        <div v-else class="hmr-featured-grid hmr-featured-grid--cinematic">
          <HmrPostCard
            v-for="(post, index) in homePreviewFeaturedPosts"
            :key="post.id"
            :post="post"
            :index="index"
            to="/explore"
            variant="grid"
          />
        </div>
      </div>
    </section>

    <section class="hmr-dark-stage hmr-dark-stage--home" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head hmr-section-head--split">
          <div>
            <p class="hmr-kicker">社区</p>
            <h2 class="hmr-section-title">正在讨论</h2>
          </div>
          <span class="hmr-state-line">{{ homeDiscussionStatus }}</span>
        </div>
        <div v-if="content.highlights.length" class="hmr-home-discussion-grid">
          <RouterLink
            v-for="item in content.highlights.slice(0, 3)"
            :key="item.id"
            class="hmr-home-discussion-card"
            :to="item.target ?? '/community'"
          >
            <span>{{ item.metric }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.excerpt }}</p>
          </RouterLink>
        </div>
        <div v-else class="hmr-home-discussion-grid">
          <RouterLink
            v-for="item in homePreviewHighlights"
            :key="item.id"
            class="hmr-home-discussion-card hmr-home-discussion-card--preview"
            :to="item.target ?? '/community'"
          >
            <span>{{ item.metric }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.excerpt }}</p>
          </RouterLink>
        </div>
        <RouterLink class="hmr-text-link hmr-text-link--light" to="/community">
          进入社区
        </RouterLink>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-home-schedule-panel">
          <div>
            <p class="hmr-kicker">日程</p>
            <h2 class="hmr-section-title">今日窗口</h2>
          </div>
          <div v-if="content.scheduleHighlights.length" class="hmr-home-schedule-list">
            <article v-for="item in content.scheduleHighlights.slice(0, 3)" :key="item.id">
              <span>{{ item.time }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.description }}</p>
            </article>
          </div>
          <div v-else class="hmr-home-schedule-list">
            <article v-for="item in homePreviewSchedule" :key="item.id">
              <span>{{ item.time }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.description }}</p>
            </article>
          </div>
          <RouterLink class="hmr-cta" to="/schedule">查看日程</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'

import {
  loadHomeContentResource,
  loadHomePrimaryContentResource,
  type HmrCommunityItem,
  type HmrHomeContent,
  type HmrPost,
} from '@/api/hmrContent'
import { shouldUseApiFallback } from '@/api/runtimeFlags'
import { STATIC_HOME_PRERENDER_IMAGE } from '@/fallbacks/generated/homePrerenderManifest'
import { useHmrHomeView } from '@/hmr/composables/useHmrHomeView'
import { useHmrPublicContentResource } from '@/hmr/composables/useHmrPublicContentResource'
import { useHmrMountedResourceRefresh } from '@/hmr/composables/useHmrRouteResourceRefresh'
import type { HmrScheduleItem } from '@/hmr/types'
import HmrPriorityImage from '@/hmr/components/HmrPriorityImage.vue'
import { cancelIdleTask, runWhenIdle, type IdleTaskHandle } from '@/utils/performance'
import { readPublicContent } from '@/utils/cache/publicContentCache'

const HmrPostCard = defineAsyncComponent(
  async () => (await import('@/hmr/components/HmrPostCard.vue')).default
)
const homePrerenderPost = {
  id: 'home-prerender-featured',
  title: 'MomiChan',
  excerpt: '精选媒体正在加载。',
  authorName: 'MomiChan',
  mediaUrl: STATIC_HOME_PRERENDER_IMAGE.href,
  tag: '精选',
  createdAt: '刚刚',
  statsLabel: '实时',
  platform: 'tiktok',
  mediaType: 'image',
  hasMedia: true,
  hasRenderableMedia: true,
  mediaCount: 1,
}

const homePreviewHighlights: HmrCommunityItem[] = [
  {
    id: 'home-preview-community-1',
    title: '公开讨论会继续留在首页入口',
    excerpt: '热门回应恢复后会回填到这里，保持从首页直接进入社区的节奏。',
    metric: '社区',
    target: '/community',
  },
  {
    id: 'home-preview-community-2',
    title: '最新反馈会自动接回当前卡片组',
    excerpt: '接口恢复后不需要改路径，用户会在同一组卡片里看到新的互动摘要。',
    metric: '继续',
    target: '/community',
  },
  {
    id: 'home-preview-community-3',
    title: '内容入口与讨论入口保持并排可见',
    excerpt: '深色分区继续承担公开社区信号，不会因为空数据直接塌成骨架。',
    metric: '公开',
    target: '/community',
  },
]

const homePreviewSchedule: HmrScheduleItem[] = [
  {
    id: 'home-preview-schedule-1',
    title: '直播窗口排期',
    phase: '直播',
    time: '20:30',
    description: '当日重点时间会继续显示在首页工作区，不等真实接口恢复也能保持结构。',
  },
  {
    id: 'home-preview-schedule-2',
    title: '发布窗口确认',
    phase: '发布',
    time: '18:00',
    description: '预览态下保留今日窗口的层级，恢复后自动替换成真实发布时间线。',
  },
  {
    id: 'home-preview-schedule-3',
    title: '社区回应整理',
    phase: '社区',
    time: '14:00',
    description: '相关讨论与内容更新会继续回流到首页和日程页之间的共享节奏。',
  },
]

const homePreviewFeaturedPosts: HmrPost[] = [
  {
    ...homePrerenderPost,
    id: 'home-preview-featured-1',
    title: '公开媒体会继续回到这里',
    excerpt: '首页保留主内容带与卡片节奏，接口恢复后自动替换成最新媒体。',
    tag: '预览',
    createdAt: '公开入口',
    statsLabel: '同步中',
  },
  {
    ...homePrerenderPost,
    id: 'home-preview-featured-2',
    title: '精选内容会沿用当前阅读层级',
    excerpt: '深色与浅色模式下继续保持稳定的媒体入口和卡片密度。',
    tag: '精选',
    createdAt: '继续浏览',
    statsLabel: '媒体',
  },
  {
    ...homePrerenderPost,
    id: 'home-preview-featured-3',
    title: '恢复后会自动接回真实封面',
    excerpt: '不需要切换路径，媒体摘要与预览图会回填到同一组卡片。',
    tag: '回填',
    createdAt: '自动更新',
    statsLabel: '预览',
  },
  {
    ...homePrerenderPost,
    id: 'home-preview-featured-4',
    title: '首页结构不会因为空数据塌掉',
    excerpt: '即使实时内容暂不可用，也保留完整首屏之后的浏览节奏。',
    tag: '结构',
    createdAt: '稳定',
    statsLabel: '入口',
  },
]

const initialHomeContent: HmrHomeContent = {
  featured: [homePrerenderPost],
  storyDeck: [homePrerenderPost],
  highlights: [],
  trends: [],
  scheduleHighlights: [],
}
const FULL_HOME_REFRESH_DELAY_MS = 2200
let fullHomeRefreshDelayTimer: number | undefined
let fullHomeRefreshHandle: IdleTaskHandle | undefined
let fullHomeRefreshStarted = false

function preservePrerenderHeroMedia(data: HmrHomeContent): HmrHomeContent {
  const prerenderMediaUrl = homePrerenderPost.mediaUrl
  if (!prerenderMediaUrl || data.featured.length === 0) return data

  const firstPost = data.featured[0]
  if (!firstPost) return data

  const stableFirstPost: HmrPost = {
    ...firstPost,
    mediaUrl: prerenderMediaUrl,
  }
  const firstStoryPost = data.storyDeck[0]
  return {
    ...data,
    featured: [stableFirstPost, ...data.featured.slice(1)],
    storyDeck: firstStoryPost
      ? [{ ...firstStoryPost, mediaUrl: prerenderMediaUrl }, ...data.storyDeck.slice(1)]
      : [stableFirstPost],
  }
}

const {
  applyResource,
  content,
  refresh: refreshHomePrimary,
} = useHmrPublicContentResource<HmrHomeContent>({
  initialData: initialHomeContent,
  paths: ['/home', '/home/featured', '/community/highlights'],
  cacheKey: 'hmr:home',
  scope: 'home',
  strategy: 'network-first',
  loader: loadHomePrimaryContentResource,
  readAvailableBeforeRefresh: true,
  isEmpty: (data) =>
    data.featured.length === 0 && data.trends.length === 0 && data.highlights.length === 0,
  onResolved: (data, nextResource) => {
    const stableData = preservePrerenderHeroMedia(data)
    if (stableData !== data) {
      applyResource({
        ...nextResource,
        data: stableData,
      })
    }
    if (data.featured.length > 0) {
      scheduleFullHomeRefresh()
    }
  },
})

const { cssContent, featuredPosts, platformItems } = useHmrHomeView(content)
const heroPost = computed(() => featuredPosts.value[0])
const displayHeroPost = computed(() => heroPost.value ?? homePrerenderPost)
const secondaryFeaturedPosts = computed(() => featuredPosts.value.slice(1, 5))
const homeDiscussionStatus = computed(() =>
  content.value.highlights.length ? '实时讨论' : '公开预览'
)
const shouldRenderStaticHeroCard = computed(
  () => !heroPost.value || heroPost.value.id === homePrerenderPost.id
)
const staticHeroCardStyle = {
  '--hmr-card-start': '#171412',
  '--hmr-card-end': '#3d2fa9',
}
const staticHeroBadgeStyle = {
  '--hmr-badge-platform': '"TikTok"',
  '--hmr-badge-kind': '"媒体"',
}
const staticHeroStatsStyle = {
  '--hmr-stat-primary': '"实时"',
  '--hmr-stat-secondary': '"刚刚"',
}
const staticHeroPlatformMarkStyle = {
  '--hmr-platform-mark': '"TT"',
}

function clearFullHomeRefreshDelay(): void {
  if (fullHomeRefreshDelayTimer === undefined) return
  window.clearTimeout(fullHomeRefreshDelayTimer)
  fullHomeRefreshDelayTimer = undefined
}

function scheduleFullHomeRefresh(): void {
  if (typeof window === 'undefined') return
  if (shouldUseApiFallback()) return
  if (fullHomeRefreshStarted || fullHomeRefreshDelayTimer !== undefined || fullHomeRefreshHandle) {
    return
  }

  fullHomeRefreshDelayTimer = window.setTimeout(() => {
    fullHomeRefreshDelayTimer = undefined
    fullHomeRefreshHandle = runWhenIdle(
      () => {
        fullHomeRefreshHandle = undefined
        void refreshFullHome()
      },
      { timeout: 4500, fallbackDelay: 2000 }
    )
  }, FULL_HOME_REFRESH_DELAY_MS)
}

async function refreshFullHome(): Promise<void> {
  if (fullHomeRefreshStarted) return
  fullHomeRefreshStarted = true
  const fullResource = await readPublicContent({
    key: 'hmr:home',
    scope: 'home',
    strategy: 'network-first',
    loader: loadHomeContentResource,
  })
  const stableFullContent = preservePrerenderHeroMedia(fullResource.data)
  const stablePrimaryContent: HmrHomeContent = {
    ...stableFullContent,
    featured: content.value.featured.length ? content.value.featured : stableFullContent.featured,
    storyDeck: content.value.storyDeck.length
      ? content.value.storyDeck
      : stableFullContent.storyDeck,
  }
  const nextResource = applyResource({
    ...fullResource,
    data: stablePrimaryContent,
  })
  const { scheduleHomeContentPrewarm } = await import('@/hmr/runtime/homePrewarm')
  scheduleHomeContentPrewarm(nextResource.data, { includeExplore: true })
}

function refreshHomePrimaryWhenApiEnabled(): Promise<unknown> | void {
  if (shouldUseApiFallback()) return
  return refreshHomePrimary()
}

useHmrMountedResourceRefresh(refreshHomePrimaryWhenApiEnabled)

onBeforeUnmount(() => {
  clearFullHomeRefreshDelay()
  cancelIdleTask(fullHomeRefreshHandle)
})
</script>
