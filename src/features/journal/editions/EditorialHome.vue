<template>
  <div ref="home" class="editorial-home editorial-page immersive-home">
    <HomeAtmosphere />
    <ImmersiveChapter id="issue-cover" kind="cover" aria-labelledby="issue-title" data-cover-wheel>
      <div class="journal-masthead">
        <h1 id="issue-title" class="journal-name" aria-label="MomiChan">
          <MotionTitle text="MomiChan" />
        </h1>
        <div class="masthead-tools">
          <time>{{ date }}</time>
          <a
            class="cover-next-chapter cover-next-chapter-compact"
            href="#issue-latest"
            :aria-label="t('journal.home.latest')"
            @click="jumpToSection($event, 'issue-latest')"
          >
            <JournalIcon name="down" />
          </a>
          <HomeContentsMenu :sections="contents" />
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
      <SpatialCover :posts="allPosts" />
      <JournalResourceState
        :state="states.posts"
        label="动态"
        label-key="journal.nav.posts"
        :empty="!allPosts.length"
        empty-message="暂无动态"
        empty-message-key="journal.states.noPosts"
        @retry="$emit('retry')"
      />
      <a
        class="cover-next-chapter cover-next-chapter-end"
        href="#issue-latest"
        :aria-label="t('journal.home.latest')"
        @click="jumpToSection($event, 'issue-latest')"
      >
        <JournalIcon name="down" />
      </a>
    </ImmersiveChapter>
    <ImmersiveChapter
      id="issue-latest"
      kind="reading"
      aria-labelledby="issue-latest-heading"
      data-reading-section
    >
      <div class="editorial-reading-layout">
        <section class="editorial-latest" data-reveal>
          <div class="section-heading">
            <h2 id="issue-latest-heading">{{ t('journal.home.latest') }}</h2>
            <RouterLink to="/explore"
              >{{ t('journal.home.allPosts') }} <JournalIcon name="arrow-up-right"
            /></RouterLink>
          </div>
          <div class="editorial-source-bar">
            <div
              class="chips"
              role="group"
              :aria-label="t('journal.filters.source')"
              data-indicator
            >
              <button
                class="chip"
                type="button"
                :class="{ active: platform === 'all' }"
                :aria-pressed="platform === 'all'"
                @click="$emit('platform', 'all')"
              >
                {{ t('common.all') }}
              </button>
              <button
                v-for="source in sources"
                :key="source.key"
                class="chip"
                type="button"
                :class="{ active: platform === source.key }"
                :aria-pressed="platform === source.key"
                @click="$emit('platform', source.key)"
              >
                {{ journalSourceLabel(source.key, source.label, t) }}
              </button>
            </div>
            <select
              class="editorial-sort"
              :aria-label="t('explore.sortBy')"
              :value="sort"
              @change="changeSort"
            >
              <option value="latest">{{ t('explore.newest') }}</option>
              <option value="popular">{{ t('journal.filters.mostLiked') }}</option>
            </select>
          </div>
          <div ref="readingGrid" class="editorial-grid home-reading-grid">
            <JournalPostCard
              v-for="post in recentPosts"
              :key="post.id"
              :post="post"
              :saved="savedPosts.has(post.id)"
              preview
              data-reveal
              @save="(item, event) => $emit('save', item, event)"
            />
          </div>
          <div v-if="!posts.length && allPosts.length" class="reading-filter-empty">
            <p>{{ t('common.noResults') }}</p>
            <button class="button" @click="$emit('platform', 'all')">
              {{ t('common.clear') }}
            </button>
          </div>
        </section>
        <EditorialReadingAside
          :posts="allPosts"
          :events="events.slice(0, 1)"
          :states="states"
          :month-name="monthName"
          @retry="$emit('retry')"
        />
      </div>
    </ImmersiveChapter>
    <ImmersiveChapter
      v-if="pictures.length"
      id="issue-film"
      kind="film"
      aria-labelledby="issue-film-heading"
      data-reading-section
    >
      <EditorialFilm :posts="pictures" />
    </ImmersiveChapter>
    <ImmersiveChapter
      id="issue-calendar"
      kind="calendar"
      aria-labelledby="issue-calendar-heading"
      data-reading-section
    >
      <section class="editorial-calendar" data-reveal>
        <div class="section-heading">
          <h2 id="issue-calendar-heading">{{ t('schedule.title') }}</h2>
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
    </ImmersiveChapter>
    <ImmersiveChapter
      id="issue-conversation"
      kind="community"
      aria-labelledby="issue-conversation-heading"
      data-reading-section
    >
      <section class="editorial-conversation" data-reveal>
        <div class="conversation-heading">
          <h2 id="issue-conversation-heading">{{ t('journal.nav.discussions') }}</h2>
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
    </ImmersiveChapter>
  </div>
</template>
<script setup lang="ts">
import { computed, inject, nextTick, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { journalCategoryLabel, journalSourceLabel } from '../controlLabels'
import { journalDateLabel } from '../localizedDate'
import { RouterLink } from 'vue-router'
import SpatialCover from './SpatialCover.vue'
import HomeAtmosphere from './HomeAtmosphere.vue'
import MotionTitle from './MotionTitle.vue'
import ImmersiveChapter from './ImmersiveChapter.vue'
import HomeContentsMenu from './HomeContentsMenu.vue'
import { useHomeSectionJump } from './homeAnchor'
import { useHomeChapterWheel } from './useHomeChapterWheel'
import { useReadingMasonry } from './useReadingMasonry'
import JournalIcon from '../JournalIcon.vue'
import JournalResourceState from '../JournalResourceState.vue'
import type { JournalResourceStates } from '../resourceState'
import '../styles/home-loading.css'
import '../styles/home-reading-masonry.css'
import EditorialFilm from './EditorialFilm.vue'
import EditorialReadingAside from './EditorialReadingAside.vue'
import JournalPostCard from '../JournalPostCard.vue'
import JournalEventCard from '../JournalEventCard.vue'
import { sourceGroups } from '../presentation'
import type { JournalPost, JournalEvent, JournalDiscussion } from '../models'
import { journalKey } from '../context'
const { locale, t } = useI18n({ useScope: 'global' })
const jumpToSection = useHomeSectionJump()
const home = ref<HTMLElement>()
useHomeChapterWheel(home)
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
const emit = defineEmits<{
  retry: []
  save: [post: JournalPost, event: MouseEvent]
  platform: [value: string]
  sort: [value: string]
}>()
function changeSort(event: Event) {
  const control = event.currentTarget
  if (control instanceof HTMLSelectElement) emit('sort', control.value)
}
const sources = computed(() => sourceGroups(props.allPosts)),
  pictures = computed(() => props.allPosts.filter((post) => post.image).slice(0, 10))
const recentPosts = computed(() => props.posts.slice(0, 6))
const runtime = inject(journalKey, shallowRef(null))
const readingGrid = ref<HTMLElement>()
const { layout: layoutReadingGrid } = useReadingMasonry(readingGrid)
watch(
  recentPosts,
  async (_posts, _previous, onCleanup) => {
    let current = true
    onCleanup(() => {
      current = false
    })
    const grid = readingGrid.value
    if (!grid) return
    const update = async () => {
      await nextTick()
      if (!current) return
      layoutReadingGrid()
      runtime.value?.mount(grid)
    }
    if (runtime.value) await runtime.value.SpatialMotion.layout(grid, update)
    else await update()
  },
  { flush: 'pre' }
)
const contents = computed(() => [
  { id: 'issue-cover', label: t('journal.next.featured') },
  {
    id: 'issue-latest',
    label: t('journal.home.latest'),
  },
  ...(pictures.value.length
    ? [
        {
          id: 'issue-film',
          label: t('journal.film.title'),
        },
      ]
    : []),
  {
    id: 'issue-calendar',
    label: t('journal.home.monthEvents', { month: monthName.value }),
  },
  {
    id: 'issue-conversation',
    label: t('journal.nav.discussions'),
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
