<template>
  <section
    v-if="selected"
    :ref="setRoot"
    class="spatial-cover"
    :data-scrubbing="scrubbing"
    data-depth-scene
    :aria-label="t('home.latest')"
    @pointerenter="hovered = true"
    @pointerleave="hovered = false"
    @focusin="focused = true"
    @focusout="focusOut"
    @keydown.left.prevent="step(-1)"
    @keydown.right.prevent="step(1)"
  >
    <div class="cover-copy">
      <div class="cover-kicker">
        <span class="status-light" />{{ t('home.latest')
        }}<span
          >{{ String(index + 1).padStart(2, '0') }} /
          {{ String(items.length).padStart(2, '0') }}</span
        >
      </div>
      <div
        v-for="(post, i) in items"
        :key="post.id"
        class="cover-article cover-story"
        :style="copyStyle(i)"
        :inert="post.id !== selectedId || undefined"
        :aria-hidden="post.id !== selectedId || undefined"
      >
        <div class="cover-source">
          <span>{{
            journalSourceLabel(post.platform, platforms[post.platform] || post.platform, t)
          }}</span><time>{{ journalPostTimeLabel(post, t, locale) }}</time>
        </div>
        <h1>
          <button :data-open="post.id" :aria-label="post.title">
            <MotionTitle :text="post.title" />
          </button>
        </h1>
        <p v-if="post.text && post.text !== post.title">{{ post.text }}</p>
        <button
          v-if="post.author"
          class="cover-author"
          :data-author-id="post.authorId"
          :data-author-query="post.author"
        >
          <img :src="post.avatar" alt="" width="28" height="28" /><span>{{ post.author }}</span>
        </button>
        <button
          class="round-action"
          :data-open="post.id"
          :aria-label="t('journal.selection.open')"
          data-magnet
        >
          <span>{{ t('journal.selection.open') }}</span><JournalIcon name="arrow-up-right" />
        </button>
      </div>
      <div class="cover-controls">
        <button
          class="icon-button"
          :aria-label="t('journal.selection.previous')"
          :disabled="items.length < 2"
          @click="step(-1)"
        >
          <JournalIcon name="arrow-left" />
        </button>
        <div class="cover-pagination">
          <button
            v-for="(post, i) in items"
            :key="post.id"
            :aria-label="`${t('journal.selection.select')} ${i + 1}: ${post.title}`"
            :aria-pressed="selectedId === post.id"
            :class="{ active: selectedId === post.id }"
            @click="selectSheet(post.id)"
          >
            <span />
          </button>
        </div>
        <button
          class="icon-button"
          :aria-label="t('journal.selection.next')"
          :disabled="items.length < 2"
          @click="step(1)"
        >
          <JournalIcon name="arrow" /></button
        ><button
          v-if="items.length > 1"
          class="cover-pause"
          :aria-pressed="paused"
          :aria-label="t(paused ? 'video.play' : 'video.pause')"
          @click="paused = !paused"
        >
          <JournalIcon :name="paused ? 'play' : 'pause'" />
        </button>
      </div>
    </div>
    <div
      class="cover-scene"
      data-tilt
      @touchstart.passive="touchStart"
      @touchend.passive="touchEnd"
      @touchcancel.passive="touchCancel"
    >
      <span class="scene-light" aria-hidden="true" />
      <div class="cover-deck">
        <button
          v-for="(post, i) in items"
          :key="post.id"
          class="cover-sheet"
          :class="{ 'is-current': post.id === selectedId }"
          :style="sheetStyle(i)"
          :data-cover-id="post.id"
          :data-open="post.id === selectedId ? post.id : undefined"
          :tabindex="post.id === selectedId ? 0 : -1"
          :aria-hidden="Math.abs(position(i)) > 2 || undefined"
          @click="selectSheet(post.id)"
        >
          <JournalImage
            v-if="post.image"
            :src="post.image"
            :original-src="post.originalImage"
            :alt="post.title"
            width="640"
            height="800"
            :loading="Math.abs(position(i)) <= 2 ? 'eager' : 'lazy'"
            :fetchpriority="post.id === selectedId ? 'high' : 'low'"
            :upgrade="post.id === selectedId"
          />
          <span
            v-else
            class="cover-sheet-text"
            :class="{ 'short-copy': (post.text || post.title).length < 80 }"
            >{{ post.text || post.title }}</span
          >
          <span class="sheet-caption"
            ><b>{{ String(i + 1).padStart(2, '0') }}</b
            ><span>{{
              post.author ||
              journalSourceLabel(post.platform, platforms[post.platform] || post.platform, t)
            }}</span
            ><JournalIcon name="arrow-up-right"
          /></span>
        </button>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import JournalIcon from '../JournalIcon.vue'
import JournalImage from '../JournalImage.vue'
import { journalSourceLabel } from '../controlLabels'
import { journalPostTimeLabel } from '../localizedPostTime'
import { platforms, type JournalPost } from '../models'
import { computed } from 'vue'
import { useCoverPlayback } from './useCoverPlayback'
import MotionTitle from './MotionTitle.vue'
const { locale, t } = useI18n({ useScope: 'global' })
const props = defineProps<{ posts: JournalPost[] }>()
const {
  setRoot,
  items,
  selectedId,
  selected,
  index,
  step,
  position,
  copyStyle,
  scrubbing,
  hovered,
  focused,
  paused,
  focusOut,
  selectSheet,
  touchStart,
  touchEnd,
  touchCancel,
} = useCoverPlayback(computed(() => props.posts))
function sheetStyle(i: number) {
  const offset = position(i)
  return {
    '--slot': offset,
    '--depth': Math.abs(offset),
    zIndex: items.value.length - Math.round(Math.abs(offset)),
    opacity: Math.min(1, Math.max(0, 3 - Math.abs(offset))),
    pointerEvents: Math.abs(offset) > 2 ? ('none' as const) : ('auto' as const),
  }
}
</script>
