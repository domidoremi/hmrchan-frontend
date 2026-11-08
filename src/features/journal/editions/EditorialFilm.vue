<template>
  <section class="editorial-film" data-reveal data-depth-scene>
    <div class="film-heading">
      <span>02 / PHOTOGRAPHS</span>
      <h2>影像</h2>
      <div>
        <button
          class="icon-button"
          aria-label="向前浏览影像"
          :disabled="!canScroll || progress <= 0.002"
          @click="step(-1)"
        >
          <JournalIcon name="arrow-left" />
        </button>
        <button
          class="icon-button"
          aria-label="向后浏览影像"
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
      aria-label="影像横卷"
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
        ><span class="sr-only">影像浏览进度</span
        ><input
          type="range"
          min="0"
          max="1000"
          :value="Math.round(progress * 1000)"
          :disabled="!canScroll"
          :aria-valuetext="`第 ${index + 1} 张，共 ${posts.length} 张`"
          @input="scrub" /><i aria-hidden="true"
      /></label>
      <span class="film-current-author">{{ posts[index]?.author }}</span>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import JournalIcon from '../JournalIcon.vue'
import JournalImage from '../JournalImage.vue'
import type { JournalPost } from '../models'
import { useFilmstrip } from './useFilmstrip'
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
