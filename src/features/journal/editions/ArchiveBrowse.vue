<template>
  <div :ref="setRoot" @keydown="keydown" class="archive-page archive-browse">
    <header class="archive-page-title" data-reveal>
      <div>
        <span class="eyebrow">{{
          t(favorites ? 'journal.nav.collection' : 'journal.browse.searchAndFilter')
        }}</span>
        <h1>
          {{ t(favorites ? 'journal.nav.collection' : 'journal.nav.records')
          }}<span class="title-dot">.</span>
        </h1>
      </div>
      <span
        class="meta-count"
        :aria-label="countUnknown ? t('journal.browse.countUnknown') : undefined"
      >
        {{ t('journal.browse.count', { count: countUnknown ? '—' : posts.length }) }}
      </span>
    </header>
    <form class="archive-searchbar" data-reveal @submit.prevent="$emit('change', 'q', search)">
      <JournalIcon name="search" /><input
        id="explore-input"
        ref="searchInput"
        v-model="search"
        type="search"
        :placeholder="t('search.placeholder')"
        :aria-label="t('journal.search.inputLabel')"
      /><button class="button button-dark" type="submit">
        {{ t('common.search') }} <JournalIcon name="arrow" />
      </button>
    </form>
    <div class="archive-querybar">
      <label
        ><span>{{ t('journal.filters.source') }}</span
        ><select
          :value="platform"
          @change="$emit('change', 'platform', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="[key, label] in sourceOptions" :key="key" :value="key">
            {{ label }}
          </option>
        </select></label
      ><label
        ><span>{{ t('journal.filters.contentType') }}</span
        ><select
          :value="contentType"
          @change="$emit('change', 'type', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="type in ['全部', '写真', '文字', '节目']" :key="type" :value="type">
            {{ journalContentTypeLabel(type, t) }}
          </option>
        </select></label
      ><label
        ><span>{{ t('explore.sortBy') }}</span
        ><select
          :value="sort"
          @change="$emit('change', 'sort', ($event.target as HTMLSelectElement).value)"
        >
          <option value="latest">{{ t('explore.newest') }}</option>
          <option value="popular">{{ t('journal.filters.mostLiked') }}</option>
        </select></label
      ><button v-if="activeFilters.length" class="text-button" @click="$emit('reset')">
        {{ t('common.clear') }} <JournalIcon name="x" />
      </button>
      <div class="density-toggle" role="group" :aria-label="t('journal.density.label')">
        <button :aria-pressed="!compact" :class="{ active: !compact }" @click="compact = false">
          {{ t('journal.density.standard') }}</button><button
          :aria-pressed="compact"
          :class="{ active: compact }"
          @click="compact = true"
        >
          {{ t('journal.density.compact') }}
        </button>
      </div>
    </div>
    <div
      v-if="activeFilters.length"
      class="active-query-summary"
      :aria-label="t('journal.filters.active')"
    >
      <span>{{ t('journal.filters.active') }}</span>
      <button
        v-for="filter in activeFilters"
        :key="filter.key"
        :aria-label="t('journal.filters.remove', { filter: filter.label })"
        @click="$emit('change', filter.key, filter.reset)"
      >
        <span>{{ filter.label }}</span><JournalIcon name="x" />
      </button>
    </div>
    <ArchiveNavigationHint
      v-if="posts.length"
      :index="index"
      :total="posts.length"
      :preview-id="previewId"
      :title="selected?.title"
      :state="readState"
    />
    <div class="archive-browser" :class="{ compact }">
      <section class="archive-results" data-reveal>
        <div class="results-table-heading">
          <span>{{ t('journal.browse.postAuthor') }}</span><span>{{
            t('journal.filters.source')
          }}</span
          ><span>{{ t('journal.browse.time') }}</span>
        </div>
        <div class="archive-result-list" :aria-busy="readState === 'loading'">
          <button
            v-for="post in posts"
            :key="post.id"
            class="archive-result-row"
            :class="{ selected: selectedId === post.id }"
            :aria-pressed="selectedId === post.id"
            :data-select-post="post.id"
            :aria-controls="previewId"
            :aria-describedby="`${previewId}-hint`"
            @click="select(post.id)"
            :tabindex="selectedId === post.id ? 0 : -1"
          >
            <JournalImage
              v-if="post.image"
              :src="post.image"
              :original-src="post.originalImage"
              alt=""
              loading="lazy"
              width="50"
              height="62"
            /><span v-else class="result-text-icon"><JournalIcon name="file" /></span
            ><span class="result-title"
              ><b>{{ post.title }}</b
              ><small>{{ post.author }}</small></span
            ><span class="result-source">{{ platforms[post.platform] || post.platform }}</span
            ><time>{{ journalPostTimeLabel(post, t, locale) }}</time
            ><JournalIcon name="chevron" />
          </button>
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
          :has-filters="activeFilters.length > 0"
          :favorites="favorites"
          v-bind="retry ? { retry } : {}"
          @retry="$emit('retry')"
          @adjust="searchInput?.focus()"
          @explore="$emit('explore')"
          @reset="$emit('reset')"
          @settled="focusResults"
        />
        <div v-if="hasMore" class="load-more">
          <button class="button button-outline" :disabled="loading" @click="$emit('more')">
            {{ t(loading ? 'common.loading' : 'common.loadMore') }}<JournalIcon name="plus" />
          </button>
        </div>
      </section>
      <aside
        :id="previewId"
        :ref="setPreview"
        :aria-label="t('post.preview')"
        class="archive-inspector"
      >
        <div class="inspector-heading">
          <span>{{ t('journal.selection.preview') }}</span><span>{{ selected?.type }}</span
          ><button
            class="text-button"
            :disabled="!selected"
            :data-open="selected?.id"
            data-preview-open
          >
            {{ t('journal.actions.open') }} <JournalIcon name="arrow-up-right" />
          </button>
        </div>
        <ArchivePreview
          :post="selected"
          :state="readState"
          :saved="Boolean(selected && savedPosts.has(selected.id))"
          @save="(item, event) => $emit('save', item, event)"
        />
      </aside>
    </div>
    <ArchiveSelectionDock
      :post="selected"
      :index="index"
      :total="posts.length"
      :visible="!previewVisible"
      @step="step"
      @preview="showPreview"
    />
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, nextTick, ref, watch } from 'vue'
import { journalPostTimeLabel } from '../localizedPostTime'
import { platforms, type JournalPost } from '../models'
import { journalContentTypeLabel, journalSourceLabel } from '../controlLabels'
import { sourceGroups } from '../presentation'
import JournalIcon from '../JournalIcon.vue'
import JournalImage from '../JournalImage.vue'
import ArchivePreview from './ArchivePreview.vue'
import ArchiveSelectionDock from './ArchiveSelectionDock.vue'
import { useArchiveNavigation } from './useArchiveNavigation'
import ArchiveNavigationHint from './ArchiveNavigationHint.vue'
import JournalBrowseState from '../JournalBrowseState.vue'
import type { JournalResourceState } from '../resourceState'
const { locale, t } = useI18n({ useScope: 'global' })
const props = defineProps<{
  posts: JournalPost[]
  allPosts: JournalPost[]
  savedPosts: Set<string>
  favorites: boolean
  query: string
  platform: string
  sort: string
  contentType: string
  hasMore: boolean
  loading: boolean
  state?: JournalResourceState
  retry?: () => Promise<void>
}>()
const emit = defineEmits<{
  open: [post: JournalPost]
  change: [key: string, value: string]
  reset: []
  save: [post: JournalPost, event: MouseEvent]
  more: []
  retry: []
  explore: []
}>()
const search = ref(props.query)
const searchInput = ref<HTMLInputElement>()
const readState = computed(() => props.state ?? (props.loading ? 'loading' : 'ready'))
const countUnknown = computed(() => !props.allPosts.length && readState.value !== 'ready')
async function focusResults(trigger: HTMLButtonElement) {
  const scope = trigger.closest('.archive-browse')
  await nextTick()
  if (!scope?.isConnected) return
  if (document.activeElement !== trigger && document.activeElement !== document.body) return
  scope.querySelector<HTMLButtonElement>('[data-select-post][aria-pressed="true"]')?.focus()
}
const compact = ref(false)
try {
  compact.value = localStorage.getItem('momichan-journal:archive-density') === 'compact'
} catch {
  /* Storage may be unavailable. */
}
watch(compact, (value) => {
  try {
    localStorage.setItem('momichan-journal:archive-density', value ? 'compact' : 'standard')
  } catch {
    /* Keep the in-memory preference. */
  }
})
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
          label: t('journal.filters.sortSummary', {
            sort: props.sort === 'popular' ? t('journal.filters.mostLiked') : props.sort,
          }),
          reset: 'latest',
        },
      ]
    : []),
])
watch(
  () => props.query,
  (value) => {
    search.value = value
  }
)
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
const sourceOptions = computed(() => [
  ['all', t('common.all')] as [string, string],
  ...sourceGroups(props.allPosts).map((source): [string, string] => [
    source.key,
    journalSourceLabel(source.key, source.label, t),
  ]),
  ...(props.platform !== 'all' && !props.allPosts.some((post) => post.platform === props.platform)
    ? [
        [
          props.platform,
          journalSourceLabel(props.platform, platforms[props.platform] || props.platform, t),
        ] as [string, string],
      ]
    : []),
])
</script>
