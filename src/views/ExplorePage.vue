<template>
  <div class="hmr-route-page hmr-route-page--explore">
    <header class="hmr-page-hero hmr-page-hero--works">
      <div class="hmr-container hmr-page-hero-container">
        <p class="hmr-kicker">{{ t('explore.eyebrow') }}</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>
          <span>{{ t('explore.title') }}</span>
        </h1>
        <div class="hmr-page-tags" aria-label="Search suggestions">
          <button
            v-for="item in content.suggestions"
            :key="item"
            class="hmr-tag-button"
            type="button"
            @click="applySuggestion(item)"
          >
            {{ item }}
          </button>
        </div>
      </div>
    </header>

    <section class="hmr-section hmr-section--tight hmr-works-catalog" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-works-header">
          <div class="hmr-works-header-main">
            <p class="hmr-kicker">{{ t('explore.allMedia') }}</p>
            <h2 class="hmr-section-title">{{ t('explore.allPosts') }}</h2>
            <form
              class="hmr-data-toolbar hmr-data-toolbar--explore"
              @submit.prevent="refreshExplore"
            >
              <label class="hmr-data-field hmr-data-field--search">
                <span>{{ t('explore.search') }}</span>
                <input v-model="query" :placeholder="t('explore.searchPlaceholder')" />
              </label>
              <label class="hmr-data-field">
                <span>{{ t('explore.platform') }}</span>
                <select v-model="platform">
                  <option
                    v-for="item in platformOptions"
                    :key="`select-${item.id}`"
                    :value="item.id"
                  >
                    {{ item.label }}
                  </option>
                </select>
              </label>
              <label class="hmr-data-field">
                <span>{{ t('explore.sort') }}</span>
                <select v-model="sortBy">
                  <option value="published_at">{{ t('explore.sortPublished') }}</option>
                  <option value="scraped_at">{{ t('explore.sortScraped') }}</option>
                  <option value="view_count">{{ t('explore.sortViews') }}</option>
                  <option value="like_count">{{ t('explore.sortLikes') }}</option>
                  <option value="comment_count">{{ t('explore.sortComments') }}</option>
                </select>
              </label>
              <label class="hmr-data-field">
                <span>{{ t('explore.type') }}</span>
                <select v-model="contentKind">
                  <option value="all">{{ t('explore.kindAll') }}</option>
                  <option value="media">{{ t('explore.kindMedia') }}</option>
                  <option value="text">{{ t('explore.kindText') }}</option>
                </select>
              </label>
              <label class="hmr-data-field">
                <span>{{ t('explore.duration') }}</span>
                <select v-model="durationRange">
                  <option value="all">{{ t('explore.durationAll') }}</option>
                  <option value="short">{{ t('explore.durationShort') }}</option>
                  <option value="medium">{{ t('explore.durationMedium') }}</option>
                  <option value="long">{{ t('explore.durationLong') }}</option>
                </select>
              </label>
              <button class="hmr-status-button" type="submit">{{ t('explore.apply') }}</button>
            </form>
          </div>
          <div class="hmr-view-tools" aria-label="探索视图">
            <button
              :class="{ 'is-active': viewMode === 'grid' }"
              type="button"
              @click="viewMode = 'grid'"
            >
              {{ t('explore.grid') }}
            </button>
            <button
              :class="{ 'is-active': viewMode === 'list' }"
              type="button"
              @click="viewMode = 'list'"
            >
              {{ t('explore.list') }}
            </button>
          </div>
        </div>

        <div class="hmr-platform-strip" aria-label="All platform post filters">
          <button
            v-for="item in platformOptions"
            :key="item.id"
            class="hmr-platform-chip"
            :class="{ 'is-active': platform === item.id }"
            type="button"
            @click="applyPlatform(item.id)"
          >
            <span>{{ item.label }}</span>
            <em>{{ item.count }}</em>
          </button>
        </div>

        <div
          v-if="!isFilteredEmpty"
          :class="
            viewMode === 'grid'
              ? 'hmr-featured-grid hmr-featured-grid--cinematic'
              : 'hmr-projects-list'
          "
        >
          <HmrPostCard
            v-for="(post, index) in visiblePosts"
            :key="`explore-post-${post.id}-${index}`"
            :post="post"
            :index="index"
            :variant="viewMode === 'grid' ? 'grid' : 'list'"
            :to="`/posts/${post.id}`"
            :show-footer="true"
          />
        </div>

        <div
          v-else-if="pageState === 'loading'"
          class="hmr-featured-grid hmr-featured-grid--cinematic"
          aria-hidden="true"
        >
          <div v-for="item in 6" :key="item" class="hmr-media-skeleton"></div>
        </div>

        <div v-else class="hmr-empty-panel" aria-label="No matching posts">
          <span aria-hidden="true"></span>
          <button class="hmr-cta" type="button" @click="clearFilters">
            {{ t('explore.clear') }}
          </button>
        </div>

        <div class="hmr-load-more">
          <button
            class="hmr-cta"
            type="button"
            :disabled="pageState === 'loading' || !content.hasMore"
            @click="loadMore"
          >
            {{ content.hasMore ? t('explore.loadMore') : t('explore.end') }}
          </button>
        </div>
      </div>
    </section>

    <section class="hmr-cinema-section hmr-cinema-section--compact" data-hmr-reveal data-hmr-scroll>
      <div class="hmr-cinema-sticky">
        <div class="hmr-cinema-frame" aria-label="媒体预览">
          <div class="hmr-media-ribbon hmr-media-ribbon--floating" aria-hidden="true">
            <div class="hmr-media-ribbon-track">
              <div
                v-for="(post, index) in balancedRibbonPosts"
                :key="`explore-sweep-a-${post.id}-${index}`"
                class="hmr-media-ribbon-card"
                :style="cardStyle(index)"
              >
                <strong>{{ post.tag }}<br />{{ glyphFor(post, index) }}</strong>
              </div>
              <div
                v-for="(post, index) in balancedRibbonPosts"
                :key="`explore-sweep-b-${post.id}-${index}`"
                class="hmr-media-ribbon-card"
                :style="cardStyle(index + 6)"
              >
                <strong>{{ post.tag }}<br />{{ glyphFor(post, index) }}</strong>
              </div>
            </div>
          </div>
          <button class="hmr-cinema-mute" type="button" aria-label="Preview media state">
            <span></span>
          </button>
          <div class="hmr-cinema-timeline" aria-hidden="true">
            <span v-for="item in 6" :key="item"></span>
          </div>
        </div>
      </div>
    </section>

    <section class="hmr-section" data-hmr-reveal>
      <div class="hmr-sticky-split">
        <div class="hmr-sticky-copy">
          <p class="hmr-kicker">{{ t('explore.authors') }}</p>
          <h2 class="hmr-section-title">{{ t('explore.authorTitle') }}</h2>
        </div>
        <div class="hmr-author-strip">
          <article v-for="author in content.authors" :key="author.id" class="hmr-author-chip">
            <div class="hmr-avatar">{{ author.name.slice(0, 1).toUpperCase() }}</div>
            <h3 class="hmr-card-title">{{ author.name }}</h3>
            <p class="hmr-body">{{ author.bio }}</p>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  seedAuthors,
  MOMICHAN_PLATFORMS,
  loadExploreContentResource,
  type HmrExploreContent,
  type HmrPost,
} from '@/api/hmrContent'
import HmrPostCard from '@/hmr/components/HmrPostCard.vue'
import type { HmrAsyncResource, HmrPageState } from '@/hmr/types'
import { readOrCreatePublicSnapshot } from '@/utils/cache/publicSnapshotCache'

const { t } = useI18n()
const viewMode = ref<'grid' | 'list'>('grid')
const query = ref('')
const platform = ref('all')
const sortBy = ref('published_at')
const contentKind = ref<'all' | 'media' | 'text'>('all')
const durationRange = ref<'all' | 'short' | 'medium' | 'long'>('all')
const pageState = ref<HmrPageState>('idle')
const content = ref<HmrExploreContent>({
  posts: [],
  authors: seedAuthors,
  suggestions: [],
  platforms: [],
  nextCursor: null,
  hasMore: false,
  activeQuery: '',
  activePlatform: 'all',
})
const resource = ref<HmrAsyncResource<HmrExploreContent>>({
  state: 'idle',
  data: content.value,
  source: 'local',
  error: null,
  paths: ['/posts/mixed', '/posts', '/authors', '/search/suggestions'],
  updatedAt: null,
})

const colorPairs = [
  ['#ff7722', '#3d2fa9'],
  ['#3d2fa9', '#ff3c34'],
  ['#ffc765', '#ff7722'],
  ['#171412', '#3d2fa9'],
]

const posts = computed(() => {
  return content.value.posts.filter((post): post is HmrPost => Boolean(post))
})
const visiblePosts = computed(() =>
  posts.value.filter((post) => {
    if (!post.id || !post.title.trim()) return false
    const hasMedia = Boolean(post.mediaUrl) || Boolean(post.hasMedia) || (post.mediaCount ?? 0) > 0
    const duration = post.durationSec ?? 0
    const matchesKind =
      contentKind.value === 'all' ||
      (contentKind.value === 'media' && hasMedia) ||
      (contentKind.value === 'text' && !hasMedia)
    const matchesDuration =
      durationRange.value === 'all' ||
      (durationRange.value === 'short' && duration > 0 && duration <= 60) ||
      (durationRange.value === 'medium' && duration > 60 && duration <= 600) ||
      (durationRange.value === 'long' && duration > 600)

    return matchesKind && matchesDuration
  })
)
const balancedRibbonPosts = computed(() => {
  const grouped = new Map<string, HmrPost[]>()
  for (const post of visiblePosts.value) {
    const key = normalizePlatform(post.platform)
    if (!MOMICHAN_PLATFORMS.includes(key as (typeof MOMICHAN_PLATFORMS)[number])) continue
    const bucket = grouped.get(key) ?? []
    bucket.push(post)
    grouped.set(key, bucket)
  }

  const result: HmrPost[] = []
  for (let index = 0; result.length < 8 && index < 8; index += 1) {
    for (const platformId of MOMICHAN_PLATFORMS) {
      const nextPost = grouped.get(platformId)?.[index]
      if (nextPost) result.push(nextPost)
      if (result.length >= 8) break
    }
  }

  return result
})
const isFilteredEmpty = computed(
  () => pageState.value === 'empty' || visiblePosts.value.length === 0
)
const platformOptions = computed(() => {
  if (content.value.platforms.length) return content.value.platforms

  const counts = new Map<string, number>()
  for (const post of visiblePosts.value.length ? visiblePosts.value : posts.value) {
    const key = normalizePlatform(post.platform)
    if (!MOMICHAN_PLATFORMS.includes(key as (typeof MOMICHAN_PLATFORMS)[number])) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [
    { id: 'all', label: '全部平台', count: posts.value.length },
    ...MOMICHAN_PLATFORMS.map((id) => ({
      id,
      label: platformName(id),
      count: counts.get(id) ?? 0,
    })),
  ]
})

function activeOptions(cursor: string | null = null) {
  return {
    query: query.value,
    platform: platform.value,
    sortBy: sortBy.value,
    cursor,
    limit: 12,
  }
}

function glyphFor(post: HmrPost, index: number): string {
  return post.title.trim().slice(0, 1).toUpperCase() || String(index + 1)
}

function platformName(value?: string): string {
  const normalized = normalizePlatform(value)
  const labels: Record<string, string> = {
    showroom: 'Showroom',
    tiktok: 'TikTok',
    twitter: 'X',
    x: 'X',
    youtube: 'YouTube',
    instagram: 'Instagram',
  }

  return labels[normalized] ?? normalized.replace(/[-_]/g, ' ')
}

function normalizePlatform(value?: string): string {
  const normalized = value?.trim().toLowerCase() ?? ''
  return normalized === 'twitter' ? 'x' : normalized
}

function cardStyle(index: number): Record<string, string> {
  const pair = colorPairs[index % colorPairs.length] ?? colorPairs[0]
  return {
    '--hmr-card-start': pair?.[0] ?? '#ff7722',
    '--hmr-card-end': pair?.[1] ?? '#3d2fa9',
  }
}

async function refreshExplore(): Promise<void> {
  pageState.value = 'loading'
  const options = activeOptions()
  const cacheKey = `hmr:explore:${JSON.stringify(options)}:${contentKind.value}:${durationRange.value}`
  const nextResource = await readOrCreatePublicSnapshot(
    cacheKey,
    () => loadExploreContentResource(options),
    'short'
  )
  resource.value = nextResource
  content.value = nextResource.data
  pageState.value = nextResource.data.posts.length ? 'ready' : 'empty'
}

async function loadMore(): Promise<void> {
  if (!content.value.hasMore || pageState.value === 'loading') return

  pageState.value = 'loading'
  const nextResource = await loadExploreContentResource(activeOptions(content.value.nextCursor))
  resource.value = nextResource
  content.value = {
    ...nextResource.data,
    posts: [...content.value.posts, ...nextResource.data.posts],
  }
  pageState.value = content.value.posts.length ? 'ready' : 'empty'
}

function applySuggestion(value: string): void {
  query.value = value
  void refreshExplore()
}

function applyPlatform(value: string): void {
  platform.value = value
  void refreshExplore()
}

function clearFilters(): void {
  query.value = ''
  platform.value = 'all'
  sortBy.value = 'published_at'
  contentKind.value = 'all'
  durationRange.value = 'all'
  void refreshExplore()
}

onMounted(() => {
  void refreshExplore()
})
</script>
