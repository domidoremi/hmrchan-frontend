<template>
  <div v-if="visible" class="journal-browse-state" :data-state="phase" :data-has-posts="hasPosts">
    <p class="sr-only" role="status" aria-atomic="true">{{ title }} {{ description }}</p>
    <section class="browse-state-panel" :aria-labelledby="titleId" :aria-busy="busy">
      <div class="browse-state-visual" aria-hidden="true">
        <svg v-if="isArchive" viewBox="0 0 80 64" fill="none">
          <path d="M12 24V12h24l8 8h22v34H12" />
          <path d="M12 54 22 32h52L64 54Z" />
          <circle v-if="phase === 'error'" cx="51" cy="12" r="8" class="state-accent" />
          <path v-if="phase === 'error'" d="M51 8v5m0 3v.1" class="state-accent" />
        </svg>
        <svg v-else viewBox="0 0 260 210" fill="none">
          <path d="M40 24h160l20 20v140H40Z" class="state-paper" />
          <path d="M200 24v20h20" />
          <path d="M58 57h112m-112 20h142m-142 20h124m-124 40h138m-138 20h98" class="state-lines" />
          <path
            v-if="phase === 'error'"
            d="M58 116h55m13 0h65m-69-6-4 6 4 6"
            class="state-accent"
          />
          <path v-else d="M58 116h134" class="state-lines" />
          <path d="M24 192h212M32 200h176" />
        </svg>
      </div>
      <div class="browse-state-copy">
        <span class="browse-state-kicker">{{ t(`journal.browse.${phase}Kicker`) }}</span>
        <h2 :id="titleId">{{ title }}</h2>
        <p :id="descriptionId">{{ description }}</p>
        <div class="browse-state-actions">
          <button
            v-if="!busy || pending"
            ref="action"
            type="button"
            class="button button-dark browse-state-action"
            :aria-disabled="busy"
            :aria-describedby="descriptionId"
            @click="activate"
          >
            <JournalIcon :name="phase === 'empty' ? 'compass' : 'refresh'" />
            {{
              t(
                busy
                  ? 'journal.browse.retrying'
                  : phase === 'empty'
                    ? emptyActionKey
                    : 'common.retry'
              )
            }}
          </button>
          <button
            v-if="phase === 'empty' && hasFilters"
            type="button"
            class="button button-outline browse-state-action"
            @click="$emit('reset')"
          >
            {{ t('journal.states.resetFilters') }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { designEdition } from '@/config/designEdition'
import JournalIcon from './JournalIcon.vue'
import type { JournalResourceState } from './resourceState'

const props = defineProps<{
  state: JournalResourceState
  hasPosts: boolean
  hasFilters: boolean
  favorites: boolean
  hasAnyPosts: boolean
  retry?: () => Promise<void>
}>()
const emit = defineEmits<{
  retry: []
  adjust: []
  explore: []
  reset: []
  settled: [trigger: HTMLButtonElement]
}>()
const { t } = useI18n({ useScope: 'global' })
const titleId = useId()
const descriptionId = `${titleId}-description`
const isArchive = designEdition === 'archive'
const action = ref<HTMLButtonElement>()
const pending = ref(false)
const eventPending = ref(false)
const retryFailed = ref(false)
const busy = computed(() => pending.value || props.state === 'idle' || props.state === 'loading')
const phase = computed(() =>
  busy.value ? 'loading' : retryFailed.value || props.state === 'error' ? 'error' : 'empty'
)
const visible = computed(() => !props.hasPosts || busy.value || phase.value === 'error')
const emptyFavorites = computed(() => props.favorites && !props.hasAnyPosts)
const emptyActionKey = computed(() =>
  emptyFavorites.value ? 'journal.nav.posts' : 'journal.browse.adjustSearch'
)
const label = computed(() =>
  t(
    props.favorites
      ? 'journal.nav.collection'
      : isArchive
        ? 'journal.nav.records'
        : 'journal.nav.posts'
  )
)
const title = computed(() =>
  phase.value === 'loading'
    ? t('journal.states.loading', { label: label.value })
    : phase.value === 'error'
      ? t('journal.states.failed', { label: label.value })
      : t(emptyFavorites.value ? 'journal.states.noFavorites' : 'common.noResults')
)
const description = computed(() =>
  t(
    phase.value === 'loading'
      ? 'journal.browse.loadingHint'
      : phase.value === 'error'
        ? props.hasAnyPosts
          ? 'journal.browse.moreRetryHint'
          : 'journal.browse.retryHint'
        : emptyFavorites.value
          ? 'journal.browse.favoritesHint'
          : 'journal.browse.emptyHint'
  )
)
watch(
  () => props.state,
  (state) => {
    if (state === 'idle' || state === 'loading') retryFailed.value = false
    else if (eventPending.value) void settleRetry()
  }
)
async function settleRetry() {
  await nextTick()
  if (!pending.value) return
  if (eventPending.value && (props.state === 'idle' || props.state === 'loading')) return
  if (
    props.state === 'ready' &&
    props.hasPosts &&
    !retryFailed.value &&
    action.value &&
    document.activeElement === action.value
  )
    emit('settled', action.value)
  eventPending.value = false
  pending.value = false
}
async function activate() {
  if (busy.value) return
  if (phase.value === 'empty') {
    if (emptyFavorites.value) emit('explore')
    else emit('adjust')
    return
  }
  pending.value = true
  retryFailed.value = false
  if (!props.retry) {
    eventPending.value = true
    emit('retry')
    await nextTick()
    if (props.state !== 'idle' && props.state !== 'loading') await settleRetry()
    return
  }
  try {
    await props.retry()
  } catch {
    retryFailed.value = true
  } finally {
    await settleRetry()
  }
}
</script>
<style src="./styles/browse-states.css"></style>
