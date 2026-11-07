<template>
  <article class="post-card" :data-post="post.id">
    <button
      v-if="post.image"
      class="post-media"
      :data-open="post.id"
      :aria-label="`查看：${post.title}`"
    >
      <img
        :src="post.image"
        :alt="post.title"
        :class="{ 'image-garden': post.id === 'garden' }"
        width="400"
        height="400"
        loading="lazy"
      />
      <span class="media-type"
        ><JournalIcon :name="post.type === '节目' ? 'headphones' : 'image'" />{{ post.type }}</span
      >
    </button>
    <button v-else class="text-post" :data-open="post.id" :aria-label="`阅读：${post.title}`">
      <span aria-hidden="true">“</span>
      <p>
        {{
          post.id === 'letter'
            ? '最近在听什么？\n这周的歌单\n又换了一轮。'
            : post.text || post.title
        }}
      </p>
      <small>ON REPEAT</small>
    </button>
    <button
      v-if="post.editorial"
      class="icon-button post-save"
      :data-gallery="post.id"
      :aria-label="`全屏查看：${post.title}`"
    >
      <JournalIcon name="expand" />
    </button>
    <button
      v-else
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
    <button class="post-title" :data-open="post.id">{{ post.title }}</button>
    <p class="post-excerpt">{{ post.text }}</p>
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
import JournalIcon from './JournalIcon.vue'
import { platforms, type JournalPost } from './models'
defineProps<{ post: JournalPost; saved: boolean }>()
defineEmits<{ save: [post: JournalPost, event: MouseEvent] }>()
</script>
