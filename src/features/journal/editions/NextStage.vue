<template>
  <section
    id="next-featured"
    ref="root"
    class="idol-feature"
    :data-idol-direction="direction > 0 ? 'forward' : 'backward'"
    :data-paused="paused || hovered || focused ? '' : undefined"
    :data-playing="playing ? '' : undefined"
    :style="{ '--idol-playback-interval': `${playbackInterval}ms` }"
    aria-labelledby="feature-heading"
    @focusin="focused = true"
    @focusout="focusOut"
    @pointerenter="hovered = true"
    @pointerleave="hovered = false"
  >
    <img
      class="idol-photo-field"
      :src="selected?.image || fallbackPhoto"
      alt=""
      aria-hidden="true"
      decoding="async"
      fetchpriority="low"
    />
    <header class="idol-feature-heading">
      <h1 id="feature-heading">{{ t('journal.next.spotlight') }}</h1>
    </header>
    <div class="idol-projection">
      <div
        class="idol-feature-media"
        data-depth-scene
        @touchstart.passive="touchStart"
        @touchend.passive="touchEnd($event, move)"
        @touchcancel.passive="touchCancel"
      >
        <Transition name="idol-exposure" :css="fullMotion" @before-leave="retireLayer">
          <div :key="selected?.id ?? 'cover'" class="idol-photo-take">
            <JournalImage
              v-if="selected?.image"
              class="idol-photo-subject"
              :src="selected.image"
              :original-src="selected.originalImage"
              :alt="selected.title"
              width="640"
              height="800"
              loading="eager"
              fetchpriority="high"
              fit="contain"
            />
            <img
              v-else
              class="idol-photo-subject"
              :src="fallbackPhoto"
              :alt="t('journal.next.portrait')"
              width="640"
              height="800"
              fetchpriority="high"
            />
          </div>
        </Transition>
        <button
          v-if="selected?.image"
          class="icon-button idol-photo-open"
          type="button"
          :data-open="selected.id"
          :aria-label="t('journal.selection.open')"
          :title="t('journal.selection.open')"
          aria-haspopup="dialog"
        >
          <JournalIcon name="arrow-up-right" />
        </button>
      </div>
      <div class="idol-feature-reel">
        <div
          v-if="items.length > 1"
          class="idol-feature-controls"
          role="group"
          :aria-label="t('journal.next.spotlight')"
          @keydown="browseByKey"
        >
          <span class="idol-feature-count" aria-hidden="true"
            ><b>{{ frameNumber(index + 1) }}</b> / {{ frameNumber(items.length) }}</span
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
              :aria-label="`${frameNumber(i + 1)} / ${frameNumber(items.length)}: ${post.title}`"
              :tabindex="selectedId === post.id ? 0 : -1"
              :title="post.title"
              @click="choose(post.id, i)"
            >
              <img
                v-if="post.image"
                :src="post.image"
                alt=""
                width="72"
                height="52"
                loading="lazy"
              />
              <JournalIcon v-else name="file" />
              <span class="idol-frame-number" aria-hidden="true">{{ frameNumber(i + 1) }}</span>
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
            :aria-label="t('video.pause')"
            :title="t(paused ? 'video.play' : 'video.pause')"
            :aria-pressed="paused"
            @click="paused = !paused"
          >
            <JournalIcon :name="paused ? 'play' : 'pause'" />
          </button>
          <span class="sr-only" role="status" :aria-live="playing ? 'off' : 'polite'">
            {{ t('journal.selection.selected', { current: index + 1, total: items.length }) }}
            {{ selected?.title }}
          </span>
        </div>
        <a
          class="idol-feature-index"
          href="#next-index"
          :aria-label="t('journal.home.latest')"
          :title="t('journal.home.latest')"
          ><JournalIcon name="down"
        /></a>
      </div>
    </div>
    <div class="idol-feature-copy">
      <Transition v-if="selected" name="idol-caption" :css="fullMotion" @before-leave="retireLayer">
        <div :key="selected.id" class="idol-feature-story">
          <p class="idol-feature-byline">
            <span class="idol-feature-source">{{
              journalSourceLabel(
                selected.platform,
                platforms[selected.platform] || selected.platform,
                t
              )
            }}</span>
            <strong v-if="selected.author" class="idol-feature-author">{{
              selected.author
            }}</strong>
            <time :datetime="selected.publishedAt">{{
              journalPostTimeLabel(selected, t, locale)
            }}</time>
          </p>
          <h2>
            <button
              class="idol-story-open"
              type="button"
              :data-open="selected.id"
              aria-haspopup="dialog"
            >
              <span class="idol-feature-title" :class="{ 'is-long': selected.title.length > 64 }">{{
                selected.title
              }}</span>
              <JournalIcon name="arrow-up-right" />
            </button>
          </h2>
        </div>
      </Transition>
      <RouterLink v-else class="idol-story-open" to="/authors">
        {{ t('nav.authors') }}<JournalIcon name="arrow-up-right" />
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { journalPostTimeLabel } from '../localizedPostTime'
import { platforms, type JournalPost } from '../models'
import { journalSourceLabel } from '../controlLabels'
import JournalIcon from '../JournalIcon.vue'
import JournalImage from '../JournalImage.vue'
import { useCoverPlayback } from './useCoverPlayback'
import '../styles/idol-stage.css'

const props = defineProps<{ posts: JournalPost[] }>()
const { locale, t } = useI18n({ useScope: 'global' })
const playbackInterval = 8500
const fallbackPhoto = '/journal/himeri-portrait.webp'
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
  { wheel: false, interval: playbackInterval }
)
const root = useTemplateRef<HTMLElement>('root')
watch(root, bindRoot, { flush: 'post' })
const direction = ref(1)
const frameNumber = (position: number) => String(position).padStart(2, '0')
function retireLayer(element: Element) {
  element.setAttribute('inert', '')
  element.setAttribute('aria-hidden', 'true')
}
let manualSelection = false
watch(
  selectedId,
  () => {
    if (!manualSelection) direction.value = 1
  },
  { flush: 'sync' }
)
function move(delta: number) {
  direction.value = delta
  manualSelection = true
  step(delta)
  manualSelection = false
}
function browseByKey(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  if (!['Home', 'End', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  const edge = event.key === 'Home' || event.key === 'End'
  if (edge) {
    const target = event.key === 'Home' ? 0 : items.value.length - 1
    const item = items.value[target]
    if (item) choose(item.id, target)
  } else move(event.key === 'ArrowLeft' ? -1 : 1)
  if (edge || (event.target instanceof Element && event.target.closest('.idol-feature-frame')))
    root.value
      ?.querySelectorAll<HTMLButtonElement>('.idol-feature-frame')
      [index.value]?.focus({ preventScroll: true })
}
function choose(id: string, target: number) {
  if (id === selectedId.value) return
  direction.value = target < index.value ? -1 : 1
  manualSelection = true
  selectSheet(id)
  manualSelection = false
}
</script>
