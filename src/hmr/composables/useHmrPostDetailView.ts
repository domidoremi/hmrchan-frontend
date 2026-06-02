import { computed, type Ref } from 'vue'

import type { HmrPostDetailContent } from '@/api/hmrContent'
import { buildThumbnailSrcset } from '@/hmr/runtime/mediaImages'
import { resolveHmrPlatformVisual } from '@/hmr/runtime/platformVisuals'
import type { HmrPageState } from '@/hmr/types'

export interface HmrPostDetailMetric {
  label: string
  value: string
}

export function formatHmrCompactNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(value)
}

export function useHmrPostDetailView(
  detail: Ref<HmrPostDetailContent>,
  pageState: Ref<HmrPageState>
) {
  const post = computed(() => detail.value.post)
  const platformVisual = computed(() => resolveHmrPlatformVisual(post.value.platform))
  const platformLabel = computed(() => platformVisual.value.label)
  const platformMark = computed(() => platformVisual.value.mark)
  const cardStyle = computed(() => {
    const pair = platformVisual.value.colors
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
  const heroImageSrcset = computed(() =>
    heroImage.value ? buildThumbnailSrcset(heroImage.value) : undefined
  )
  const sourceUrl = computed(() => {
    const url = post.value.postUrl?.trim()
    if (!url || url === '#') return ''
    return url
  })
  const sourceDescription = computed(() =>
    sourceUrl.value ? sourceUrl.value : platformLabel.value
  )
  const commentsPreview = computed(() => detail.value.comments.slice(0, 5))
  const interactionLabel = computed(
    () =>
      `${formatHmrCompactNumber(
        post.value.commentCount ?? detail.value.comments.length
      )} 回应 · ${formatHmrCompactNumber(post.value.likeCount ?? 0)} 喜欢`
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
  const showMediaSection = computed(
    () => showContentSections.value && detail.value.media.length > 0
  )
  const showCommunitySection = computed(() => showContentSections.value)
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
  const detailMetrics = computed<HmrPostDetailMetric[]>(() => [
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

  function mediaImageSrcset(value: string): string {
    return buildThumbnailSrcset(value)
  }

  return {
    canRetry,
    cardStyle,
    commentsPreview,
    contentTypeLabel,
    detailMetrics,
    hasRenderableMedia,
    heroBody,
    heroEyebrow,
    heroImage,
    heroImageSrcset,
    heroTitle,
    interactionLabel,
    isLoadingState,
    isNotFoundState,
    isRestrictedState,
    isUnavailableState,
    mediaImageSrcset,
    mediaLabel,
    platformLabel,
    platformMark,
    platformVisual,
    post,
    showCommunitySection,
    showContentSections,
    showMediaSection,
    showRelatedSection,
    sourceDescription,
    sourceUrl,
    stateBody,
    stateTitle,
  }
}
