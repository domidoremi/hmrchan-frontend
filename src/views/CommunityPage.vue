<template>
  <section class="hmr-page-hero">
    <p class="hmr-kicker">{{ t('community.eyebrow') }}</p>
    <h1>{{ t('community.title') }}</h1>
    <p>{{ t('community.body') }}</p>
  </section>

  <section class="hmr-section hmr-section--split">
    <div>
      <p class="hmr-kicker">{{ t('community.stats') }}</p>
      <h2>{{ t('community.liveTitle') }}</h2>
    </div>
    <div class="hmr-signal-list">
      <article v-for="item in content.stats" :key="item.id" class="hmr-signal-row">
        <strong>{{ item.title }}</strong>
        <span>{{ item.excerpt }}</span>
        <em>{{ item.metric }}</em>
      </article>
    </div>
  </section>

  <section class="hmr-section">
    <div class="hmr-section-head">
      <p class="hmr-kicker">{{ t('community.latest') }}</p>
      <h2>{{ t('community.threadTitle') }}</h2>
    </div>
    <div class="hmr-feed-list">
      <article v-for="item in content.discussions" :key="item.id" class="hmr-post-card">
        <div class="hmr-media-plane hmr-media-plane--small">
          <span>{{ item.metric }}</span>
        </div>
        <div>
          <p>{{ t('community.discussionLabel') }}</p>
          <h3>{{ item.title }}</h3>
          <span>{{ item.excerpt }}</span>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { fallbackCommunity, loadCommunityContent, type HmrCommunityContent } from '@/api/hmrContent'

const { t } = useI18n({ useScope: 'global' })
const content = ref<HmrCommunityContent>({
  stats: fallbackCommunity,
  discussions: fallbackCommunity,
})

onMounted(async () => {
  content.value = await loadCommunityContent()
})
</script>
