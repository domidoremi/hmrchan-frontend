<template>
  <div class="archive-preview" :class="{ 'preview-spatial': spatial }" data-tilt>
    <div class="preview-edge" aria-hidden="true" />
    <div class="preview-edge second" aria-hidden="true" />
    <Transition name="archive-preview" mode="out-in"
      ><article v-if="post" :key="post.id" class="preview-face post-card" :data-post="post.id">
        <div class="preview-caption">
          <span>{{
            journalSourceLabel(post.platform, platforms[post.platform] || post.platform, t)
          }}</span><span>{{ journalContentTypeLabel(post.type, t) }}</span
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
            fetchpriority="high"
            fit="contain"
          /><span v-else>{{ post.text || post.title }}</span>
        </button>
        <div class="preview-copy">
          <div class="meta-line">
            <button :data-author-id="post.authorId" :data-author-query="post.author">
              {{ post.author }}</button><time>{{ journalPostTimeLabel(post, t, locale) }}</time>
          </div>
          <h2 v-if="post.image || post.text.trim() !== post.title.trim()">
            <button :data-open="post.id">{{ post.title }}</button>
          </h2>
          <p v-if="post.image && post.text.trim() && post.text.trim() !== post.title.trim()">
            {{ post.text }}
          </p>
          <div v-if="post.tags.length" class="preview-tags">
            <button v-for="tag in post.tags.slice(0, 4)" :key="tag" :data-search-term="tag">
              # {{ tag }}
            </button>
          </div>
          <div class="preview-actions">
            <button class="button button-dark" :data-open="post.id">
              {{ t('journal.actions.open') }} <JournalIcon name="arrow-up-right" /></button
            ><button
              class="button button-outline"
              :aria-pressed="saved"
              :aria-label="
                t(saved ? 'journal.actions.removeFavorite' : 'journal.actions.addFavorite', {
                  title: post.title,
                })
              "
              @click="$emit('save', post, $event)"
            >
              <JournalIcon name="bookmark" />{{
                t(saved ? 'journal.actions.saved' : 'post.favorite')
              }}</button
            ><span v-if="post.likes !== null"><JournalIcon name="heart" />{{ post.likes }}</span>
          </div>
        </div>
      </article>
    </Transition>
    <template v-if="!post">
      <div
        v-if="state === 'loading' || state === 'idle'"
        class="archive-loading-preview"
        aria-hidden="true"
      >
        <span>{{ t('journal.selection.preview') }}</span>
        <div><i /><i /><i /></div>
        <small>· · ·</small>
      </div>
      <div v-else class="preview-empty">
        <JournalIcon name="file" /><span>{{
          t(state === 'error' ? 'journal.selection.unavailable' : 'journal.selection.empty')
        }}</span>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import JournalIcon from '../JournalIcon.vue'
import JournalImage from '../JournalImage.vue'
import { journalContentTypeLabel, journalSourceLabel } from '../controlLabels'
import { journalPostTimeLabel } from '../localizedPostTime'
import { platforms, type JournalPost } from '../models'
import type { JournalResourceState } from '../resourceState'
const { locale, t } = useI18n({ useScope: 'global' })
defineProps<{
  post?: JournalPost | undefined
  saved: boolean
  spatial?: boolean
  state?: JournalResourceState
}>()
defineEmits<{ save: [post: JournalPost, event: MouseEvent] }>()
</script>
