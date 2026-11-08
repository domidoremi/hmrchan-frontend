<template>
  <div :ref="setRoot" @keydown="keydown" class="archive-page archive-home">
    <div class="archive-page-title" data-reveal>
      <div>
        <span class="eyebrow">OVERVIEW</span>
        <h1>总览<span class="title-dot">.</span></h1>
      </div>
      <span class="archive-date">{{ date }}</span
      ><RouterLink class="button button-outline" to="/explore"
        >资料检索 <JournalIcon name="arrow-up-right"
      /></RouterLink>
    </div>
    <div class="archive-summary" data-reveal>
      <div>
        <JournalIcon name="file" /><span
          >当前动态<strong>{{ posts.length }}</strong></span
        >
      </div>
      <div>
        <JournalIcon name="compass" /><span
          >来源<strong>{{ sources.length }}</strong></span
        >
      </div>
      <div>
        <JournalIcon name="calendar" /><span
          >{{ Number(month.slice(5)) }} 月日程<strong>{{ events.length }}</strong></span
        >
      </div>
      <div>
        <JournalIcon name="messages" /><span
          >最近讨论<strong>{{ discussions.length }}</strong></span
        >
      </div>
      <div class="source-distribution" aria-label="当前动态来源分布">
        <div>
          <span
            v-for="(source, i) in sources"
            :key="source.key"
            :style="{ flex: source.count, '--source-index': i }"
            :title="`${source.label} · ${source.count}`"
          />
        </div>
        <span v-for="source in sources.slice(0, 3)" :key="source.key"
          >{{ source.label }} <b>{{ source.count }}</b></span
        >
      </div>
    </div>
    <section class="archive-command" data-reveal>
      <div>
        <span class="command-marker">⌕</span>
        <h2>动态索引</h2>
        <span class="meta-count">{{ posts.length }}</span>
      </div>
      <button data-action="search">
        <JournalIcon name="search" /><span>搜索动态、作者、标签</span><kbd>⌘ K</kbd></button
      ><RouterLink to="/explore" class="text-button">全部 <JournalIcon name="arrow" /></RouterLink>
    </section>
    <div class="archive-observatory">
      <section class="archive-stream" data-reveal>
        <div class="stream-tabs">
          <button :class="{ active: platform === 'all' }" @click="$emit('platform', 'all')">
            全部来源</button
          ><button
            v-for="source in sources"
            :key="source.key"
            :class="{ active: platform === source.key }"
            @click="$emit('platform', source.key)"
          >
            {{ source.label }}
          </button>
        </div>
        <div class="stream-content">
          <div v-for="group in groups" :key="group.label" class="timeline-group">
            <div class="timeline-label">
              <span>{{ group.label }}</span
              ><i />
            </div>
            <button
              v-for="post in group.items"
              :key="post.id"
              class="stream-row"
              :class="{ selected: selectedId === post.id }"
              :aria-pressed="selectedId === post.id"
              :data-select-post="post.id"
              @click="select(post.id)"
              :tabindex="selectedId === post.id ? 0 : -1"
            >
              <span class="stream-dot" /><JournalImage
                v-if="post.image"
                :src="post.image"
                :original-src="post.originalImage"
                alt=""
                width="48"
                height="60"
                loading="lazy"
              /><JournalIcon v-else name="file" /><span class="stream-row-copy"
                ><b>{{ post.title }}</b
                ><small
                  >{{ post.author }}<i>·</i>{{ platforms[post.platform] || post.platform }}</small
                ></span
              ><JournalIcon name="arrow-up-right" />
            </button>
          </div>
          <slot name="state" />
        </div>
        <RouterLink to="/explore" class="stream-more"
          >全部动态 <JournalIcon name="arrow"
        /></RouterLink>
      </section>
      <aside :ref="setPreview" class="observatory-preview" data-reveal>
        <div class="preview-label">
          <span class="status-light" />预览<span
            >{{ String(posts.length ? index + 1 : 0).padStart(2, '0') }} /
            {{ String(posts.length).padStart(2, '0') }}</span
          >
        </div>
        <ArchivePreview
          :post="selected"
          :saved="Boolean(selected && savedPosts.has(selected.id))"
          spatial
          @save="(item, event) => $emit('save', item, event)"
        />
        <div class="preview-steppers">
          <button
            class="icon-button"
            aria-label="上一条预览"
            :disabled="posts.length < 2"
            @click="step(-1)"
          >
            <JournalIcon name="arrow-left" /></button
          ><span>{{ selected?.author }}</span
          ><button
            class="icon-button"
            aria-label="下一条预览"
            :disabled="posts.length < 2"
            @click="step(1)"
          >
            <JournalIcon name="arrow" />
          </button>
        </div>
      </aside>
    </div>
    <div class="archive-bottom-grid">
      <section class="archive-panel" data-reveal>
        <div class="panel-heading">
          <span>CALENDAR</span>
          <h2>{{ Number(month.slice(5)) }} 月日程</h2>
          <RouterLink to="/schedule"
            ><JournalIcon name="arrow-up-right" /><span class="sr-only">打开月历</span></RouterLink
          >
        </div>
        <div class="archive-agenda">
          <article v-for="event in events.slice(0, 4)" :key="event.id">
            <span class="agenda-day"
              >{{ String(event.day).padStart(2, '0') }}<small>{{ event.week }}</small></span
            ><button :data-event="event.id">
              <b>{{ event.title }}</b
              ><small>{{ event.time }} · {{ event.venue }}</small></button
            ><button
              class="icon-button remind"
              :data-remind="event.id"
              :aria-pressed="reminders.has(event.id)"
              :aria-label="`记下：${event.title}`"
            >
              <JournalIcon :name="reminders.has(event.id) ? 'check' : 'plus'" />
            </button>
          </article>
          <p v-if="!events.length" class="journal-state">本月暂无日程</p>
        </div>
      </section>
      <section class="archive-panel" data-reveal>
        <div class="panel-heading">
          <span>COMMUNITY</span>
          <h2>最近讨论</h2>
          <RouterLink to="/community"
            ><JournalIcon name="arrow-up-right" /><span class="sr-only">打开社区</span></RouterLink
          >
        </div>
        <article
          v-for="item in discussions.slice(0, 4)"
          :key="item.id"
          class="archive-discussion-row"
        >
          <span class="discussion-avatar">{{ item.avatar }}</span>
          <div>
            <button :data-discussion="item.id">{{ item.title }}</button
            ><small>{{ item.author }} · {{ item.category }}</small>
          </div>
          <span>{{ item.replies }}<JournalIcon name="messages" /></span>
        </article>
        <p v-if="!discussions.length" class="journal-state">暂无讨论</p>
      </section>
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
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import JournalIcon from '../JournalIcon.vue'
import JournalImage from '../JournalImage.vue'
import ArchivePreview from './ArchivePreview.vue'
import ArchiveSelectionDock from './ArchiveSelectionDock.vue'
import { useArchiveNavigation } from './useArchiveNavigation'
import { sourceGroups, timelineGroups } from '../presentation'
import { platforms, type JournalPost, type JournalEvent, type JournalDiscussion } from '../models'
const props = defineProps<{
  posts: JournalPost[]
  allPosts: JournalPost[]
  events: JournalEvent[]
  discussions: JournalDiscussion[]
  savedPosts: Set<string>
  reminders: Set<string>
  platform: string
  sort: string
  month: string
}>()
defineEmits<{
  save: [post: JournalPost, event: MouseEvent]
  platform: [value: string]
  sort: [value: string]
}>()
const {
  selected,
  selectedId,
  index,
  step,
  setRoot,
  setPreview,
  previewVisible,
  select,
  keydown,
  showPreview,
} = useArchiveNavigation(computed(() => props.posts))
const sources = computed(() => sourceGroups(props.allPosts)),
  groups = computed(() => timelineGroups(props.posts))
const date = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: 'short',
  day: '2-digit',
})
  .format(new Date())
  .toUpperCase()
</script>
