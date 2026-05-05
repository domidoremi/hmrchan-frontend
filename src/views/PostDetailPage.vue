<template>
  <article class="hmr-detail">
    <div class="hmr-detail-hero">
      <div>
        <RouterLink class="hmr-text-link" to="/explore">返回探索</RouterLink>
        <p class="hmr-kicker">{{ post.tag }}</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>{{ post.title }}</h1>
        <p class="hmr-body">{{ post.excerpt }}</p>
        <p class="hmr-meta">
          <span>{{ post.authorName }}</span>
          <span>{{ post.createdAt }}</span>
          <span>{{ post.statsLabel }}</span>
        </p>
        <HmrPageStateBlock
          :loading="pageState === 'loading'"
          :empty="pageState === 'empty'"
          empty-title="内容暂时不可用。"
          empty-body="返回探索页重新打开，或稍后再试。"
          @retry="loadPost"
        />
      </div>
      <div class="hmr-project-media hmr-detail-media" :style="cardStyle" aria-hidden="true">
        <img v-if="heroImage" :src="heroImage" alt="" />
        <span class="hmr-project-glyph">{{ post.title.slice(0, 1).toUpperCase() }}</span>
      </div>
    </div>

    <section class="hmr-section" data-hmr-reveal>
      <div class="hmr-sticky-split">
        <div class="hmr-sticky-copy">
          <p class="hmr-kicker">内容上下文</p>
          <h2 class="hmr-section-title">来源、媒体和回应都在这里。</h2>
        </div>
        <div class="hmr-story-stack">
          <article class="hmr-story-block">
            <p class="hmr-kicker">来源</p>
            <strong>{{ post.platform ?? 'HMRChan' }}</strong>
            <span>{{ post.postUrl ?? '这条内容来自 HMRChan 内容流。' }}</span>
          </article>
          <article class="hmr-story-block">
            <p class="hmr-kicker">互动</p>
            <strong>{{ post.commentCount ?? detail.comments.length }} 条回应</strong>
            <span
              >{{ post.likeCount ?? 0 }} 个社区点赞 ·
              {{ post.mediaCount ?? detail.media.length }} 个媒体资源</span
            >
          </article>
        </div>
      </div>
    </section>

    <section v-if="detail.media.length" class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">媒体</p>
          <h2 class="hmr-section-title">媒体先被看见。</h2>
        </div>
        <div class="hmr-signal-grid hmr-media-grid">
          <a
            v-for="item in detail.media"
            :key="item.id"
            class="hmr-mini-panel hmr-media-tile"
            :href="item.streamUrl"
            target="_blank"
            rel="noreferrer"
          >
            <img :src="item.thumbnailUrl" :alt="item.title" loading="lazy" decoding="async" />
            <p class="hmr-kicker">{{ item.mediaType }}</p>
            <strong>{{ item.title }}</strong>
            <span>打开媒体</span>
          </a>
        </div>
      </div>
    </section>

    <section v-else class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-empty-panel">
          <p class="hmr-kicker">暂无媒体</p>
          <h3>这条内容暂时没有媒体附件。</h3>
          <p>详情仍保留正文、作者、互动数据和评论入口。</p>
        </div>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">评论</p>
          <h2 class="hmr-section-title">回应会继续生长。</h2>
        </div>
        <div class="hmr-list">
          <article v-for="item in detail.comments" :key="item.id" class="hmr-list-row">
            <strong>{{ item.title }}</strong>
            <span>{{ item.excerpt }}</span>
            <em>{{ item.metric }}</em>
          </article>
        </div>
      </div>
    </section>

    <section class="hmr-dark-stage hmr-dark-stage--media" data-hmr-reveal>
      <div class="hmr-section-head">
        <p class="hmr-kicker">相关内容</p>
        <h2 class="hmr-section-title">继续打开下一条。</h2>
      </div>
      <div class="hmr-media-ribbon" aria-hidden="true">
        <div class="hmr-media-ribbon-track">
          <RouterLink
            v-for="(item, index) in detail.relatedPosts"
            :key="`detail-a-${item.id}-${index}`"
            class="hmr-media-ribbon-card"
            :to="`/posts/${item.id}`"
          >
            <strong>{{ item.tag }}<br />{{ index + 1 }}</strong>
          </RouterLink>
          <RouterLink
            v-for="(item, index) in detail.relatedPosts"
            :key="`detail-b-${item.id}-${index}`"
            class="hmr-media-ribbon-card"
            :to="`/posts/${item.id}`"
          >
            <strong>{{ item.tag }}<br />{{ index + 1 }}</strong>
          </RouterLink>
        </div>
      </div>
      <RouterLink class="hmr-text-link hmr-text-link--light" to="/community"
        >进入社区讨论</RouterLink
      >
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import {
  seedCommunity,
  seedPosts,
  loadPostDetailContentResource,
  type HmrPost,
  type HmrPostDetailContent,
} from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import type { HmrAsyncResource, HmrPageState } from '@/hmr/types'

const route = useRoute()
const seedPost: HmrPost = seedPosts[0] ?? {
  id: 'signal-room',
  title: '今日精选内容',
  excerpt: '来自 HMRChan 的最新精选内容。',
  authorName: 'HMRChan',
  tag: '精选',
  createdAt: '刚刚',
  statsLabel: '实时',
}
const post = ref<HmrPost>(seedPost)
const detail = ref<HmrPostDetailContent>({
  post: seedPost,
  relatedPosts: seedPosts,
  comments: seedCommunity,
  media: [],
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
const cardStyle = computed(() => ({
  '--hmr-card-start': '#ff7722',
  '--hmr-card-end': '#3d2fa9',
}))
const heroImage = computed(() => post.value.mediaUrl ?? detail.value.media[0]?.thumbnailUrl)

async function loadPost(): Promise<void> {
  pageState.value = 'loading'
  const id = String(route.params.id ?? 'signal-room')
  const nextResource = await loadPostDetailContentResource(id)
  resource.value = nextResource
  detail.value = nextResource.data
  post.value = detail.value.post
  pageState.value = nextResource.data.post ? 'ready' : 'empty'
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
