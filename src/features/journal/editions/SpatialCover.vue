<template>
  <section
    v-if="selected"
    ref="root"
    class="spatial-cover"
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
      <Transition name="cover-copy" mode="out-in"
        ><div :key="selected.id" class="cover-article">
          <div class="cover-source">
            <span>{{
              journalSourceLabel(
                selected.platform,
                platforms[selected.platform] || selected.platform,
                t
              )
            }}</span><time>{{ journalPostTimeLabel(selected, t, locale) }}</time>
          </div>
          <h1>
            <button :data-open="selected.id">{{ selected.title }}</button>
          </h1>
          <p v-if="selected.text && selected.text !== selected.title">{{ selected.text }}</p>
          <button
            v-if="selected.author"
            class="cover-author"
            :data-author-id="selected.authorId"
            :data-author-query="selected.author"
          >
            <img :src="selected.avatar" alt="" width="28" height="28" />{{ selected.author }}
          </button>
          <button
            class="round-action"
            :data-open="selected.id"
            :aria-label="t('journal.selection.open')"
          >
            <span>{{ t('journal.selection.open') }}</span><JournalIcon name="arrow-up-right" />
          </button></div
      ></Transition>
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
            @click="selectedId = post.id"
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
          @click="paused = !paused"
        >
          {{ t(paused ? 'video.play' : 'video.pause') }}
        </button>
      </div>
    </div>
    <div
      class="cover-scene"
      data-tilt
      @touchstart.passive="touchStart"
      @touchend.passive="touchEnd"
    >
      <div class="cover-orbit" aria-hidden="true"><span>MOMICHAN / JOURNAL</span><i /></div>
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
      <div class="cover-coordinate" aria-hidden="true">
        <span>{{ t('journal.home.contentsKicker') }}</span><span>{{
          String(index + 1).padStart(2, '0')
        }}</span>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, ref, watch, onMounted, onBeforeUnmount, onActivated, onDeactivated } from 'vue'
import JournalIcon from '../JournalIcon.vue'
import JournalImage from '../JournalImage.vue'
import { createVisibilityObserver } from '@/utils/modernAPIs'
import { journalSourceLabel } from '../controlLabels'
import { journalPostTimeLabel } from '../localizedPostTime'
import { platforms, type JournalPost } from '../models'
import { usePostSelection } from '../presentation'
const { locale, t } = useI18n({ useScope: 'global' })
const props = defineProps<{ posts: JournalPost[] }>()
const items = computed(() => props.posts.slice(0, 6))
const { selectedId, selected, index, step } = usePostSelection(items)
const root = ref<HTMLElement>(),
  hovered = ref(false),
  focused = ref(false),
  paused = ref(false)
let visible = true,
  active = true,
  timer: ReturnType<typeof setInterval> | undefined,
  observer: IntersectionObserver | undefined,
  touchX = 0
function position(i: number) {
  const length = items.value.length
  const offset = (i - index.value + length) % length
  return offset > length / 2 ? offset - length : offset
}
function sheetStyle(i: number) {
  const offset = position(i)
  return {
    '--slot': offset,
    '--depth': Math.abs(offset),
    zIndex: items.value.length - Math.abs(offset),
    opacity: Math.abs(offset) > 2 ? 0 : 1,
    pointerEvents: Math.abs(offset) > 2 ? ('none' as const) : ('auto' as const),
  }
}
function selectSheet(id: string) {
  if (id !== selectedId.value) selectedId.value = id
}
function focusOut(event: FocusEvent) {
  if (!(event.relatedTarget instanceof Node) || !root.value?.contains(event.relatedTarget))
    focused.value = false
}
function touchStart(event: TouchEvent) {
  touchX = event.changedTouches[0]?.clientX || 0
}
function touchEnd(event: TouchEvent) {
  const delta = (event.changedTouches[0]?.clientX || touchX) - touchX
  if (Math.abs(delta) > 50) step(delta < 0 ? 1 : -1)
}
onMounted(() => {
  observer = createVisibilityObserver(
    ([entry]) => {
      visible = Boolean(entry?.isIntersecting)
    },
    { threshold: 0.2 }
  )
  if (root.value) observer.observe(root.value)
  timer = setInterval(() => {
    if (
      active &&
      visible &&
      !document.hidden &&
      !document.querySelector('dialog[open]') &&
      !hovered.value &&
      !focused.value &&
      !paused.value &&
      document.body.dataset['motion'] === 'full'
    )
      step(1)
  }, 6500)
})
onActivated(() => {
  active = true
})
watch(root, (element, previous) => {
  if (previous) observer?.unobserve(previous)
  if (element) observer?.observe(element)
})
onDeactivated(() => {
  active = false
})
onBeforeUnmount(() => {
  clearInterval(timer)
  observer?.disconnect()
})
</script>
