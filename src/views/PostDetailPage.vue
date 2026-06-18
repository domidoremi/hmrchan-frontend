<template>
  <article class="hmr-detail hmr-detail--reader">
    <header class="hmr-detail-reader-hero">
      <div class="hmr-detail-reader-copy">
        <RouterLink class="hmr-text-link hmr-detail-back" to="/explore">返回探索</RouterLink>
        <p class="hmr-kicker">{{ heroEyebrow }}</p>
        <h1 class="hmr-detail-title" data-hmr-text-reveal>{{ heroTitle }}</h1>
        <p class="hmr-detail-lede">{{ heroBody }}</p>

        <div class="hmr-detail-meta-grid" aria-label="内容信息">
          <div v-for="item in detailMetrics" :key="item.label" class="hmr-detail-meta-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>

        <HmrPageStateBlock
          :loading="pageState === 'loading'"
          :empty="pageState === 'empty'"
          :error="resource.error"
          :title="stateTitle"
          :body="stateBody"
          :loading-title="'内容加载中'"
          :loading-body="'正在拉取帖子、评论与媒体预览。'"
          :empty-title="'暂无可显示内容'"
          :empty-body="'这条帖子当前没有可展示的正文或媒体。'"
          :error-title="stateTitle"
          :error-body="stateBody"
          :show-retry="canRetry"
          @retry="loadPost"
        />
      </div>

      <aside
        class="hmr-detail-cover"
        :class="{ 'is-muted': isRestrictedState }"
        :style="cardStyle"
        data-hmr-reveal
      >
        <div class="hmr-detail-cover-media">
          <img
            v-if="heroImage"
            :src="heroImage"
            :srcset="heroImageSrcset"
            sizes="(min-width: 64em) 34vw, 92vw"
            :alt="post.title"
            loading="eager"
            decoding="async"
            fetchpriority="high"
          />
          <span v-else>{{ platformMark }}</span>
        </div>
        <div class="hmr-detail-cover-caption">
          <span>{{ platformLabel }}</span>
          <strong>{{ mediaLabel }}</strong>
        </div>
      </aside>
    </header>

    <section v-if="showContentSections" class="hmr-detail-reader-section" data-hmr-reveal>
      <div class="hmr-detail-reader-grid">
        <aside class="hmr-detail-sidebar">
          <div class="hmr-detail-source-card">
            <p class="hmr-kicker">来源</p>
            <strong>{{ platformLabel }}</strong>
            <span>{{ sourceDescription }}</span>
            <a
              v-if="sourceUrl"
              class="hmr-text-link"
              :href="sourceUrl"
              target="_blank"
              rel="noreferrer"
            >
              打开原帖
            </a>
          </div>

          <div class="hmr-detail-source-card">
            <p class="hmr-kicker">互动</p>
            <strong>{{ interactionLabel }}</strong>
            <RouterLink class="hmr-text-link" to="/community">进入讨论</RouterLink>
          </div>
        </aside>

        <div class="hmr-detail-prose">
          <p class="hmr-kicker">正文</p>
          <h2>内容摘要</h2>
          <p>{{ post.excerpt }}</p>
          <blockquote>
            <span>{{ post.authorName }}</span>
            <strong>{{ post.statsLabel }}</strong>
          </blockquote>
        </div>
      </div>
    </section>

    <section
      v-if="showMediaSection"
      class="hmr-detail-reader-section hmr-detail-reader-section--compact"
      data-hmr-reveal
    >
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head hmr-section-head--split">
          <div>
            <p class="hmr-kicker">媒体</p>
            <h2 class="hmr-section-title">附件与预览</h2>
          </div>
          <span class="hmr-detail-count">{{ detail.media.length || 0 }} 项</span>
        </div>

        <div v-if="detail.media.length" class="hmr-detail-media-grid">
          <a
            v-for="item in detail.media"
            :key="item.id"
            class="hmr-detail-media-card"
            :href="mediaCardHref(item)"
            :target="mediaCardHref(item) ? '_blank' : undefined"
            :rel="mediaCardHref(item) ? 'noreferrer' : undefined"
            :aria-disabled="mediaCardHref(item) ? undefined : 'true'"
            @click="handleMediaCardClick"
          >
            <img
              :src="item.thumbnailUrl"
              :srcset="mediaImageSrcset(item.thumbnailUrl)"
              sizes="(min-width: 64em) 22vw, (min-width: 48em) 42vw, 92vw"
              :alt="item.title"
              loading="lazy"
              decoding="async"
              fetchpriority="low"
            />
            <span>{{ item.mediaType }}</span>
            <strong>{{ item.title }}</strong>
          </a>
        </div>

        <div v-else class="hmr-detail-empty">
          <strong>暂无媒体附件</strong>
        </div>
      </div>
    </section>

    <section
      v-else-if="showFallbackSections"
      class="hmr-detail-reader-section hmr-detail-reader-section--compact hmr-detail-reader-section--fallback"
      data-hmr-reveal
    >
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head hmr-section-head--split">
          <div>
            <p class="hmr-kicker">状态概览</p>
            <h2 class="hmr-section-title">当前可继续的路径</h2>
          </div>
          <span class="hmr-detail-count">{{ fallbackStatusTag }}</span>
        </div>

        <div class="hmr-detail-fallback-grid">
          <article v-for="item in fallbackSummary" :key="item.label" class="hmr-detail-fallback-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <p>{{ item.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <section
      v-if="showCommunitySection"
      class="hmr-detail-reader-section hmr-detail-reader-section--compact post-comments"
      data-hmr-reveal
    >
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head hmr-section-head--split">
          <div>
            <p class="hmr-kicker">评论</p>
            <h2 class="hmr-section-title">社区回应</h2>
          </div>
          <RouterLink class="hmr-text-link" to="/community">查看全部</RouterLink>
        </div>

        <div class="hmr-detail-comment-list">
          <article v-for="item in commentsPreview" :key="item.id" class="hmr-detail-comment">
            <span>{{ item.metric }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.excerpt }}</p>
          </article>
          <div v-if="commentsPreview.length === 0" class="hmr-detail-empty">
            <strong>暂无公开评论</strong>
          </div>
        </div>
      </div>
    </section>

    <section
      v-else-if="showFallbackSections"
      class="hmr-dark-stage hmr-dark-stage--detail"
      data-hmr-reveal
    >
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">继续浏览</p>
          <h2 class="hmr-section-title">先去这些入口</h2>
        </div>
        <div class="hmr-detail-related">
          <RouterLink
            v-for="item in fallbackActions"
            :key="item.id"
            class="hmr-detail-related-card"
            :to="item.to"
          >
            <span>{{ item.tag }}</span>
            <strong>{{ item.title }}</strong>
            <em>{{ item.description }}</em>
          </RouterLink>
        </div>
      </div>
    </section>

    <section
      v-if="showRelatedSection"
      class="hmr-dark-stage hmr-dark-stage--detail"
      data-hmr-reveal
    >
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">继续浏览</p>
          <h2 class="hmr-section-title">相关内容</h2>
        </div>
        <div class="hmr-detail-related">
          <RouterLink
            v-for="item in detail.relatedPosts"
            :key="item.id"
            class="hmr-detail-related-card"
            :to="`/posts/${item.id}`"
          >
            <span>{{ item.tag }}</span>
            <strong>{{ item.title }}</strong>
            <em>{{ item.statsLabel }}</em>
          </RouterLink>
        </div>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import {
  loadPostDetailContentResource,
  type HmrMediaItem,
  type HmrPost,
  type HmrPostDetailContent,
} from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import { useHmrPostDetailView } from '@/hmr/composables/useHmrPostDetailView'
import { useHmrPublicContentResource } from '@/hmr/composables/useHmrPublicContentResource'
import {
  normalizeHmrRouteParam,
  useHmrRouteResourceRefresh,
} from '@/hmr/composables/useHmrRouteResourceRefresh'

const route = useRoute()
const seedPost: HmrPost = {
  id: 'signal-room',
  title: '内容加载中',
  excerpt: '',
  authorName: 'MomiChan',
  tag: '',
  createdAt: '',
  statsLabel: '',
}
const initialDetailContent: HmrPostDetailContent = {
  post: seedPost,
  relatedPosts: [],
  comments: [],
  media: [],
  viewState: 'available',
}
const {
  content: detail,
  pageState,
  resource,
  refresh: loadPost,
} = useHmrPublicContentResource<HmrPostDetailContent>({
  initialData: initialDetailContent,
  paths: ['/posts/:id', '/posts/:id/comments'],
  cacheKey: () => `hmr:post-detail:${postId()}`,
  scope: 'post-detail',
  strategy: 'stale-while-revalidate',
  loader: () => loadPostDetailContentResource(postId()),
  resolvePageState: (data) =>
    data.viewState === 'available' ? 'ready' : data.viewState === 'not-found' ? 'empty' : 'error',
})
const {
  canRetry,
  cardStyle,
  commentsPreview,
  detailMetrics,
  heroBody,
  heroEyebrow,
  heroImage,
  heroImageSrcset,
  heroTitle,
  interactionLabel,
  isRestrictedState,
  mediaImageSrcset,
  mediaLabel,
  platformLabel,
  platformMark,
  post,
  showCommunitySection,
  showContentSections,
  showMediaSection,
  showRelatedSection,
  sourceDescription,
  sourceUrl,
  stateBody,
  stateTitle,
} = useHmrPostDetailView(detail, pageState)

const showFallbackSections = computed(
  () => pageState.value !== 'loading' && !showContentSections.value
)

const fallbackSummary = [
  {
    label: '状态',
    value: '内容未取回',
    body: '当前公开拉取失败，页面保留阅读入口与状态说明，避免只剩空白区域。',
  },
  {
    label: '说明',
    value: '稍后重试通常可恢复',
    body: '网络或上游接口恢复后，正文、媒体与评论会回到同一阅读布局。',
  },
  {
    label: '去向',
    value: 'Explore / Community',
    body: '继续浏览公开内容或社区讨论，不需要退出当前阅读链路。',
  },
]

const fallbackActions = [
  {
    id: 'post-fallback-explore',
    tag: '去向',
    title: '返回探索继续浏览',
    description: '先看其他公开内容',
    to: '/explore',
  },
  {
    id: 'post-fallback-community',
    tag: '社区',
    title: '进入社区查看讨论',
    description: '切到公开讨论入口',
    to: '/community',
  },
  {
    id: 'post-fallback-home',
    tag: '主页',
    title: '回到媒体入口',
    description: '重新选择浏览路径',
    to: '/',
  },
]

const fallbackStatusTag = '可继续浏览'

function postId(): string {
  return normalizeHmrRouteParam(route.params.id, 'signal-room')
}

function mediaCardHref(item: HmrMediaItem): string {
  return item.mediaType.trim().toLowerCase() === 'image'
    ? mediaImagePreviewUrl(item.thumbnailUrl)
    : item.streamUrl
}

function mediaImagePreviewUrl(value: string): string {
  if (!value) return ''
  try {
    const origin = typeof window === 'undefined' ? 'https://momichan.local' : window.location.origin
    const url = new URL(value, origin)
    if (url.pathname.includes('/thumbnail')) {
      url.searchParams.set('size', 'large')
      return `${url.pathname}${url.search}${url.hash}`
    }
  } catch {
    return value
  }
  return value
}

function handleMediaCardClick(event: MouseEvent): void {
  const target = event.currentTarget instanceof HTMLAnchorElement ? event.currentTarget : null
  const href = target?.getAttribute('href')?.trim()
  if (!href || href === '#') {
    event.preventDefault()
  }
}

useHmrRouteResourceRefresh({
  refresh: loadPost,
  watchSource: () => route.params.id,
})
</script>
