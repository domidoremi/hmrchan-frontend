<template>
  <div class="hmr-route-page hmr-route-page--home">
    <header class="hmr-home-hero">
      <div class="hmr-home-hero-grid">
        <div class="hmr-home-hero-copy">
          <p class="hmr-kicker">HMRChan</p>
          <h1 class="hmr-title" data-hmr-text-reveal>
            <span class="hmr-title-line">HMRChan</span>
            <span class="hmr-title-line">媒体入口</span>
          </h1>
          <div class="hmr-marquee" aria-label="HMRChan 内容流">
            <div class="hmr-marquee-track">
              <span v-for="item in marqueeItems" :key="`a-${item}`" class="hmr-marquee-item">
                {{ item }}
              </span>
              <span v-for="item in marqueeItems" :key="`b-${item}`" class="hmr-marquee-item">
                {{ item }}
              </span>
            </div>
          </div>
          <div class="hmr-actions">
            <RouterLink class="hmr-cta" to="/explore">探索媒体</RouterLink>
            <RouterLink class="hmr-text-link" to="/community">社区</RouterLink>
          </div>
        </div>

        <div class="hmr-home-hero-media" data-hmr-reveal>
          <HmrPostCard
            :post="featuredPosts[0] ?? heroSeedPost"
            variant="hero"
            :show-footer="true"
          />
        </div>
      </div>
    </header>

    <section class="hmr-section hmr-home-strip" data-hmr-reveal>
      <div class="hmr-logo-cloud" aria-label="HMRChan loops">
        <div class="hmr-logo-cloud-track">
          <span
            v-for="(item, index) in signalItems"
            :key="`cloud-a-${item}-${index}`"
            class="hmr-logo-cloud-item"
          >
            {{ item }}
          </span>
          <span
            v-for="(item, index) in signalItems"
            :key="`cloud-b-${item}-${index}`"
            class="hmr-logo-cloud-item"
          >
            {{ item }}
          </span>
        </div>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight hmr-home-featured" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-works-header">
          <div class="hmr-works-header-main">
            <p class="hmr-kicker">Now</p>
            <h2 class="hmr-section-title">最新媒体</h2>
          </div>
          <RouterLink class="hmr-text-link" to="/explore">全部</RouterLink>
        </div>

        <div class="hmr-featured-grid hmr-featured-grid--cinematic">
          <HmrPostCard
            v-for="(post, index) in featuredPosts.slice(0, 6)"
            :key="`featured-${post.id}-${index}`"
            :post="post"
            :index="index"
            :to="`/posts/${post.id}`"
            variant="grid"
          />
        </div>

        <div class="hmr-signal-grid hmr-signal-grid--home" data-hmr-reveal>
          <article v-if="pageState === 'loading'" class="hmr-mini-panel hmr-mini-panel--state">
            <p class="hmr-kicker">Loading</p>
            <strong>更新中</strong>
          </article>
          <article v-for="trend in content.trends" :key="trend.title" class="hmr-mini-panel">
            <p class="hmr-kicker">{{ trend.metric }}</p>
            <strong>{{ trend.title }}</strong>
          </article>
        </div>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight hmr-home-stream" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head hmr-section-head--wide">
          <p class="hmr-kicker">Feed</p>
          <h2 class="hmr-section-title">平台媒体</h2>
        </div>
        <div class="hmr-projects-list hmr-home-stream-list">
          <HmrPostCard
            v-for="(post, index) in streamPosts"
            :key="`stream-${post.id}-${index}`"
            :post="post"
            :index="index"
            :to="`/posts/${post.id}`"
            variant="list"
            :show-footer="true"
          />
        </div>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight hmr-home-index" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-home-index-layout">
          <div class="hmr-home-index-copy">
            <p class="hmr-kicker">Index</p>
            <h2 class="hmr-section-title">快速入口</h2>
          </div>
          <div class="hmr-home-index-board">
            <RouterLink
              v-for="(post, index) in featuredPosts.slice(0, 5)"
              :key="`home-index-${post.id}-${index}`"
              class="hmr-home-index-row"
              :to="`/posts/${post.id}`"
            >
              <span>{{ String(index + 1).padStart(2, '0') }}</span>
              <strong>{{ post.title }}</strong>
              <em>{{ post.tag }}</em>
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <section class="hmr-section" data-hmr-reveal>
      <div class="hmr-sticky-split">
        <div class="hmr-sticky-copy">
          <p class="hmr-kicker">Routes</p>
          <h2 class="hmr-section-title">入口</h2>
        </div>
        <div class="hmr-story-stack">
          <article v-for="item in storyBlocks" :key="item.title" class="hmr-story-block">
            <p class="hmr-kicker">{{ item.kicker }}</p>
            <strong>{{ item.title }}</strong>
            <span>{{ item.body }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-actions">
          <RouterLink class="hmr-cta" to="/explore">进入探索</RouterLink>
          <RouterLink class="hmr-text-link" to="/schedule">日程</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import {
  seedCommunity,
  seedPosts,
  seedScheduleItems,
  seedTrends,
  loadHomeContentResource,
  type HmrHomeContent,
  type HmrPost,
} from '@/api/hmrContent'
import HmrPostCard from '@/hmr/components/HmrPostCard.vue'
import type { HmrAsyncResource, HmrPageState } from '@/hmr/types'

const content = ref<HmrHomeContent>({
  featured: seedPosts,
  storyDeck: seedPosts,
  highlights: seedCommunity,
  trends: seedTrends,
  scheduleHighlights: seedScheduleItems,
})
const pageState = ref<HmrPageState>('idle')
const resource = ref<HmrAsyncResource<HmrHomeContent>>({
  state: 'idle',
  data: content.value,
  source: 'local',
  error: null,
  paths: ['/home', '/home/featured', '/community/highlights'],
  updatedAt: null,
})

const heroSeedPost = seedPosts[0] ?? {
  id: 'hero-seed',
  title: '今日精选内容',
  excerpt: '最新精选内容',
  authorName: 'HMRChan',
  tag: '精选',
  createdAt: '今天',
  statsLabel: '实时',
}

const marqueeItems = ['YouTube', 'Instagram', 'X', 'TikTok', 'Showroom', 'Bilibili']
const storyBlocks = [
  {
    kicker: '01 / Home',
    title: '首页',
    body: '最新媒体入口',
  },
  {
    kicker: '02 / 探索',
    title: '探索',
    body: '全平台内容',
  },
  {
    kicker: '03 / Community',
    title: '社区',
    body: '讨论与回复',
  },
  {
    kicker: '04 / Schedule',
    title: '日程',
    body: '发布窗口',
  },
]
const featuredPosts = computed(() => normalizePosts(content.value.featured, 12))
const signalItems = computed(() => [
  ...content.value.trends.map((item) => item.title),
  ...content.value.scheduleHighlights.map((item) => item.phase),
  ...content.value.highlights.map((item) => item.title),
])
const streamPosts = computed(() => normalizePosts(content.value.storyDeck, 3))

function normalizePosts(posts: HmrPost[], count: number): HmrPost[] {
  const source = posts.length ? posts : seedPosts
  return Array.from({ length: count }, (_, index) => source[index % source.length]).filter(
    (post): post is HmrPost => Boolean(post)
  )
}

async function refreshHome(): Promise<void> {
  pageState.value = 'loading'
  resource.value = {
    ...resource.value,
    state: 'loading',
  }
  const nextResource = await loadHomeContentResource()
  resource.value = nextResource
  content.value = nextResource.data
  pageState.value =
    nextResource.data.featured.length ||
    nextResource.data.trends.length ||
    nextResource.data.highlights.length
      ? 'ready'
      : 'empty'
}

onMounted(() => {
  void refreshHome()
})
</script>
