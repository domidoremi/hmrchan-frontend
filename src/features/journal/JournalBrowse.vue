<template>
  <div class="page-container edition-browser">
    <div class="page-heading">
      <div>
        <span class="eyebrow">{{
          favorites
            ? 'SAVED / PERSONAL INDEX'
            : `UPDATES / ${String(posts.length).padStart(3, '0')}`
        }}</span>
        <h1>{{ favorites ? '我的收藏' : collectionTitle || '全部动态' }}</h1>
        <p v-if="!favorites">{{ collectionNote || '写真、节目、舞台与日常。' }}</p>
      </div>
      <span class="page-monogram" aria-hidden="true">{{ favorites ? 'm.' : 'Explore.' }}</span>
    </div>
    <div v-if="favorites" id="saved-shelf">
      <section class="saved-shelf">
        <div class="saved-shelf-label">
          <span>YOUR COLLECTION</span><b>{{ String(posts.length).padStart(2, '0') }}</b
          ><small>条收藏</small>
        </div>
        <div class="saved-shelf-stage" :aria-hidden="!covers.length || undefined">
          <template v-if="covers.length"
            ><button
              v-for="(post, index) in covers"
              :key="post.id"
              class="saved-volume"
              :style="{ '--volume': index, '--volumes': covers.length }"
              :data-open="post.id"
              :aria-label="`查看${post.title}`"
            >
              <img :src="post.image || ''" :alt="post.title" width="260" height="340" /><span
                >0{{ index + 1 }}</span
              >
            </button></template
          ><template v-else
            ><div
              v-for="index in 3"
              :key="index"
              class="saved-volume saved-volume-empty"
              :style="{ '--volume': index - 1, '--volumes': 3 }"
            >
              <b>0{{ index }}</b
              ><i>✳</i><span>MOMICHAN</span>
            </div></template
          >
        </div>
        <span class="saved-shelf-word" aria-hidden="true">Saved.</span>
      </section>
    </div>
    <section class="browse-workbench" :aria-label="`${favorites ? '收藏' : '动态'}筛选`">
      <div class="browse-primary">
        <label class="explore-search"
          ><JournalIcon name="search" /><input
            id="explore-input"
            type="search"
            maxlength="100"
            :placeholder="favorites ? '搜索收藏' : '搜索动态、作者、标签'"
            :aria-label="favorites ? '搜索收藏' : '搜索动态、作者或标签'"
            :value="query"
            @input="searchInput"
          /><kbd>/</kbd></label
        ><label class="browse-sort"
          ><span class="sr-only">排序方式</span
          ><select
            class="sort-select"
            :value="sort"
            @change="change('sort', ($event.target as HTMLSelectElement).value)"
          >
            <option value="latest">最新发布</option>
            <option value="popular">最多赞</option>
          </select></label
        ><button
          class="browse-filter-button"
          :aria-expanded="filtersOpen"
          aria-controls="browse-filters"
          @click="filtersOpen = !filtersOpen"
        >
          <JournalIcon name="filter" /><span>筛选</span
          ><b class="filter-number" :hidden="!filters.length">{{ filters.length }}</b></button
        ><button
          class="browse-appearance icon-button"
          data-action="appearance"
          aria-label="显示设置"
        >
          <JournalIcon name="sliders" />
        </button>
      </div>
      <div id="browse-filters" class="browse-filters" :hidden="!filtersOpen">
        <div class="browse-filter-row">
          <span>来源</span>
          <div class="chips" aria-label="按内容来源筛选">
            <button
              v-for="[key, label] in sourceOptions"
              :key="key"
              class="chip"
              :class="{ active: platform === key }"
              :aria-pressed="platform === key"
              @click="change('platform', key)"
            >
              {{ label }}
            </button>
          </div>
        </div>
        <div class="browse-filter-row">
          <span>内容</span>
          <div class="type-filters" aria-label="按内容类型筛选">
            <button
              v-for="type in contentTypes"
              :key="type"
              class="type-filter"
              :class="{ active: contentType === type }"
              :aria-pressed="contentType === type"
              @click="change('type', type)"
            >
              {{ type }}
            </button>
          </div>
        </div>
      </div>
      <div class="filter-summary" :hidden="!filters.length">
        <button
          v-for="[key, label] in filters"
          :key="key"
          class="filter-token"
          :aria-label="`移除筛选：${label}`"
          @click="change(key, '')"
        >
          {{ label }}<JournalIcon name="x" /></button
        ><button class="filter-reset" @click="$emit('reset')">清除全部</button>
      </div>
      <div class="browser-toolbar">
        <p id="results-count" class="results-count" aria-live="polite">
          {{ posts.length }} 条{{ favorites ? '收藏' : '动态' }}
        </p>
        <div class="view-toggle" aria-label="浏览布局">
          <button
            v-for="[value, label, icon] in layouts"
            :key="value"
            :data-layout="value"
            :class="{ active: layout === value }"
            :aria-pressed="layout === value"
            :aria-label="label + '视图'"
            @click="change('view', value)"
          >
            <JournalIcon :name="icon" /><span>{{ label }}</span>
          </button>
        </div>
      </div>
    </section>
    <div
      id="post-results"
      ref="grid"
      class="post-grid explore-grid"
      :class="{ 'view-list': layout === 'list', 'view-wall': layout === 'wall' }"
    >
      <JournalPostCard
        v-for="post in posts"
        :key="post.id"
        :post="post"
        :saved="savedPosts.has(post.id)"
        @save="(post, event) => $emit('save', post, event)"
      /><slot v-if="!posts.length" name="empty" />
    </div>
    <slot name="state" />
    <p v-if="posts.length || hasMore" class="feed-more">
      <button v-if="hasMore" class="text-button" :disabled="loading" @click="$emit('more')">
        {{ loading ? '加载中…' : '更多动态' }} <JournalIcon name="arrow" /></button
      ><span v-else>已显示全部</span>
    </p>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, onBeforeUnmount, nextTick } from 'vue'
import JournalIcon from './JournalIcon.vue'
import JournalPostCard from './JournalPostCard.vue'
import { platforms, contentTypes, type JournalPost } from './models'
import { useJournal } from './context'
const props = defineProps<{
  posts: JournalPost[]
  savedPosts: Set<string>
  favorites: boolean
  query: string
  platform: string
  sort: string
  contentType: string
  layout: string
  collection: string
  hasMore: boolean
  loading: boolean
  fixture: boolean
}>()
const emit = defineEmits<{
  change: [key: string, value: string]
  reset: []
  save: [post: JournalPost, event: MouseEvent]
  more: []
}>()
const runtime = useJournal(),
  grid = ref<HTMLElement>()
const filtersOpen = ref(false)
const sourceOptions = computed(() =>
  props.fixture ? Object.entries(platforms).slice(0, 5) : Object.entries(platforms)
)
const layouts = [
  ['grid', '画廊', 'grid'],
  ['wall', '相纸', 'image'],
  ['list', '列表', 'list'],
] as const
const covers = computed(() => props.posts.filter((post) => post.image).slice(0, 4))
const selectedCollection = computed(() =>
  runtime.value?.Editorial.collections.find((item) => item.id === props.collection)
)
const collectionTitle = computed(() => selectedCollection.value?.title)
const collectionNote = computed(() => selectedCollection.value?.note)
const filters = computed(
  () =>
    [
      [props.query ? 'q' : '', `“${props.query}”`],
      [props.platform !== 'all' ? 'platform' : '', platforms[props.platform] || props.platform],
      [props.contentType !== '全部' ? 'type' : '', props.contentType],
      [props.collection ? 'collection' : '', collectionTitle.value || '合集'],
    ].filter(([key]) => key) as [string, string][]
)
let timer: ReturnType<typeof setTimeout> | undefined
function searchInput(event: Event) {
  clearTimeout(timer)
  const value = (event.target as HTMLInputElement).value
  timer = setTimeout(() => emit('change', 'q', value), 350)
}
function change(key: string, value: string) {
  if (key === 'view' && grid.value) {
    const element = grid.value
    runtime.value?.SpatialMotion.layout(element, () => {
      element.classList.toggle('view-list', value === 'list')
      element.classList.toggle('view-wall', value === 'wall')
    })
  }
  emit('change', key, value)
  void nextTick(() => {
    if (grid.value) runtime.value?.Experience.mount(grid.value)
  })
}
onBeforeUnmount(() => clearTimeout(timer))
</script>
