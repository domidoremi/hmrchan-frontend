<template>
  <div class="editorial-page editorial-browse">
    <header class="editorial-page-heading" data-reveal>
      <span class="eyebrow">{{ favorites ? 'PERSONAL COLLECTION' : 'THE INDEX' }}</span>
      <div>
        <h1>
          {{ favorites ? '收藏' : '动态' }}<em>{{ String(posts.length).padStart(2, '0') }}</em>
        </h1>
        <JournalIcon :name="favorites ? 'bookmark' : 'compass'" />
      </div>
    </header>
    <div class="editorial-browse-toolbar" data-reveal>
      <form class="explore-search" @submit.prevent="$emit('change', 'q', search)">
        <JournalIcon name="search" /><input
          id="explore-input"
          v-model="search"
          type="search"
          placeholder="搜索动态、作者、标签"
          aria-label="搜索动态、作者、标签"
        /><button type="submit" class="icon-button" aria-label="搜索">
          <JournalIcon name="arrow" />
        </button>
      </form>
      <div class="browse-views">
        <button
          v-for="view in views"
          :key="view.key"
          :class="{ active: layout === view.key }"
          :aria-pressed="layout === view.key"
          :aria-label="view.label"
          @click="setLayout(view.key)"
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
          @click="$emit('change', 'platform', key)"
        >
          {{ label }}
        </button>
      </div>
      <label
        ><span class="sr-only">内容类型</span
        ><select
          :value="contentType"
          @change="$emit('change', 'type', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="type in ['全部', '写真', '文字', '节目']" :key="type">{{ type }}</option>
        </select></label
      ><label
        ><span class="sr-only">排序</span
        ><select
          :value="sort"
          @change="$emit('change', 'sort', ($event.target as HTMLSelectElement).value)"
        >
          <option value="latest">最新发布</option>
          <option value="popular">最多赞</option>
        </select></label
      ><button
        v-if="query || platform !== 'all' || contentType !== '全部'"
        class="text-button"
        @click="$emit('reset')"
      >
        清除 <JournalIcon name="x" />
      </button>
    </div>
    <div ref="grid" class="editorial-gallery editorial-grid" :class="`layout-${layout}`">
      <JournalPostCard
        v-for="post in posts"
        :key="post.id"
        :post="post"
        :saved="savedPosts.has(post.id)"
        data-reveal
        @save="(item, event) => $emit('save', item, event)"
      />
    </div>
    <slot v-if="!posts.length" name="empty" /><slot name="state" />
    <div v-if="hasMore" class="load-more">
      <button class="button button-outline" :disabled="loading" @click="$emit('more')">
        {{ loading ? '加载中…' : '继续浏览' }}<JournalIcon name="plus" />
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { platforms, type JournalPost } from '../models'
import JournalIcon from '../JournalIcon.vue'
import JournalPostCard from '../JournalPostCard.vue'
import { useJournal } from '../context'
import { sourceGroups } from '../presentation'
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
}>()
const emit = defineEmits<{
  change: [key: string, value: string]
  reset: []
  save: [post: JournalPost, event: MouseEvent]
  more: []
}>()
const search = ref(props.query),
  grid = ref<HTMLElement>(),
  runtime = useJournal()
watch(
  () => props.query,
  (value) => {
    search.value = value
  }
)
const views = [
  { key: 'grid', label: '画廊', icon: 'grid' },
  { key: 'wall', label: '照片墙', icon: 'image' },
  { key: 'list', label: '阅读列表', icon: 'list' },
]
function setLayout(value: string) {
  if (grid.value && runtime.value)
    runtime.value.SpatialMotion.layout(grid.value, async () => {
      emit('change', 'view', value)
      await nextTick()
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    })
  else emit('change', 'view', value)
}
const sourceOptions = computed(() => [
  ['all', '全部'] as [string, string],
  ...sourceGroups(props.allPosts).map((source): [string, string] => [source.key, source.label]),
  ...(props.platform !== 'all' && !props.allPosts.some((post) => post.platform === props.platform)
    ? [[props.platform, platforms[props.platform] || props.platform] as [string, string]]
    : []),
])
</script>
