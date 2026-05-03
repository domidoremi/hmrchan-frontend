<template>
  <article class="hmr-detail">
    <RouterLink class="hmr-link" to="/explore">{{ t('post.back') }}</RouterLink>
    <div class="hmr-detail-grid">
      <div>
        <p class="hmr-kicker">{{ post.tag }}</p>
        <h1>{{ post.title }}</h1>
        <p>{{ post.excerpt }}</p>
        <div class="hmr-meta-row">
          <span>{{ post.authorName }}</span>
          <span>{{ post.createdAt }}</span>
          <span>{{ post.statsLabel }}</span>
        </div>
      </div>
      <div class="hmr-hero-visual hmr-hero-visual--compact" aria-hidden="true">
        <div class="hmr-floating-tile">
          <span>{{ t('post.discussion') }}</span>
          <strong>{{ post.title }}</strong>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { fallbackPosts, loadPostDetail, type HmrPost } from '@/api/hmrContent'

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const fallbackPost: HmrPost = fallbackPosts[0] ?? {
  id: 'signal-room',
  title: 'Signal Room',
  excerpt: 'A fresh dispatch from the HMRChan community.',
  authorName: 'HMRChan',
  tag: 'Signal',
  createdAt: 'Just now',
  statsLabel: 'Live',
}
const post = ref<HmrPost>(fallbackPost)

async function loadPost(): Promise<void> {
  const id = String(route.params.id ?? 'signal-room')
  post.value = await loadPostDetail(id)
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
