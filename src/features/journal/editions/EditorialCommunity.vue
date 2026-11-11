<template>
  <div class="editorial-page editorial-community">
    <header class="editorial-page-heading" data-reveal>
      <span class="eyebrow">CONVERSATIONS</span>
      <div>
        <h1>
          社区<em>{{ String(discussions.length).padStart(2, '0') }}</em>
        </h1>
        <button class="round-action" @click="$emit('compose')">
          <span>发起讨论</span><JournalIcon name="plus" />
        </button>
      </div>
    </header>
    <section v-if="featured" class="community-cover" data-reveal>
      <div class="community-cover-index" aria-hidden="true">
        <span>01</span><JournalIcon name="messages" /><i />
      </div>
      <div class="community-cover-copy">
        <div class="meta-line">
          <span>{{ featured.pinned ? '置顶' : featured.category }}</span><time>{{
            featured.time
          }}</time>
        </div>
        <h2>
          <button :data-discussion="featured.id">{{ featured.title }}</button>
        </h2>
        <p>{{ featured.text }}</p>
        <div>
          <span>{{ featured.author }} · {{ featured.replies }} 条回复</span
          ><button
            class="icon-button"
            :data-discussion="featured.id"
            :aria-label="`阅读：${featured.title}`"
          >
            <JournalIcon name="arrow-up-right" />
          </button>
        </div>
      </div>
    </section>
    <div class="community-index-bar">
      <h2>讨论索引</h2>
      <div class="chips">
        <button
          v-for="label in categories"
          :key="label"
          class="chip"
          :class="{ active: category === label }"
          @click="$emit('category', label)"
        >
          {{ label }}
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
            <span>{{ item.category }}</span><span v-if="item.pinned">置顶</span
            ><time>{{ item.time }}</time>
          </div>
          <h3>
            <button :data-discussion="item.id">{{ item.title }}</button>
          </h3>
          <p>{{ item.text }}</p>
          <small>{{ item.author }} · {{ item.replies }} 条回复</small>
        </div>
        <button class="icon-button" :data-discussion="item.id" :aria-label="`阅读：${item.title}`">
          <JournalIcon name="arrow-up-right" />
        </button>
      </article>
    </div>
    <slot name="state" />
    <div v-if="!discussions.length && !loading && !error" class="empty-state">
      <JournalIcon name="messages" />
      <h3>暂无讨论</h3>
      <button class="text-button" @click="$emit('compose')">
        发起讨论 <JournalIcon name="plus" />
      </button>
    </div>
    <div v-if="hasMore" class="load-more">
      <button class="button button-outline" :disabled="loading" @click="$emit('more')">
        更多讨论 <JournalIcon name="plus" />
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import JournalIcon from '../JournalIcon.vue'
import type { JournalDiscussion } from '../models'
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
