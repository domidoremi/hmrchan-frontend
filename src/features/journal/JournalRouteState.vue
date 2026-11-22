<template>
  <section
    class="journal-route-state"
    :class="{ 'is-error': error }"
    :data-state="error ? 'error' : slow ? 'slow' : 'loading'"
  >
    <div class="route-state-heading">
      <div>
        <span v-if="!isArchive" class="route-state-eyebrow">{{ pageLabel }}</span>
        <h1>
          {{
            error
              ? t('journal.states.pageFailed')
              : isArchive
                ? pageLabel
                : t('journal.states.loadingPage')
          }}
        </h1>
        <p role="status" aria-live="polite">
          {{ error ? t('journal.states.checkNetwork') : t('common.loading') }}
        </p>
      </div>
      <div class="route-state-mark" aria-hidden="true" />
    </div>
    <template v-if="!error">
      <div class="route-state-progress" aria-hidden="true" />
      <div class="route-state-skeleton" aria-hidden="true">
        <div class="route-state-lines"><i /><i /><i /><i /><i /></div>
        <div class="route-state-preview"><i /><i /><i /></div>
      </div>
    </template>
    <div v-if="error || slow" class="route-state-recovery">
      <p v-if="slow && !error">{{ t('journal.states.slow') }}</p>
      <div>
        <button class="button button-dark" @click="reloadPage">
          {{ t('common.retry') }} <span aria-hidden="true">↗</span>
        </button>
        <RouterLink class="button button-outline" to="/">{{ t('nav.backHome') }}</RouterLink>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import { designEdition } from '@/config/designEdition'

defineProps<{ error?: Error }>()
const route = useRoute()
const { t } = useI18n({ useScope: 'global' })
const isArchive = designEdition === 'archive'
const pageLabel = computed(() => {
  if (route.path === '/schedule') return t(isArchive ? 'journal.nav.calendar' : 'nav.schedule')
  if (route.path === '/community') return t(isArchive ? 'journal.nav.discussions' : 'nav.community')
  if (route.path === '/profile/favorites') return t('journal.nav.collection')
  if (route.path === '/explore') return t(isArchive ? 'journal.nav.records' : 'journal.nav.posts')
  return t('journal.states.pageLoadingLabel')
})
const slow = ref(false)
let slowTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  slowTimer = setTimeout(() => {
    slow.value = true
  }, 8000)
})
onBeforeUnmount(() => clearTimeout(slowTimer))
function reloadPage() {
  window.location.reload()
}
</script>
<style scoped>
.journal-route-state {
  padding: 3.25rem 3rem;
  min-block-size: min(45rem, 80svh);
  color: var(--ink);
}
.route-state-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  margin-block-end: 2rem;
}
.route-state-eyebrow {
  color: var(--accent);
  font: 0.625rem/1.6 monospace;
  letter-spacing: 0.12em;
}
.route-state-heading h1 {
  margin: 1rem 0;
  font:
    400 clamp(1.75rem, 4vw, 3.25rem)/1.2 Georgia,
    'Songti SC',
    serif;
}
.route-state-heading p,
.route-state-recovery p {
  margin: 0;
  color: var(--muted);
  font-size: 0.875rem;
  line-height: 1.8;
}
.route-state-mark {
  inline-size: 3.25rem;
  block-size: 4rem;
  flex: none;
  border: 1px solid var(--line);
  border-top: 3px solid var(--accent);
  background: var(--paper);
  transform: rotate(5deg);
}
.route-state-progress {
  block-size: 2px;
  margin-block-end: 2.25rem;
  background: var(--line);
  overflow: hidden;
}
.route-state-progress::before {
  content: '';
  display: block;
  block-size: 100%;
  inline-size: 24%;
  background: var(--accent);
}
body[data-motion='full'] .route-state-progress::before {
  animation: route-state-progress 1.8s ease-in-out infinite;
}
@keyframes route-state-progress {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(520%);
  }
}
.route-state-skeleton {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: 4rem;
  min-block-size: 17.5rem;
}
.route-state-lines {
  padding-block-start: 1.25rem;
}
.route-state-lines i {
  display: block;
  block-size: 0.625rem;
  inline-size: 100%;
  margin-block-end: 1.375rem;
  background: var(--line);
  opacity: 0.55;
}
.route-state-lines i:first-child {
  inline-size: 42%;
}
.route-state-lines i:nth-child(2) {
  block-size: 1.625rem;
  margin-block: 2rem;
  inline-size: 85%;
}
.route-state-lines i:nth-child(4) {
  inline-size: 68%;
}
.route-state-preview {
  position: relative;
  min-block-size: 17.5rem;
}
.route-state-preview i {
  position: absolute;
  inset: 0.75rem 12%;
  border: 1px solid var(--line);
  background: var(--paper);
  transform: rotate(-6deg);
}
.route-state-preview i:nth-child(2) {
  transform: rotate(6deg);
}
.route-state-preview i:last-child {
  transform: rotate(-1deg);
  inset: 0 16% 1.375rem;
}
.route-state-preview i:last-child::after {
  content: '';
  display: block;
  block-size: 76%;
  margin: 1.125rem;
  background: var(--canvas);
}
.route-state-recovery {
  padding-block-start: 1.625rem;
}
.route-state-recovery > div {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.route-state-recovery .button {
  min-block-size: 2.75rem;
}
.route-state-recovery p {
  margin-block-end: 1.25rem;
}
.is-error .route-state-recovery {
  border-top: 1px solid var(--line);
}
.edition-archive .journal-route-state {
  min-block-size: 0;
  padding: clamp(1rem, 3vw, 2.5rem) 0;
}
.edition-archive .route-state-heading h1 {
  font: var(--idol-heading-weight)
    calc(clamp(1.75rem, 3vw, 2.75rem) * var(--journal-reading-scale)) / 1.2 var(--idol-display);
}
.edition-archive .route-state-mark {
  display: none;
}
.edition-archive .route-state-skeleton {
  display: block;
  min-block-size: 0;
}
.edition-archive .route-state-lines {
  display: none;
}
.edition-archive .route-state-preview {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
  gap: clamp(0.75rem, 2vw, 1.75rem);
  min-block-size: 0;
}
.edition-archive .route-state-preview i {
  position: static;
  display: block;
  min-inline-size: 0;
  aspect-ratio: 0.95;
  border: 1px solid var(--line);
  border-radius: var(--idol-panel-radius);
  background: linear-gradient(145deg, var(--idol-rose), var(--paper) 75%);
  transform: none;
}
.edition-archive .route-state-preview i:nth-child(2) {
  aspect-ratio: 0.75;
}
html[data-preset='minimal-editorial'] .edition-archive .route-state-preview {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
html[data-preset='minimal-editorial'] .edition-archive .route-state-preview i {
  border-radius: 0;
  border-width: 0.35rem;
}
html[data-preset='fluent-soft'] .edition-archive .route-state-preview {
  max-inline-size: 52rem;
  margin-inline: auto;
}
html[data-preset='fluent-soft'] .edition-archive .route-state-preview i {
  border-radius: 2rem;
}
html[data-preset='organic-natural'] .edition-archive .route-state-preview {
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.9fr) minmax(0, 1fr);
  padding: 0.75rem;
}
html[data-preset='organic-natural'] .edition-archive .route-state-preview i:nth-child(2) {
  margin-block-start: 1.5rem;
  transform: rotate(3deg);
}
.edition-archive .route-state-preview i:last-child::after {
  display: none;
}
body[data-motion='reduced'] .route-state-progress::before {
  inline-size: 100%;
  opacity: 0.5;
}
@media (max-width: 760px) {
  .journal-route-state {
    padding: 2rem 1.125rem;
  }
  .route-state-heading {
    align-items: flex-start;
    gap: 0.875rem;
  }
  .route-state-mark {
    inline-size: 2rem;
    block-size: 2.625rem;
    margin-block-start: 1.75rem;
  }
  .route-state-heading h1 {
    font-size: 1.75rem;
  }
  .route-state-skeleton {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.25rem;
  }
  .route-state-lines {
    padding: 0;
  }
  .route-state-lines i:nth-child(n + 4) {
    display: none;
  }
  .edition-editorial .route-state-lines i:nth-child(2) {
    margin-block: 0.875rem 1.375rem;
  }
  .route-state-preview {
    min-block-size: 13.75rem;
  }
  .edition-archive .route-state-preview {
    min-block-size: 0;
  }
}
</style>
