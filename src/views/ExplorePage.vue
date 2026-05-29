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
              class="hmr-data-toolbar hmr-data-toolbar--explore"
              @submit.prevent="submitExploreFilters"
            >
              <label class="hmr-data-field hmr-data-field--search">
                <span>{{ t('explore.search') }}</span>
                <input v-model="query" :placeholder="t('explore.searchPlaceholder')" />
              </label>
              <div class="hmr-data-field hmr-filter-field">
                <span id="hmr-filter-label-platform">{{ t('explore.platform') }}</span>
                <div
                  class="hmr-filter-select"
                  :class="{ 'is-open': openFilterMenu === 'platform' }"
                >
                  <button
                    id="hmr-filter-value-platform"
                    class="hmr-filter-trigger"
                    type="button"
                    aria-haspopup="listbox"
                    :aria-expanded="openFilterMenu === 'platform'"
                    aria-controls="hmr-filter-menu-platform"
                    aria-labelledby="hmr-filter-label-platform hmr-filter-value-platform"
                    @click="toggleFilterMenu('platform')"
                    @keydown.esc.prevent="closeFilterMenu"
                  >
                    {{ selectedFilterLabel(platformFilterOptions, platform) }}
                  </button>
                  <div
                    v-if="openFilterMenu === 'platform'"
                    id="hmr-filter-menu-platform"
                    class="hmr-filter-menu"
                    role="listbox"
                    aria-labelledby="hmr-filter-label-platform"
                  >
                    <button
                      v-for="item in platformFilterOptions"
                      :key="`filter-platform-${item.id}`"
                      class="hmr-filter-option"
                      :class="{ 'is-selected': item.id === platform }"
                      type="button"
                      role="option"
                      :aria-selected="item.id === platform"
                      @click="selectFilterOption('platform', item.id)"
                    >
                      <span>{{ item.label }}</span>
                      <em v-if="typeof item.count === 'number'">{{ item.count }}</em>
                    </button>
                  </div>
                </div>
              </div>
              <div class="hmr-data-field hmr-filter-field">
                <span id="hmr-filter-label-sort">{{ t('explore.sort') }}</span>
                <div class="hmr-filter-select" :class="{ 'is-open': openFilterMenu === 'sort' }">
                  <button
                    id="hmr-filter-value-sort"
                    class="hmr-filter-trigger"
                    type="button"
                    aria-haspopup="listbox"
                    :aria-expanded="openFilterMenu === 'sort'"
                    aria-controls="hmr-filter-menu-sort"
                    aria-labelledby="hmr-filter-label-sort hmr-filter-value-sort"
                    @click="toggleFilterMenu('sort')"
                    @keydown.esc.prevent="closeFilterMenu"
                  >
                    {{ selectedFilterLabel(sortOptions, sortBy) }}
                  </button>
                  <div
                    v-if="openFilterMenu === 'sort'"
                    id="hmr-filter-menu-sort"
                    class="hmr-filter-menu"
                    role="listbox"
                    aria-labelledby="hmr-filter-label-sort"
                  >
                    <button
                      v-for="item in sortOptions"
                      :key="`filter-sort-${item.id}`"
                      class="hmr-filter-option"
                      :class="{ 'is-selected': item.id === sortBy }"
                      type="button"
                      role="option"
                      :aria-selected="item.id === sortBy"
                      @click="selectFilterOption('sort', item.id)"
                    >
                      <span>{{ item.label }}</span>
                    </button>
                  </div>
                </div>
              </div>
              <div class="hmr-data-field hmr-filter-field">
                <span id="hmr-filter-label-kind">{{ t('explore.type') }}</span>
                <div class="hmr-filter-select" :class="{ 'is-open': openFilterMenu === 'kind' }">
                  <button
                    id="hmr-filter-value-kind"
                    class="hmr-filter-trigger"
                    type="button"
                    aria-haspopup="listbox"
                    :aria-expanded="openFilterMenu === 'kind'"
                    aria-controls="hmr-filter-menu-kind"
                    aria-labelledby="hmr-filter-label-kind hmr-filter-value-kind"
                    @click="toggleFilterMenu('kind')"
                    @keydown.esc.prevent="closeFilterMenu"
                  >
                    {{ selectedFilterLabel(contentKindOptions, contentKind) }}
                  </button>
                  <div
                    v-if="openFilterMenu === 'kind'"
                    id="hmr-filter-menu-kind"
                    class="hmr-filter-menu"
                    role="listbox"
                    aria-labelledby="hmr-filter-label-kind"
                  >
                    <button
                      v-for="item in contentKindOptions"
                      :key="`filter-kind-${item.id}`"
                      class="hmr-filter-option"
                      :class="{ 'is-selected': item.id === contentKind }"
                      type="button"
                      role="option"
                      :aria-selected="item.id === contentKind"
                      @click="selectFilterOption('kind', item.id)"
                    >
                      <span>{{ item.label }}</span>
                    </button>
                  </div>
                </div>
              </div>
              <div class="hmr-data-field hmr-filter-field">
                <span id="hmr-filter-label-duration">{{ t('explore.duration') }}</span>
                <div
                  class="hmr-filter-select"
                  :class="{ 'is-open': openFilterMenu === 'duration' }"
                >
                  <button
                    id="hmr-filter-value-duration"
                    class="hmr-filter-trigger"
                    type="button"
                    aria-haspopup="listbox"
                    :aria-expanded="openFilterMenu === 'duration'"
                    aria-controls="hmr-filter-menu-duration"
                    aria-labelledby="hmr-filter-label-duration hmr-filter-value-duration"
                    @click="toggleFilterMenu('duration')"
                    @keydown.esc.prevent="closeFilterMenu"
                  >
                    {{ selectedFilterLabel(durationOptions, durationRange) }}
                  </button>
                  <div
                    v-if="openFilterMenu === 'duration'"
                    id="hmr-filter-menu-duration"
                    class="hmr-filter-menu"
                    role="listbox"
                    aria-labelledby="hmr-filter-label-duration"
                  >
                    <button
                      v-for="item in durationOptions"
                      :key="`filter-duration-${item.id}`"
                      class="hmr-filter-option"
                      :class="{ 'is-selected': item.id === durationRange }"
                      type="button"
                      role="option"
                      :aria-selected="item.id === durationRange"
                      @click="selectFilterOption('duration', item.id)"
                    >
                      <span>{{ item.label }}</span>
                    </button>
                  </div>
                </div>
              </div>
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
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import HmrPostCard from '@/hmr/components/HmrPostCard.vue'
import {
  useHmrExploreCatalog,
  type HmrExploreContentKind,
  type HmrExploreDurationRange,
} from '@/hmr/composables/useHmrExploreCatalog'
import { useHmrMountedResourceRefresh } from '@/hmr/composables/useHmrRouteResourceRefresh'

type ExploreFilterMenuId = 'platform' | 'sort' | 'kind' | 'duration'
type ExploreFilterOption = {
  id: string
  label: string
  count?: number
}

const { t } = useI18n()
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
const platformFilterOptions = computed<ExploreFilterOption[]>(() => platformOptions.value)
const sortOptions = computed<ExploreFilterOption[]>(() => [
  { id: 'published_at', label: t('explore.sortPublished') },
  { id: 'scraped_at', label: t('explore.sortScraped') },
  { id: 'view_count', label: t('explore.sortViews') },
  { id: 'like_count', label: t('explore.sortLikes') },
  { id: 'comment_count', label: t('explore.sortComments') },
])
const contentKindOptions = computed<ExploreFilterOption[]>(() => [
  { id: 'all', label: t('explore.kindAll') },
  { id: 'media', label: t('explore.kindMedia') },
  { id: 'text', label: t('explore.kindText') },
])
const durationOptions = computed<ExploreFilterOption[]>(() => [
  { id: 'all', label: t('explore.durationAll') },
  { id: 'short', label: t('explore.durationShort') },
  { id: 'medium', label: t('explore.durationMedium') },
  { id: 'long', label: t('explore.durationLong') },
])

function selectedFilterLabel(options: ExploreFilterOption[], value: string): string {
  return options.find((item) => item.id === value)?.label ?? value
}

function closeFilterMenu(): void {
  openFilterMenu.value = null
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

useHmrMountedResourceRefresh(refreshExplore)
</script>
