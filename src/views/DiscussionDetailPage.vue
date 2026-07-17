<template>
  <article class="hmr-detail hmr-detail--reader discussion-detail-page">
    <header class="hmr-detail-reader-hero">
      <div class="hmr-detail-reader-copy">
        <RouterLink class="hmr-text-link hmr-detail-back" to="/community">
          {{ t('discussionDetail.back') }}
        </RouterLink>
        <p class="hmr-kicker">{{ heroEyebrow }}</p>
        <h1 class="hmr-detail-title" data-hmr-text-reveal>{{ heroTitle }}</h1>
        <p class="hmr-detail-lede">{{ heroBody }}</p>

        <div class="hmr-detail-meta-grid" role="list" :aria-label="t('discussionDetail.infoLabel')">
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
          :loading-title="t('discussionDetail.loadingTitle')"
          :loading-body="t('discussionDetail.loadingBody')"
          :empty-title="stateTitle"
          :empty-body="stateBody"
          :error-title="stateTitle"
          :error-body="stateBody"
          :show-retry="canRetry"
          :retry-label="t('discussionDetail.retry')"
          @retry="loadDiscussion"
        />
      </div>

      <aside
        class="hmr-detail-cover"
        :class="{ 'is-muted': isMutedState }"
        :style="coverStyle"
        data-hmr-reveal
      >
        <div class="hmr-detail-cover-media">
          <HmrPriorityImage
            v-if="relatedPost?.thumbnailUrl"
            :src="relatedPost.thumbnailUrl"
            :alt="relatedPost.title"
            sizes="(min-width: 64em) 34vw, 92vw"
            loading="eager"
            fetch-priority="high"
          />
          <span v-else>{{ coverMark }}</span>
        </div>
        <div class="hmr-detail-cover-caption">
          <span>
            {{
              showFallbackSections ? t('discussionDetail.fallbackCoverLabel') : discussion.category
            }}
          </span>
          <strong>{{ statusLabel }}</strong>
        </div>
      </aside>
    </header>

    <section v-if="showContentSections" class="hmr-detail-reader-section" data-hmr-reveal>
      <div class="hmr-detail-reader-grid">
        <aside class="hmr-detail-sidebar">
          <div class="hmr-detail-source-card">
            <p class="hmr-kicker">状态</p>
            <strong>{{ statusLabel }}</strong>
            <span>{{ activityLabel }}</span>
          </div>

          <div v-if="relatedPost" class="hmr-detail-source-card">
            <p class="hmr-kicker">关联内容</p>
            <strong>{{ relatedPost.title }}</strong>
            <span>{{ relatedPost.authorName ?? '公开内容' }}</span>
            <RouterLink class="hmr-text-link" :to="`/posts/${relatedPost.id}`">打开内容</RouterLink>
          </div>
        </aside>

        <div class="hmr-detail-prose">
          <p class="hmr-kicker">主题</p>
          <h2>{{ discussion.title }}</h2>
          <p>{{ discussion.content }}</p>
          <blockquote>
            <span>{{ discussion.authorName }}</span>
            <strong>{{ tagLine }}</strong>
          </blockquote>
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
            <h2 class="hmr-section-title">{{ t('detailFallback.discussionHeading') }}</h2>
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
      v-if="showCommentsSection"
      class="hmr-detail-reader-section hmr-detail-reader-section--compact discussion-comments"
      data-hmr-reveal
    >
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head hmr-section-head--split" data-testid="comment-thread-header">
          <div>
            <p class="hmr-kicker">回应</p>
            <h2 class="hmr-section-title">最新讨论</h2>
          </div>
          <span class="hmr-detail-count">{{ comments.length }} 项</span>
        </div>

        <div class="hmr-detail-comment-list" data-testid="discussion-comment-composer">
          <article v-for="item in comments" :key="item.id" class="hmr-detail-comment">
            <span>{{ item.metric }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.excerpt }}</p>
          </article>
          <div v-if="comments.length === 0" class="hmr-detail-empty">
            <strong>暂无公开回应</strong>
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
          <h2 class="hmr-section-title">{{ t('detailFallback.discussionActionsTitle') }}</h2>
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
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import {
  loadDiscussionDetailContentResource,
  type HmrDiscussionDetailContent,
} from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import HmrPriorityImage from '@/hmr/components/HmrPriorityImage.vue'
import { formatHmrCompactNumber } from '@/hmr/composables/useHmrPostDetailView'
import { useHmrPublicContentResource } from '@/hmr/composables/useHmrPublicContentResource'
import {
  normalizeHmrRouteParam,
  useHmrRouteResourceRefresh,
} from '@/hmr/composables/useHmrRouteResourceRefresh'

const route = useRoute()
const { t } = useI18n()
const initialDiscussionContent: HmrDiscussionDetailContent = {
  discussion: {
    id: 'discussion',
    title: '讨论加载中',
    content: '',
    category: '讨论',
    authorName: 'MomiChan',
    createdAt: '',
    updatedAt: '',
    lastActivityAt: '',
    tags: [],
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    isPinned: false,
    isClosed: false,
  },
  comments: [],
  viewState: 'available',
}
const {
  content: detail,
  pageState,
  resource,
  refresh: loadDiscussion,
} = useHmrPublicContentResource<HmrDiscussionDetailContent>({
  initialData: initialDiscussionContent,
  paths: ['/discussions/:id', '/discussions/:id/comments'],
  cacheKey: () => `hmr:discussion-detail:${discussionId()}`,
  scope: 'discussion-detail',
  strategy: 'stale-while-revalidate',
  loader: () => loadDiscussionDetailContentResource(discussionId()),
  resolvePageState: (data) =>
    data.viewState === 'available' ? 'ready' : data.viewState === 'not-found' ? 'empty' : 'error',
})

const discussion = computed(() => detail.value.discussion)
const comments = computed(() => detail.value.comments)
const relatedPost = computed(() => detail.value.relatedPost)
const isRestrictedState = computed(() => detail.value.viewState === 'restricted')
const isNotFoundState = computed(() => detail.value.viewState === 'not-found')
const isUnavailableState = computed(() => detail.value.viewState === 'temporary-unavailable')
const isLoadingState = computed(() => pageState.value === 'loading')
const isMutedState = computed(
  () => isRestrictedState.value || isNotFoundState.value || isUnavailableState.value
)
const showContentSections = computed(
  () => pageState.value === 'ready' && detail.value.viewState === 'available'
)
const showCommentsSection = computed(() => showContentSections.value)
const showFallbackSections = computed(
  () => pageState.value !== 'loading' && !showContentSections.value
)
const fallbackStateKey = computed(() => {
  if (detail.value.viewState === 'restricted') return 'restricted'
  if (detail.value.viewState === 'not-found') return 'notFound'
  return 'unavailable'
})
const fallbackStateCopy = computed(() => {
  const key = `discussionDetail.states.${fallbackStateKey.value}`
  return {
    eyebrow: t(`${key}.eyebrow`),
    heroTitle: t(`${key}.heroTitle`),
    title: t(`${key}.title`),
    body: t(`${key}.body`),
    guidance: t(`${key}.guidance`),
  }
})
const canRetry = computed(() => isUnavailableState.value)
const statusLabel = computed(() => {
  if (showFallbackSections.value) return fallbackStateCopy.value.title
  if (discussion.value.isClosed) return '已关闭'
  if (discussion.value.isPinned) return '置顶讨论'
  return '开放讨论'
})
const activityLabel = computed(() => {
  const lastActivity = discussion.value.lastActivityAt || discussion.value.updatedAt
  return lastActivity ? `最后活动 ${lastActivity}` : '等待活动'
})
const tagLine = computed(() =>
  discussion.value.tags.length ? discussion.value.tags.join(' / ') : discussion.value.category
)
const coverMark = computed(() => (discussion.value.isPinned ? 'PIN' : 'CHAT'))
const heroEyebrow = computed(() => {
  if (isLoadingState.value) return t('discussionDetail.loadingTitle')
  if (showFallbackSections.value) return fallbackStateCopy.value.eyebrow
  return `${discussion.value.category} · ${discussion.value.createdAt || '公开讨论'}`
})
const heroTitle = computed(() => {
  if (isLoadingState.value) return t('discussionDetail.loadingTitle')
  if (showFallbackSections.value) return fallbackStateCopy.value.heroTitle
  return discussion.value.title
})
const heroBody = computed(() => {
  if (isLoadingState.value) return t('discussionDetail.loadingBody')
  if (showFallbackSections.value) return fallbackStateCopy.value.body
  return discussion.value.content
})
const stateTitle = computed(() => {
  if (showFallbackSections.value) return fallbackStateCopy.value.title
  return ''
})
const stateBody = computed(() => {
  if (showFallbackSections.value) return fallbackStateCopy.value.body
  return ''
})
const detailMetrics = computed(() => {
  if (isMutedState.value) {
    return [
      { label: t('detailFallback.status'), value: statusLabel.value },
      { label: t('detailFallback.explanation'), value: stateBody.value },
      { label: t('detailFallback.next'), value: fallbackStateCopy.value.guidance },
      { label: t('detailFallback.destination'), value: 'Community' },
    ]
  }

  return [
    { label: '浏览', value: formatHmrCompactNumber(discussion.value.viewCount) },
    { label: '喜欢', value: formatHmrCompactNumber(discussion.value.likeCount) },
    { label: '回应', value: formatHmrCompactNumber(discussion.value.commentCount) },
    { label: '状态', value: statusLabel.value },
  ]
})
const coverStyle = computed(() => ({
  '--hmr-card-start': discussion.value.isPinned ? '#f97316' : '#14b8a6',
  '--hmr-card-end': discussion.value.isClosed ? '#64748b' : '#ec4899',
}))

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
      value: 'Community / Discussion',
      body: t('detailFallback.discussionDestinationBody'),
    },
  ]
})

const fallbackActions = computed(() => [
  {
    id: 'discussion-fallback-community',
    tag: t('detailFallback.communityTag'),
    title: t('detailFallback.discussionCommunityTitle'),
    description: t('detailFallback.communityDescription'),
    to: '/community',
  },
  {
    id: 'discussion-fallback-explore',
    tag: t('detailFallback.exploreTag'),
    title: t('detailFallback.exploreTitle'),
    description: t('detailFallback.exploreDescription'),
    to: '/explore',
  },
  {
    id: 'discussion-fallback-home',
    tag: t('detailFallback.homeTag'),
    title: t('detailFallback.homeTitle'),
    description: t('detailFallback.homeDescription'),
    to: '/',
  },
])

const fallbackStatusTag = computed(() => t('detailFallback.discussionStatusTag'))

function discussionId(): string {
  return normalizeHmrRouteParam(route.params['id'], 'discussion')
}

useHmrRouteResourceRefresh({
  refresh: loadDiscussion,
  watchSource: () => route.params['id'],
})
</script>
