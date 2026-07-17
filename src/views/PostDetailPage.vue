<template>
  <article class="hmr-detail hmr-detail--reader">
    <header class="hmr-detail-reader-hero">
      <div class="hmr-detail-reader-copy">
        <RouterLink class="hmr-text-link hmr-detail-back" to="/explore">
          {{ t('post.back') }}
        </RouterLink>
        <p class="hmr-kicker">{{ heroEyebrow }}</p>
        <h1 class="hmr-detail-title" data-hmr-text-reveal>{{ heroTitle }}</h1>
        <p class="hmr-detail-lede">{{ heroBody }}</p>

        <div class="hmr-detail-meta-grid" role="list" :aria-label="t('post.infoLabel')">
          <div
            v-for="item in detailMetrics"
            :key="item.label"
            class="hmr-detail-meta-card"
            role="listitem"
          >
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
          :loading-title="t('post.loadingTitle')"
          :loading-body="t('post.loadingBody')"
          :empty-title="stateTitle"
          :empty-body="stateBody"
          :error-title="stateTitle"
          :error-body="stateBody"
          :show-retry="canRetry"
          :retry-label="t('post.retry')"
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
          <strong>{{ showFallbackSections ? t('post.fallbackMediaLabel') : mediaLabel }}</strong>
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
            <p class="hmr-kicker">{{ t('detailFallback.stateOverview') }}</p>
            <h2 class="hmr-section-title">{{ t('detailFallback.postHeading') }}</h2>
          </div>
          <span class="hmr-detail-count">{{ fallbackStatusTag }}</span>
        </div>

        <div class="hmr-detail-fallback-grid">
          <article
            v-for="item in fallbackSummary"
            :key="item.label"
            class="hmr-detail-fallback-card"
          >
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
          <p class="hmr-kicker">{{ t('detailFallback.continueBrowsing') }}</p>
          <h2 class="hmr-section-title">{{ t('detailFallback.postActionsTitle') }}</h2>
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
import { useI18n } from 'vue-i18n'
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
const { t } = useI18n()
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
  detailMetrics: sourceDetailMetrics,
  heroBody: sourceHeroBody,
  heroEyebrow: sourceHeroEyebrow,
  heroImage,
  heroImageSrcset,
  heroTitle: sourceHeroTitle,
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
  stateBody: sourceStateBody,
  stateTitle: sourceStateTitle,
} = useHmrPostDetailView(detail, pageState)

const showFallbackSections = computed(
  () => pageState.value !== 'loading' && !showContentSections.value
)

const fallbackStateKey = computed(() => {
  if (detail.value.viewState === 'restricted') return 'restricted'
  if (detail.value.viewState === 'not-found') return 'notFound'
  return 'unavailable'
})
const fallbackStateCopy = computed(() => {
  const key = `post.states.${fallbackStateKey.value}`
  return {
    eyebrow: t(`${key}.eyebrow`),
    heroTitle: t(`${key}.heroTitle`),
    title: t(`${key}.title`),
    body: t(`${key}.body`),
    guidance: t(`${key}.guidance`),
  }
})
const heroEyebrow = computed(() =>
  showFallbackSections.value ? fallbackStateCopy.value.eyebrow : sourceHeroEyebrow.value
)
const heroTitle = computed(() =>
  showFallbackSections.value ? fallbackStateCopy.value.heroTitle : sourceHeroTitle.value
)
const heroBody = computed(() =>
  showFallbackSections.value ? fallbackStateCopy.value.body : sourceHeroBody.value
)
const stateTitle = computed(() =>
  showFallbackSections.value ? fallbackStateCopy.value.title : sourceStateTitle.value
)
const stateBody = computed(() =>
  showFallbackSections.value ? fallbackStateCopy.value.body : sourceStateBody.value
)
const detailMetrics = computed(() => {
  if (!showFallbackSections.value) return sourceDetailMetrics.value

  return [
    { label: t('detailFallback.status'), value: fallbackStateCopy.value.title },
    { label: t('detailFallback.explanation'), value: fallbackStateCopy.value.body },
    { label: t('detailFallback.next'), value: fallbackStateCopy.value.guidance },
    { label: t('detailFallback.destination'), value: 'Explore / Community' },
  ]
})

const fallbackSummary = computed(() => {
  return [
    {
      label: t('detailFallback.status'),
      value: fallbackStateCopy.value.title,
      body: fallbackStateCopy.value.body,
    },
    {
      label: t('detailFallback.explanation'),
      value: fallbackStateCopy.value.guidance,
      body: fallbackStateCopy.value.body,
    },
    {
      label: t('detailFallback.destination'),
      value: 'Explore / Community',
      body: t('detailFallback.postDestinationBody'),
    },
  ]
})

const fallbackActions = computed(() => [
  {
    id: 'post-fallback-explore',
    tag: t('detailFallback.exploreTag'),
    title: t('detailFallback.exploreTitle'),
    description: t('detailFallback.exploreDescription'),
    to: '/explore',
  },
  {
    id: 'post-fallback-community',
    tag: t('detailFallback.communityTag'),
    title: t('detailFallback.postCommunityTitle'),
    description: t('detailFallback.communityDescription'),
    to: '/community',
  },
  {
    id: 'post-fallback-home',
    tag: t('detailFallback.homeTag'),
    title: t('detailFallback.homeTitle'),
    description: t('detailFallback.homeDescription'),
    to: '/',
  },
])

const fallbackStatusTag = computed(() => t('detailFallback.postStatusTag'))

function postId(): string {
  return normalizeHmrRouteParam(route.params['id'], 'signal-room')
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
  watchSource: () => route.params['id'],
})
</script>
