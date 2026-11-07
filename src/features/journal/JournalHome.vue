<template>
  <div class="page-container atelier-home">
    <JournalScene kind="hero" /><JournalScene kind="index" />
    <section class="atelier-journal" aria-label="最新动态">
      <div class="atelier-section-heading">
        <span class="atelier-section-index">01 /</span>
        <div>
          <span>THE LATEST</span>
          <h2>最近更新</h2>
        </div>
        <RouterLink class="text-button" to="/explore"
          >全部动态 <JournalIcon name="arrow-up-right"
        /></RouterLink>
      </div>
      <div class="feed-tools">
        <div class="chips" aria-label="按内容来源筛选">
          <button
            v-for="[key, label] in sources"
            :key="key"
            class="chip"
            :class="{ active: platform === key }"
            :aria-pressed="platform === key"
            @click="$emit('platform', key)"
          >
            {{ label }}
          </button>
        </div>
        <label
          ><span class="sr-only">排序方式</span
          ><select
            class="sort-select"
            :value="sort"
            @change="$emit('sort', ($event.target as HTMLSelectElement).value)"
          >
            <option value="latest">最新发布</option>
            <option value="popular">最多赞</option>
          </select></label
        >
      </div>
      <div id="post-results" class="post-grid journal-grid">
        <JournalPostCard
          v-for="post in posts.slice(0, 3)"
          :key="post.id"
          :post="post"
          :saved="savedPosts.has(post.id)"
          @save="(post, event) => $emit('save', post, event)"
        />
      </div>
      <slot name="state" />
    </section>
    <JournalScene kind="panorama" /><JournalScene kind="collections" />
    <section class="atelier-schedule" data-reveal>
      <div class="atelier-section-heading">
        <span class="atelier-section-index">03 /</span>
        <div>
          <span>ON THE CALENDAR</span>
          <h2>活动日程</h2>
        </div>
        <RouterLink class="text-button" to="/schedule"
          >全部日程 <JournalIcon name="arrow-up-right"
        /></RouterLink>
      </div>
      <div class="atelier-schedule-grid">
        <div class="atelier-calendar-art">
          <span
            >{{ monthName }}<span>{{ month.slice(0, 4) }}</span></span
          ><img
            :src="'/journal/stage-moment.webp'"
            alt="舞台造型"
            width="400"
            height="500"
            loading="lazy"
          /><i aria-hidden="true">{{ Number(month.slice(5)) }}</i>
        </div>
        <div class="atelier-events">
          <JournalEventCard
            v-for="event in events.slice(0, 3)"
            :key="event.id"
            :event="event"
            :saved="reminders.has(event.id)"
          />
          <div v-if="!events.length" class="journal-state">
            <p>暂无活动</p>
            <RouterLink class="text-button" to="/schedule"
              >查看日程 <JournalIcon name="arrow"
            /></RouterLink>
          </div>
        </div>
      </div>
    </section>
    <section class="atelier-community" data-reveal>
      <div class="atelier-community-lead">
        <span>04 / COMMUNITY</span>
        <h2>最近<br />在聊什么<span aria-hidden="true">↗</span></h2>
        <RouterLink class="atelier-round-link" to="/community"
          ><span>全部讨论</span><b><JournalIcon name="arrow-up-right" /></b
        ></RouterLink>
      </div>
      <div class="atelier-discussions">
        <JournalDiscussionRow
          v-for="discussion in discussions.slice(0, 3)"
          :key="discussion.id"
          :discussion="discussion"
        />
        <div v-if="!discussions.length" class="journal-state">
          <p>暂无讨论</p>
          <RouterLink class="text-button" to="/community"
            >发起讨论 <JournalIcon name="arrow"
          /></RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import JournalScene from './JournalScene.vue'
import JournalIcon from './JournalIcon.vue'
import JournalPostCard from './JournalPostCard.vue'
import JournalEventCard from './JournalEventCard.vue'
import JournalDiscussionRow from './JournalDiscussionRow.vue'
import { platforms, type JournalPost, type JournalEvent, type JournalDiscussion } from './models'
const props = defineProps<{
  posts: JournalPost[]
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
const sources = Object.entries(platforms).slice(0, 5)
const monthName = computed(() =>
  new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' })
    .format(new Date(props.month + '-01T00:00:00Z'))
    .toUpperCase()
)
</script>
