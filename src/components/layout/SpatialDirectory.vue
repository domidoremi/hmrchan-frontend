<template>
  <button
    ref="trigger"
    type="button"
    class="directory-trigger nav-action-btn nav-action-btn--square"
    aria-haspopup="dialog"
    :aria-expanded="isOpen"
    :aria-controls="dialogId"
    :aria-label="t('spatial.directory')"
    @click="open"
  >
    <span aria-hidden="true"><i /><i /></span>
  </button>
  <Teleport to="body">
    <dialog
      :id="dialogId"
      ref="dialog"
      class="spatial-directory"
      :class="{ 'spatial-directory--animated': motionAllowed }"
      :data-edition="designEdition"
      :aria-labelledby="`${dialogId}-title`"
      @close="handleNativeClose"
      @cancel.prevent="close"
    >
      <div class="spatial-directory__curtain" aria-hidden="true">
        <i v-for="column in 5" :key="column" :style="{ '--column': column }" />
      </div>
      <header class="spatial-directory__top">
        <span :id="`${dialogId}-title`">MOMICHAN / {{ t('spatial.directory') }}</span>
        <button type="button" :aria-label="t('common.close')" autofocus @click="close">×</button>
      </header>
      <div class="spatial-directory__body">
        <nav :aria-label="t('common.siteNavigation')">
          <RouterLink
            v-for="(item, index) in allNavItems"
            :key="item.path"
            :to="getNavigationLink(item)"
            :style="{ '--order': index }"
            :class="{ 'is-selected': selected === index }"
            :aria-current="isCurrent(item.path) ? 'page' : undefined"
            @pointerenter="selected = index"
            @focus="selected = index"
            @click="navigate"
          >
            <small>{{ String(index + 1).padStart(2, '0') }}</small>
            <span>{{ t(item.i18nKey) }}</span>
            <b aria-hidden="true">↗</b>
          </RouterLink>
        </nav>
        <div class="spatial-directory__visual" aria-hidden="true">
          <img
            v-for="(cover, index) in covers"
            :key="cover"
            :src="isOpen ? cover : undefined"
            alt=""
            width="500"
            height="650"
            decoding="async"
            :class="{ 'is-selected': selected % covers.length === index }"
          />
          <span>{{ String(selected + 1).padStart(2, '0') }}</span>
        </div>
      </div>
      <footer class="spatial-directory__bottom">
        <span>籾山ひめり / 高嶺のなでしこ</span>
        <span>MOMICHAN</span>
      </footer>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useNavigation } from '@/composables/useNavigation'
import { designEdition } from '@/config/designEdition'
import { lockBodyScroll, unlockBodyScroll } from '@/utils/bodyScrollLock'

const props = defineProps<{ animated: boolean }>()
const emit = defineEmits<{ open: [] }>()
const { t } = useI18n()
const route = useRoute()
const { allNavItems, getNavigationLink } = useNavigation()
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
const motionAllowed = computed(() => props.animated && !reduced.value)
const dialogId = `directory-${useId()}`
const dialog = ref<HTMLDialogElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const isOpen = ref(false)
const selected = ref(0)
const covers = [
  '/snapshot-media/home/hero-spotlight-f2e0f8f6-0434-4e37-874e-bb9b506585bf.webp',
  '/snapshot-media/home/story-1-90c52c15-ab0a-473d-8981-f2420a91fdc1.webp',
  '/snapshot-media/home/story-0-403aefeb-e9e2-4f16-884d-1875ee34916f.webp',
  '/snapshot-media/home/story-2-6d08e205-d2b3-4ad0-9a3c-9351702cca60.webp',
]

function isCurrent(path: string) {
  return path === '/'
    ? route.path === '/'
    : route.path === path || route.path.startsWith(`${path}/`)
}

function open() {
  if (!dialog.value || isOpen.value) return
  selected.value = Math.max(
    0,
    allNavItems.value.findIndex((item) => isCurrent(item.path))
  )
  emit('open')
  dialog.value.showModal()
  lockBodyScroll()
  isOpen.value = true
}

function release() {
  if (!isOpen.value) return
  isOpen.value = false
  unlockBodyScroll()
}

function handleNativeClose() {
  if (!dialog.value?.open) release()
}

function close() {
  if (!isOpen.value) return
  dialog.value?.close()
  release()
  trigger.value?.focus({ preventScroll: true })
}

function navigate(event: MouseEvent) {
  if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey)
    close()
}

watch(() => route.fullPath, close)
onBeforeUnmount(() => {
  if (dialog.value?.open) dialog.value.close()
  release()
})
</script>

<style scoped>
.directory-trigger > span {
  display: grid;
  gap: 6px;
  width: 19px;
}
.directory-trigger i {
  height: 1px;
  background: currentColor;
  transition: transform 250ms;
}
.directory-trigger i:last-child {
  width: 70%;
  justify-self: end;
}
.directory-trigger:hover i:last-child {
  transform: translateX(-30%);
}
.spatial-directory {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: max(1rem, env(safe-area-inset-top)) clamp(1.2rem, 5vw, 6rem)
    max(1rem, env(safe-area-inset-bottom));
  border: 0;
  color: var(--letterbook-ink);
  background: var(--letterbook-paper);
  font-family: var(--letterbook-ui-font);
  overflow: auto;
  overscroll-behavior: contain;
}
.spatial-directory[open] {
  display: flex;
  flex-direction: column;
}
.spatial-directory::backdrop {
  background: var(--letterbook-canvas);
}
.spatial-directory__top,
.spatial-directory__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  position: relative;
  z-index: 1;
  font-size: 0.72rem;
  letter-spacing: 0.13em;
}
.spatial-directory__top {
  border-bottom: 1px solid var(--letterbook-line);
  padding-bottom: 1rem;
}
.spatial-directory__top button {
  width: 44px;
  height: 44px;
  border: 1px solid var(--letterbook-line);
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font-size: 2rem;
  cursor: pointer;
}
.spatial-directory__body {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 8vw;
  align-items: center;
  flex: 1;
  padding-block: 1.6rem;
}
.spatial-directory nav {
  display: grid;
}
.spatial-directory nav a {
  display: grid;
  grid-template-columns: 2.4rem 1fr 2.5rem;
  align-items: center;
  gap: 1rem;
  padding: clamp(0.35rem, 1vh, 0.9rem) 0;
  border-bottom: 1px solid var(--letterbook-line);
  text-decoration: none;
  color: inherit;
}
.spatial-directory nav small {
  font: 0.65rem var(--letterbook-ui-font);
  color: var(--letterbook-muted);
}
.spatial-directory nav a > span {
  font-size: clamp(1.7rem, 4.6vw, 4.5rem);
  line-height: 1.16;
  letter-spacing: -0.055em;
  font-weight: 400;
  transition: transform 400ms;
}
.spatial-directory nav b {
  font-size: 1.8rem;
  font-weight: 400;
  opacity: 0;
  transform: translate(-10px, 10px);
  transition:
    opacity 300ms,
    transform 300ms;
}
.spatial-directory nav .is-selected > span {
  transform: translateX(0.6rem);
}
.spatial-directory nav .is-selected b {
  opacity: 1;
  transform: none;
}
.spatial-directory nav [aria-current='page'] small {
  color: var(--letterbook-accent);
}
.spatial-directory__visual {
  position: relative;
  width: min(100%, 28rem);
  height: min(58dvh, 37rem);
  justify-self: center;
  perspective: 1000px;
}
.spatial-directory__visual img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: 9px solid var(--letterbook-paper-strong);
  box-shadow: 0 1.5rem 3rem -1.5rem #081c2066;
  opacity: 0;
  transform: translate3d(0, 24px, -100px) rotateY(-14deg) rotateZ(5deg);
  transition:
    opacity 450ms,
    transform 700ms cubic-bezier(0.2, 0.65, 0.2, 1);
}
.spatial-directory__visual img.is-selected {
  opacity: 1;
  transform: rotateZ(-4deg);
}
.spatial-directory__visual > span {
  position: absolute;
  right: -0.06em;
  bottom: -0.25em;
  font: 400 clamp(6rem, 15vw, 14rem)/1 var(--letterbook-ui-font);
  color: var(--letterbook-accent);
  mix-blend-mode: difference;
}
.spatial-directory__bottom {
  border-top: 1px solid var(--letterbook-line);
  padding-block: 1rem 0.4rem;
}
.spatial-directory__curtain {
  position: fixed;
  inset: 0;
  display: flex;
  pointer-events: none;
}
.spatial-directory__curtain i {
  flex: 1;
  background: var(--letterbook-accent-soft);
  transform: scaleY(0);
  transform-origin: top;
}
.spatial-directory--animated[open] .spatial-directory__curtain i {
  animation: directory-curtain 800ms calc(var(--column) * 45ms) cubic-bezier(0.65, 0, 0.2, 1) both;
}
.spatial-directory--animated[open] nav a {
  animation: directory-entry 650ms calc(var(--order) * 45ms + 120ms) both;
}
.spatial-directory :focus-visible {
  outline: 2px solid var(--letterbook-accent);
  outline-offset: 5px;
}
@keyframes directory-curtain {
  from {
    transform: scaleY(1);
  }
  to {
    transform: scaleY(0);
  }
}
@keyframes directory-entry {
  from {
    opacity: 0;
    transform: translateY(35px) rotate(2deg);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.spatial-directory:not(.spatial-directory--animated) * {
  transition: none;
}
@media (max-width: 700px) {
  .spatial-directory__body {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .spatial-directory__visual {
    display: none;
  }
  .spatial-directory nav a {
    padding-block: min(2vh, 1.1rem);
  }
  .spatial-directory nav a > span {
    font-size: clamp(1.7rem, 8vw, 3rem);
  }
  .spatial-directory__bottom {
    letter-spacing: 0.02em;
    font-size: 0.6rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .spatial-directory *,
  .directory-trigger i {
    animation: none !important;
    transition: none !important;
  }
}
</style>
