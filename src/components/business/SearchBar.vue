<template>
  <div class="search-bar" :class="{ focused: isFocused, expanded: isExpanded }">
    <div class="search-input-wrapper">
      <Search :size="18" class="search-icon" />
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        class="search-input"
        :placeholder="$t('search.placeholder')"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
        @keydown.enter="handleSearch"
        @keydown.escape="handleClose"
        @keydown.down.prevent="selectNext"
        @keydown.up.prevent="selectPrev"
      />
      <button v-if="query" type="button" class="clear-btn" @click="clearQuery">
        <X :size="16" />
      </button>
    </div>

    <Transition name="dropdown">
      <div v-if="showDropdown" class="search-dropdown glass-card">
        <div v-if="isLoading" class="dropdown-loading">
          <span class="spinner spinner-sm" />
        </div>

        <template v-else>
          <div v-if="searchHistory.length > 0 && !query" class="dropdown-section">
            <div class="section-header">
              <span>{{ $t('search.history') }}</span>
              <button type="button" class="clear-history-btn" @click="clearHistory">
                {{ $t('search.clearHistory') }}
              </button>
            </div>
            <button
              v-for="(item, index) in searchHistory.slice(0, 5)"
              :key="item"
              type="button"
              class="dropdown-item"
              :class="{ selected: selectedIndex === index }"
              @click="selectHistoryItem(item)"
            >
              <History :size="14" class="item-icon" />
              <span class="item-text">{{ item }}</span>
            </button>
          </div>

          <div v-if="suggestions.length > 0" class="dropdown-section">
            <div class="section-header">
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
              <component :is="getSuggestionIcon(suggestion.type)" :size="14" class="item-icon" />
              <span class="item-text">{{ suggestion.text }}</span>
              <span class="item-type">{{ getSuggestionLabel(suggestion.type) }}</span>
            </button>
          </div>

          <div v-if="!query && searchHistory.length === 0" class="dropdown-empty">
            <Search :size="24" class="empty-icon" />
            <p>{{ $t('search.startTyping') }}</p>
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Search, X, History, FileText, User, Tag } from 'lucide-vue-next'
import { searchService, type SearchSuggestion } from '@/api/searchService'

// 简单的 debounce 实现，避免引入整个 VueUse
function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  return ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

const router = useRouter()
const { t } = useI18n()

const inputRef = ref<HTMLInputElement>()
const query = ref('')
const isFocused = ref(false)
const isExpanded = ref(false)
const isLoading = ref(false)
const suggestions = ref<SearchSuggestion[]>([])
const selectedIndex = ref(-1)

const HISTORY_KEY = 'search_history'
const MAX_HISTORY = 10

const searchHistory = ref<string[]>([])

const showDropdown = computed(
  () => isFocused.value && (query.value || searchHistory.value.length > 0)
)

function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY)
    if (saved) {
      searchHistory.value = JSON.parse(saved)
    }
  } catch {
    searchHistory.value = []
  }
}

function saveHistory(term: string) {
  if (!term.trim()) return

  const filtered = searchHistory.value.filter((h) => h !== term)
  searchHistory.value = [term, ...filtered].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory.value))
}

function clearHistory() {
  searchHistory.value = []
  localStorage.removeItem(HISTORY_KEY)
}

function handleFocus() {
  isFocused.value = true
  isExpanded.value = true
}

function handleBlur() {
  setTimeout(() => {
    isFocused.value = false
  }, 200)
}

function handleClose() {
  query.value = ''
  isFocused.value = false
  isExpanded.value = false
  inputRef.value?.blur()
}

function clearQuery() {
  query.value = ''
  suggestions.value = []
  inputRef.value?.focus()
}

const fetchSuggestions = debounce(async (q: string) => {
  if (!q.trim()) {
    suggestions.value = []
    return
  }

  isLoading.value = true
  try {
    suggestions.value = await searchService.getSuggestions(q)
  } catch {
    suggestions.value = []
  } finally {
    isLoading.value = false
  }
}, 300)

function handleInput() {
  selectedIndex.value = -1
  fetchSuggestions(query.value)
}

function handleSearch() {
  const term = query.value.trim()
  if (!term) return

  saveHistory(term)
  router.push({ name: 'search', query: { q: term } })
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

onMounted(() => {
  loadHistory()
})

defineExpose({
  focus: () => inputRef.value?.focus(),
  clear: clearQuery,
})
</script>

<style scoped>
.search-bar {
  position: relative;
  width: 100%;
  max-width: 400px;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.search-bar.focused .search-input-wrapper {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.12);
}

.search-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: var(--text-sm);
  color: var(--color-text);
  outline: none;
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-1);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.clear-btn:hover {
  background: var(--glass-bg-light);
  color: var(--color-text);
}

.search-dropdown {
  position: absolute;
  top: calc(100% + var(--spacing-2));
  left: 0;
  right: 0;
  max-height: 400px;
  overflow-y: auto;
  z-index: var(--z-dropdown);
}

.dropdown-loading {
  display: flex;
  justify-content: center;
  padding: var(--spacing-4);
}

.dropdown-section {
  padding: var(--spacing-2);
}

.dropdown-section + .dropdown-section {
  border-top: 1px solid var(--glass-border);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.clear-history-btn {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  transition: color var(--transition-fast);
}

.clear-history-btn:hover {
  color: var(--color-primary);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  width: 100%;
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  text-align: left;
  transition: background var(--transition-fast);
}

.dropdown-item:hover,
.dropdown-item.selected {
  background: var(--glass-bg-light);
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
}

.dropdown-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-6);
  color: var(--color-text-secondary);
}

.empty-icon {
  opacity: 0.5;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all var(--transition-fast);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
