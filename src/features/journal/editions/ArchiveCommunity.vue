<template>
  <div class="archive-page archive-community">
    <header class="archive-page-title" data-reveal>
      <div>
        <span class="eyebrow">COMMUNITY</span>
        <h1>讨论<span class="title-dot">.</span></h1>
      </div>
      <button class="button button-dark" @click="$emit('compose')">
        <JournalIcon name="plus" />发起讨论
      </button>
    </header>
    <div class="archive-forum">
      <nav class="forum-categories" aria-label="讨论分类">
        <button
          v-for="(label, i) in categories"
          :key="label"
          :class="{ active: category === label }"
          @click="$emit('category', label)"
        >
          <JournalIcon :name="icons[i] || 'messages'" /><span>{{ label }}</span
          ><JournalIcon name="chevron" />
        </button>
      </nav>
      <section class="forum-threads" data-reveal>
        <div class="panel-heading">
          <span>THREADS</span>
          <h2>{{ category === '全部' ? '全部讨论' : category }}</h2>
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
            <span>{{ item.category }}</span><span v-if="item.pinned">置顶</span
            ><time>{{ item.time }}</time>
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
          <h3>暂无讨论</h3>
        </div>
        <div v-if="hasMore" class="load-more">
          <button class="button button-outline" :disabled="loading" @click="$emit('more')">
            更多讨论 <JournalIcon name="plus" />
          </button>
        </div>
      </section>
      <aside class="forum-preview">
        <div class="inspector-heading"><span>讨论预览</span><JournalIcon name="messages" /></div>
        <Transition name="archive-preview" mode="out-in"
          ><article v-if="selected" :key="selected.id">
            <div class="meta-line">
              <span>{{ selected.category }}</span><time>{{ selected.time }}</time>
            </div>
            <h2>{{ selected.title }}</h2>
            <div class="forum-author">
              <span class="discussion-avatar">{{ selected.avatar }}</span><span
                >{{ selected.author }}<small>{{ selected.replies }} 条回复</small></span
              >
            </div>
            <p>{{ selected.text }}</p>
            <button class="button button-dark" :data-discussion="selected.id">
              阅读与回复 <JournalIcon name="arrow-up-right" />
            </button>
          </article>
          <div v-else class="empty-state">暂无讨论</div></Transition
        >
      </aside>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
