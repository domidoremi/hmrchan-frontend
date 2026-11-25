<template>
  <div class="archive-page archive-home idol-home">
    <NextStage v-if="showFeature" :posts="featuredPosts" />
    <div class="idol-home-feed">
      <h1 v-if="!showFeature" class="idol-search-title">{{ t('journal.nav.posts') }}</h1>
      <NextCollection
        id="next-index"
        :posts="homePosts"
        :all-posts="allPosts"
        :saved-posts="savedPosts"
        :platform="platform"
        :sort="sort"
        :query="query"
        :layout="layout"
        :has-more="!showFeature && hasMore"
        :state="states.posts"
        :heading="t('journal.home.latest')"
        v-bind="retry ? { retry } : {}"
        @change="change"
        @reset="resetFilters"
        @retry="$emit('retry')"
        @more="$emit('more')"
        @adjust="searchInput?.focus()"
        @explore="router.push('/explore')"
        @open="$emit('open', $event)"
        @save="(post, event) => $emit('save', post, event)"
      >
        <template #search>
          <form
            class="next-searchbar idol-feed-search"
            role="search"
            @submit.prevent="commitSearch"
          >
            <JournalIcon name="search" />
            <input
              ref="searchInput"
              v-model="search"
              type="search"
              :placeholder="t('journal.search.inputLabel')"
              :aria-label="t('journal.search.inputLabel')"
              @input="scheduleSearch"
              @compositionend="scheduleSearch"
            />
            <button type="submit" class="icon-button" :aria-label="t('common.search')">
              <JournalIcon name="arrow" />
            </button>
          </form>
        </template>
      </NextCollection>
      <div class="idol-feed-more">
        <RouterLink class="text-button" to="/explore">
          {{ t('journal.home.allPosts') }}<JournalIcon name="arrow-up-right" />
        </RouterLink>
      </div>
    </div>
    <div class="archive-bottom-grid">
      <section class="archive-panel idol-home-panel" data-reveal>
        <div class="panel-heading">
          <h2>{{ t('journal.home.monthEvents', { month: monthName }) }}</h2>
          <RouterLink class="icon-button" to="/schedule"
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
      <section class="archive-panel idol-home-panel" data-reveal>
        <div class="panel-heading">
          <h2>{{ t('community.recentDiscussions') }}</h2>
          <RouterLink class="icon-button" to="/community"
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
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import { journalEventTimeLabel } from '../localizedEventTime'
import { journalCategoryLabel } from '../controlLabels'
import { useBrowseFilterFocus } from '../useBrowseFilterFocus'
import JournalIcon from '../JournalIcon.vue'
import JournalResourceState from '../JournalResourceState.vue'
import NextStage from './NextStage.vue'
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
  { query: '', layout: 'grid', hasMore: false }
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
const featuredPosts = shallowRef<JournalPost[]>([])
const showFeature = computed(() => !props.query.trim())
const homePosts = computed(() => (showFeature.value ? props.posts.slice(0, 6) : props.posts))
watch(
  () => props.allPosts,
  (values) => {
    if (props.query.trim() || props.platform !== 'all' || !values.length) return
    const photos = values.filter((post) => post.image)
    featuredPosts.value = (photos.length ? photos : values).slice(0, 4)
  },
  { immediate: true }
)
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
function scheduleSearch(event: Event) {
  clearTimeout(timer)
  if (event instanceof InputEvent && event.isComposing) return
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
  async (value, previous) => {
    clearTimeout(timer)
    search.value = value
    if (Boolean(value.trim()) === Boolean(previous.trim())) return
    await nextTick()
    if (document.activeElement === searchInput.value)
      searchInput.value?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
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
