<template>
  <div class="archive-page archive-browse next-browse">
    <header class="archive-page-title" data-reveal>
      <div>
        <h1>{{ t(favorites ? 'journal.nav.collection' : 'journal.next.browse') }}</h1>
      </div>
    </header>
    <form
      class="archive-searchbar next-searchbar"
      role="search"
      @submit.prevent="$emit('change', 'q', search.trim())"
    >
      <JournalIcon name="search" />
      <input
        id="explore-input"
        ref="searchInput"
        v-model="search"
        type="search"
        :placeholder="t('search.placeholder')"
        :aria-label="t('journal.search.inputLabel')"
      />
      <button class="button button-dark" type="submit">
        {{ t('common.search') }}<JournalIcon name="arrow" />
      </button>
    </form>
    <NextCollection
      v-bind="collectionProps"
      show-type
      @change="changeFilter"
      @reset="resetFilters"
      @save="(post, event) => $emit('save', post, event)"
      @open="$emit('open', $event)"
      @more="$emit('more')"
      @retry="$emit('retry')"
      @explore="$emit('explore')"
      @adjust="searchInput?.focus()"
    >
      <template v-if="$slots['empty']" #empty><slot name="empty" /></template>
      <template v-if="$slots['state']" #state><slot name="state" /></template>
    </NextCollection>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import JournalIcon from '../JournalIcon.vue'
import NextCollection from './NextCollection.vue'
import { useBrowseFilterFocus } from '../useBrowseFilterFocus'
import type { JournalPost } from '../models'
import type { JournalResourceState } from '../resourceState'
const props = defineProps<{
  posts: JournalPost[]
  allPosts: JournalPost[]
  savedPosts: Set<string>
  favorites: boolean
  query: string
  platform: string
  sort: string
  contentType: string
  layout?: string
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
const { t } = useI18n({ useScope: 'global' })
const collectionProps = computed(() => ({
  posts: props.posts,
  allPosts: props.allPosts,
  savedPosts: props.savedPosts,
  favorites: props.favorites,
  query: props.query,
  platform: props.platform,
  sort: props.sort,
  contentType: props.contentType,
  layout: props.layout ?? 'grid',
  hasMore: props.hasMore,
  loading: props.loading,
  state: props.state ?? (props.loading ? 'loading' : 'ready'),
  ...(props.retry ? { retry: props.retry } : {}),
}))
const search = ref(props.query),
  searchInput = ref<HTMLInputElement>()
const rememberFilterFocus = useBrowseFilterFocus(
  () => [props.query, props.platform, props.contentType, props.sort],
  searchInput
)
function resetFilters(event?: MouseEvent) {
  if (event) rememberFilterFocus(event)
  emit('reset')
}
function changeFilter(key: string, value: string, event?: MouseEvent) {
  if (event) rememberFilterFocus(event)
  emit('change', key, value)
}
watch(
  () => props.query,
  (value) => {
    search.value = value
  }
)
</script>
