<template>
  <section v-if="items.length" class="photo-book" :aria-labelledby="titleId">
    <header class="photo-book__heading">
      <div>
        <span>MOMI / SELECTED</span>
        <h2 :id="titleId">{{ t('spatial.book') }}</h2>
      </div>
      <span>{{ String(items.length).padStart(2, '0') }} / MOMICHAN</span>
    </header>
    <div
      ref="stage"
      class="photo-book__stage"
      :class="{ 'is-open': opened, 'is-still': !motionAllowed }"
      :data-turning="Boolean(turn)"
      :tabindex="opened ? 0 : -1"
      :aria-label="t('spatial.book')"
      @keydown.left.prevent="step(-1)"
      @keydown.right.prevent="step(1)"
    >
      <div class="photo-book__spread">
        <div class="photo-book__page photo-book__left" :inert="!opened">
          <div class="photo-book__meta">
            <span>{{ t('spatial.selected') }}</span
            ><span>{{ folio }}</span>
          </div>
          <button
            class="photo-book__image"
            type="button"
            :aria-label="items[active]?.title"
            @click="emit('select', active)"
          >
            <slot name="image" :index="active" :decorative="false" />
          </button>
          <p class="photo-book__author">{{ items[active]?.author }}</p>
          <h3>{{ items[active]?.title }}</h3>
        </div>
        <div class="photo-book__page photo-book__right" :inert="!opened">
          <div class="photo-book__meta">
            <span>{{ t('spatial.contents') }}</span
            ><span>02</span>
          </div>
          <div class="photo-book__index">
            <button
              v-for="(item, index) in items"
              :key="item.id"
              type="button"
              :aria-pressed="active === index"
              :disabled="Boolean(turn)"
              @click="turnTo(index)"
            >
              <small>{{ String(index + 1).padStart(2, '0') }}</small>
              <span
                >{{ item.title }}<small>{{ item.author }}</small></span
              >
              <b aria-hidden="true">↗</b>
            </button>
          </div>
          <div class="photo-book__pagination">
            <button
              type="button"
              :disabled="active === 0 || Boolean(turn)"
              :aria-label="t('spatial.previous')"
              @click="step(-1)"
            >
              ←
            </button>
            <span aria-live="polite" aria-atomic="true"
              >{{ folio }} / {{ String(items.length).padStart(2, '0') }}</span
            >
            <button
              type="button"
              :disabled="active === items.length - 1 || Boolean(turn)"
              :aria-label="t('spatial.next')"
              @click="step(1)"
            >
              →
            </button>
          </div>
          <button class="photo-book__view" type="button" @click="emit('select', active)">
            {{ t('spatial.viewPhoto') }} <span aria-hidden="true">↗</span>
          </button>
        </div>
        <button v-if="!opened" class="photo-book__cover" type="button" @click="turnTo(0)">
          <span class="photo-book__meta">MOMICHAN / 01</span>
          <span class="photo-book__cover-image"
            ><slot name="image" :index="0" :decorative="true"
          /></span>
          <strong>{{ t('spatial.book') }}</strong>
          <span>{{ t('spatial.openBook') }} <b aria-hidden="true">↗</b></span>
        </button>
        <div v-if="turn" ref="leaf" class="photo-book__leaf" aria-hidden="true" inert>
          <div class="photo-book__face photo-book__face--front">
            <slot name="image" :index="turn.from" :decorative="true" /><span>MOMICHAN</span>
          </div>
          <div class="photo-book__face photo-book__face--back">
            <slot name="image" :index="turn.to" :decorative="true" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onDeactivated, ref, useId, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  items: Array<{ id: string; title: string; author: string }>
  animated: boolean
}>()
const emit = defineEmits<{ select: [index: number] }>()
const { t } = useI18n()
const titleId = `photo-book-${useId()}`
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
const compact = useMediaQuery('(max-width: 700px)')
const motionAllowed = computed(() => props.animated && !reduced.value && !compact.value)
const opened = ref(false)
const active = ref(0)
const folio = computed(() => String(active.value + 1).padStart(2, '0'))
const turn = ref<{ from: number; to: number } | null>(null)
const leaf = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
let animation: Animation | null = null
let generation = 0

function stopTurn() {
  generation += 1
  animation?.cancel()
  animation = null
  turn.value = null
}

async function turnTo(index: number) {
  if (turn.value || !props.items[index] || (opened.value && active.value === index)) return
  const from = active.value
  const opening = !opened.value
  opened.value = true
  active.value = index
  if (opening) void nextTick(() => stage.value?.focus({ preventScroll: true }))
  if (!motionAllowed.value) return
  const current = ++generation
  turn.value = { from, to: index }
  await nextTick()
  if (current !== generation || !leaf.value) return
  if (!leaf.value.animate) {
    stopTurn()
    return
  }
  const reverse = index < from
  animation = leaf.value.animate(
    [
      { transform: `rotateY(${reverse ? -180 : 0}deg)` },
      { transform: `rotateY(${reverse ? 0 : -180}deg)` },
    ],
    { duration: opening ? 1100 : 800, easing: 'cubic-bezier(.32,.05,.18,1)', fill: 'both' }
  )
  try {
    await animation.finished
  } catch {
    /* Cancellation settles the current page. */
  }
  if (current === generation) {
    animation = null
    turn.value = null
  }
}

function step(delta: number) {
  if (opened.value) void turnTo(active.value + delta)
}

watch(
  () => props.items.map((item) => item.id).join('|'),
  () => {
    stopTurn()
    active.value = 0
  }
)
watch(motionAllowed, (allowed) => {
  if (!allowed) stopTurn()
})
onDeactivated(stopTurn)
onBeforeUnmount(stopTurn)
</script>

<style scoped>
.photo-book {
  margin: clamp(3rem, 8vw, 8rem) auto;
  padding-inline: var(--letterbook-gutter);
  max-width: 90rem;
  color: var(--letterbook-ink);
}
.photo-book__heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 1rem;
  margin-bottom: 2.5rem;
  border-top: 1px solid var(--letterbook-line);
  padding-top: 1.3rem;
}
.photo-book__heading span {
  font-size: 0.66rem;
  letter-spacing: 0.16em;
}
.photo-book__heading h2 {
  margin: 0.6rem 0 0;
  font-size: clamp(2.2rem, 5vw, 4.5rem);
  font-weight: 400;
  letter-spacing: -0.06em;
}
.photo-book__stage {
  perspective: 1800px;
  max-width: 68rem;
  margin: auto;
}
.photo-book__spread {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  transform-style: preserve-3d;
  transform: translateX(-25%) rotateX(5deg) rotateZ(-3deg);
  transition: transform 950ms cubic-bezier(0.22, 0.65, 0.2, 1);
}
.is-open .photo-book__spread {
  transform: none;
}
.photo-book__page {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: clamp(1.1rem, 2.8vw, 3rem);
  background: var(--letterbook-paper-strong);
  box-shadow: 0 2rem 3rem -2rem #081c2055;
  visibility: hidden;
}
.is-open .photo-book__page {
  visibility: visible;
}
.photo-book__left {
  border-radius: 2px 0 0 2px;
  background-image: linear-gradient(90deg, transparent 90%, #08202012);
}
.photo-book__right {
  border-radius: 0 2px 2px 0;
  background-image: linear-gradient(90deg, #08202015, transparent 8%);
  border-left: 1px solid var(--letterbook-line);
}
.photo-book__meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  margin-bottom: 1.4rem;
}
.photo-book__image {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1.08;
  padding: 0;
  border: 0;
  background: var(--letterbook-accent-soft);
  overflow: hidden;
  cursor: pointer;
}
.photo-book :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.photo-book__author {
  font-size: 0.7rem;
  margin: 1rem 0 0.5rem;
  color: var(--letterbook-muted);
}
.photo-book h3 {
  margin: 0;
  font-size: clamp(1rem, 2vw, 1.6rem);
  line-height: 1.4;
  font-weight: 400;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.photo-book__index {
  flex: 1;
}
.photo-book__index button {
  display: grid;
  grid-template-columns: 1.4rem minmax(0, 1fr) 1rem;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem 0;
  text-align: left;
  color: inherit;
  border: 0;
  border-bottom: 1px solid var(--letterbook-line);
  background: none;
  cursor: pointer;
}
.photo-book__index button > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
}
.photo-book__index small {
  font-size: 0.62rem;
  color: var(--letterbook-muted);
}
.photo-book__index span small {
  display: block;
  margin-top: 0.35rem;
}
.photo-book__index b {
  font-weight: 400;
  opacity: 0;
}
.photo-book__index [aria-pressed='true'] {
  color: var(--letterbook-accent);
}
.photo-book__index [aria-pressed='true'] b {
  opacity: 1;
}
.photo-book__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-block: 1rem;
  font-size: 0.7rem;
}
.photo-book__pagination button {
  width: 44px;
  height: 44px;
  background: transparent;
  color: inherit;
  border: 1px solid var(--letterbook-line);
  border-radius: 50%;
  cursor: pointer;
}
.photo-book__pagination button:disabled {
  opacity: 0.35;
  cursor: default;
}
.photo-book__view {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  color: inherit;
  border: 0;
  border-top: 1px solid var(--letterbook-line);
  padding-block: 1rem 0;
  font-size: 0.8rem;
  cursor: pointer;
}
.photo-book__cover {
  position: absolute;
  inset: 0 0 0 50%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: left;
  padding: clamp(1.1rem, 2.8vw, 3rem);
  border: 0;
  border-left: 10px solid var(--letterbook-line-strong);
  color: var(--letterbook-ink);
  background: var(--letterbook-paper-strong);
  cursor: pointer;
  box-shadow:
    4px 4px 0 var(--letterbook-line),
    8px 8px 0 var(--letterbook-paper),
    0 2rem 3rem -2rem #081c2088;
}
.photo-book__cover-image {
  display: block;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
.photo-book__cover strong {
  font-size: clamp(2rem, 4vw, 4rem);
  font-weight: 400;
  letter-spacing: -0.06em;
}
.photo-book__cover > span:last-child {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}
.photo-book__leaf {
  position: absolute;
  inset: 0 0 0 50%;
  transform-origin: left center;
  transform-style: preserve-3d;
  z-index: 2;
  pointer-events: none;
}
.photo-book__face {
  position: absolute;
  inset: 0;
  padding: clamp(1.1rem, 2.8vw, 3rem);
  background: var(--letterbook-paper-strong);
  backface-visibility: hidden;
  box-shadow: 0 1rem 3rem -1rem #081c2055;
  overflow: hidden;
}
.photo-book__face--front {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.photo-book__face--front :deep(img) {
  min-height: 0;
  flex: 1;
}
.photo-book__face--front > span {
  font-size: 0.7rem;
  letter-spacing: 0.15em;
}
.photo-book__face--back {
  transform: rotateY(180deg);
}
.photo-book__face::after {
  position: absolute;
  inset: 0;
  content: '';
  background: linear-gradient(90deg, #08202024, transparent 12%, transparent 80%, #08202012);
}
.photo-book :focus-visible {
  outline: 2px solid var(--letterbook-accent);
  outline-offset: 5px;
}
.is-still .photo-book__spread {
  transition: none;
  transform: translateX(-25%);
}
.is-still.is-open .photo-book__spread {
  transform: none;
}
@media (max-width: 700px) {
  .photo-book__heading > span {
    display: none;
  }
  .photo-book__spread,
  .is-still .photo-book__spread {
    grid-template-columns: 1fr;
    transform: none;
  }
  .photo-book__right {
    border-left: 0;
    background-image: none;
  }
  .photo-book__left {
    background-image: none;
  }
  .photo-book__stage:not(.is-open) .photo-book__right {
    display: none;
  }
  .photo-book__cover {
    left: 0;
  }
  .photo-book__index {
    display: none;
  }
  .photo-book__right > .photo-book__meta {
    display: none;
  }
  .photo-book__page {
    padding: 1.2rem;
  }
  .photo-book__right {
    padding-top: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .photo-book__spread {
    transition: none;
  }
}
</style>
