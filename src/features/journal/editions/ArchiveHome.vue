<template>
  <div :ref="setRoot" @keydown="keydown" class="archive-page archive-home">
    <div class="archive-page-title" data-reveal>
      <div>
        <span class="eyebrow">{{ t('journal.home.overviewKicker') }}</span>
        <h1>{{ t('journal.nav.overview') }}<span class="title-dot">.</span></h1>
      </div>
      <span class="archive-date">{{ date }}</span><RouterLink
        class="button button-outline"
        to="/explore"
        >{{ t('journal.nav.records') }} <JournalIcon name="arrow-up-right"
      /></RouterLink>
    </div>
    <div class="archive-summary" data-reveal>
      <div>
        <JournalIcon name="file" /><span
          >{{ t('journal.home.currentPosts')
          }}<strong
            :aria-label="states.posts !== 'ready' ? t('journal.browse.countUnknown') : undefined"
            >{{ states.posts === 'ready' ? posts.length : '—' }}</strong
          ></span
        >
      </div>
      <div>
        <JournalIcon name="compass" /><span
          >{{ t('journal.filters.source')
          }}<strong
            :aria-label="
              states.posts !== 'ready' ? t('journal.home.sourcesCountUnknown') : undefined
            "
            >{{ states.posts === 'ready' ? sources.length : '—' }}</strong
          ></span
        >
      </div>
      <div>
        <JournalIcon name="calendar" /><span
          >{{ t('journal.home.monthEvents', { month: monthName })
          }}<strong
            :aria-label="
              states.events !== 'ready' ? t('journal.home.eventsCountUnknown') : undefined
            "
            >{{ states.events === 'ready' ? events.length : '—' }}</strong
          ></span
        >
      </div>
      <div>
        <JournalIcon name="messages" /><span
          >{{ t('community.recentDiscussions')
          }}<strong
            :aria-label="
              states.discussions !== 'ready' ? t('journal.home.discussionsCountUnknown') : undefined
            "
            >{{ states.discussions === 'ready' ? discussions.length : '—' }}</strong
          ></span
        >
      </div>
      <div class="source-distribution" :aria-label="t('journal.home.sourceDistribution')">
        <div>
          <span
            v-for="(source, i) in sources"
            :key="source.key"
            :style="{ flex: source.count, '--source-index': i }"
            :title="`${journalSourceLabel(source.key, source.label, t)} · ${source.count}`"
          />
        </div>
        <span v-for="source in sources.slice(0, 3)" :key="source.key"
          >{{ journalSourceLabel(source.key, source.label, t) }} <b>{{ source.count }}</b></span
        >
      </div>
    </div>
    <section class="archive-command" data-reveal>
      <div>
        <span class="command-marker">⌕</span>
        <h2>{{ t('journal.browse.index') }}</h2>
        <span
          class="meta-count"
          :aria-label="states.posts !== 'ready' ? t('journal.browse.countUnknown') : undefined"
          >{{ states.posts === 'ready' ? posts.length : '—' }}</span
        >
      </div>
      <button data-action="search">
        <JournalIcon name="search" /><span>{{ t('journal.search.inputLabel') }}</span
        ><kbd>⌘ K</kbd></button
      ><RouterLink to="/explore" class="text-button"
        >{{ t('common.all') }} <JournalIcon name="arrow"
      /></RouterLink>
    </section>
    <ArchiveNavigationHint
      :index="index"
      :total="posts.length"
      :state="states.posts"
      :preview-id="previewId"
      :title="selected?.title"
    />
    <div class="archive-observatory">
      <section class="archive-stream" data-reveal>
        <div class="stream-tabs">
          <button :class="{ active: platform === 'all' }" @click="$emit('platform', 'all')">
            {{ t('journal.home.allSources') }}</button><button
            v-for="source in sources"
            :key="source.key"
            :class="{ active: platform === source.key }"
            @click="$emit('platform', source.key)"
          >
            {{ journalSourceLabel(source.key, source.label, t) }}
          </button>
        </div>
        <div class="stream-content" :aria-busy="states.posts === 'loading'">
          <div
            v-if="states.posts === 'loading' && !posts.length"
            class="archive-loading-list"
            aria-hidden="true"
          >
            <div v-for="row in 4" :key="row">
              <i /><span><i /><i /></span>
            </div>
          </div>
          <div v-for="group in groups" :key="group.key" class="timeline-group">
            <div class="timeline-label">
              <span>{{ group.label }}</span><i />
            </div>
            <button
              v-for="post in group.items"
              :key="post.id"
              class="stream-row"
              :class="{ selected: selectedId === post.id }"
              :aria-pressed="selectedId === post.id"
              :data-select-post="post.id"
              :aria-controls="previewId"
              :aria-describedby="`${previewId}-hint`"
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
                  >{{ post.author }}<i>·</i
                  >{{
                    journalSourceLabel(post.platform, platforms[post.platform] || post.platform, t)
                  }}</small
                ></span
              ><JournalIcon name="arrow-up-right" />
            </button>
          </div>
          <JournalResourceState
            :state="states.posts"
            label="动态"
            label-key="journal.nav.posts"
            :empty="!posts.length"
            empty-message="暂无动态"
            empty-message-key="journal.states.noPosts"
            @retry="$emit('retry')"
          />
        </div>
        <RouterLink to="/explore" class="stream-more"
          >{{ t('journal.home.allPosts') }} <JournalIcon name="arrow"
        /></RouterLink>
      </section>
      <aside
        :id="previewId"
        :ref="setPreview"
        :aria-label="t('journal.selection.current')"
        class="observatory-preview"
        data-reveal
      >
        <div class="preview-label">
          <span class="status-light" />{{ t('journal.selection.preview')
          }}<button
            class="text-button"
            :disabled="!selected"
            :data-open="selected?.id"
            data-preview-open
          >
            {{ t('journal.actions.open') }} <JournalIcon name="arrow-up-right" /></button
          ><span
            >{{
              states.posts === 'ready' ? String(posts.length ? index + 1 : 0).padStart(2, '0') : '—'
            }}
            / {{ states.posts === 'ready' ? String(posts.length).padStart(2, '0') : '—' }}</span
          >
        </div>
        <ArchivePreview
          :post="selected"
          :state="states.posts"
          :saved="Boolean(selected && savedPosts.has(selected.id))"
          spatial
          @save="(item, event) => $emit('save', item, event)"
        />
        <div class="preview-steppers">
          <button
            class="icon-button"
            :aria-label="t('journal.selection.previous')"
            :disabled="posts.length < 2"
            @click="step(-1)"
          >
            <JournalIcon name="arrow-left" /></button
          ><span>{{ selected?.author }}</span
          ><button
            class="icon-button"
            :aria-label="t('journal.selection.next')"
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
          <span>{{ t('journal.home.calendarKicker') }}</span>
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
      <section class="archive-panel" data-reveal>
        <div class="panel-heading">
          <span>{{ t('journal.home.communityKicker') }}</span>
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
import { useI18n } from 'vue-i18n'
import { journalEventTimeLabel } from '../localizedEventTime'
import { journalCategoryLabel, journalSourceLabel } from '../controlLabels'
import { RouterLink } from 'vue-router'
import JournalIcon from '../JournalIcon.vue'
import JournalResourceState from '../JournalResourceState.vue'
import type { JournalResourceStates } from '../resourceState'
import '../styles/home-loading.css'
import JournalImage from '../JournalImage.vue'
import ArchivePreview from './ArchivePreview.vue'
import ArchiveSelectionDock from './ArchiveSelectionDock.vue'
import { useArchiveNavigation } from './useArchiveNavigation'
import ArchiveNavigationHint from './ArchiveNavigationHint.vue'
import { sourceGroups, timelineGroups } from '../presentation'
import { platforms, type JournalPost, type JournalEvent, type JournalDiscussion } from '../models'
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
const { locale, t } = useI18n({ useScope: 'global' })
const emit = defineEmits<{
  retry: []
  open: [post: JournalPost]
  save: [post: JournalPost, event: MouseEvent]
  platform: [value: string]
  sort: [value: string]
}>()
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
const sources = computed(() => sourceGroups(props.allPosts)),
  groups = computed(() => timelineGroups(props.posts, locale.value, t('journal.nav.posts')))
const today = new Date()
const date = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
    .format(today)
    .toUpperCase()
)
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
