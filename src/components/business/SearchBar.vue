<template>
  <div class="search-bar" :class="{ focused: isFocused, expanded: isExpanded }">
    <div class="search-input-wrapper">
      <AnimatedIcon name="search" :fallback-icon="Search" size="md" class="search-icon" />
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        class="search-input"
        :aria-label="$t('common.search')"
        :placeholder="$t('search.placeholder')"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
        @keydown.enter="handleSearch"
        @keydown.escape="handleClose"
        @keydown.down.prevent="selectNext"
        @keydown.up.prevent="selectPrev"
      />
      <ControlButton
        v-if="query"
        class="clear-btn"
        size="square"
        icon-only
        :aria-label="$t('common.clear')"
        @click="clearQuery"
      >
        <template #start>
          <AnimatedIcon name="sparkle" :fallback-icon="X" size="sm" />
        </template>
      </ControlButton>
      <button
        type="button"
        class="search-submit-btn"
        :aria-label="$t('common.search')"
        :disabled="!query.trim()"
        @click="handleSearch"
      >
        <AnimatedIcon name="search" :fallback-icon="Search" size="sm" />
        <span class="search-submit-text">{{ $t('common.search') }}</span>
      </button>
    </div>

    <Transition name="dropdown">
      <div v-if="showDropdown" class="search-dropdown empty-surface">
        <div v-if="isLoading" class="dropdown-loading">
          <span class="spinner spinner-sm" />
        </div>

        <template v-else>
          <div v-if="searchHistory.length > 0 && !query" class="dropdown-section">
            <div class="search-dropdown__header">
              <span>{{ $t('search.history') }}</span>
              <ControlButton class="clear-history-btn" size="compact" @click="clearHistory">
                {{ $t('search.clearHistory') }}
              </ControlButton>
            </div>
            <button
              v-for="(item, index) in searchHistory.slice(0, 5)"
              :key="item"
              type="button"
              class="dropdown-item"
              :class="{ selected: selectedIndex === index }"
              @click="selectHistoryItem(item)"
            >
              <AnimatedIcon name="explore" :fallback-icon="History" size="sm" class="item-icon" />
              <span class="item-text">{{ item }}</span>
            </button>
          </div>

          <div v-if="suggestions.length > 0" class="dropdown-section">
            <div class="search-dropdown__header">
              <span>{{ $t('search.suggestions') }}</span>
            </div>
            <button
              v-for="(suggestion, index) in suggestions"
              :key="suggestion.text"
              type="button"
              class="dropdown-item"
              :class="{ selected: selectedIndex === searchHistory.length + index }"
              @click="selectSuggestion(suggestion)"
            >
              <AnimatedIcon
                :name="getSuggestionAnimation(suggestion.type)"
                :fallback-icon="getSuggestionIcon(suggestion.type)"
                size="sm"
                class="item-icon"
              />
              <span class="item-text">{{ suggestion.text }}</span>
              <span class="item-type">{{ getSuggestionLabel(suggestion.type) }}</span>
            </button>
          </div>

          <div v-if="!query && searchHistory.length === 0" class="dropdown-empty">
            <AnimatedIcon name="search" :fallback-icon="Search" size="lg" class="empty-icon" />
            <p>{{ $t('search.startTyping') }}</p>
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Search, X, History, FileText, User, Tag } from '@lucide/vue'
import { searchService, type SearchSuggestion } from '@/api/searchService'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import ControlButton from '@/components/appearance/ControlButton.vue'

let suggestionController: AbortController | null = null
let suggestionRequestToken = 0

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) return error.name === 'AbortError'
  return error instanceof Error && /abort/i.test(error.message)
}

function abortActiveSuggestionRequest() {
  if (suggestionController) {
    suggestionController.abort()
    suggestionController = null
  }
  suggestionRequestToken += 1
}

function abortSuggestionRequest() {
  cancelSuggestionDebounce()
  abortActiveSuggestionRequest()
}

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const query = ref('')
const suggestionKeyword = ref('')
const isFocused = ref(false)
const isExpanded = ref(false)
const isLoading = ref(false)
const suggestions = ref<SearchSuggestion[]>([])
const selectedIndex = ref(-1)
const { debounced: debouncedSuggestionKeyword, cancel: cancelSuggestionDebounce } = useDebouncedRef(
  suggestionKeyword,
  300
)

const HISTORY_KEY = 'search_history'
const MAX_HISTORY = 10
const HISTORY_EXPIRY_DAYS = 30

interface HistoryItem {
  term: string
  timestamp: number
}

const searchHistory = ref<string[]>([])

const showDropdown = computed(
  () => isFocused.value && (query.value || searchHistory.value.length > 0)
)

function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      const now = Date.now()
      const expiryMs = HISTORY_EXPIRY_DAYS * 24 * 60 * 60 * 1000

      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && typeof parsed[0] === 'string') {
          const migrated: HistoryItem[] = parsed.map((term: string) => ({
            term,
            timestamp: now,
          }))
          localStorage.setItem(HISTORY_KEY, JSON.stringify(migrated))
          searchHistory.value = parsed.slice(0, MAX_HISTORY)
        } else {
          const validItems = (parsed as HistoryItem[]).filter(
            (item) => now - item.timestamp < expiryMs
          )
          searchHistory.value = validItems.map((item) => item.term).slice(0, MAX_HISTORY)

          if (validItems.length < parsed.length) {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(validItems))
          }
        }
      }
    }
  } catch {
    searchHistory.value = []
    localStorage.removeItem(HISTORY_KEY)
  }
}

function saveHistory(term: string) {
  if (!term.trim()) return

  try {
    const saved = localStorage.getItem(HISTORY_KEY)
    let items: HistoryItem[] = []

    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (typeof parsed[0] === 'object') {
          items = parsed as HistoryItem[]
        }
      }
    }

    items = items.filter((item) => item.term !== term)

    items.unshift({ term, timestamp: Date.now() })

    items = items.slice(0, MAX_HISTORY)

    localStorage.setItem(HISTORY_KEY, JSON.stringify(items))
    searchHistory.value = items.map((item) => item.term)
  } catch {}
}

function clearHistory() {
  searchHistory.value = []
  localStorage.removeItem(HISTORY_KEY)
}

function handleFocus() {
  isFocused.value = true
  isExpanded.value = true
}

let blurTimer: ReturnType<typeof setTimeout> | null = null
function handleBlur() {
  if (blurTimer) clearTimeout(blurTimer)
  blurTimer = setTimeout(() => {
    isFocused.value = false
  }, 200)
}

function handleClose() {
  abortSuggestionRequest()
  query.value = ''
  suggestions.value = []
  selectedIndex.value = -1
  isLoading.value = false
  isFocused.value = false
  isExpanded.value = false
  inputRef.value?.blur()
}

function clearQuery() {
  abortSuggestionRequest()
  query.value = ''
  suggestions.value = []
  isLoading.value = false
  inputRef.value?.focus()
}

async function fetchSuggestions(q: string) {
  const normalizedQuery = q.trim()
  if (!normalizedQuery) {
    if (suggestionController) {
      suggestionController.abort()
      suggestionController = null
    }
    suggestions.value = []
    isLoading.value = false
    return
  }

  if (suggestionController) suggestionController.abort()
  const controller = new AbortController()
  suggestionController = controller
  const requestToken = ++suggestionRequestToken
  isLoading.value = true
  try {
    const result = await searchService.getSuggestions(normalizedQuery, {
      limit: 10,
      signal: controller.signal,
      skipErrorToast: true,
    })
    if (controller.signal.aborted || requestToken !== suggestionRequestToken) return
    suggestions.value = result.map((item) => ({ ...item, text: item.text ?? item.label }))
  } catch (error) {
    if (controller.signal.aborted || isAbortError(error) || requestToken !== suggestionRequestToken)
      return
    suggestions.value = []
  } finally {
    if (requestToken === suggestionRequestToken && suggestionController === controller) {
      suggestionController = null
      isLoading.value = false
    }
  }
}

function handleInput() {
  selectedIndex.value = -1
  suggestionKeyword.value = query.value
  if (!query.value.trim()) {
    abortSuggestionRequest()
    suggestions.value = []
    isLoading.value = false
    return
  }

  abortActiveSuggestionRequest()
  isLoading.value = true
}

async function handleSearch() {
  const term = query.value.trim()
  if (!term) return

  abortSuggestionRequest()
  saveHistory(term)

  // Create a navigable history entry when user confirms (Enter)
  await router.push({ name: 'search', query: { q: term } })
  handleClose()
}

function selectHistoryItem(item: string) {
  query.value = item
  handleSearch()
}

function selectSuggestion(suggestion: SearchSuggestion) {
  query.value = suggestion.text
  handleSearch()
}

function selectNext() {
  const total = searchHistory.value.length + suggestions.value.length
  if (total === 0) return
  selectedIndex.value = (selectedIndex.value + 1) % total
}

function selectPrev() {
  const total = searchHistory.value.length + suggestions.value.length
  if (total === 0) return
  selectedIndex.value = selectedIndex.value <= 0 ? total - 1 : selectedIndex.value - 1
}

function getSuggestionIcon(type: string) {
  switch (type) {
    case 'post':
      return FileText
    case 'author':
      return User
    case 'tag':
      return Tag
    default:
      return Search
  }
}

function getSuggestionAnimation(type: string) {
  switch (type) {
    case 'post':
      return 'explore'
    case 'author':
      return 'user'
    case 'tag':
      return 'sparkle'
    default:
      return 'search'
  }
}

function getSuggestionLabel(type: string) {
  switch (type) {
    case 'post':
      return t('search.type.post')
    case 'author':
      return t('search.type.author')
    case 'tag':
      return t('search.type.tag')
    default:
      return ''
  }
}

watch(selectedIndex, (index) => {
  if (index >= 0) {
    const historyLen = searchHistory.value.length
    if (index < historyLen) {
      query.value = searchHistory.value[index] || ''
    } else {
      const suggestion = suggestions.value[index - historyLen]
      if (suggestion) {
        query.value = suggestion.text
      }
    }
  }
})

watch(debouncedSuggestionKeyword, (keyword) => {
  if (!isFocused.value) return
  void fetchSuggestions(keyword)
})

onUnmounted(() => {
  abortSuggestionRequest()
  if (blurTimer) {
    clearTimeout(blurTimer)
    blurTimer = null
  }
})

onMounted(() => {
  loadHistory()

  // Sync initial query from URL
  const q = route.query['q']
  query.value = typeof q === 'string' ? q : ''
})

watch(
  () => route.query['q'],
  (q) => {
    const next = typeof q === 'string' ? q : ''
    // Avoid fighting user typing.
    if (isFocused.value) return
    query.value = next
  }
)

defineExpose({
  focus: () => inputRef.value?.focus(),
  clear: clearQuery,
})
</script>

<style scoped>
.search-bar {
  --search-surface-bg: var(--chrome-surface-bg-soft);
  --search-surface-bg-strong: var(--chrome-surface-bg);
  --search-surface-border: var(--chrome-surface-border);
  --search-surface-border-strong: var(--chrome-surface-border-strong);
  --search-chip-bg: var(--chrome-chip-bg);
  --search-chip-border: var(--chrome-chip-border);
  --search-chip-text: var(--chrome-chip-text);
  --search-action-bg: var(--chrome-action-bg);
  --search-action-bg-hover: var(--chrome-action-bg-hover);
  --search-action-border: var(--chrome-action-border);
  --search-action-border-strong: var(--chrome-action-border-strong);
  position: relative;
  width: 100%;
  min-inline-size: 0;
  max-width: min(90vw, 25rem);
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding-block: max(0.5rem, var(--ui-control-padding-y-sm));
  padding-inline: max(0.875rem, var(--ui-control-padding-x-sm));
  background: var(--search-surface-bg);
  border: 1px solid var(--search-surface-border);
  border-radius: var(--ui-radius-input, var(--radius-lg));
  box-shadow: var(--chrome-surface-shadow);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
  transition:
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.search-bar.focused .search-input-wrapper {
  background: var(--search-surface-bg-strong);
  border-color: var(--search-surface-border-strong);
  box-shadow:
    0 0 0 3px rgba(var(--color-primary-rgb), 0.12),
    var(--chrome-surface-shadow);
}

.search-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  min-inline-size: 0;
  min-block-size: 2.75rem;
  border: none;
  background: transparent;
  font-size: var(--text-sm);
  line-height: var(--appearance-ui-line-height);
  color: var(--color-text);
  outline: none;
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

.clear-btn.page-control {
  min-inline-size: var(--ui-control-height-sm);
  block-size: var(--ui-control-height-sm);
  padding: var(--ui-control-padding-y-sm);
  border: 1px solid transparent;
  color: var(--color-text-secondary);
  border-radius: var(--ui-radius-button, var(--radius-sm));
  box-shadow: none;
  line-height: var(--appearance-ui-line-height);
  transition:
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.clear-btn.page-control:hover,
.clear-btn.page-control:focus-visible {
  background: var(--search-action-bg-hover);
  border-color: var(--search-action-border);
  color: var(--color-primary);
  transform: none;
  box-shadow: none;
}

.search-submit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-1);
  min-inline-size: var(--ui-control-min-inline-size);
  min-block-size: calc(var(--ui-control-height-sm) + 0.125rem);
  padding-inline: var(--ui-control-padding-x-sm);
  padding-block: var(--ui-control-padding-y-sm);
  border-radius: var(--ui-radius-button, var(--radius-md));
  border: 1px solid var(--search-action-border);
  background: var(--search-action-bg);
  color: var(--color-text-secondary);
  line-height: var(--appearance-ui-line-height);
  transition:
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.search-submit-btn:hover:not(:disabled) {
  background: var(--search-action-bg-hover);
  border-color: var(--search-action-border-strong);
  color: var(--color-primary);
}

.search-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-submit-text {
  display: none;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  transform: translateY(var(--appearance-baseline-shift));
}

@media (min-width: 640px) {
  .search-submit-text {
    display: inline;
  }
}

@media (max-width: 640px) {
  .search-input-wrapper {
    gap: var(--spacing-2);
    padding-inline: max(0.75rem, var(--spacing-2));
  }

  .search-submit-btn {
    min-inline-size: calc(var(--ui-control-height-sm) + 0.125rem);
    padding-inline: 0.625rem;
  }
}

.search-dropdown {
  position: absolute;
  top: calc(100% + var(--spacing-2));
  left: 0;
  right: 0;
  padding: 0;
  max-height: 25rem;
  overflow-y: auto;
  z-index: var(--z-dropdown);
  border: 1px solid var(--search-surface-border);
  border-radius: var(--ui-radius-dropdown, var(--radius-xl));
  background: var(--search-surface-bg-strong);
  box-shadow: var(--chrome-surface-shadow);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
}

.search-dropdown.empty-surface {
  animation: none;
}

.dropdown-loading {
  display: flex;
  justify-content: center;
  padding: var(--spacing-4);
}

.dropdown-section {
  padding: max(var(--spacing-2), calc(var(--appearance-surface-padding-sm) - 0.125rem));
}

.dropdown-section + .dropdown-section {
  border-top: 1px solid var(--chrome-muted-border);
}

.search-dropdown__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-block: 0.625rem;
  padding-inline: 0.75rem;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.clear-history-btn.page-control {
  min-block-size: var(--ui-control-height-sm);
  min-inline-size: var(--ui-control-compact-min-inline-size);
  padding-inline: var(--ui-control-padding-x-sm);
  padding-block: var(--ui-control-padding-y-sm);
  border: 1px solid transparent;
  border-radius: var(--ui-radius-button, var(--radius-full));
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  box-shadow: none;
  line-height: var(--appearance-ui-line-height);
  transition:
    color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.clear-history-btn.page-control:hover,
.clear-history-btn.page-control:focus-visible {
  color: var(--color-primary);
  background: var(--search-action-bg-hover);
  border-color: var(--search-action-border);
  transform: none;
  box-shadow: none;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  width: 100%;
  padding-block: 0.625rem;
  padding-inline: 0.875rem;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  text-align: left;
  transition:
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.dropdown-item:hover,
.dropdown-item.selected {
  background: var(--chrome-muted-bg);
  border-color: var(--chrome-muted-border-strong);
}

.item-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.item-text {
  flex: 1;
  font-size: var(--text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-type {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  padding: 0.125rem 0.5rem;
  border: 1px solid var(--search-chip-border);
  border-radius: var(--radius-full);
  background: var(--search-chip-bg);
}

.dropdown-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-6);
  color: var(--color-text-secondary);
  border-radius: var(--radius-lg);
  background: linear-gradient(180deg, transparent, rgba(var(--color-primary-rgb), 0.03));
}

.empty-icon {
  opacity: 0.5;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}
</style>
