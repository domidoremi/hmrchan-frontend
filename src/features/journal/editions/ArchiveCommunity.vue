<template>
  <div class="archive-page archive-community">
    <header class="archive-page-title" data-reveal>
      <div>
        <span class="eyebrow">{{ t('journal.home.communityKicker') }}</span>
        <h1>{{ t('journal.nav.discussions') }}<span class="title-dot">.</span></h1>
      </div>
      <button class="button button-dark" @click="$emit('compose')">
        <JournalIcon name="plus" />{{ t('community.newDiscussion') }}
      </button>
    </header>
    <div class="archive-forum">
      <nav class="forum-categories" :aria-label="t('journal.community.categories')">
        <button
          v-for="(label, i) in categories"
          :key="label"
          :class="{ active: category === label }"
          @click="$emit('category', label)"
        >
          <JournalIcon :name="icons[i] || 'messages'" /><span>{{
            journalCategoryLabel(label, t)
          }}</span
          ><JournalIcon name="chevron" />
        </button>
      </nav>
      <section class="forum-threads" data-reveal>
        <div class="panel-heading">
          <span>{{ t('journal.community.threads') }}</span>
          <h2>
            {{
              category === '全部'
                ? t('journal.community.allDiscussions')
                : journalCategoryLabel(category, t)
            }}
          </h2>
          <span class="meta-count">{{ discussions.length }}</span>
        </div>
        <button
          v-for="item in discussions"
          :key="item.id"
          class="forum-thread"
          :class="{ selected: selected?.id === item.id }"
          :aria-pressed="selected?.id === item.id"
          @click="selectedId = item.id"
        >
          <div class="meta-line">
            <span>{{ journalCategoryLabel(item.category, t) }}</span><span v-if="item.pinned">{{
              t('community.pinned')
            }}</span
            ><time>{{ journalDateLabel(item.time, locale) }}</time>
          </div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
          <div>
            <span class="discussion-avatar">{{ item.avatar }}</span><span>{{ item.author }}</span
            ><small>{{ item.replies }} <JournalIcon name="messages" /></small>
          </div></button
        ><slot name="state" />
        <div v-if="!discussions.length && !loading && !error" class="empty-state">
          <JournalIcon name="messages" />
          <h3>{{ t('journal.states.noDiscussions') }}</h3>
        </div>
        <div v-if="hasMore" class="load-more">
          <button class="button button-outline" :disabled="loading" @click="$emit('more')">
            {{ t('journal.community.more') }} <JournalIcon name="plus" />
          </button>
        </div>
      </section>
      <aside class="forum-preview">
        <div class="inspector-heading">
          <span>{{ t('journal.community.preview') }}</span><JournalIcon name="messages" />
        </div>
        <Transition name="archive-preview" mode="out-in"
          ><article v-if="selected" :key="selected.id">
            <div class="meta-line">
              <span>{{ journalCategoryLabel(selected.category, t) }}</span><time>{{
                journalDateLabel(selected.time, locale)
              }}</time>
            </div>
            <h2>{{ selected.title }}</h2>
            <div class="forum-author">
              <span class="discussion-avatar">{{ selected.avatar }}</span><span
                >{{ selected.author
                }}<small>{{
                  t('journal.community.replies', { count: selected.replies })
                }}</small></span
              >
            </div>
            <p>{{ selected.text }}</p>
            <button class="button button-dark" :data-discussion="selected.id">
              {{ t('journal.community.readAndReply') }} <JournalIcon name="arrow-up-right" />
            </button>
          </article>
          <div v-else class="empty-state">{{ t('journal.states.noDiscussions') }}</div></Transition
        >
      </aside>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
const categories = ['全部', '日常闲聊', '提问', '分享', '反馈'],
  icons = ['messages', 'users', 'file', 'image', 'flag']
const selectedId = ref('')
watch(
  () => props.discussions,
  (items) => {
    if (!items.some((item) => item.id === selectedId.value)) selectedId.value = items[0]?.id || ''
  },
  { immediate: true }
)
const selected = computed(() => props.discussions.find((item) => item.id === selectedId.value))
</script>
