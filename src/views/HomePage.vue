<template>
  <div class="hmr-route-page hmr-route-page--home">
    <header class="hmr-home-hero">
      <div class="hmr-home-hero-grid">
        <div class="hmr-home-hero-copy">
          <h1 class="hmr-title" data-hmr-text-reveal>
            <span class="hmr-title-line">MomiChan</span>
            <span class="hmr-title-line">媒体入口</span>
          </h1>
          <div class="hmr-home-platform-strip" aria-hidden="true">
            <span
              v-for="item in platformItems"
              :key="item"
              :style="{ '--hmr-platform-name': cssContent(item) }"
            >
            </span>
          </div>
          <div class="hmr-actions">
            <RouterLink class="hmr-cta" to="/explore">探索媒体</RouterLink>
            <RouterLink class="hmr-text-link" to="/community">社区讨论</RouterLink>
          </div>
        </div>

        <div class="hmr-home-hero-media" data-hmr-reveal>
          <HmrPostCard
            v-if="featuredPosts[0]"
            :post="featuredPosts[0]"
            variant="hero"
            :show-footer="false"
          />
          <div v-else class="hmr-media-skeleton hmr-media-skeleton--hero" aria-hidden="true"></div>
        </div>
      </div>
    </header>

    <section class="hmr-section hmr-section--tight hmr-home-featured" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-works-header">
          <div class="hmr-works-header-main">
            <p class="hmr-kicker">最新</p>
            <h2 class="hmr-section-title">最新媒体</h2>
          </div>
          <RouterLink class="hmr-text-link" to="/explore">全部</RouterLink>
        </div>

        <div v-if="featuredPosts.length" class="hmr-featured-grid hmr-featured-grid--cinematic">
          <HmrPostCard
            v-for="(post, index) in featuredPosts.slice(0, 4)"
            :key="`featured-${post.id}-${index}`"
            :post="post"
            :index="index"
            :to="`/posts/${post.id}`"
            variant="grid"
          />
        </div>
        <div v-else class="hmr-featured-grid hmr-featured-grid--cinematic" aria-hidden="true">
          <div v-for="item in 4" :key="item" class="hmr-media-skeleton"></div>
        </div>
      </div>
    </section>

    <section class="hmr-dark-stage hmr-dark-stage--home" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">社区</p>
          <h2 class="hmr-section-title">正在讨论</h2>
        </div>
        <div v-if="content.highlights.length" class="hmr-home-discussion-grid">
          <RouterLink
            v-for="item in content.highlights.slice(0, 3)"
            :key="item.id"
            class="hmr-home-discussion-card"
            :to="item.target ?? '/community'"
          >
            <span>{{ item.metric }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.excerpt }}</p>
          </RouterLink>
        </div>
        <div v-else class="hmr-home-discussion-grid" aria-hidden="true">
          <div v-for="item in 3" :key="item" class="hmr-line-skeleton"></div>
        </div>
        <RouterLink class="hmr-text-link hmr-text-link--light" to="/community">
          进入社区
        </RouterLink>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-home-schedule-panel">
          <div>
            <p class="hmr-kicker">日程</p>
            <h2 class="hmr-section-title">今日窗口</h2>
          </div>
          <div v-if="content.scheduleHighlights.length" class="hmr-home-schedule-list">
            <article v-for="item in content.scheduleHighlights.slice(0, 3)" :key="item.id">
              <span>{{ item.time }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.description }}</p>
            </article>
          </div>
          <div v-else class="hmr-home-schedule-list" aria-hidden="true">
            <div v-for="item in 3" :key="item" class="hmr-line-skeleton"></div>
          </div>
          <RouterLink class="hmr-cta" to="/schedule">查看日程</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { loadHomeContentResource, type HmrHomeContent, type HmrPost } from '@/api/hmrContent'
import HmrPostCard from '@/hmr/components/HmrPostCard.vue'
import type { HmrAsyncResource, HmrPageState } from '@/hmr/types'
import { readOrCreatePublicSnapshot } from '@/utils/cache/publicSnapshotCache'

const content = ref<HmrHomeContent>({
  featured: [],
  storyDeck: [],
  highlights: [],
  trends: [],
  scheduleHighlights: [],
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

const platformItems = ['YouTube', 'Instagram', 'X', 'TikTok', 'Showroom']
const featuredPosts = computed(() => normalizePosts(content.value.featured, 6))

function normalizePosts(posts: HmrPost[], count: number): HmrPost[] {
  return posts.slice(0, count).filter((post): post is HmrPost => Boolean(post))
}

async function refreshHome(): Promise<void> {
  pageState.value = 'loading'
  resource.value = {
    ...resource.value,
    state: 'loading',
  }
  const nextResource = await readOrCreatePublicSnapshot(
    'hmr:home',
    loadHomeContentResource,
    'short'
  )
  resource.value = nextResource
  content.value = nextResource.data
  pageState.value =
    nextResource.data.featured.length ||
    nextResource.data.trends.length ||
    nextResource.data.highlights.length
      ? 'ready'
      : 'empty'
}

function cssContent(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

onMounted(() => {
  void refreshHome()
})
</script>
