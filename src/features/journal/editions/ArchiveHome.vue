<template>
  <div class="archive-page archive-home next-home immersive-home">
    <HomeAtmosphere />
    <EditorialContents class="next-contents" :sections="contents" />
    <ImmersiveChapter id="next-index" kind="index">
      <header class="next-desk-header">
        <h1 class="next-desk-mark" aria-label="MomiChan Next">
          <MotionTitle text="next" /><span aria-hidden="true">↗</span>
        </h1>
        <form class="next-searchbar liquid-surface" role="search" @submit.prevent="commitSearch">
          <JournalIcon name="search" />
          <input
            ref="searchInput"
            v-model="search"
            type="search"
            :placeholder="t('journal.search.inputLabel')"
            :aria-label="t('journal.search.inputLabel')"
            @input="scheduleSearch"
          />
          <button type="submit" class="icon-button" :aria-label="t('common.search')">
            <JournalIcon name="arrow" />
          </button>
        </form>
      </header>
      <NextCollection
        id="next-collection"
        :posts="posts"
        :all-posts="allPosts"
        :saved-posts="savedPosts"
        :platform="platform"
        :sort="sort"
        :query="query"
        :layout="layout"
        :has-more="hasMore"
        :state="states.posts"
        v-bind="retry ? { retry } : {}"
        @change="change"
        @reset="resetFilters"
        @retry="$emit('retry')"
        @more="$emit('more')"
        @adjust="searchInput?.focus()"
        @explore="router.push('/explore')"
        @open="$emit('open', $event)"
        @save="(post, event) => $emit('save', post, event)"
      />
      <div class="next-collection-footer">
        <RouterLink class="next-all-posts text-button" to="/explore">
          {{ t('journal.home.allPosts') }}<JournalIcon name="arrow-up-right" />
        </RouterLink>
      </div>
    </ImmersiveChapter>
    <ImmersiveChapter v-if="!query.trim() && allPosts.length" id="next-featured" kind="stage">
      <NextStage :posts="allPosts" />
    </ImmersiveChapter>
    <div class="archive-bottom-grid">
      <ImmersiveChapter id="next-calendar" kind="calendar">
        <section class="archive-panel" data-reveal>
          <div class="panel-heading">
            <h2>{{ t('journal.home.monthEvents', { month: monthName }) }}</h2>
            <RouterLink to="/schedule"
              ><JournalIcon name="arrow-up-right" /><span class="sr-only">{{
                t('journal.home.openCalendar')
              }}</span></RouterLink
            >
          </div>
          <div class="archive-agenda">
            <article v-for="event in events.slice(0, 4)" :key="event.id">
              <span class="agenda-day"
                >{{ String(event.day).padStart(2, '0')
                }}<small>{{ eventWeekday(event.date) }}</small></span
              ><button :data-event="event.id">
                <b>{{ event.title }}</b><small
                  >{{ journalEventTimeLabel(event, t) }} · {{ event.venue }}</small
                ></button
              ><button
                class="icon-button remind"
                :data-remind="event.id"
                :aria-pressed="reminders.has(event.id)"
                :aria-label="
                  t(
                    reminders.has(event.id)
                      ? 'journal.actions.removeReminderNamed'
                      : 'journal.actions.remindNamed',
                    { title: event.title }
                  )
                "
              >
                <JournalIcon :name="reminders.has(event.id) ? 'check' : 'plus'" />
              </button>
            </article>
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
        </section>
      </ImmersiveChapter>
      <ImmersiveChapter id="next-community" kind="community">
        <section class="archive-panel" data-reveal>
          <div class="panel-heading">
            <h2>{{ t('community.recentDiscussions') }}</h2>
            <RouterLink to="/community"
              ><JournalIcon name="arrow-up-right" /><span class="sr-only">{{
                t('journal.home.openCommunity')
              }}</span></RouterLink
            >
          </div>
          <article
            v-for="item in discussions.slice(0, 4)"
            :key="item.id"
            class="archive-discussion-row"
          >
            <span class="discussion-avatar">{{ item.avatar }}</span>
            <div>
              <button :data-discussion="item.id">{{ item.title }}</button><small
                >{{ item.author }} · {{ journalCategoryLabel(item.category, t) }}</small
              >
            </div>
            <span>{{ item.replies }}<JournalIcon name="messages" /></span>
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
        </section>
      </ImmersiveChapter>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import { journalEventTimeLabel } from '../localizedEventTime'
import { journalCategoryLabel } from '../controlLabels'
import { useBrowseFilterFocus } from '../useBrowseFilterFocus'
import JournalIcon from '../JournalIcon.vue'
import JournalResourceState from '../JournalResourceState.vue'
import NextStage from './NextStage.vue'
import HomeAtmosphere from './HomeAtmosphere.vue'
import EditorialContents from './EditorialContents.vue'
import ImmersiveChapter from './ImmersiveChapter.vue'
import MotionTitle from './MotionTitle.vue'
import NextCollection from './NextCollection.vue'
import type { JournalResourceStates } from '../resourceState'
import type { JournalPost, JournalEvent, JournalDiscussion } from '../models'
import '../styles/home-loading.css'

const props = withDefaults(
  defineProps<{
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
    query?: string
    layout?: string
    hasMore?: boolean
    retry?: () => Promise<void>
  }>(),
  { query: '', layout: 'list', hasMore: false }
)
const emit = defineEmits<{
  retry: []
  open: [post: JournalPost]
  save: [post: JournalPost, event: MouseEvent]
  platform: [value: string]
  sort: [value: string]
  change: [key: string, value: string]
  reset: []
  more: []
}>()
const { locale, t } = useI18n({ useScope: 'global' })
const contents = computed(() => [
  { id: 'next-index', number: '01', label: t('journal.next.index'), count: null },
  ...(!props.query.trim() && props.allPosts.length
    ? [{ id: 'next-featured', number: '02', label: t('journal.next.featured'), count: null }]
    : []),
  { id: 'next-calendar', number: '03', label: t('schedule.title'), count: null },
  { id: 'next-community', number: '04', label: t('journal.nav.discussions'), count: null },
])
const router = useRouter()
const search = ref(props.query),
  searchInput = ref<HTMLInputElement>()
const rememberFilterFocus = useBrowseFilterFocus(
  () => [props.query, props.platform, props.sort],
  searchInput
)
let timer: ReturnType<typeof setTimeout> | undefined
function commitSearch() {
  clearTimeout(timer)
  if (search.value.trim() !== props.query) emit('change', 'q', search.value.trim())
}
function scheduleSearch() {
  clearTimeout(timer)
  timer = setTimeout(commitSearch, 300)
}
function change(key: string, value: string, event?: MouseEvent) {
  if (event) rememberFilterFocus(event)
  if (key === 'platform') emit('platform', value)
  else if (key === 'sort') emit('sort', value)
  else emit('change', key, value)
}
function resetFilters(event?: MouseEvent) {
  if (event) rememberFilterFocus(event)
  emit('reset')
}
watch(
  () => props.query,
  async (value, previous, onCleanup) => {
    let current = true
    onCleanup(() => {
      current = false
    })
    clearTimeout(timer)
    search.value = value
    if (Boolean(value.trim()) === Boolean(previous.trim())) return
    await nextTick()
    if (current && document.activeElement === searchInput.value)
      searchInput.value?.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'instant',
      })
  }
)
onBeforeUnmount(() => clearTimeout(timer))
const monthName = computed(() =>
  new Intl.DateTimeFormat(locale.value, { month: 'long', timeZone: 'Asia/Taipei' }).format(
    new Date(props.month + '-01T04:00:00Z')
  )
)
const eventWeekdayFormatter = computed(
  () => new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: 'Asia/Taipei' })
)
const eventWeekday = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? eventWeekdayFormatter.value.format(new Date(date + 'T04:00:00Z'))
    : date
</script>
