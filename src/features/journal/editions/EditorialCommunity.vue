<template>
  <div class="editorial-page editorial-community">
    <header class="editorial-page-heading" data-reveal>
      <span class="eyebrow">{{ t('journal.community.conversations') }}</span>
      <div>
        <h1>
          {{ t('community.title') }}<em>{{ String(discussions.length).padStart(2, '0') }}</em>
        </h1>
        <button class="round-action" @click="$emit('compose')">
          <span>{{ t('community.newDiscussion') }}</span><JournalIcon name="plus" />
        </button>
      </div>
    </header>
    <section v-if="featured" class="community-cover" data-reveal>
      <div class="community-cover-index" aria-hidden="true">
        <span>01</span><JournalIcon name="messages" /><i />
      </div>
      <div class="community-cover-copy">
        <div class="meta-line">
          <span>{{
            featured.pinned ? t('community.pinned') : journalCategoryLabel(featured.category, t)
          }}</span><time>{{ journalDateLabel(featured.time, locale) }}</time>
        </div>
        <h2>
          <button :data-discussion="featured.id">{{ featured.title }}</button>
        </h2>
        <p>{{ featured.text }}</p>
        <div>
          <span
            >{{ featured.author }} ·
            {{ t('journal.community.replies', { count: featured.replies }) }}</span
          ><button
            class="icon-button"
            :data-discussion="featured.id"
            :aria-label="t('journal.community.readNamed', { title: featured.title })"
          >
            <JournalIcon name="arrow-up-right" />
          </button>
        </div>
      </div>
    </section>
    <div class="community-index-bar">
      <h2>{{ t('journal.community.index') }}</h2>
      <div class="chips">
        <button
          v-for="label in categories"
          :key="label"
          class="chip"
          :class="{ active: category === label }"
          @click="$emit('category', label)"
        >
          {{ journalCategoryLabel(label, t) }}
        </button>
      </div>
    </div>
    <div class="editorial-discussion-list">
      <article
        v-for="(item, i) in discussions"
        :key="item.id"
        class="editorial-discussion"
        data-reveal
      >
        <span>{{ String(i + 1).padStart(2, '0') }}</span>
        <div>
          <div class="meta-line">
            <span>{{ journalCategoryLabel(item.category, t) }}</span><span v-if="item.pinned">{{
              t('community.pinned')
            }}</span
            ><time>{{ journalDateLabel(item.time, locale) }}</time>
          </div>
          <h3>
            <button :data-discussion="item.id">{{ item.title }}</button>
          </h3>
          <p>{{ item.text }}</p>
          <small
            >{{ item.author }} ·
            {{ t('journal.community.replies', { count: item.replies }) }}</small
          >
        </div>
        <button
          class="icon-button"
          :data-discussion="item.id"
          :aria-label="t('journal.community.readNamed', { title: item.title })"
        >
          <JournalIcon name="arrow-up-right" />
        </button>
      </article>
    </div>
    <slot name="state" />
    <div v-if="!discussions.length && !loading && !error" class="empty-state">
      <JournalIcon name="messages" />
      <h3>{{ t('journal.states.noDiscussions') }}</h3>
      <button class="text-button" @click="$emit('compose')">
        {{ t('community.newDiscussion') }} <JournalIcon name="plus" />
      </button>
    </div>
    <div v-if="hasMore" class="load-more">
      <button class="button button-outline" :disabled="loading" @click="$emit('more')">
        {{ t('journal.community.more') }} <JournalIcon name="plus" />
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { journalCategoryLabel } from '../controlLabels'
import { journalDateLabel } from '../localizedDate'
import JournalIcon from '../JournalIcon.vue'
import type { JournalDiscussion } from '../models'
const { locale, t } = useI18n({ useScope: 'global' })
const props = defineProps<{
  discussions: JournalDiscussion[]
  category: string
  loading: boolean
  error: string
  hasMore: boolean
}>()
defineEmits<{ category: [value: string]; compose: []; more: [] }>()
const categories = ['全部', '日常闲聊', '提问', '分享', '反馈']
const featured = computed(
  () => props.discussions.find((item) => item.pinned) || props.discussions[0]
)
</script>
