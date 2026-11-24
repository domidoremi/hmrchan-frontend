<template>
  <section
    v-if="selected"
    :ref="setRoot"
    class="spatial-cover"
    :data-paused="paused || hovered || focused ? '' : undefined"
    :aria-label="t('home.latest')"
    @focusin="focused = true"
    @focusout="focusOut"
  >
    <div class="cover-copy">
      <div class="cover-kicker">
        <span class="status-light" aria-hidden="true" />{{ t('home.latest')
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
        <h2>
          <button
            type="button"
            :data-open="post.id"
            :aria-label="post.title"
            aria-haspopup="dialog"
          >
            <span class="cover-story-title">{{ post.title }}</span>
            <JournalIcon name="arrow-up-right" />
          </button>
        </h2>
        <p v-if="post.text && post.text !== post.title">{{ post.text }}</p>
        <button
          v-if="post.author || post.authorId"
          class="cover-author"
          type="button"
          :aria-label="post.author || t('search.type.author')"
          :data-author-id="post.authorId"
          :data-author-query="post.author"
        >
          <PublicAuthorAvatar :src="post.avatar" :author-id="post.authorId" :size="28" /><span>{{
            post.author || t('search.type.author')
          }}</span>
        </button>
      </div>
      <div
        v-if="items.length > 1"
        class="cover-controls"
        role="group"
        :aria-label="t('home.latest')"
        @keydown="browseByKey"
      >
        <button
          class="icon-button"
          type="button"
          :aria-label="t('journal.selection.previous')"
          @click="step(-1)"
        >
          <JournalIcon name="arrow-left" />
        </button>
        <div class="cover-pagination">
          <button
            v-for="(post, i) in items"
            :key="post.id"
            type="button"
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
          type="button"
          :aria-label="t('journal.selection.next')"
          @click="step(1)"
        >
          <JournalIcon name="arrow" /></button
        ><button
          v-if="fullMotion"
          class="cover-pause"
          type="button"
          :aria-pressed="paused"
          :aria-label="t('video.pause')"
          :title="t(paused ? 'video.play' : 'video.pause')"
          @click="paused = !paused"
        >
          <JournalIcon :name="paused ? 'play' : 'pause'" />
        </button>
        <span class="sr-only" role="status" :aria-live="playing ? 'off' : 'polite'">
          {{ t('journal.selection.selected', { current: index + 1, total: items.length }) }}
          {{ selected.title }}
        </span>
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
      <div class="cover-deck" data-depth-scene>
        <button
          v-for="(post, i) in items"
          :key="post.id"
          class="cover-sheet"
          type="button"
          :class="{ 'is-current': post.id === selectedId }"
          :style="sheetStyle(i)"
          :data-cover-id="post.id"
          :data-open="post.id === selectedId ? post.id : undefined"
          :aria-haspopup="post.id === selectedId ? 'dialog' : undefined"
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
            :fit="settings.settings.appearancePreset === 'carbon-index' ? 'contain' : 'cover'"
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
import PublicAuthorAvatar from '@/components/business/PublicAuthorAvatar.vue'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from 'vue-i18n'
import JournalIcon from '../JournalIcon.vue'
import JournalImage from '../JournalImage.vue'
import { journalSourceLabel } from '../controlLabels'
import { journalPostTimeLabel } from '../localizedPostTime'
import { platforms, type JournalPost } from '../models'
import { computed, nextTick, watch } from 'vue'
import { useCoverPlayback } from './useCoverPlayback'
const { locale, t } = useI18n({ useScope: 'global' })
const props = defineProps<{ posts: JournalPost[] }>()
const settings = useSettingsStore()
const {
  setRoot,
  root,
  items,
  selectedId,
  selected,
  index,
  step,
  position,
  copyStyle,
  hovered,
  focused,
  paused,
  fullMotion,
  playing,
  focusOut,
  selectSheet,
  touchStart,
  touchEnd,
  touchCancel,
} = useCoverPlayback(computed(() => props.posts))
watch(selectedId, async () => {
  const focusedElement = document.activeElement
  if (
    !root.value?.contains(focusedElement) ||
    !focusedElement?.closest('.cover-story, .cover-sheet')
  )
    return
  await nextTick()
  if (document.activeElement === focusedElement || document.activeElement === document.body)
    root.value
      ?.querySelector<HTMLButtonElement>('.cover-pagination [aria-pressed="true"]')
      ?.focus({ preventScroll: true })
})
function browseByKey(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  step(event.key === 'ArrowLeft' ? -1 : 1)
}
function sheetStyle(i: number) {
  const offset = position(i)
  return {
    '--slot': offset,
    '--depth': Math.abs(offset),
    zIndex: items.value.length - Math.round(Math.abs(offset)),
    '--sheet-alpha': Math.min(1, Math.max(0, 3 - Math.abs(offset))),
    '--sheet-interaction': Math.abs(offset) > 2 ? 'none' : 'auto',
  }
}
</script>
