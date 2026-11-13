<template>
  <div class="editorial-home editorial-page">
    <div class="journal-masthead" data-reveal>
      <span>{{ t('journal.home.masthead') }}</span><strong>MomiChan<span>↗</span></strong>
      <div>
        <span>{{ date }}</span><span>{{ t('journal.home.subjects') }}</span>
      </div>
    </div>
    <div
      v-if="states.posts === 'loading' && !posts.length"
      class="spatial-cover cover-loading"
      aria-hidden="true"
    >
      <div class="cover-copy">
        <div class="cover-kicker"><i /></div>
        <div class="cover-article"><i /><i /><i /><i /></div>
        <div class="cover-controls"><i /></div>
      </div>
      <div class="cover-scene">
        <div class="cover-deck"><div class="cover-placeholder" /></div>
      </div>
    </div>
    <SpatialCover :posts="posts" />
    <EditorialContents :sections="contents" />
    <JournalResourceState
      :state="states.posts"
      label="动态"
      label-key="journal.nav.posts"
      :empty="!posts.length"
      empty-message="暂无动态"
      empty-message-key="journal.states.noPosts"
      @retry="$emit('retry')"
    />
    <section
      id="issue-latest"
      class="editorial-latest"
      data-reading-section
      tabindex="-1"
      data-reveal
    >
      <div class="section-heading">
        <span class="section-number">01</span>
        <h2>
          {{ t('journal.home.latest') }}<small>{{ t('journal.home.latestKicker') }}</small>
        </h2>
        <RouterLink to="/explore"
          >{{ t('journal.home.allPosts') }} <JournalIcon name="arrow-up-right"
        /></RouterLink>
      </div>
      <p class="reading-section-note">
        <span>{{ t('journal.home.readingNote') }}</span><span>{{
          states.posts === 'ready'
            ? t('journal.browse.count', { count: posts.length })
            : states.posts === 'error'
              ? t('journal.states.failed', { label: t('journal.nav.posts') })
              : t('journal.states.loading', { label: t('journal.nav.posts') })
        }}</span>
      </p>
      <div class="editorial-source-bar">
        <div class="chips">
          <button
            class="chip"
            :class="{ active: platform === 'all' }"
            @click="$emit('platform', 'all')"
          >
            {{ t('common.all') }}</button><button
            v-for="source in sources"
            :key="source.key"
            class="chip"
            :class="{ active: platform === source.key }"
            @click="$emit('platform', source.key)"
          >
            {{ journalSourceLabel(source.key, source.label, t) }}
          </button>
        </div>
        <label
          ><span class="sr-only">{{ t('explore.sortBy') }}</span
          ><select
            :value="sort"
            @change="$emit('sort', ($event.target as HTMLSelectElement).value)"
          >
            <option value="latest">{{ t('explore.newest') }}</option>
            <option value="popular">{{ t('journal.filters.mostLiked') }}</option>
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
    <EditorialFilm
      v-if="pictures.length"
      id="issue-film"
      data-reading-section
      tabindex="-1"
      :posts="pictures"
    />
    <section
      id="issue-calendar"
      class="editorial-calendar"
      data-reading-section
      tabindex="-1"
      data-reveal
    >
      <div class="section-heading">
        <span class="section-number">03</span>
        <h2>
          {{ t('schedule.title') }}<small>{{ t('journal.home.calendarKicker') }}</small>
        </h2>
        <RouterLink to="/schedule"
          >{{ t('journal.calendar.allEvents') }} <JournalIcon name="arrow-up-right"
        /></RouterLink>
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
          <JournalResourceState
            :state="states.events"
            label="日程"
            label-key="nav.schedule"
            :empty="!events.length"
            empty-message="本月暂无日程"
            empty-message-key="journal.calendar.noneThisMonth"
            @retry="$emit('retry')"
          />
        </div>
      </div>
    </section>
    <section
      id="issue-conversation"
      class="editorial-conversation"
      data-reading-section
      tabindex="-1"
      data-reveal
    >
      <div class="conversation-heading">
        <span>04 / {{ t('journal.home.communityKicker') }}</span>
        <h2>{{ t('journal.nav.discussions') }}</h2>
        <RouterLink to="/community"
          >{{ t('journal.home.visitCommunity') }} <JournalIcon name="arrow-up-right"
        /></RouterLink>
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
              <span>{{ journalCategoryLabel(item.category, t) }}</span><time>{{
                journalDateLabel(item.time, locale)
              }}</time>
            </div>
            <h3>
              <button :data-discussion="item.id">{{ item.title }}</button>
            </h3>
            <p>
              {{ item.author }}
              <span>· {{ t('journal.community.replies', { count: item.replies }) }}</span>
            </p>
          </div>
          <JournalIcon name="arrow-up-right" />
        </article>
        <JournalResourceState
          :state="states.discussions"
          label="讨论"
          label-key="journal.nav.discussions"
          :empty="!discussions.length"
          empty-message="暂无讨论"
          empty-message-key="journal.states.noDiscussions"
          @retry="$emit('retry')"
        />
      </div>
    </section>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { journalCategoryLabel, journalSourceLabel } from '../controlLabels'
import { journalDateLabel } from '../localizedDate'
import { RouterLink } from 'vue-router'
import SpatialCover from './SpatialCover.vue'
import EditorialContents from './EditorialContents.vue'
import JournalIcon from '../JournalIcon.vue'
import JournalResourceState from '../JournalResourceState.vue'
import type { JournalResourceStates } from '../resourceState'
import '../styles/home-loading.css'
import EditorialFilm from './EditorialFilm.vue'
import JournalPostCard from '../JournalPostCard.vue'
import JournalEventCard from '../JournalEventCard.vue'
import { sourceGroups } from '../presentation'
import type { JournalPost, JournalEvent, JournalDiscussion } from '../models'
const { locale, t } = useI18n({ useScope: 'global' })
const props = defineProps<{
  states: JournalResourceStates
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
  retry: []
  save: [post: JournalPost, event: MouseEvent]
  platform: [value: string]
  sort: [value: string]
}>()
const sources = computed(() => sourceGroups(props.allPosts)),
  pictures = computed(() => props.posts.filter((post) => post.image).slice(0, 10))
const contents = computed(() => [
  {
    id: 'issue-latest',
    number: '01',
    label: t('journal.nav.posts'),
    count: props.states.posts === 'ready' ? props.posts.length : null,
  },
  ...(pictures.value.length
    ? [
        {
          id: 'issue-film',
          number: '02',
          label: t('journal.film.title'),
          count: pictures.value.length,
        },
      ]
    : []),
  {
    id: 'issue-calendar',
    number: '03',
    label: t('schedule.title'),
    count: props.states.events === 'ready' ? props.events.length : null,
  },
  {
    id: 'issue-conversation',
    number: '04',
    label: t('journal.nav.discussions'),
    count: props.states.discussions === 'ready' ? props.discussions.length : null,
  },
])
const today = new Date()
const date = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    timeZone: 'Asia/Taipei',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(today)
    .toUpperCase()
)
const monthName = computed(() =>
  new Intl.DateTimeFormat(locale.value, { month: 'long', timeZone: 'Asia/Taipei' })
    .format(new Date(props.month + '-01T04:00:00Z'))
    .toUpperCase()
)
</script>
