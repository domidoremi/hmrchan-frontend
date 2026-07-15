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
              ref="filterToolbarRef"
              class="hmr-data-toolbar hmr-data-toolbar--explore"
              @submit.prevent="submitExploreFilters"
            >
              <label class="hmr-data-field hmr-data-field--search">
                <span>{{ t('explore.search') }}</span>
                <input v-model="query" :placeholder="t('explore.searchPlaceholder')" />
              </label>
              <HmrFilterSelect
                filter-id="platform"
                :label="t('explore.platform')"
                :model-value="platform"
                :open="openFilterMenu === 'platform'"
                :options="platformFilterOptions"
                @close="closeFilterMenu"
                @select="selectFilterOption('platform', $event)"
                @toggle="toggleFilterMenu('platform')"
              />
              <HmrFilterSelect
                filter-id="sort"
                :label="t('explore.sort')"
                :model-value="sortBy"
                :open="openFilterMenu === 'sort'"
                :options="sortOptions"
                @close="closeFilterMenu"
                @select="selectFilterOption('sort', $event)"
                @toggle="toggleFilterMenu('sort')"
              />
              <HmrFilterSelect
                filter-id="kind"
                :label="t('explore.type')"
                :model-value="contentKind"
                :open="openFilterMenu === 'kind'"
                :options="contentKindOptions"
                @close="closeFilterMenu"
                @select="selectFilterOption('kind', $event)"
                @toggle="toggleFilterMenu('kind')"
              />
              <HmrFilterSelect
                filter-id="duration"
                :label="t('explore.duration')"
                :model-value="durationRange"
                :open="openFilterMenu === 'duration'"
                :options="durationOptions"
                @close="closeFilterMenu"
                @select="selectFilterOption('duration', $event)"
                @toggle="toggleFilterMenu('duration')"
              />
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

        <HmrPageStateBlock
          v-if="nonBlockingError"
          :error="nonBlockingError"
          error-title="正在显示可用内容"
          error-body="刷新最新公开内容失败，当前列表来自可用缓存或已返回的数据。"
          retry-label="重新加载"
          @retry="refreshExplore"
        />

        <div
          v-if="hasVisiblePosts"
          :class="
            viewMode === 'grid'
              ? 'hmr-featured-grid hmr-featured-grid--cinematic'
              : 'hmr-projects-list'
          "
        >
          <HmrPostCard
            v-for="(post, index) in renderedPosts"
            :key="`explore-post-${post.id}-${index}`"
            :post="post"
            :index="index"
            :variant="viewMode === 'grid' ? 'grid' : 'list'"
            :to="`/posts/${post.id}`"
            :show-footer="true"
            :image-loading="index < 2 ? 'eager' : 'lazy'"
            :image-fetch-priority="index < 2 ? 'high' : 'auto'"
          />
        </div>

        <div
          v-else-if="showLoadingSkeleton"
          class="hmr-featured-grid hmr-featured-grid--cinematic"
          aria-hidden="true"
        >
          <div v-for="item in 6" :key="item" class="hmr-media-skeleton"></div>
        </div>

        <HmrPageStateBlock
          v-else
          :empty="!blockingError"
          :error="blockingError"
          :empty-title="catalogStateTitle"
          :empty-body="catalogStateBody"
          error-title="公开内容暂时不可用"
          error-body="最新公开内容加载失败，稍后重试或检查网络连接。"
          :retry-label="catalogStateActionLabel"
          @retry="handleCatalogStateAction"
        />

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

    <section
      v-if="showDeferredSections"
      class="hmr-cinema-section hmr-cinema-section--compact"
      data-hmr-reveal
      data-hmr-scroll
    >
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

    <section v-if="showDeferredSections" class="hmr-section" data-hmr-reveal>
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import HmrFilterSelect from '@/hmr/components/HmrFilterSelect.vue'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import HmrPostCard from '@/hmr/components/HmrPostCard.vue'
import {
  useHmrExploreCatalog,
  type HmrExploreContentKind,
  type HmrExploreDurationRange,
} from '@/hmr/composables/useHmrExploreCatalog'
import { useHmrMountedResourceRefresh } from '@/hmr/composables/useHmrRouteResourceRefresh'

type ExploreFilterMenuId = 'platform' | 'sort' | 'kind' | 'duration'
const { t } = useI18n({ useScope: 'global' })
const {
  balancedRibbonPosts,
  blockingError,
  cardStyle,
  catalogStateActionLabel,
  catalogStateBody,
  catalogStateTitle,
  content,
  contentKind,
  durationRange,
  glyphFor,
  handleCatalogStateAction,
  hasVisiblePosts,
  loadMore,
  nonBlockingError,
  pageState,
  platform,
  platformOptions,
  query,
  renderedPosts,
  refreshExplore,
  showLoadingSkeleton,
  showDeferredSections,
  sortBy,
  viewMode,
  applyPlatform,
  applySuggestion,
} = useHmrExploreCatalog(t)

const openFilterMenu = ref<ExploreFilterMenuId | null>(null)
const filterToolbarRef = ref<HTMLFormElement | null>(null)
const platformFilterOptions = computed(() => platformOptions.value)
const sortOptions = computed(() => [
  { id: 'published_at', label: t('explore.sortPublished') },
  { id: 'scraped_at', label: t('explore.sortScraped') },
  { id: 'view_count', label: t('explore.sortViews') },
  { id: 'like_count', label: t('explore.sortLikes') },
  { id: 'comment_count', label: t('explore.sortComments') },
])
const contentKindOptions = computed(() => [
  { id: 'all', label: t('explore.kindAll') },
  { id: 'media', label: t('explore.kindMedia') },
  { id: 'text', label: t('explore.kindText') },
])
const durationOptions = computed(() => [
  { id: 'all', label: t('explore.durationAll') },
  { id: 'short', label: t('explore.durationShort') },
  { id: 'medium', label: t('explore.durationMedium') },
  { id: 'long', label: t('explore.durationLong') },
])

function closeFilterMenu(): void {
  openFilterMenu.value = null
}

function handleDocumentPointerDown(event: PointerEvent): void {
  const target = event.target
  if (
    openFilterMenu.value === null ||
    !(target instanceof Node) ||
    filterToolbarRef.value?.contains(target)
  ) {
    return
  }

  closeFilterMenu()
}

function toggleFilterMenu(id: ExploreFilterMenuId): void {
  openFilterMenu.value = openFilterMenu.value === id ? null : id
}

function selectFilterOption(id: ExploreFilterMenuId, value: string): void {
  if (id === 'platform') {
    platform.value = value
  } else if (id === 'sort') {
    sortBy.value = value
  } else if (id === 'kind') {
    contentKind.value = value as HmrExploreContentKind
  } else {
    durationRange.value = value as HmrExploreDurationRange
  }
  closeFilterMenu()
}

function submitExploreFilters(): void {
  closeFilterMenu()
  void refreshExplore()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
})

useHmrMountedResourceRefresh(refreshExplore)
</script>
