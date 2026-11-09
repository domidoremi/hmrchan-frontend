<template>
  <article class="post-card" :data-post="post.id">
    <button v-if="post.image" class="post-media" :data-open="post.id">
      <JournalImage
        :src="post.image"
        :original-src="post.originalImage"
        :alt="post.title"
        width="400"
        height="400"
        loading="lazy"
      />
      <span class="media-type"
        ><JournalIcon :name="post.type === '节目' ? 'headphones' : 'image'" />{{ post.type }}</span
      >
    </button>
    <button v-else class="text-post" :data-open="post.id">
      <span aria-hidden="true">“</span>
      <p>
        <template v-for="(line, index) in textLines" :key="index"
          >{{ line }}<br v-if="index < textLines.length - 1"
        /></template>
      </p>
      <small>{{ post.author }}</small>
    </button>
    <button
      class="icon-button post-save"
      :class="{ saved }"
      :aria-label="`${saved ? '取消收藏' : '收藏'}：${post.title}`"
      :aria-pressed="saved"
      @click="$emit('save', post, $event)"
    >
      <JournalIcon name="bookmark" />
    </button>
    <div class="post-meta">
      <span class="platform"
        ><i class="platform-dot" :class="`platform-${post.platform}`" />{{
          platforms[post.platform] || post.platform
        }}</span
      ><time>{{ post.time }}</time>
    </div>
    <button v-if="post.image || distinctText" class="post-title" :data-open="post.id">
      {{ post.title }}
    </button>
    <p v-if="post.image && distinctText" class="post-excerpt">{{ post.text }}</p>
    <div class="post-bottom">
      <button class="post-author" :data-author-id="post.authorId" :data-author-query="post.author">
        <img :src="post.avatar" alt="" width="19" height="19" loading="lazy" /><span>{{
          post.author
        }}</span></button
      ><span v-if="!post.editorial && post.likes !== null" class="post-likes"
        ><JournalIcon name="heart" />{{ post.likes }}</span
      >
    </div>
  </article>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import JournalIcon from './JournalIcon.vue'
import JournalImage from './JournalImage.vue'
import { platforms, type JournalPost } from './models'
const props = defineProps<{ post: JournalPost; saved: boolean }>()
const textLines = computed(() => (props.post.text || props.post.title).split('\n'))
const distinctText = computed(
  () => props.post.text.trim() && props.post.text.trim() !== props.post.title.trim()
)
defineEmits<{ save: [post: JournalPost, event: MouseEvent] }>()
</script>
