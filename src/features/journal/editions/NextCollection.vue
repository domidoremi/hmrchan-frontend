<template>
  <section
    :ref="setCollection"
    class="next-collection"
    :class="{ 'is-index': view === 'list', compact }"
    tabindex="-1"
    @keydown="keydown"
  >
    <header class="next-collection-heading">
      <div>
        <h2>
          {{
            t(
              favorites
                ? 'journal.nav.collection'
                : view === 'list'
                  ? 'journal.next.index'
                  : 'journal.next.gallery'
            )
          }}
          <span
            class="meta-count"
            :aria-label="countUnknown ? t('journal.browse.countUnknown') : undefined"
          >
            {{ countUnknown ? '—' : posts.length }}
          </span>
        </h2>
      </div>
      <div
        class="next-view-toggle"
        role="group"
        data-indicator
        :aria-label="t('journal.next.view')"
      >
        <button
          type="button"
          :class="{ active: view === 'grid' }"
          :aria-pressed="view === 'grid'"
          :aria-label="t('journal.next.gallery')"
          :title="t('journal.next.gallery')"
          @click="changeView('grid')"
        >
          <JournalIcon name="grid" />
        </button>
        <button
          type="button"
          :class="{ active: view === 'list' }"
          :aria-pressed="view === 'list'"
          :aria-label="t('journal.next.index')"
          :title="t('journal.next.index')"
          @click="changeView('list')"
        >
          <JournalIcon name="list" />
        </button>
      </div>
    </header>
    <div class="next-collection-filters">
      <div
        class="stream-tabs chips"
        role="group"
        data-indicator
        :aria-label="t('journal.filters.source')"
      >
        <button
          class="chip"
          :class="{ active: platform === 'all' }"
          :aria-pressed="platform === 'all'"
          @click="$emit('change', 'platform', 'all')"
        >
          {{ t('journal.home.allSources') }}
        </button>
        <button
          v-for="source in sources"
          :key="source.key"
          class="chip"
          :class="{ active: platform === source.key }"
          :aria-pressed="platform === source.key"
          @click="$emit('change', 'platform', source.key)"
        >
          {{ journalSourceLabel(source.key, source.label, t) }}
        </button>
      </div>
      <div class="next-filter-selects archive-querybar">
        <label v-if="showType">
          <span class="sr-only">{{ t('journal.filters.contentType') }}</span>
          <select
            :value="contentType"
            @change="$emit('change', 'type', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="type in ['全部', '写真', '文字', '节目']" :key="type" :value="type">
              {{ journalContentTypeLabel(type, t) }}
            </option>
          </select>
        </label>
        <label>
          <span class="sr-only">{{ t('explore.sortBy') }}</span>
          <select
            :value="sort"
            @change="$emit('change', 'sort', ($event.target as HTMLSelectElement).value)"
          >
            <option value="latest">{{ t('explore.newest') }}</option>
            <option value="popular">{{ t('journal.filters.mostLiked') }}</option>
          </select>
        </label>
        <button v-if="hasFilters" class="text-button" @click="$emit('reset', $event)">
          {{ t('common.clear') }}<JournalIcon name="x" />
        </button>
      </div>
    </div>
    <div
      v-if="hasFilters"
      class="next-filter-summary active-query-summary"
      :aria-label="t('journal.filters.active')"
    >
      <button
        v-for="filter in activeFilters"
        :key="filter.key"
        class="chip"
        :aria-label="t('journal.filters.remove', { filter: filter.label })"
        @click="$emit('change', filter.key, filter.reset, $event)"
      >
        {{ filter.label }}<JournalIcon name="x" />
      </button>
    </div>
    <div v-if="view === 'grid'" class="next-gallery" :aria-busy="readState === 'loading'">
      <article
        v-for="post in posts"
        :key="post.id"
        class="post-card next-gallery-card"
        :class="{ 'next-gallery-text': !post.image }"
        :data-post="post.id"
      >
        <button
          class="next-gallery-media"
          :data-open="post.id"
          :data-select-post="post.id"
          :aria-label="post.title"
          @focus="select(post.id)"
        >
          <JournalImage
            v-if="post.image"
            :src="post.image"
            :original-src="post.originalImage"
            :alt="post.title"
            width="640"
            height="760"
            loading="lazy"
          />
          <span v-else class="next-gallery-quote">{{ post.text || post.title }}</span>
          <span class="next-gallery-caption">
            <small
              >{{
                journalSourceLabel(post.platform, platforms[post.platform] || post.platform, t)
              }}
              · {{ post.author }}<time>{{ journalPostTimeLabel(post, t, locale) }}</time></small
            >
            <b>{{ post.title }}</b>
          </span>
        </button>
        <button
          class="icon-button post-save"
          :class="{ saved: savedPosts.has(post.id) }"
          :aria-pressed="savedPosts.has(post.id)"
          :aria-label="
            t(
              savedPosts.has(post.id)
                ? 'journal.actions.removeFavorite'
                : 'journal.actions.addFavorite',
              { title: post.title }
            )
          "
          @click="$emit('save', post, $event)"
        >
          <JournalIcon name="bookmark" />
        </button>
      </article>
    </div>
    <div v-else class="next-index-browser">
      <section class="archive-results">
        <ArchiveNavigationHint
          v-if="posts.length"
          :index="index"
          :total="posts.length"
          :preview-id="previewId"
          :title="selected?.title"
          :state="readState"
        />
        <div class="archive-result-list" :aria-busy="readState === 'loading'">
          <button
            v-for="post in posts"
            :key="post.id"
            class="archive-result-row"
            :class="{ selected: selectedId === post.id }"
            :data-post="post.id"
            :data-select-post="post.id"
            :aria-pressed="selectedId === post.id"
            :aria-controls="previewId"
            :aria-describedby="`${previewId}-hint`"
            :tabindex="selectedId === post.id ? 0 : -1"
            @click="select(post.id)"
          >
            <JournalImage
              v-if="post.image"
              :src="post.image"
              :original-src="post.originalImage"
              alt=""
              width="50"
              height="62"
              loading="lazy"
              :upgrade="false"
            />
            <span v-else class="result-text-icon"><JournalIcon name="file" /></span>
            <span class="result-title"
              ><b>{{ post.title }}</b>
              <span class="result-byline">
                <span v-if="post.author">{{ post.author }}</span>
                <span>{{
                  journalSourceLabel(post.platform, platforms[post.platform] || post.platform, t)
                }}</span>
                <time>{{ journalPostTimeLabel(post, t, locale) }}</time>
              </span>
            </span>
            <JournalIcon name="chevron" />
          </button>
        </div>
      </section>
      <aside
        :id="previewId"
        :ref="setPreview"
        class="archive-inspector"
        :aria-label="t('post.preview')"
      >
        <div class="inspector-heading">
          <JournalIcon name="file" aria-hidden="true" />
          <span class="next-preview-position" v-if="selected">
            {{ String(index + 1).padStart(2, '0') }} / {{ String(posts.length).padStart(2, '0') }}
          </span>
          <button
            class="text-button"
            :disabled="!selected"
            :data-open="selected?.id"
            data-preview-open
          >
            {{ t('journal.actions.open') }}<JournalIcon name="arrow-up-right" />
          </button>
        </div>
        <ArchivePreview
          spatial
          :post="selected"
          :state="readState"
          :saved="Boolean(selected && savedPosts.has(selected.id))"
          @preview-enter="previewEnter"
          @save="(post, event) => $emit('save', post, event)"
        />
      </aside>
    </div>
    <template v-if="$slots['empty'] && $slots['state']">
      <slot v-if="!posts.length && readState === 'ready'" name="empty" /><slot name="state" />
    </template>
    <slot v-else-if="!posts.length && readState === 'ready' && $slots['empty']" name="empty" />
    <slot v-else-if="readState !== 'ready' && $slots['state']" name="state" />
    <JournalBrowseState
      v-else
      :state="readState"
      :has-posts="posts.length > 0"
      :has-any-posts="allPosts.length > 0"
      :has-filters="hasFilters"
      :favorites="favorites"
      v-bind="retry ? { retry } : {}"
      @retry="$emit('retry')"
      @adjust="$emit('adjust')"
      @explore="$emit('explore')"
      @reset="$emit('reset')"
      @settled="focusResults"
    />
    <div v-if="hasMore" class="load-more">
      <button class="button" :disabled="loading" @click="$emit('more')">
        {{ t(loading ? 'common.loading' : 'common.loadMore') }}<JournalIcon name="plus" />
      </button>
    </div>
    <ArchiveSelectionDock
      v-if="view === 'list'"
      :post="selected"
      :index="index"
      :total="posts.length"
      :visible="!previewVisible"
      @step="step"
      @preview="showPreview"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { journalKey } from '../context'
import { journalContentTypeLabel, journalSourceLabel } from '../controlLabels'
import { journalPostTimeLabel } from '../localizedPostTime'
import { sourceGroups } from '../presentation'
import { platforms, type JournalPost } from '../models'
import type { JournalResourceState } from '../resourceState'
import { readDisplayPreference } from '../displayPreferences'
import JournalIcon from '../JournalIcon.vue'
import JournalImage from '../JournalImage.vue'
import JournalBrowseState from '../JournalBrowseState.vue'
import ArchivePreview from './ArchivePreview.vue'
import ArchiveNavigationHint from './ArchiveNavigationHint.vue'
import ArchiveSelectionDock from './ArchiveSelectionDock.vue'
import { useArchiveNavigation } from './useArchiveNavigation'
import { useCollectionScroll } from './useCollectionScroll'

const props = withDefaults(
  defineProps<{
    posts: JournalPost[]
    allPosts: JournalPost[]
    savedPosts: Set<string>
    platform: string
    sort: string
    layout?: string | undefined
    query?: string
    contentType?: string
    showType?: boolean
    favorites?: boolean
    loading?: boolean
    hasMore?: boolean
    state?: JournalResourceState | undefined
    retry?: (() => Promise<void>) | undefined
  }>(),
  {
    layout: 'grid',
    query: '',
    contentType: '全部',
    showType: false,
    favorites: false,
    loading: false,
    hasMore: false,
    state: 'ready',
  }
)
const emit = defineEmits<{
  change: [key: string, value: string, event?: MouseEvent]
  reset: [event?: MouseEvent]
  retry: []
  more: []
  explore: []
  adjust: []
  open: [post: JournalPost]
  save: [post: JournalPost, event: MouseEvent]
}>()
const { locale, t } = useI18n({ useScope: 'global' })
const runtime = inject(journalKey, shallowRef(null))
const collection = ref<HTMLElement>()
const view = ref(props.layout === 'list' ? 'list' : 'grid')
const compact = ref(readDisplayPreference('density') === 'compact')
const sources = computed(() => {
  const values = sourceGroups(props.allPosts)
  if (props.platform !== 'all' && !values.some((source) => source.key === props.platform))
    values.push({
      key: props.platform,
      label: platforms[props.platform] || props.platform,
      count: 0,
    })
  return values
})
const readState = computed(() => (props.loading ? 'loading' : props.state))
const countUnknown = computed(() => !props.allPosts.length && readState.value !== 'ready')
const activeFilters = computed(() => [
  ...(props.query
    ? [{ key: 'q', label: t('journal.filters.querySummary', { query: props.query }), reset: '' }]
    : []),
  ...(props.platform !== 'all'
    ? [
        {
          key: 'platform',
          label: t('journal.filters.sourceSummary', {
            source: journalSourceLabel(
              props.platform,
              platforms[props.platform] || props.platform,
              t
            ),
          }),
          reset: 'all',
        },
      ]
    : []),
  ...(props.contentType !== '全部'
    ? [
        {
          key: 'type',
          label: t('journal.filters.typeSummary', {
            type: journalContentTypeLabel(props.contentType, t),
          }),
          reset: '全部',
        },
      ]
    : []),
  ...(props.sort !== 'latest'
    ? [
        {
          key: 'sort',
          label: t('journal.filters.sortSummary', { sort: t('journal.filters.mostLiked') }),
          reset: 'latest',
        },
      ]
    : []),
])
const hasFilters = computed(() => activeFilters.value.length > 0)
const {
  selected,
  selectedId,
  previewId,
  index,
  step,
  setRoot,
  setPreview,
  previewVisible,
  select,
  keydown,
  showPreview,
} = useArchiveNavigation(
  computed(() => props.posts),
  (post) => emit('open', post)
)
useCollectionScroll(
  collection,
  index,
  () => props.posts.length,
  (next) => {
    const post = props.posts[next]
    if (post) select(post.id)
  }
)
function previewEnter(face: Element) {
  if (view.value !== 'list' || face.getAttribute('data-post') !== selectedId.value) return
  const thumbnail = collection.value?.querySelector<HTMLImageElement>(
    '.archive-result-row.selected img'
  )
  runtime.value?.SpatialMotion.preview?.(thumbnail, face.querySelector('.preview-media img'))
}
watch([selectedId, view], () => runtime.value?.SpatialMotion.stopPreview?.(), { flush: 'sync' })
onBeforeUnmount(() => runtime.value?.SpatialMotion.stopPreview?.())
function setCollection(element: unknown) {
  collection.value = element instanceof HTMLElement ? element : undefined
  setRoot(element)
}
async function animateLayout(update: () => void) {
  const root = collection.value
  const change = async () => {
    update()
    await nextTick()
  }
  if (root && runtime.value) await runtime.value.SpatialMotion.layout(root, change)
  else await change()
}
function changeView(next: string) {
  if (next === view.value) return
  void animateLayout(() => {
    view.value = next
    emit('change', 'view', next)
  })
}
watch(
  () => props.layout,
  (next) => {
    const mode = next === 'list' ? 'list' : 'grid'
    if (mode !== view.value)
      void animateLayout(() => {
        view.value = mode
      })
  }
)
watch(
  () => props.posts,
  () => {
    void animateLayout(() => {})
  },
  { flush: 'pre' }
)
function syncDensity() {
  compact.value = document.body.dataset['archiveDensity'] === 'compact'
}
async function focusResults(trigger: HTMLButtonElement) {
  await nextTick()
  if (
    !collection.value?.isConnected ||
    (document.activeElement !== trigger && document.activeElement !== document.body)
  )
    return
  collection.value
    .querySelector<HTMLButtonElement>(
      view.value === 'list' ? '[data-select-post][aria-pressed="true"]' : '[data-select-post]'
    )
    ?.focus({ preventScroll: true })
}
onMounted(() => document.addEventListener('journaldisplaychange', syncDensity))
onBeforeUnmount(() => document.removeEventListener('journaldisplaychange', syncDensity))
</script>
