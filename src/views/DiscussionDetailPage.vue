<template>
  <article class="hmr-detail hmr-detail--reader discussion-detail-page">
    <header class="hmr-detail-reader-hero">
      <div class="hmr-detail-reader-copy">
        <RouterLink class="hmr-text-link hmr-detail-back" to="/community">返回社区</RouterLink>
        <p class="hmr-kicker">{{ heroEyebrow }}</p>
        <h1 class="hmr-detail-title" data-hmr-text-reveal>{{ heroTitle }}</h1>
        <p class="hmr-detail-lede">{{ heroBody }}</p>

        <div class="hmr-detail-meta-grid" aria-label="讨论信息">
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
          :loading-title="'讨论加载中'"
          :loading-body="'拉取主题、标签与最新回应。'"
          :empty-title="'暂无可显示讨论'"
          :empty-body="'这条讨论当前没有可展示的公开内容。'"
          :error-title="stateTitle"
          :error-body="stateBody"
          :show-retry="canRetry"
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
          <span>{{ discussion.category }}</span>
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
            <p class="hmr-kicker">状态概览</p>
            <h2 class="hmr-section-title">当前讨论仍可继续浏览</h2>
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
          <p class="hmr-kicker">继续浏览</p>
          <h2 class="hmr-section-title">先去这些公开入口</h2>
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
const canRetry = computed(() => isUnavailableState.value)
const statusLabel = computed(() => {
  if (isRestrictedState.value) return '公开预览受限'
  if (isNotFoundState.value) return '未找到'
  if (isUnavailableState.value) return '暂不可用'
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
  if (isLoadingState.value) return '讨论加载中 · 正在拉取公开主题'
  if (isRestrictedState.value) return '公开预览受限 · 自动访问未开放'
  if (isNotFoundState.value) return '未找到 · 讨论已移除或下架'
  if (isUnavailableState.value) return '暂不可用 · 拉取失败'
  return `${discussion.value.category} · ${discussion.value.createdAt || '公开讨论'}`
})
const heroTitle = computed(() => {
  if (isLoadingState.value) return '讨论加载中'
  if (isRestrictedState.value) return '讨论无法公开预览'
  if (isNotFoundState.value) return '这条讨论不存在或已下架'
  if (isUnavailableState.value) return '讨论暂时不可用'
  return discussion.value.title
})
const heroBody = computed(() => {
  if (isLoadingState.value) return '拉取讨论正文、标签与最新回应。'
  if (isRestrictedState.value) return '当前访问方式受限，正文与回应模块已隐藏。'
  if (isNotFoundState.value) return '讨论已删除、下架或切换为不可访问状态。'
  if (isUnavailableState.value) return '讨论拉取失败。重试会重新请求公开讨论接口。'
  return discussion.value.content
})
const stateTitle = computed(() => {
  if (isRestrictedState.value) return '公开预览受限'
  if (isNotFoundState.value) return '未找到讨论'
  if (isUnavailableState.value) return '讨论暂不可用'
  return ''
})
const stateBody = computed(() => {
  if (isRestrictedState.value) return '当前讨论对公开访问受限，系统隐藏正文与回应模块。'
  if (isNotFoundState.value) return '这条讨论没有可继续显示的公开内容。'
  if (isUnavailableState.value) return '重试会重新请求公开讨论接口。'
  return ''
})
const detailMetrics = computed(() => {
  if (isMutedState.value) {
    return [
      { label: '状态', value: statusLabel.value },
      { label: '说明', value: stateBody.value },
      { label: '去向', value: 'Community' },
      { label: '类型', value: 'Discussion' },
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

const fallbackSummary = [
  {
    label: '状态',
    value: '讨论未取回',
    body: '当前公开讨论接口没有返回内容，页面保留状态、去向与恢复提示。',
  },
  {
    label: '说明',
    value: '重试会重新请求公开讨论接口',
    body: '接口恢复后，正文、回应与关联内容会回到当前阅读结构。',
  },
  {
    label: '去向',
    value: 'Community / Discussion',
    body: '你仍然可以继续浏览社区入口或返回相关公开内容。',
  },
]

const fallbackActions = [
  {
    id: 'discussion-fallback-community',
    tag: '社区',
    title: '返回社区查看最新讨论',
    description: '切回公开讨论入口',
    to: '/community',
  },
  {
    id: 'discussion-fallback-explore',
    tag: '内容',
    title: '去探索页继续浏览',
    description: '先看其他公开内容',
    to: '/explore',
  },
  {
    id: 'discussion-fallback-home',
    tag: '主页',
    title: '回到媒体入口',
    description: '重新选择浏览路径',
    to: '/',
  },
]

const fallbackStatusTag = '公开入口仍可用'

function discussionId(): string {
  return normalizeHmrRouteParam(route.params.id, 'discussion')
}

useHmrRouteResourceRefresh({
  refresh: loadDiscussion,
  watchSource: () => route.params.id,
})
</script>
