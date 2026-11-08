<template>
  <div class="editorial-home editorial-page">
    <div class="journal-masthead" data-reveal>
      <span>THE JOURNAL</span><strong>MomiChan<span>↗</span></strong>
      <div>
        <span>{{ date }}</span
        ><span>PHOTOS · POSTS · PEOPLE</span>
      </div>
    </div>
    <SpatialCover :posts="posts" />
    <slot name="state" />
    <section class="editorial-latest" data-reveal>
      <div class="section-heading">
        <span class="section-number">01</span>
        <h2>最近更新<small>THE LATEST</small></h2>
        <RouterLink to="/explore">全部动态 <JournalIcon name="arrow-up-right" /></RouterLink>
      </div>
      <div class="editorial-source-bar">
        <div class="chips">
          <button
            class="chip"
            :class="{ active: platform === 'all' }"
            @click="$emit('platform', 'all')"
          >
            全部</button
          ><button
            v-for="source in sources"
            :key="source.key"
            class="chip"
            :class="{ active: platform === source.key }"
            @click="$emit('platform', source.key)"
          >
            {{ source.label }}
          </button>
        </div>
        <label
          ><span class="sr-only">排序</span
          ><select
            :value="sort"
            @change="$emit('sort', ($event.target as HTMLSelectElement).value)"
          >
            <option value="latest">最新发布</option>
            <option value="popular">最多赞</option>
          </select></label
        >
      </div>
      <div class="editorial-grid home-reading-grid">
        <JournalPostCard
          v-for="post in posts.slice(0, 8)"
          :key="post.id"
          :post="post"
          :saved="savedPosts.has(post.id)"
          data-reveal
          @save="(item, event) => $emit('save', item, event)"
        />
      </div>
    </section>
    <section v-if="pictures.length" class="editorial-film" data-reveal data-depth-scene>
      <div class="film-heading">
        <span>02 / PHOTOGRAPHS</span>
        <h2>影像</h2>
        <div>
          <button class="icon-button" aria-label="向前浏览影像" @click="scrollFilm(-1)">
            <JournalIcon name="arrow-left" /></button
          ><button class="icon-button" aria-label="向后浏览影像" @click="scrollFilm(1)">
            <JournalIcon name="arrow" />
          </button>
        </div>
      </div>
      <div ref="film" class="film-track">
        <button
          v-for="(post, i) in pictures"
          :key="post.id"
          :data-open="post.id"
          class="film-frame"
        >
          <span>{{ String(i + 1).padStart(2, '0') }} / {{ post.author }}</span
          ><JournalImage
            :src="post.image!"
            :alt="post.title"
            loading="lazy"
            width="400"
            height="520"
          /><span>{{ post.title }} <JournalIcon name="arrow-up-right" /></span>
        </button>
      </div>
    </section>
    <section class="editorial-calendar" data-reveal>
      <div class="section-heading">
        <span class="section-number">03</span>
        <h2>日程<small>ON THE CALENDAR</small></h2>
        <RouterLink to="/schedule">全部日程 <JournalIcon name="arrow-up-right" /></RouterLink>
      </div>
      <div class="editorial-calendar-body">
        <RouterLink class="month-poster" to="/schedule" data-tilt
          ><small>{{ month.slice(0, 4) }}</small
          ><b>{{ month.slice(5) }}</b
          ><span>{{ monthName }}<JournalIcon name="arrow-up-right" /></span><i aria-hidden="true"
        /></RouterLink>
        <div>
          <JournalEventCard
            v-for="event in events.slice(0, 4)"
            :key="event.id"
            :event="event"
            :saved="reminders.has(event.id)"
          />
          <div v-if="!events.length" class="journal-state">本月暂无日程</div>
        </div>
      </div>
    </section>
    <section class="editorial-conversation" data-reveal>
      <div class="conversation-heading">
        <span>04 / COMMUNITY</span>
        <h2>讨论</h2>
        <RouterLink to="/community">进入社区 <JournalIcon name="arrow-up-right" /></RouterLink>
      </div>
      <div>
        <article
          v-for="(item, i) in discussions.slice(0, 4)"
          :key="item.id"
          class="editorial-discussion"
        >
          <span>{{ String(i + 1).padStart(2, '0') }}</span>
          <div>
            <div class="meta-line">
              <span>{{ item.category }}</span
              ><time>{{ item.time }}</time>
            </div>
            <h3>
              <button :data-discussion="item.id">{{ item.title }}</button>
            </h3>
            <p>
              {{ item.author }} <span>· {{ item.replies }} 条回复</span>
            </p>
          </div>
          <JournalIcon name="arrow-up-right" />
        </article>
        <p v-if="!discussions.length" class="journal-state">暂无讨论</p>
      </div>
    </section>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import SpatialCover from './SpatialCover.vue'
import JournalIcon from '../JournalIcon.vue'
import JournalImage from '../JournalImage.vue'
import JournalPostCard from '../JournalPostCard.vue'
import JournalEventCard from '../JournalEventCard.vue'
import { sourceGroups } from '../presentation'
import type { JournalPost, JournalEvent, JournalDiscussion } from '../models'
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
const sources = computed(() => sourceGroups(props.allPosts)),
  pictures = computed(() => props.posts.filter((post) => post.image).slice(0, 10))
const date = new Intl.DateTimeFormat('en', {
  timeZone: 'Asia/Taipei',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})
  .format(new Date())
  .toUpperCase()
const monthName = computed(() =>
  new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' })
    .format(new Date(props.month + '-01T00:00:00Z'))
    .toUpperCase()
)
const film = ref<HTMLElement>()
function scrollFilm(direction: number) {
  film.value?.scrollBy({
    left: direction * film.value.clientWidth * 0.7,
    behavior: document.body.dataset['motion'] === 'full' ? 'smooth' : 'instant',
  })
}
</script>
