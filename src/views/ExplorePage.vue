<template>
  <section class="hmr-page-hero">
    <p class="hmr-kicker">{{ t('explore.eyebrow') }}</p>
    <h1>{{ t('explore.title') }}</h1>
    <p>{{ t('explore.body') }}</p>
    <div class="hmr-switch">
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
  </section>

  <section class="hmr-section">
    <div :class="viewMode === 'grid' ? 'hmr-story-grid' : 'hmr-feed-list'">
      <RouterLink
        v-for="post in content.posts"
        :key="post.id"
        class="hmr-post-card"
        :to="`/posts/${post.id}`"
      >
        <div class="hmr-media-plane">
          <span>{{ post.tag }}</span>
        </div>
        <div>
          <p>{{ post.authorName }} · {{ post.createdAt }}</p>
          <h3>{{ post.title }}</h3>
          <span>{{ post.excerpt }}</span>
        </div>
      </RouterLink>
    </div>
  </section>

  <section class="hmr-section">
    <div class="hmr-section-head">
      <p class="hmr-kicker">{{ t('explore.authors') }}</p>
      <h2>{{ t('explore.authorTitle') }}</h2>
    </div>
    <div class="hmr-author-strip">
      <article v-for="author in content.authors" :key="author.id" class="hmr-author-chip">
        <div class="hmr-avatar">{{ author.name.slice(0, 1).toUpperCase() }}</div>
        <strong>{{ author.name }}</strong>
        <span>{{ author.bio }}</span>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

import {
  fallbackAuthors,
  fallbackPosts,
  loadExploreContent,
  type HmrExploreContent,
} from '@/api/hmrContent'

const { t } = useI18n({ useScope: 'global' })
const viewMode = ref<'grid' | 'list'>('grid')
const content = ref<HmrExploreContent>({
  posts: fallbackPosts,
  authors: fallbackAuthors,
})

onMounted(async () => {
  content.value = await loadExploreContent()
})
</script>
