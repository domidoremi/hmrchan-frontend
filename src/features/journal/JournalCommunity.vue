<template>
  <div class="page-container">
    <div class="page-heading">
      <div>
        <span class="eyebrow">COMMUNITY</span>
        <h1>社区</h1>
        <p>最近在聊什么</p>
      </div>
      <button class="button button-dark" @click="$emit('compose')">
        <JournalIcon name="plus" />发起讨论
      </button>
    </div>
    <JournalScene kind="conversation" />
    <div class="chips" aria-label="讨论分类">
      <button
        v-for="item in categories"
        :key="item"
        class="chip"
        :class="{ active: category === item }"
        :aria-pressed="category === item"
        @click="$emit('category', item)"
      >
        {{ item }}
      </button>
    </div>
    <div class="community-layout">
      <section class="discussion-list" aria-label="社区讨论">
        <JournalDiscussionRow
          v-for="discussion in discussions"
          :key="discussion.id"
          :discussion="discussion"
        /><slot name="state" />
        <div v-if="!loading && !error && !discussions.length" class="empty-state">
          <JournalIcon name="compass" />
          <h3>暂无讨论</h3>
          <button class="button button-outline button-small" @click="$emit('compose')">
            发起讨论
          </button>
        </div>
        <button v-if="hasMore" class="text-button" :disabled="loading" @click="$emit('more')">
          更多讨论 <JournalIcon name="arrow" />
        </button>
      </section>
      <aside class="community-aside">
        <h3>话题</h3>
        <div class="tag-cloud">
          <button v-for="[value, label] in topics" :key="label" @click="$emit('category', value)">
            # {{ label }}
          </button>
        </div>
        <hr />
        <RouterLink class="text-button" to="/about"
          >关于 MomiChan <JournalIcon name="arrow-up-right"
        /></RouterLink>
      </aside>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import JournalScene from './JournalScene.vue'
import JournalIcon from './JournalIcon.vue'
import JournalDiscussionRow from './JournalDiscussionRow.vue'
import type { JournalDiscussion } from './models'
const props = defineProps<{
  discussions: JournalDiscussion[]
  category: string
  loading: boolean
  error: string
  hasMore: boolean
  fixture: boolean
}>()
defineEmits<{ category: [value: string]; compose: []; more: [] }>()
const categories = computed(() =>
  props.fixture
    ? ['全部', '舞台讨论', '粉丝创作', '日常闲聊', '资料整理']
    : ['全部', '日常闲聊', '提问', '分享', '反馈']
)
const topics = [
  ['舞台讨论', '舞台推荐'],
  ['粉丝创作', 'ひめり手账'],
  ['日常闲聊', '最近在听'],
  ['资料整理', '节目清单'],
] as const
</script>
