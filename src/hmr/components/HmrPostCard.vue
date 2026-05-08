<template>
  <component
    :is="linkTo ? RouterLink : 'article'"
    class="hmr-project-card hmr-post-card"
    :class="[
      `hmr-post-card--${variant}`,
      {
        'hmr-post-card--generated-poster': !hasRealPoster,
        'hmr-post-card--real-poster': hasRealPoster,
        'is-linked': Boolean(linkTo),
      },
    ]"
    :data-platform="platformKey"
    :style="cardVisualStyle"
    v-bind="linkAttrs"
  >
    <div class="hmr-project-media hmr-post-card__visual">
      <img
        class="hmr-post-card__poster"
        :src="posterUrl"
        :alt="post.title"
        loading="lazy"
        decoding="async"
      />
      <div class="hmr-post-card__shade" aria-hidden="true"></div>
      <div
        class="hmr-post-card__badge-row"
        :style="badgeStyle"
        :aria-label="`${platformLabel} ${mediaKindLabel}`"
        aria-hidden="true"
      >
        <span class="hmr-post-card__badge"></span>
        <span v-if="hasMediaContent" class="hmr-post-card__badge hmr-post-card__badge--solid">
        </span>
      </div>
      <div class="hmr-post-card__stats" :style="statsStyle" aria-hidden="true">
        <span></span>
        <span></span>
      </div>
      <span class="hmr-post-card__platform-mark" :style="platformMarkStyle" aria-hidden="true">
      </span>
      <span class="hmr-post-card__play" aria-hidden="true"><span></span></span>
    </div>

    <div class="hmr-project-info hmr-post-card__content">
      <p class="hmr-meta hmr-post-card__meta">
        <span>{{ post.authorName }}</span>
        <span>{{ post.createdAt }}</span>
      </p>
      <h3 class="hmr-card-title">{{ post.title }}</h3>
      <p v-if="showExcerpt" class="hmr-body hmr-post-card__excerpt">{{ post.excerpt }}</p>
      <p v-if="showFooter" class="hmr-meta hmr-post-card__footer">
        <span>{{ platformLabel }}</span>
        <span>{{ footerMetric }}</span>
      </p>
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import type { HmrPost } from '@/api/hmrContent'

const props = withDefaults(
  defineProps<{
    post: HmrPost
    to?: string
    index?: number
    variant?: 'hero' | 'grid' | 'list' | 'compact'
    showExcerpt?: boolean
    showFooter?: boolean
  }>(),
  {
    index: 0,
    variant: 'grid',
    showExcerpt: true,
    showFooter: true,
  }
)

const palette = {
  instagram: ['#ff7722', '#ff3c34'],
  tiktok: ['#171412', '#3d2fa9'],
  twitter: ['#171412', '#ff7722'],
  showroom: ['#3d2fa9', '#ffc765'],
  youtube: ['#ff3c34', '#ff7722'],
  x: ['#171412', '#ff7722'],
  default: ['#ff7722', '#3d2fa9'],
} as const

const platformLabelMap: Record<string, string> = {
  instagram: 'Instagram',
  showroom: 'Showroom',
  tiktok: 'TikTok',
  twitter: 'X',
  x: 'X',
  youtube: 'YouTube',
  default: 'MomiChan',
}

const linkTo = computed(() => props.to ?? `/posts/${props.post.id}`)
const linkAttrs = computed(() =>
  linkTo.value
    ? {
        to: linkTo.value,
      }
    : {}
)

const platformKey = computed(() => props.post.platform?.trim().toLowerCase() || 'default')
const platformLabel = computed(
  () => platformLabelMap[platformKey.value] ?? platformLabelMap.default ?? 'MomiChan'
)
const colorSet = computed(
  () => palette[platformKey.value as keyof typeof palette] ?? palette.default
)
const cardVisualStyle = computed(() => ({
  '--hmr-card-start': colorSet.value[0],
  '--hmr-card-end': colorSet.value[1],
}))
const badgeStyle = computed(() => ({
  '--hmr-badge-platform': `"${escapeCssContent(platformLabel.value)}"`,
  '--hmr-badge-kind': `"${escapeCssContent(mediaKindLabel.value)}"`,
}))
const statsStyle = computed(() => ({
  '--hmr-stat-primary': `"${escapeCssContent(metricLabel.value)}"`,
  '--hmr-stat-secondary': `"${escapeCssContent(audienceLabel.value)}"`,
}))
const platformMarkStyle = computed(() => ({
  '--hmr-platform-mark': `"${escapeCssContent(platformMark.value)}"`,
}))
const hasRealPoster = computed(() => {
  const value = props.post.mediaUrl?.trim()
  return Boolean(value) && !value?.startsWith('/hmrchan/reference/') && !value?.startsWith('data:')
})
const posterUrl = computed(() => props.post.mediaUrl ?? buildPosterDataUrl())
const hasMediaContent = computed(
  () =>
    props.post.hasMedia ||
    (props.post.mediaCount ?? 0) > 0 ||
    (props.post.fileCount ?? 0) > 0 ||
    typeof props.post.durationSec === 'number'
)
const mediaKindLabel = computed(() => {
  if (typeof props.post.durationSec === 'number' && props.post.durationSec > 0) {
    return formatDuration(props.post.durationSec)
  }
  if (hasMediaContent.value) {
    const count = props.post.mediaCount ?? props.post.fileCount
    return count && count > 1 ? `${count} 媒体` : '媒体'
  }
  return ''
})
const platformMark = computed(() => {
  const marks: Record<string, string> = {
    instagram: 'IG',
    showroom: 'SR',
    tiktok: 'TT',
    twitter: 'X',
    x: 'X',
    youtube: 'YT',
  }

  return marks[platformKey.value] ?? 'M'
})
const metricLabel = computed(() => {
  if (typeof props.post.viewCount === 'number' && props.post.viewCount > 0) {
    return `${formatCompact(props.post.viewCount)} 浏览`
  }
  if (typeof props.post.likeCount === 'number' && props.post.likeCount > 0) {
    return `${formatCompact(props.post.likeCount)} 喜欢`
  }
  return props.post.statsLabel
})
const audienceLabel = computed(() => {
  if (typeof props.post.commentCount === 'number' && props.post.commentCount > 0) {
    return `${formatCompact(props.post.commentCount)} 讨论`
  }
  if (typeof props.post.durationSec === 'number' && props.post.durationSec > 0) {
    return formatDuration(props.post.durationSec)
  }
  if (typeof props.post.mediaCount === 'number' && props.post.mediaCount > 0) {
    return `${props.post.mediaCount} 媒体`
  }
  return props.post.createdAt
})
const footerMetric = computed(() =>
  typeof props.post.commentCount === 'number' && props.post.commentCount > 0
    ? `${formatCompact(props.post.commentCount)} 讨论`
    : props.post.statsLabel
)
const showFooter = computed(() => props.showFooter && props.variant !== 'compact')

function buildPosterDataUrl(): string {
  const [start, end] = colorSet.value
  const author = escapeXml(props.post.authorName)
  const platform = escapeXml(platformLabel.value)
  const tag = escapeXml(props.post.tag)
  const accent = escapeXml(props.post.postType ?? 'media')
  const mark = escapeXml(platformMark.value)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1500" role="img" aria-labelledby="t d">
      <title id="t">${platform} media preview</title>
      <desc id="d">${platform} preview for ${author}</desc>
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
        <radialGradient id="glow" cx="30%" cy="25%" r="80%">
          <stop offset="0%" stop-color="#fff" stop-opacity=".42" />
          <stop offset="55%" stop-color="#fff" stop-opacity=".04" />
          <stop offset="100%" stop-color="#fff" stop-opacity="0" />
        </radialGradient>
        <filter id="soft">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>
      <rect width="1200" height="1500" fill="url(#bg)" />
      <circle cx="955" cy="245" r="330" fill="url(#glow)" />
      <circle cx="250" cy="1190" r="370" fill="rgba(255,255,255,.09)" />
      <rect x="94" y="84" width="1012" height="1332" rx="68" fill="rgba(23,20,18,.18)" stroke="rgba(255,255,255,.24)" stroke-width="6" />
      <rect x="156" y="178" width="888" height="728" rx="48" fill="rgba(251,249,239,.17)" />
      <rect x="196" y="222" width="808" height="540" rx="38" fill="rgba(23,20,18,.28)" />
      <path d="M534 401l184 107-184 107z" fill="#fbf9ef" opacity=".88" />
      <rect x="196" y="806" width="520" height="28" rx="14" fill="rgba(251,249,239,.76)" />
      <rect x="196" y="858" width="712" height="24" rx="12" fill="rgba(251,249,239,.34)" />
      <g opacity=".92">
        <rect x="156" y="980" width="210" height="264" rx="34" fill="rgba(251,249,239,.2)" />
        <rect x="404" y="980" width="210" height="264" rx="34" fill="rgba(251,249,239,.34)" />
        <rect x="652" y="980" width="210" height="264" rx="34" fill="rgba(251,249,239,.18)" />
        <rect x="900" y="980" width="144" height="264" rx="34" fill="rgba(251,249,239,.26)" />
      </g>
      <circle cx="946" cy="1292" r="112" fill="rgba(251,249,239,.16)" filter="url(#soft)" />
      <g fill="#fbf9ef">
        <text x="156" y="142" font-family="Arial, sans-serif" font-size="56" font-weight="700" letter-spacing="4">${platform}</text>
        <text x="156" y="1342" font-family="Arial, sans-serif" font-size="58" font-weight="700" opacity=".82">${author}</text>
        <text x="940" y="137" text-anchor="end" font-family="Arial, sans-serif" font-size="54" font-weight="900" opacity=".92">${mark}</text>
        <text x="156" y="930" font-family="Arial, sans-serif" font-size="48" font-weight="700" opacity=".72">${tag} · ${accent}</text>
      </g>
    </svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function formatCompact(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(value)
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const rest = safeSeconds % 60

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const hourMinutes = minutes % 60
    return `${hours}:${String(hourMinutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
  }

  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function escapeCssContent(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}
</script>
