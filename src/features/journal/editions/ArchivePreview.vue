<template>
  <div class="archive-preview" :class="{ 'preview-spatial': spatial }" data-tilt>
    <div class="preview-edge" aria-hidden="true" />
    <div class="preview-edge second" aria-hidden="true" />
    <Transition name="archive-preview" mode="out-in"
      ><article v-if="post" :key="post.id" class="preview-face post-card" :data-post="post.id">
        <div class="preview-caption">
          <span>{{ platforms[post.platform] || post.platform }}</span
          ><span>{{ post.type }}</span
          ><JournalIcon name="expand" />
        </div>
        <button
          class="preview-media"
          :class="{ 'is-text': !post.image }"
          :data-open="post.id"
          :aria-label="post.image ? post.title : undefined"
        >
          <JournalImage
            v-if="post.image"
            :src="post.image"
            :original-src="post.originalImage"
            :alt="post.title"
            width="600"
            height="680"
            loading="eager"
            fit="contain"
          /><span v-else>{{ post.text || post.title }}</span>
        </button>
        <div class="preview-copy">
          <div class="meta-line">
            <button :data-author-id="post.authorId" :data-author-query="post.author">
              {{ post.author }}</button
            ><time>{{ post.time }}</time>
          </div>
          <h2>
            <button :data-open="post.id">{{ post.title }}</button>
          </h2>
          <p v-if="post.text !== post.title">{{ post.text }}</p>
          <div class="preview-tags">
            <button v-for="tag in post.tags.slice(0, 4)" :key="tag" :data-search-term="tag">
              # {{ tag }}
            </button>
          </div>
          <div class="preview-actions">
            <button class="button button-dark" :data-open="post.id">
              打开 <JournalIcon name="arrow-up-right" /></button
            ><button
              class="button button-outline"
              :aria-pressed="saved"
              :aria-label="`${saved ? '已收藏，取消收藏' : '收藏'}：${post.title}`"
              @click="$emit('save', post, $event)"
            >
              <JournalIcon name="bookmark" />{{ saved ? '已收藏' : '收藏' }}</button
            ><span v-if="post.likes !== null"><JournalIcon name="heart" />{{ post.likes }}</span>
          </div>
        </div>
      </article>
      <div v-else class="preview-empty">
        <JournalIcon name="file" /><span>暂无内容</span>
      </div></Transition
    >
  </div>
</template>
<script setup lang="ts">
import JournalIcon from '../JournalIcon.vue'
import JournalImage from '../JournalImage.vue'
import { platforms, type JournalPost } from '../models'
defineProps<{ post?: JournalPost | undefined; saved: boolean; spatial?: boolean }>()
defineEmits<{ save: [post: JournalPost, event: MouseEvent] }>()
</script>
