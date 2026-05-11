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
          <img v-if="heroImage" :src="heroImage" :alt="post.title" />
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
            :href="item.streamUrl"
            target="_blank"
            rel="noreferrer"
          >
            <img :src="item.thumbnailUrl" :alt="item.title" loading="lazy" decoding="async" />
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
      v-if="showCommunitySection"
      class="hmr-detail-reader-section hmr-detail-reader-section--compact"
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
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import {
  loadPostDetailContentResource,
  type HmrPost,
  type HmrPostDetailContent,
} from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import type { HmrAsyncResource, HmrPageState } from '@/hmr/types'
import { readPublicContent } from '@/utils/cache/publicContentCache'

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
const post = ref<HmrPost>(seedPost)
const detail = ref<HmrPostDetailContent>({
  post: seedPost,
  relatedPosts: [],
  comments: [],
  media: [],
  viewState: 'available',
})
const pageState = ref<HmrPageState>('idle')
const resource = ref<HmrAsyncResource<HmrPostDetailContent>>({
  state: 'idle',
  data: detail.value,
  source: 'local',
  error: null,
  paths: ['/posts/:id', '/posts/:id/comments'],
  updatedAt: null,
})

const palette: Record<string, [string, string]> = {
  instagram: ['#ff7722', '#ff3c34'],
  showroom: ['#3d2fa9', '#ffc765'],
  tiktok: ['#171412', '#3d2fa9'],
  twitter: ['#171412', '#ff7722'],
  x: ['#171412', '#ff7722'],
  youtube: ['#ff3c34', '#ff7722'],
  default: ['#ff7722', '#3d2fa9'],
}

const platformLabels: Record<string, string> = {
  instagram: 'Instagram',
  showroom: 'Showroom',
  tiktok: 'TikTok',
  twitter: 'X',
  x: 'X',
  youtube: 'YouTube',
  default: 'MomiChan',
}

const platformMarks: Record<string, string> = {
  instagram: 'IG',
  showroom: 'SR',
  tiktok: 'TT',
  twitter: 'X',
  x: 'X',
  youtube: 'YT',
  default: 'M',
}

const platformKey = computed(() => post.value.platform?.trim().toLowerCase() || 'default')
const platformLabel = computed(() => platformLabels[platformKey.value] ?? platformLabels.default)
const platformMark = computed(() => platformMarks[platformKey.value] ?? platformMarks.default)
const cardStyle = computed(() => {
  const pair = palette[platformKey.value] ?? palette.default
  return {
    '--hmr-card-start': pair[0],
    '--hmr-card-end': pair[1],
  }
})
const hasRenderableMedia = computed(
  () =>
    post.value.hasRenderableMedia ||
    (post.value.mediaCount ?? 0) > 0 ||
    detail.value.media.length > 0 ||
    typeof post.value.durationSec === 'number'
)
const heroImage = computed(() =>
  hasRenderableMedia.value ? (post.value.mediaUrl ?? detail.value.media[0]?.thumbnailUrl) : ''
)
const sourceUrl = computed(() => {
  const url = post.value.postUrl?.trim()
  if (!url || url === '#') return ''
  return url
})
const sourceDescription = computed(() => (sourceUrl.value ? sourceUrl.value : platformLabel.value))
const commentsPreview = computed(() => detail.value.comments.slice(0, 5))
const interactionLabel = computed(
  () =>
    `${formatNumber(post.value.commentCount ?? detail.value.comments.length)} 回应 · ${formatNumber(
      post.value.likeCount ?? 0
    )} 喜欢`
)
const mediaLabel = computed(() => {
  if (!hasRenderableMedia.value) return '帖子'
  const count = post.value.mediaCount ?? detail.value.media.length
  if (count > 0) return `${count} 个媒体资源`
  return post.value.postType ?? '媒体内容'
})
const contentTypeLabel = computed(() => {
  if (hasRenderableMedia.value) return mediaLabel.value
  return post.value.mediaType === 'text' ? '文本帖子' : '帖子'
})
const isRestrictedState = computed(() => detail.value.viewState === 'restricted')
const isNotFoundState = computed(() => detail.value.viewState === 'not-found')
const isUnavailableState = computed(() => detail.value.viewState === 'temporary-unavailable')
const isLoadingState = computed(() => pageState.value === 'loading')
const showContentSections = computed(
  () => pageState.value === 'ready' && detail.value.viewState === 'available'
)
const showMediaSection = computed(() => showContentSections.value && detail.value.media.length > 0)
const showCommunitySection = computed(
  () => showContentSections.value && detail.value.comments.length > 0
)
const showRelatedSection = computed(
  () => showContentSections.value && detail.value.relatedPosts.length > 0
)
const canRetry = computed(() => isUnavailableState.value)
const heroEyebrow = computed(() => {
  if (isLoadingState.value) return '内容加载中 · 正在拉取公开帖子'
  if (isRestrictedState.value) return '公开预览受限 · 该内容暂不对自动访问开放'
  if (isNotFoundState.value) return '未找到 · 该帖子可能已被移除'
  if (isUnavailableState.value) return '暂不可用 · 稍后可重试'
  return `${platformLabel.value} · ${post.value.createdAt}`
})
const heroTitle = computed(() => {
  if (isLoadingState.value) return '内容加载中'
  if (isRestrictedState.value) return '这条帖子当前无法公开预览'
  if (isNotFoundState.value) return '这条帖子不存在或已下架'
  if (isUnavailableState.value) return '内容暂时不可用'
  return post.value.title
})
const heroBody = computed(() => {
  if (isLoadingState.value) return '正在拉取帖子正文、评论与媒体预览。'
  if (isRestrictedState.value) {
    return '当前访问方式被限制，页面保留导航但不会展示空的正文、媒体或评论。你可以稍后再来，或继续浏览其他公开内容。'
  }
  if (isNotFoundState.value) {
    return '这条内容可能已删除、下架或切换为不可访问状态。'
  }
  if (isUnavailableState.value) {
    return '内容暂时没有拉取成功。你可以点击重试，或先浏览其他帖子。'
  }
  return post.value.excerpt
})
const stateTitle = computed(() => {
  if (isRestrictedState.value) return '公开预览受限'
  if (isNotFoundState.value) return '未找到内容'
  if (isUnavailableState.value) return '内容暂不可用'
  return ''
})
const stateBody = computed(() => {
  if (isRestrictedState.value) return '当前帖子对公开访问受限，系统会隐藏空白模块。'
  if (isNotFoundState.value) return '这条帖子没有可继续显示的公开内容。'
  if (isUnavailableState.value) return '稍后重试，通常可以恢复拉取。'
  return ''
})
const detailMetrics = computed(() => [
  isRestrictedState.value || isNotFoundState.value || isUnavailableState.value
    ? { label: '状态', value: stateTitle.value }
    : { label: '平台', value: platformLabel.value },
  isRestrictedState.value || isNotFoundState.value || isUnavailableState.value
    ? { label: '说明', value: stateBody.value }
    : { label: '作者', value: post.value.authorName },
  isRestrictedState.value
    ? { label: '后续', value: '可继续浏览探索页或社区' }
    : isNotFoundState.value
      ? { label: '后续', value: '返回探索继续浏览' }
      : isUnavailableState.value
        ? { label: '后续', value: '稍后重试即可恢复' }
        : { label: '互动', value: post.value.statsLabel },
  isRestrictedState.value || isNotFoundState.value || isUnavailableState.value
    ? { label: '去向', value: 'Explore / Community' }
    : { label: '类型', value: contentTypeLabel.value },
])

async function loadPost(): Promise<void> {
  pageState.value = 'loading'
  const id = String(route.params.id ?? 'signal-room')
  const nextResource = await readPublicContent({
    key: `hmr:post-detail:${id}`,
    scope: 'post-detail',
    strategy: 'stale-while-revalidate',
    loader: () => loadPostDetailContentResource(id),
  })
  resource.value = nextResource
  detail.value = nextResource.data
  post.value = detail.value.post
  pageState.value =
    detail.value.viewState === 'available'
      ? 'ready'
      : detail.value.viewState === 'not-found'
        ? 'empty'
        : 'error'
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(value)
}

onMounted(() => {
  void loadPost()
})

watch(
  () => route.params.id,
  () => {
    void loadPost()
  }
)
</script>
