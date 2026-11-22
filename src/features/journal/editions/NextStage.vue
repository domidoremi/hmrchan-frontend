<template>
  <section
    id="next-featured"
    ref="root"
    class="idol-feature"
    :data-idol-direction="direction > 0 ? 'forward' : 'backward'"
    :data-paused="paused || hovered || focused ? '' : undefined"
    aria-labelledby="feature-heading"
    @focusin="focused = true"
    @focusout="focusOut"
    @pointerenter="hovered = true"
    @pointerleave="hovered = false"
  >
    <div class="idol-stage-art" aria-hidden="true" />
    <h1 id="feature-heading" class="sr-only">{{ t('journal.next.spotlight') }}</h1>
    <div
      class="idol-feature-media"
      @touchstart.passive="touchStart"
      @touchend.passive="touchEnd"
      @touchcancel.passive="touchCancel"
    >
      <div class="idol-photo idol-photo-lead">
        <Transition name="idol-exposure">
          <div :key="selected?.id ?? 'cover'" class="idol-photo-take">
            <JournalImage
              v-if="selected?.image"
              :src="selected.image"
              :original-src="selected.originalImage"
              alt=""
              width="640"
              height="800"
              loading="eager"
              fetchpriority="high"
            />
            <img
              v-else
              :src="'/journal/himeri-portrait.webp'"
              :alt="t('journal.next.portrait')"
              width="640"
              height="800"
              fetchpriority="high"
            />
          </div>
        </Transition>
      </div>
      <div class="idol-photo idol-photo-companion" aria-hidden="true">
        <Transition name="idol-exposure">
          <div :key="companion?.id ?? 'stage'" class="idol-photo-take">
            <JournalImage
              v-if="companion?.image"
              :src="companion.image"
              alt=""
              width="480"
              height="600"
              :upgrade="false"
            />
            <img v-else :src="'/journal/stage-moment.webp'" alt="" width="480" height="600" />
          </div>
        </Transition>
      </div>
    </div>
    <div class="idol-feature-copy">
      <template v-if="selected">
        <p class="idol-feature-byline">
          <strong v-if="selected.author">{{ selected.author }}</strong>
          <time :datetime="selected.publishedAt">{{
            journalPostTimeLabel(selected, t, locale)
          }}</time>
        </p>
        <button
          class="idol-story-open"
          type="button"
          :data-open="selected.id"
          aria-haspopup="dialog"
        >
          <span class="idol-feature-title">{{ selected.title }}</span>
          <JournalIcon name="arrow-up-right" />
        </button>
      </template>
      <RouterLink v-else class="idol-story-open" to="/authors">
        {{ t('nav.authors') }}<JournalIcon name="arrow-up-right" />
      </RouterLink>
    </div>
    <div
      v-if="items.length > 1"
      class="idol-feature-controls"
      role="group"
      :aria-label="t('journal.next.spotlight')"
      @keydown.left.prevent="move(-1)"
      @keydown.right.prevent="move(1)"
    >
      <button
        class="icon-button idol-feature-step"
        type="button"
        :aria-label="t('journal.selection.previous')"
        @click="move(-1)"
      >
        <JournalIcon name="arrow-left" />
      </button>
      <div class="idol-feature-frames">
        <button
          v-for="(post, i) in items"
          :key="post.id"
          class="idol-feature-frame"
          type="button"
          :aria-pressed="selectedId === post.id"
          :aria-label="`${i + 1} / ${items.length}: ${post.title}`"
          @click="choose(post.id, i)"
        >
          <img v-if="post.image" :src="post.image" alt="" width="44" height="44" loading="lazy" />
          <JournalIcon v-else name="file" />
        </button>
      </div>
      <button
        class="icon-button idol-feature-step"
        type="button"
        :aria-label="t('journal.selection.next')"
        @click="move(1)"
      >
        <JournalIcon name="arrow" />
      </button>
      <button
        v-if="fullMotion"
        class="icon-button idol-feature-pause"
        type="button"
        :aria-label="t(paused ? 'video.play' : 'video.pause')"
        :aria-pressed="paused"
        @click="paused = !paused"
      >
        <JournalIcon :name="paused ? 'play' : 'pause'" />
      </button>
      <span class="sr-only" :aria-live="playing ? 'off' : 'polite'">
        {{ t('journal.selection.selected', { current: index + 1, total: items.length }) }}
        {{ selected?.title }}
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { journalPostTimeLabel } from '../localizedPostTime'
import type { JournalPost } from '../models'
import JournalIcon from '../JournalIcon.vue'
import JournalImage from '../JournalImage.vue'
import { useCoverPlayback } from './useCoverPlayback'
import '../styles/idol-stage.css'

const props = defineProps<{ posts: JournalPost[] }>()
const { locale, t } = useI18n({ useScope: 'global' })
const {
  setRoot: bindRoot,
  items,
  selected,
  selectedId,
  index,
  step,
  selectSheet,
  hovered,
  focused,
  paused,
  playing,
  fullMotion,
  focusOut,
  touchStart,
  touchEnd,
  touchCancel,
} = useCoverPlayback(
  computed(() => props.posts),
  { wheel: false, interval: 8500 }
)
const root = useTemplateRef<HTMLElement>('root')
watch(root, bindRoot, { flush: 'post' })
const direction = ref(1)
function move(delta: number) {
  direction.value = delta
  step(delta)
}
function choose(id: string, target: number) {
  if (id === selectedId.value) return
  direction.value = target < index.value ? -1 : 1
  selectSheet(id)
}
const companion = computed(() =>
  items.value.length > 1 ? items.value[(index.value + 1) % items.value.length] : undefined
)
</script>
