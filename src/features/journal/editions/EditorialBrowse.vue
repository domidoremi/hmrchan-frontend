<template>
  <div class="editorial-page editorial-browse">
    <header class="editorial-page-heading" data-reveal>
      <span class="eyebrow">{{
        t(favorites ? 'journal.nav.collection' : 'journal.browse.index')
      }}</span>
      <div>
        <h1>
          {{ t(favorites ? 'nav.favorites' : 'journal.nav.posts')
          }}<em
            :aria-label="
              countUnknown
                ? t('journal.browse.countUnknown')
                : t('journal.browse.count', { count: posts.length })
            "
          >
            {{ countUnknown ? '—' : String(posts.length).padStart(2, '0') }}
          </em>
        </h1>
        <JournalIcon :name="favorites ? 'bookmark' : 'compass'" />
      </div>
    </header>
    <div class="editorial-browse-toolbar" data-reveal>
      <form class="explore-search" @submit.prevent="$emit('change', 'q', search)">
        <JournalIcon name="search" /><input
          id="explore-input"
          ref="searchInput"
          v-model="search"
          type="search"
          :placeholder="t('search.placeholder')"
          :aria-label="t('journal.search.inputLabel')"
        /><button type="submit" class="icon-button" :aria-label="t('common.search')">
          <JournalIcon name="arrow" />
        </button>
      </form>
      <div class="browse-views" role="group" :aria-label="t('settings.display')">
        <button
          v-for="view in views"
          :key="view.key"
          :class="{ active: layout === view.key }"
          :aria-pressed="layout === view.key"
          :aria-label="t(view.labelKey)"
          @click="$emit('change', 'view', view.key)"
        >
          <JournalIcon :name="view.icon" />
        </button>
      </div>
    </div>
    <div class="browse-filter-row">
      <div class="chips">
        <button
          v-for="[key, label] in sourceOptions"
          :key="key"
          class="chip"
          :class="{ active: platform === key }"
          :aria-pressed="platform === key"
          @click="$emit('change', 'platform', key)"
        >
          {{ label }}
        </button>
      </div>
      <label
        ><span class="sr-only">{{ t('journal.filters.contentType') }}</span
        ><select
          :value="contentType"
          @change="$emit('change', 'type', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="type in ['全部', '写真', '文字', '节目']" :key="type" :value="type">
            {{ journalContentTypeLabel(type, t) }}
          </option>
        </select></label
      ><label
        ><span class="sr-only">{{ t('explore.sortBy') }}</span
        ><select
          :value="sort"
          @change="$emit('change', 'sort', ($event.target as HTMLSelectElement).value)"
        >
          <option value="latest">{{ t('explore.newest') }}</option>
          <option value="popular">{{ t('journal.filters.mostLiked') }}</option>
        </select></label
      ><button
        v-if="query || platform !== 'all' || contentType !== '全部'"
        class="text-button"
        @click="$emit('reset')"
      >
        {{ t('common.clear') }} <JournalIcon name="x" />
      </button>
    </div>
    <div
      ref="grid"
      class="editorial-gallery editorial-grid"
      :class="`layout-${layout}`"
      :aria-busy="readState === 'loading'"
    >
      <JournalPostCard
        v-for="post in posts"
        :key="post.id"
        :post="post"
        :saved="savedPosts.has(post.id)"
        data-reveal
        @save="(item, event) => $emit('save', item, event)"
      />
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
      @adjust="searchInput?.focus()"
      @explore="$emit('explore')"
      @reset="$emit('reset')"
      @settled="focusResults"
    />
    <div v-if="hasMore" class="load-more">
      <button class="button button-outline" :disabled="loading" @click="$emit('more')">
        {{ t(loading ? 'common.loading' : 'journal.browse.continue') }}<JournalIcon name="plus" />
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, ref, watch, nextTick } from 'vue'
import { platforms, type JournalPost } from '../models'
import JournalIcon from '../JournalIcon.vue'
import JournalPostCard from '../JournalPostCard.vue'
import JournalBrowseState from '../JournalBrowseState.vue'
import type { JournalResourceState } from '../resourceState'
import { useJournal } from '../context'
import { journalContentTypeLabel, journalSourceLabel } from '../controlLabels'
import { sourceGroups } from '../presentation'
const { t } = useI18n({ useScope: 'global' })
const props = defineProps<{
  posts: JournalPost[]
  allPosts: JournalPost[]
  savedPosts: Set<string>
  favorites: boolean
  query: string
  platform: string
  sort: string
  contentType: string
  layout: string
  hasMore: boolean
  loading: boolean
  state?: JournalResourceState
  retry?: () => Promise<void>
}>()
defineEmits<{
  change: [key: string, value: string]
  reset: []
  save: [post: JournalPost, event: MouseEvent]
  more: []
  retry: []
  explore: []
}>()
const search = ref(props.query),
  searchInput = ref<HTMLInputElement>(),
  grid = ref<HTMLElement>(),
  runtime = useJournal()
const readState = computed(() => props.state ?? (props.loading ? 'loading' : 'ready'))
const countUnknown = computed(() => !props.allPosts.length && readState.value !== 'ready')
const hasFilters = computed(
  () =>
    Boolean(props.query) ||
    props.platform !== 'all' ||
    props.contentType !== '全部' ||
    props.sort !== 'latest'
)
async function focusResults(trigger: HTMLButtonElement) {
  await nextTick()
  if (document.activeElement !== trigger && document.activeElement !== document.body) return
  grid.value?.querySelector<HTMLButtonElement>('button[data-open]')?.focus()
}
watch(
  () => props.query,
  (value) => {
    search.value = value
  }
)
const views = [
  { key: 'grid', labelKey: 'journal.views.gallery', icon: 'grid' },
  { key: 'wall', labelKey: 'journal.views.wall', icon: 'image' },
  { key: 'list', labelKey: 'journal.views.list', icon: 'list' },
]
watch(
  () => props.layout,
  () => {
    if (grid.value && runtime.value)
      runtime.value.SpatialMotion.layout(grid.value, () => nextTick())
  }
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
