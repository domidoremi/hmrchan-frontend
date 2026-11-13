<template>
  <section class="editorial-film" data-reveal data-depth-scene>
    <div class="film-heading">
      <span>02 / {{ t('journal.film.kicker') }}</span>
      <h2>{{ t('journal.film.title') }}</h2>
      <div>
        <button
          class="icon-button"
          :aria-label="t('journal.film.previous')"
          :disabled="!canScroll || progress <= 0.002"
          @click="step(-1)"
        >
          <JournalIcon name="arrow-left" />
        </button>
        <button
          class="icon-button"
          :aria-label="t('journal.film.next')"
          :disabled="!canScroll || progress >= 0.998"
          @click="step(1)"
        >
          <JournalIcon name="arrow" />
        </button>
      </div>
    </div>
    <div
      :ref="setTrack"
      class="film-track"
      :class="{ 'is-dragging': dragging }"
      role="region"
      :aria-label="t('journal.film.region')"
      tabindex="0"
      @scroll.passive="schedule"
      @keydown="keydown"
      @pointerdown="pointerdown"
      @pointermove="pointermove"
      @pointerup="pointerend"
      @pointercancel="pointerend"
      @lostpointercapture="pointerend"
      @click.capture="click"
      @dragstart.prevent
    >
      <button
        v-for="(post, i) in posts"
        :key="post.id"
        :data-open="post.id"
        class="film-frame"
        :class="{ 'is-current': i === index }"
      >
        <span>{{ String(i + 1).padStart(2, '0') }} / {{ post.author }}</span>
        <JournalImage
          :src="post.image!"
          :original-src="post.originalImage"
          :alt="post.title"
          loading="lazy"
          width="400"
          height="520"
        />
        <span>{{ post.title }} <JournalIcon name="arrow-up-right" /></span>
      </button>
    </div>
    <div class="film-position">
      <span class="film-counter"
        ><b>{{ String(index + 1).padStart(2, '0') }}</b
        ><span>/ {{ String(posts.length).padStart(2, '0') }}</span></span
      >
      <label class="film-scrubber" :style="{ '--film-progress': progress }"
        ><span class="sr-only">{{ t('journal.film.progress') }}</span
        ><input
          type="range"
          min="0"
          max="1000"
          :value="Math.round(progress * 1000)"
          :disabled="!canScroll"
          :aria-valuetext="t('journal.film.position', { index: index + 1, total: posts.length })"
          @input="scrub" /><i aria-hidden="true"
      /></label>
      <span class="film-current-author">{{ posts[index]?.author }}</span>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import JournalIcon from '../JournalIcon.vue'
import JournalImage from '../JournalImage.vue'
import type { JournalPost } from '../models'
import { useFilmstrip } from './useFilmstrip'
const { t } = useI18n({ useScope: 'global' })
const props = defineProps<{ posts: JournalPost[] }>()
const {
  setTrack,
  index,
  progress,
  canScroll,
  dragging,
  schedule,
  step,
  scrub,
  keydown,
  pointerdown,
  pointermove,
  pointerend,
  click,
} = useFilmstrip(computed(() => props.posts))
</script>
