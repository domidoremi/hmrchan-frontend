<template>
  <div :ref="setRoot" @keydown="keydown" class="archive-page archive-browse">
    <header class="archive-page-title" data-reveal>
      <div>
        <span class="eyebrow">{{ favorites ? 'COLLECTION' : 'SEARCH & FILTER' }}</span>
        <h1>{{ favorites ? '我的收藏' : '资料检索' }}<span class="title-dot">.</span></h1>
      </div>
      <span class="meta-count">{{ posts.length }} 项</span>
    </header>
    <form class="archive-searchbar" data-reveal @submit.prevent="$emit('change', 'q', search)">
      <JournalIcon name="search" /><input
        id="explore-input"
        v-model="search"
        type="search"
        placeholder="动态、作者、标签"
        aria-label="搜索动态、作者或标签"
      /><button class="button button-dark" type="submit">搜索 <JournalIcon name="arrow" /></button>
    </form>
    <div class="archive-querybar">
      <label
        ><span>来源</span
        ><select
          :value="platform"
          @change="$emit('change', 'platform', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="[key, label] in sourceOptions" :key="key" :value="key">
            {{ label }}
          </option>
        </select></label
      ><label
        ><span>内容</span
        ><select
          :value="contentType"
          @change="$emit('change', 'type', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="type in ['全部', '写真', '文字', '节目']" :key="type">{{ type }}</option>
        </select></label
      ><label
        ><span>排序</span
        ><select
          :value="sort"
          @change="$emit('change', 'sort', ($event.target as HTMLSelectElement).value)"
        >
          <option value="latest">最新发布</option>
          <option value="popular">最多赞</option>
        </select></label
      ><button v-if="activeFilters.length" class="text-button" @click="$emit('reset')">
        清除 <JournalIcon name="x" />
      </button>
      <div class="density-toggle">
        <button :aria-pressed="!compact" :class="{ active: !compact }" @click="compact = false">
          标准</button
        ><button :aria-pressed="compact" :class="{ active: compact }" @click="compact = true">
          紧凑
        </button>
      </div>
    </div>
    <div v-if="activeFilters.length" class="active-query-summary" aria-label="当前筛选">
      <span>当前筛选</span>
      <button
        v-for="filter in activeFilters"
        :key="filter.key"
        :aria-label="`移除筛选：${filter.label}`"
        @click="$emit('change', filter.key, filter.reset)"
      >
        <span>{{ filter.label }}</span
        ><JournalIcon name="x" />
      </button>
    </div>
    <ArchiveNavigationHint
      :index="index"
      :total="posts.length"
      :preview-id="previewId"
      :title="selected?.title"
    />
    <div class="archive-browser" :class="{ compact }">
      <section class="archive-results" data-reveal>
        <div class="results-table-heading">
          <span>动态 / 作者</span><span>来源</span><span>时间</span>
        </div>
        <div class="archive-result-list">
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
            ><time>{{ post.time }}</time
            ><JournalIcon name="chevron" />
          </button>
        </div>
        <slot v-if="!posts.length" name="empty" /><slot name="state" />
        <div v-if="hasMore" class="load-more">
          <button class="button button-outline" :disabled="loading" @click="$emit('more')">
            {{ loading ? '加载中…' : '加载更多' }}<JournalIcon name="plus" />
          </button>
        </div>
      </section>
      <aside :id="previewId" :ref="setPreview" aria-label="所选动态预览" class="archive-inspector">
        <div class="inspector-heading">
          <span>预览</span><span>{{ selected?.type }}</span
          ><button
            class="text-button"
            :disabled="!selected"
            :data-open="selected?.id"
            data-preview-open
          >
            打开 <JournalIcon name="arrow-up-right" />
          </button>
        </div>
        <ArchivePreview
          :post="selected"
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
import { computed, ref, watch } from 'vue'
import { platforms, type JournalPost } from '../models'
import { sourceGroups } from '../presentation'
import JournalIcon from '../JournalIcon.vue'
import JournalImage from '../JournalImage.vue'
import ArchivePreview from './ArchivePreview.vue'
import ArchiveSelectionDock from './ArchiveSelectionDock.vue'
import { useArchiveNavigation } from './useArchiveNavigation'
import ArchiveNavigationHint from './ArchiveNavigationHint.vue'
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
}>()
const emit = defineEmits<{
  open: [post: JournalPost]
  change: [key: string, value: string]
  reset: []
  save: [post: JournalPost, event: MouseEvent]
  more: []
}>()
const search = ref(props.query)
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
  ...(props.query ? [{ key: 'q', label: `搜索：${props.query}`, reset: '' }] : []),
  ...(props.platform !== 'all'
    ? [
        {
          key: 'platform',
          label: `来源：${platforms[props.platform] || props.platform}`,
          reset: 'all',
        },
      ]
    : []),
  ...(props.contentType !== '全部'
    ? [{ key: 'type', label: `内容：${props.contentType}`, reset: '全部' }]
    : []),
  ...(props.sort !== 'latest' ? [{ key: 'sort', label: '排序：最多赞', reset: 'latest' }] : []),
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
  ['all', '全部'] as [string, string],
  ...sourceGroups(props.allPosts).map((source): [string, string] => [source.key, source.label]),
  ...(props.platform !== 'all' && !props.allPosts.some((post) => post.platform === props.platform)
    ? [[props.platform, platforms[props.platform] || props.platform] as [string, string]]
    : []),
])
</script>
