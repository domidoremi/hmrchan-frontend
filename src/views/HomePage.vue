<template>
  <section class="hmr-hero">
    <div class="hmr-hero-copy">
      <p class="hmr-kicker">{{ t('home.eyebrow') }}</p>
      <h1>{{ t('home.title') }}</h1>
      <p>{{ t('home.body') }}</p>
      <div class="hmr-action-row">
        <RouterLink class="hmr-cta hmr-cta--dark" to="/explore">{{ t('home.primary') }}</RouterLink>
        <RouterLink class="hmr-link" to="/community">{{ t('home.secondary') }}</RouterLink>
      </div>
    </div>
    <div class="hmr-hero-visual" aria-hidden="true">
      <div v-for="post in heroPosts" :key="post.id" class="hmr-floating-tile">
        <span>{{ post.tag }}</span>
        <strong>{{ post.title }}</strong>
      </div>
    </div>
  </section>

  <section class="hmr-section">
    <div class="hmr-section-head">
      <p class="hmr-kicker">{{ t('home.featured') }}</p>
      <h2>{{ t('home.stories') }}</h2>
    </div>
    <div class="hmr-story-grid">
      <RouterLink
        v-for="post in content.featured"
        :key="post.id"
        class="hmr-post-card"
        :to="`/posts/${post.id}`"
      >
        <div class="hmr-media-plane">
          <span>{{ post.tag }}</span>
        </div>
        <div>
          <p>{{ post.authorName }} · {{ post.statsLabel }}</p>
          <h3>{{ post.title }}</h3>
          <span>{{ post.excerpt }}</span>
        </div>
      </RouterLink>
    </div>
  </section>

  <section class="hmr-section hmr-section--split">
    <div>
      <p class="hmr-kicker">{{ t('home.pulse') }}</p>
      <h2>{{ t('home.communityTitle') }}</h2>
    </div>
    <div class="hmr-signal-list">
      <RouterLink
        v-for="item in content.highlights"
        :key="item.id"
        class="hmr-signal-row"
        to="/community"
      >
        <strong>{{ item.title }}</strong>
        <span>{{ item.excerpt }}</span>
        <em>{{ item.metric }}</em>
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

import {
  fallbackCommunity,
  fallbackPosts,
  loadHomeContent,
  type HmrHomeContent,
} from '@/api/hmrContent'

const { t } = useI18n({ useScope: 'global' })
const content = ref<HmrHomeContent>({
  featured: fallbackPosts,
  storyDeck: fallbackPosts,
  highlights: fallbackCommunity,
})
const heroPosts = computed(() => content.value.storyDeck.slice(0, 3))

onMounted(async () => {
  content.value = await loadHomeContent()
})
</script>
