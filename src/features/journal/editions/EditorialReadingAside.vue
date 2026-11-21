<template>
  <aside ref="aside" class="editorial-reading-aside">
    <section v-if="featured" class="reading-author-panel" data-reveal>
      <button
        class="reading-author-link"
        :data-author-id="featured.authorId"
        :data-author-query="featured.author"
      >
        <PublicAuthorAvatar :src="featured.avatar" :author-id="featured.authorId" :size="64" />
        <span
          ><b>{{ featured.author }}</b></span
        >
        <JournalIcon name="arrow-up-right" />
      </button>
      <div v-if="featured.tags.length" class="reading-author-tags">
        <button v-for="tag in featured.tags.slice(0, 3)" :key="tag" :data-search-term="tag">
          # {{ tag }}
        </button>
      </div>
      <RouterLink class="reading-panel-link" to="/authors">
        {{ t('nav.authors') }}<JournalIcon name="arrow" />
      </RouterLink>
    </section>
    <section class="reading-schedule-panel" data-reveal>
      <header>
        <span class="reading-panel-symbol"><JournalIcon name="calendar" /></span>
        <h3>{{ t('journal.home.monthEvents', { month: monthName }) }}</h3>
        <RouterLink to="/schedule" :aria-label="t('journal.home.openCalendar')">
          <JournalIcon name="arrow-up-right" />
        </RouterLink>
      </header>
      <article v-for="event in events.slice(0, 3)" :key="event.id">
        <time :datetime="event.date">{{ String(event.day).padStart(2, '0') }}</time>
        <button :data-event="event.id">
          <b>{{ event.title }}</b><small
            >{{ journalEventTimeLabel(event, t) }} · {{ event.venue }}</small
          >
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
    </section>
    <section
      v-if="sources.length"
      class="reading-sources-panel"
      :aria-label="t('journal.home.sourceDistribution')"
      data-reveal
    >
      <div v-for="source in sources" :key="source.key">
        <span>{{ journalSourceLabel(source.key, source.label, t) }}</span>
        <span class="reading-source-meter" aria-hidden="true">
          <i :style="{ '--source-ratio': source.count / posts.length }" />
        </span>
        <b>{{ source.count }}</b>
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PublicAuthorAvatar from '@/components/business/PublicAuthorAvatar.vue'
import { journalSourceLabel } from '../controlLabels'
import { journalEventTimeLabel } from '../localizedEventTime'
import { sourceGroups } from '../presentation'
import JournalIcon from '../JournalIcon.vue'
import JournalResourceState from '../JournalResourceState.vue'
import type { JournalPost, JournalEvent } from '../models'
import type { JournalResourceStates } from '../resourceState'
import { useReadingAside } from './useReadingAside'
import '../styles/home-reading-layout.css'

const props = defineProps<{
  posts: JournalPost[]
  events: JournalEvent[]
  states: JournalResourceStates
  monthName: string
}>()
defineEmits<{ retry: [] }>()
const { t } = useI18n({ useScope: 'global' })
const featured = computed(() => props.posts.find((post) => post.author))
const sources = computed(() => sourceGroups(props.posts))
const aside = ref<HTMLElement>()
useReadingAside(aside)
</script>
