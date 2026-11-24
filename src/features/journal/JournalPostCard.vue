<template>
  <article
    class="post-card"
    :class="post.image ? 'post-card--media' : 'post-card--text'"
    :data-post="post.id"
  >
    <button v-if="post.image" class="post-media" :data-open="post.id">
      <JournalImage
        :src="post.image"
        :original-src="post.originalImage"
        :alt="post.title"
        :width="preview ? '160' : '400'"
        :height="preview ? '160' : '400'"
        loading="lazy"
      />
      <span v-if="!preview" class="media-type"
        ><JournalIcon :name="post.type === '节目' ? 'headphones' : 'image'" />{{
          journalContentTypeLabel(post.type, t)
        }}</span
      >
    </button>
    <button v-else-if="!preview" class="text-post" :data-open="post.id">
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
      :aria-label="
        t(saved ? 'journal.actions.removeFavorite' : 'journal.actions.addFavorite', {
          title: post.title,
        })
      "
      :aria-pressed="saved"
      @click="$emit('save', post, $event)"
    >
      <JournalIcon name="bookmark" />
    </button>
    <div class="post-meta">
      <span class="platform"
        ><i class="platform-dot" :class="`platform-${post.platform}`" />{{
          journalSourceLabel(post.platform, platforms[post.platform] || post.platform, t)
        }}</span
      ><time>{{ journalPostTimeLabel(post, t, locale) }}</time>
    </div>
    <button
      v-if="preview || post.image || copy.showTextTitle"
      class="post-title"
      :data-open="post.id"
    >
      {{ post.title }}
    </button>
    <p v-if="!preview && post.image && copy.showImageExcerpt" class="post-excerpt">
      {{ post.text }}
    </p>
    <div class="post-bottom">
      <button
        v-if="post.author || post.authorId"
        class="post-author"
        :data-author-id="post.authorId"
        :data-author-query="post.author"
      >
        <PublicAuthorAvatar :src="post.avatar" :author-id="post.authorId" :size="19" /><span>{{
          post.author || t('search.type.author')
        }}</span></button
      ><span v-if="!post.editorial && post.likes !== null" class="post-likes"
        ><JournalIcon name="heart" />{{ post.likes }}</span
      >
    </div>
  </article>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import PublicAuthorAvatar from '@/components/business/PublicAuthorAvatar.vue'
import JournalIcon from './JournalIcon.vue'
import JournalImage from './JournalImage.vue'
import { journalContentTypeLabel, journalSourceLabel } from './controlLabels'
import { journalPostTimeLabel } from './localizedPostTime'
import { platforms, type JournalPost } from './models'
import { postCopyPresentation } from './post-copy'
const { locale, t } = useI18n({ useScope: 'global' })
const props = defineProps<{ post: JournalPost; saved: boolean; preview?: boolean }>()
const textLines = computed(() => (props.post.text || props.post.title).split('\n'))
const copy = computed(() => postCopyPresentation(props.post))
defineEmits<{ save: [post: JournalPost, event: MouseEvent] }>()
</script>
