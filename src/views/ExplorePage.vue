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
              @submit.prevent="refreshExplore"
            >
              <label class="hmr-data-field hmr-data-field--search">
                <span>{{ t('explore.search') }}</span>
                <input v-model="query" :placeholder="t('explore.searchPlaceholder')" />
              </label>
              <label class="hmr-data-field">
                <span>{{ t('explore.platform') }}</span>
                <select v-model="platform">
                  <option
                    v-for="item in platformOptions"
                    :key="`select-${item.id}`"
                    :value="item.id"
                  >
                    {{ item.label }}
                  </option>
                </select>
              </label>
              <label class="hmr-data-field">
                <span>{{ t('explore.sort') }}</span>
                <select v-model="sortBy">
                  <option value="published_at">{{ t('explore.sortPublished') }}</option>
                  <option value="scraped_at">{{ t('explore.sortScraped') }}</option>
                  <option value="view_count">{{ t('explore.sortViews') }}</option>
                  <option value="like_count">{{ t('explore.sortLikes') }}</option>
                  <option value="comment_count">{{ t('explore.sortComments') }}</option>
                </select>
              </label>
              <label class="hmr-data-field">
                <span>{{ t('explore.type') }}</span>
                <select v-model="contentKind">
                  <option value="all">{{ t('explore.kindAll') }}</option>
                  <option value="media">{{ t('explore.kindMedia') }}</option>
                  <option value="text">{{ t('explore.kindText') }}</option>
                </select>
              </label>
              <label class="hmr-data-field">
                <span>{{ t('explore.duration') }}</span>
                <select v-model="durationRange">
                  <option value="all">{{ t('explore.durationAll') }}</option>
                  <option value="short">{{ t('explore.durationShort') }}</option>
                  <option value="medium">{{ t('explore.durationMedium') }}</option>
                  <option value="long">{{ t('explore.durationLong') }}</option>
                </select>
              </label>
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
import { useI18n } from 'vue-i18n'

import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import HmrPostCard from '@/hmr/components/HmrPostCard.vue'
import { useHmrExploreCatalog } from '@/hmr/composables/useHmrExploreCatalog'
import { useHmrMountedResourceRefresh } from '@/hmr/composables/useHmrRouteResourceRefresh'

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

useHmrMountedResourceRefresh(refreshExplore)
</script>
