<template>
  <div class="hmr-route-page hmr-route-page--home">
    <header class="hmr-home-hero">
      <div class="hmr-home-hero-grid">
        <div class="hmr-home-hero-copy">
          <p class="hmr-kicker">HMRChan</p>
          <h1 class="hmr-title" data-hmr-text-reveal>
            <span class="hmr-title-line">内容、媒体、</span>
            <span class="hmr-title-line">讨论与</span>
            <span class="hmr-title-line">发布入口<span class="hmr-title-mark">©</span></span>
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
          <p class="hmr-body hmr-home-hero-copy__body">
            YouTube、Instagram、X、TikTok、Showroom 的新内容在这里汇合。
          </p>
          <div class="hmr-actions">
            <RouterLink class="hmr-cta" to="/explore">进入探索</RouterLink>
            <RouterLink class="hmr-text-link" to="/community">看社区</RouterLink>
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
            <p class="hmr-kicker">精选内容</p>
            <h2 class="hmr-section-title">今天值得打开的内容。</h2>
          </div>
          <RouterLink class="hmr-text-link" to="/explore">查看全部</RouterLink>
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
            <p class="hmr-kicker">更新中</p>
            <strong>正在整理内容。</strong>
            <span>稍等片刻，今日精选会自动刷新。</span>
          </article>
          <article v-for="trend in content.trends" :key="trend.title" class="hmr-mini-panel">
            <p class="hmr-kicker">{{ trend.metric }}</p>
            <strong>{{ trend.title }}</strong>
            <span>{{ trend.body }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight hmr-home-platforms" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-platform-showcase">
          <article
            v-for="(post, index) in platformShowcasePosts"
            :key="`platform-showcase-${post.id}-${index}`"
            class="hmr-platform-showcase-card"
            :style="cardStyle(index)"
          >
            <p class="hmr-kicker">{{ post.tag }}</p>
            <strong>{{ post.title }}</strong>
            <span>{{ post.statsLabel }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight hmr-home-stream" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head hmr-section-head--wide">
          <p class="hmr-kicker">内容流</p>
          <h2 class="hmr-section-title">全平台媒体排在一起。</h2>
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
            <p class="hmr-kicker">今日索引</p>
            <h2 class="hmr-section-title">先看媒体，再进讨论。</h2>
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

    <section class="hmr-cinema-section" data-hmr-reveal data-hmr-scroll>
      <div class="hmr-cinema-sticky">
        <div class="hmr-cinema-frame" aria-label="HMRChan live preview">
          <div class="hmr-cinema-orbit" aria-hidden="true">
            <span v-for="item in visualStageItems" :key="item">{{ item }}</span>
          </div>
          <div class="hmr-cinema-copy">
            <p class="hmr-kicker">滚动现场</p>
            <h2 class="hmr-section-title">视频、图组、短帖一起滚动。</h2>
            <p class="hmr-body">内容先被看见，再被讨论、收藏和排进下一轮发布。</p>
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
          <p class="hmr-kicker">内容路径</p>
          <h2 class="hmr-section-title">从发现到回应，每一步都有位置。</h2>
          <p class="hmr-body">打开内容、进入讨论、保存线索、等待下一次更新。</p>
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
        <div class="hmr-section-head hmr-section-head--wide">
          <p class="hmr-kicker">讨论流</p>
          <h2 class="hmr-section-title">创作者、讨论和收藏一起流动。</h2>
        </div>
        <div class="hmr-media-ribbon" aria-hidden="true">
          <div class="hmr-media-ribbon-track">
            <div
              v-for="(post, index) in ribbonPosts"
              :key="`ribbon-a-${post.id}-${index}`"
              class="hmr-media-ribbon-card"
              :style="cardStyle(index)"
            >
              <strong>{{ post.tag }}<br />{{ glyphFor(post, index) }}</strong>
            </div>
            <div
              v-for="(post, index) in ribbonPosts"
              :key="`ribbon-b-${post.id}-${index}`"
              class="hmr-media-ribbon-card"
              :style="cardStyle(index + ribbonPosts.length)"
            >
              <strong>{{ post.tag }}<br />{{ glyphFor(post, index) }}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="hmr-section" data-hmr-reveal>
      <div class="hmr-sticky-split">
        <div class="hmr-sticky-copy">
          <p class="hmr-kicker">发布节奏</p>
          <h2 class="hmr-section-title">下一轮发布从这里开始。</h2>
        </div>
        <div class="hmr-list">
          <RouterLink
            v-for="item in workflowItems"
            :key="item.id"
            class="hmr-list-row"
            :to="item.to"
          >
            <strong>{{ item.title }}</strong>
            <span>{{ item.excerpt }}</span>
            <em>{{ item.metric }}</em>
          </RouterLink>
        </div>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-actions">
          <RouterLink class="hmr-cta" to="/join-us">加入 HMRChan</RouterLink>
          <RouterLink class="hmr-text-link" to="/schedule">查看日程</RouterLink>
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
  excerpt: '来自 HMRChan 的最新精选内容。',
  authorName: 'HMRChan',
  tag: '精选',
  createdAt: '今天',
  statsLabel: '实时',
}

const marqueeItems = ['首页精选', '探索', '社区', '日程', '创作者', '故事流']
const visualStageItems = ['精选', '讨论', '发布', '收藏', '作者', '反馈']
const storyBlocks = [
  {
    kicker: '01 / Home',
    title: '先看到重点。',
    body: '首页把今日精选、热度、讨论和日程放到同一条入口。',
  },
  {
    kicker: '02 / 探索',
    title: '再进入媒体流。',
    body: '探索页聚合 YouTube、Instagram、X、TikTok 与 Showroom 内容。',
  },
  {
    kicker: '03 / Community',
    title: '让回应留下来。',
    body: '社区把评论、热帖、反馈和关系变成可继续参与的上下文。',
  },
  {
    kicker: '04 / Schedule',
    title: '等待下一轮更新。',
    body: '日程把巡检、讨论和发布窗口排进清楚的时间线。',
  },
]
const colorPairs = [
  ['#ff7722', '#3d2fa9'],
  ['#ff3c34', '#ffc765'],
  ['#3d2fa9', '#ff7722'],
  ['#171412', '#ff3c34'],
  ['#ffc765', '#3d2fa9'],
  ['#ff7722', '#ff3c34'],
]

const featuredPosts = computed(() => normalizePosts(content.value.featured, 12))
const ribbonPosts = computed(() => normalizePosts(content.value.storyDeck, 5))
const platformShowcasePosts = computed(() => normalizePosts(content.value.featured, 6))
const signalItems = computed(() => [
  ...content.value.trends.map((item) => item.title),
  ...content.value.scheduleHighlights.map((item) => item.phase),
  ...content.value.highlights.map((item) => item.title),
])
const workflowItems = computed(() => [
  ...content.value.highlights.map((item) => ({ ...item, to: '/community' })),
  ...content.value.scheduleHighlights.map((item) => ({
    id: item.id,
    title: item.title,
    excerpt: item.description,
    metric: item.phase,
    to: '/schedule',
  })),
])
const streamPosts = computed(() => normalizePosts(content.value.storyDeck, 4))

function normalizePosts(posts: HmrPost[], count: number): HmrPost[] {
  const source = posts.length ? posts : seedPosts
  return Array.from({ length: count }, (_, index) => source[index % source.length]).filter(
    (post): post is HmrPost => Boolean(post)
  )
}

function glyphFor(post: HmrPost, index: number): string {
  return post.title.trim().slice(0, 1).toUpperCase() || String(index + 1)
}

function cardStyle(index: number): Record<string, string> {
  const pair = colorPairs[index % colorPairs.length] ?? colorPairs[0]
  return {
    '--hmr-card-start': pair?.[0] ?? '#ff7722',
    '--hmr-card-end': pair?.[1] ?? '#3d2fa9',
  }
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
