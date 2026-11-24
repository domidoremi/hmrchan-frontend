<template>
  <section
    :ref="setRoot"
    class="next-stage"
    :data-scrubbing="scrubbing"
    :class="{ 'has-entered': hasEntered }"
    :aria-label="t('journal.next.featured')"
    @pointerenter="hovered = true"
    @pointerleave="hovered = false"
    @focusin="focused = true"
    @focusout="focusOut"
    @keydown.left.prevent="step(-1)"
    @keydown.right.prevent="step(1)"
  >
    <div class="next-stage-copy">
      <div
        v-for="(post, i) in items"
        :key="post.id"
        class="next-stage-entry"
        :style="copyStyle(i)"
        :inert="post.id !== selectedId || undefined"
        :aria-hidden="post.id !== selectedId || undefined"
      >
        <h2 :aria-label="post.title"><MotionTitle :text="post.title" /></h2>
        <p class="next-stage-byline">
          <PublicAuthorAvatar
            v-if="post.author || post.authorId"
            :src="post.avatar"
            :author-id="post.authorId"
            :size="28"
          />
          <span>{{ post.author || t('search.type.author') }}</span><span aria-hidden="true">·</span
          ><span>{{ journalPostTimeLabel(post, t, locale) }}</span>
        </p>
        <button class="button button-dark" :data-open="post.id" data-magnet>
          {{ t('journal.actions.open') }}<JournalIcon name="arrow-up-right" />
        </button>
      </div>
    </div>
    <div
      v-if="selected"
      class="next-stage-scene"
      data-tilt
      @touchstart.passive="touchStart"
      @touchend.passive="touchEnd"
      @touchcancel.passive="touchCancel"
    >
      <div class="next-orbit next-orbit-wide" aria-hidden="true" />
      <div class="next-orbit next-orbit-tall" aria-hidden="true" />
      <span class="scene-light" aria-hidden="true" />
      <div class="next-stage-planes" data-depth-scene>
        <button
          v-for="(post, i) in items"
          :key="post.id"
          class="next-stage-photo"
          :class="{ 'is-current': post.id === selectedId }"
          :style="photoStyle(i)"
          :data-open="post.id === selectedId ? post.id : undefined"
          :data-cover-id="post.id"
          :tabindex="post.id === selectedId ? 0 : -1"
          :aria-hidden="post.id !== selectedId || undefined"
          :aria-label="post.title"
        >
          <JournalImage
            v-if="post.image"
            :src="post.image"
            :original-src="post.originalImage"
            :alt="post.title"
            width="640"
            height="800"
            :loading="hasEntered && Math.abs(position(i)) <= 1 ? 'eager' : 'lazy'"
            :fetchpriority="hasEntered && post.id === selectedId ? 'high' : 'low'"
            :upgrade="post.id === selectedId"
          />
          <span v-else class="next-stage-text">{{ post.text || post.title }}</span>
          <span class="next-photo-caption">
            <span>
              <small>
                {{
                  journalSourceLabel(post.platform, platforms[post.platform] || post.platform, t)
                }}
                · {{ journalPostTimeLabel(post, t, locale) }}
              </small>
              <b>{{ post.title }}</b>
            </span>
            <span class="next-photo-action"><JournalIcon name="arrow-up-right" /></span>
          </span>
        </button>
        <Transition name="next-satellite">
          <button
            v-if="satellite"
            :key="satellite.id"
            class="next-stage-satellite"
            :data-open="satellite.id"
            :aria-label="satellite.title"
          >
            <JournalImage
              v-if="satellite.image"
              :src="satellite.image"
              :original-src="satellite.originalImage"
              :alt="satellite.title"
              width="280"
              height="230"
              :loading="hasEntered ? 'eager' : 'lazy'"
              :upgrade="false"
            />
            <span v-else class="next-satellite-text">{{ satellite.text || satellite.title }}</span>
            <span>{{ satellite.title }}<JournalIcon name="arrow-up-right" /></span>
          </button>
        </Transition>
      </div>
      <div class="next-feature-controls">
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
          <JournalIcon name="arrow" />
        </button>
        <span class="next-feature-count">
          {{ String(index + 1).padStart(2, '0') }} / {{ String(items.length).padStart(2, '0') }}
        </span>
        <button
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
    <div v-else class="next-stage-empty" aria-hidden="true"><span>n↗</span><i /><i /></div>
  </section>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import PublicAuthorAvatar from '@/components/business/PublicAuthorAvatar.vue'
import { journalPostTimeLabel } from '../localizedPostTime'
import { journalSourceLabel } from '../controlLabels'
import { platforms, type JournalPost } from '../models'
import JournalIcon from '../JournalIcon.vue'
import JournalImage from '../JournalImage.vue'
import MotionTitle from './MotionTitle.vue'
import { chapterKey } from './chapterContext'
import { useCoverPlayback } from './useCoverPlayback'

const props = defineProps<{ posts: JournalPost[] }>()
const { locale, t } = useI18n({ useScope: 'global' })
const {
  setRoot,
  items,
  selected,
  selectedId,
  index,
  step,
  position,
  copyStyle,
  scrubbing,
  selectSheet,
  hovered,
  focused,
  paused,
  hasEntered,
  focusOut,
  touchStart,
  touchEnd,
  touchCancel,
} = useCoverPlayback(
  computed(() => props.posts),
  inject(chapterKey, null)
)
const satellite = computed(() =>
  items.value.length > 1 ? items.value[(index.value + 1) % items.value.length] : undefined
)
function photoStyle(i: number) {
  const offset = position(i)
  return {
    '--slot': offset,
    '--depth': Math.abs(offset),
    zIndex: items.value.length - Math.round(Math.abs(offset)),
    pointerEvents: i === index.value ? ('auto' as const) : ('none' as const),
  }
}
</script>
