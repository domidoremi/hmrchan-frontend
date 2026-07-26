<template>
  <article class="hmr-detail hmr-detail--reader author-detail-page">
    <header class="hmr-detail-reader-hero">
      <div class="hmr-detail-reader-copy">
        <RouterLink class="hmr-text-link hmr-detail-back" to="/explore">
          Back to Explore
        </RouterLink>
        <p class="hmr-kicker">Creator profile</p>
        <h1 class="hmr-detail-title" data-hmr-text-reveal>{{ authorName }}</h1>
        <p class="hmr-detail-lede">{{ authorBio }}</p>

        <div class="hmr-detail-meta-grid" role="list" aria-label="Creator information">
          <div class="hmr-detail-meta-card" role="listitem">
            <span>Profile</span>
            <strong>Public creator</strong>
          </div>
          <div class="hmr-detail-meta-card" role="listitem">
            <span>Creator ID</span>
            <strong>{{ content.id || authorId }}</strong>
          </div>
        </div>

        <HmrPageStateBlock
          :loading="pageState === 'loading'"
          :empty="pageState === 'empty'"
          :error="pageState === 'error' ? resource.error : null"
          title="Creator profile unavailable"
          body="This public creator profile could not be loaded. Continue from Explore or try again."
          loading-title="Loading creator profile"
          loading-body="Fetching the latest public creator information."
          empty-title="Creator not found"
          empty-body="This creator profile is no longer available."
          error-title="Creator profile unavailable"
          error-body="The public creator service is temporarily unavailable."
          :show-retry="pageState === 'error'"
          retry-label="Try again"
          @retry="loadAuthor"
        />
      </div>

      <aside class="hmr-detail-cover" :class="{ 'is-muted': pageState !== 'ready' }">
        <div class="hmr-detail-cover-media">
          <HmrPriorityImage
            v-if="content.avatarUrl"
            :src="content.avatarUrl"
            :alt="authorName"
            sizes="(min-width: 64em) 34vw, 92vw"
            loading="eager"
            fetch-priority="high"
          />
          <span v-else>{{ authorInitial }}</span>
        </div>
        <div class="hmr-detail-cover-caption">
          <span>Creator</span>
          <strong>{{ pageState === 'ready' ? 'Public profile' : 'Profile lookup' }}</strong>
        </div>
      </aside>
    </header>

    <section v-if="pageState === 'ready'" class="hmr-detail-reader-section" data-hmr-reveal>
      <div class="hmr-detail-reader-grid">
        <aside class="hmr-detail-sidebar">
          <div class="hmr-detail-source-card">
            <p class="hmr-kicker">Continue browsing</p>
            <strong>Public creator activity</strong>
            <span>Find recent posts and related signals from Explore.</span>
            <RouterLink class="hmr-text-link" to="/explore">Open Explore</RouterLink>
          </div>
        </aside>

        <div class="hmr-detail-prose">
          <p class="hmr-kicker">About</p>
          <h2>{{ authorName }}</h2>
          <p>{{ authorBio }}</p>
        </div>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { loadAuthorDetailContentResource, type HmrAuthor } from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import HmrPriorityImage from '@/hmr/components/HmrPriorityImage.vue'
import { useHmrPublicContentResource } from '@/hmr/composables/useHmrPublicContentResource'
import {
  normalizeHmrRouteParam,
  useHmrRouteResourceRefresh,
} from '@/hmr/composables/useHmrRouteResourceRefresh'

const route = useRoute()
const initialAuthor: HmrAuthor = {
  id: '',
  name: '',
  bio: '',
}

function authorId(): string {
  return normalizeHmrRouteParam(route.params['id'], '')
}

const {
  content,
  pageState,
  resource,
  refresh: loadAuthor,
} = useHmrPublicContentResource<HmrAuthor>({
  initialData: initialAuthor,
  paths: ['/authors/:id'],
  cacheKey: () => `hmr:author-detail:${authorId()}`,
  scope: 'author-detail',
  strategy: 'stale-while-revalidate',
  loader: () => loadAuthorDetailContentResource(authorId()),
  resolvePageState: (data, nextResource) => {
    if (nextResource.error?.kind === 'not-found') return 'empty'
    if (nextResource.error) return 'error'
    return data.id && data.name ? 'ready' : 'empty'
  },
})

const authorName = computed(() => content.value.name || 'Creator profile')
const authorBio = computed(
  () => content.value.bio || 'Public creator information will appear here when available.'
)
const authorInitial = computed(() => authorName.value.slice(0, 1).toUpperCase() || 'M')

useHmrRouteResourceRefresh({
  refresh: loadAuthor,
  watchSource: () => route.params['id'],
})
</script>
