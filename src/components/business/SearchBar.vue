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
      <button
        v-if="query"
        type="button"
        class="clear-btn"
        :aria-label="$t('common.clear')"
        @click="clearQuery"
      >
        <AnimatedIcon name="sparkle" :fallback-icon="X" size="sm" />
      </button>
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
              <AnimatedIcon name="explore" :fallback-icon="History" size="sm" class="item-icon" />
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
import { Search, X, History, FileText, User, Tag } from 'lucide-vue-next'
import { searchService, type SearchSuggestion } from '@/api/searchService'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

// 简单的 debounce 实现，避免引入整个 VueUse
let suggestionTimer: ReturnType<typeof setTimeout> | null = null
let suggestionController: AbortController | null = null
let suggestionRequestToken = 0

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) return error.name === 'AbortError'
  return error instanceof Error && /abort/i.test(error.message)
}

function abortSuggestionRequest() {
  if (suggestionTimer) {
    clearTimeout(suggestionTimer)
    suggestionTimer = null
  }
  if (suggestionController) {
    suggestionController.abort()
    suggestionController = null
  }
  suggestionRequestToken += 1
}

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
  return ((...args: Parameters<T>) => {
    if (suggestionTimer) clearTimeout(suggestionTimer)
    suggestionTimer = setTimeout(() => fn(...args), delay)
  }) as T
}

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const query = ref('')
const isFocused = ref(false)
const isExpanded = ref(false)
const isLoading = ref(false)
const suggestions = ref<SearchSuggestion[]>([])
const selectedIndex = ref(-1)

const HISTORY_KEY = 'search_history'
const MAX_HISTORY = 10
const HISTORY_EXPIRY_DAYS = 30 // 搜索历史过期天数

interface HistoryItem {
  term: string
  timestamp: number
}

const searchHistory = ref<string[]>([])

const showDropdown = computed(
  () => isFocused.value && (query.value || searchHistory.value.length > 0)
)

/**
 * 加载搜索历史，自动清理过期条目
 */
function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      const now = Date.now()
      const expiryMs = HISTORY_EXPIRY_DAYS * 24 * 60 * 60 * 1000

      // 兼容旧格式（纯字符串数组）和新格式（带时间戳）
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && typeof parsed[0] === 'string') {
          // 旧格式：迁移到新格式
          const migrated: HistoryItem[] = parsed.map((term: string) => ({
            term,
            timestamp: now,
          }))
          localStorage.setItem(HISTORY_KEY, JSON.stringify(migrated))
          searchHistory.value = parsed.slice(0, MAX_HISTORY)
        } else {
          // 新格式：过滤过期条目
          const validItems = (parsed as HistoryItem[]).filter(
            (item) => now - item.timestamp < expiryMs
          )
          searchHistory.value = validItems.map((item) => item.term).slice(0, MAX_HISTORY)

          // 如果有过期条目被清理，更新存储
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

/**
 * 保存搜索历史
 */
function saveHistory(term: string) {
  if (!term.trim()) return

  try {
    const saved = localStorage.getItem(HISTORY_KEY)
    let items: HistoryItem[] = []

    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 处理新格式
        if (typeof parsed[0] === 'object') {
          items = parsed as HistoryItem[]
        }
      }
    }

    // 移除重复项
    items = items.filter((item) => item.term !== term)

    // 添加新条目到开头
    items.unshift({ term, timestamp: Date.now() })

    // 限制数量
    items = items.slice(0, MAX_HISTORY)

    localStorage.setItem(HISTORY_KEY, JSON.stringify(items))
    searchHistory.value = items.map((item) => item.term)
  } catch {
    // 存储失败时静默处理
  }
}

/**
 * 清除搜索历史
 */
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

const fetchSuggestions = debounce(async (q: string) => {
  const normalizedQuery = q.trim()
  if (!normalizedQuery) {
    abortSuggestionRequest()
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
    const result = await searchService.getSuggestions(normalizedQuery, 10, {
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
}, 300)

function handleInput() {
  selectedIndex.value = -1
  if (!query.value.trim()) {
    abortSuggestionRequest()
    suggestions.value = []
    isLoading.value = false
    return
  }
  fetchSuggestions(query.value)
}

async function handleSearch() {
  const term = query.value.trim()
  if (!term) return

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

onUnmounted(() => {
  abortSuggestionRequest()
  if (suggestionTimer) {
    clearTimeout(suggestionTimer)
    suggestionTimer = null
  }
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
  position: relative;
  width: 100%;
  max-width: min(90vw, 25rem);
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

.search-submit-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-md);
  background: var(--glass-bg-subtle);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.search-submit-btn:hover:not(:disabled) {
  background: var(--glass-bg-light);
  color: var(--color-text);
}

.search-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-submit-text {
  display: none;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

@media (min-width: 640px) {
  .search-submit-text {
    display: inline;
  }
}

.search-dropdown {
  position: absolute;
  top: calc(100% + var(--spacing-2));
  left: 0;
  right: 0;
  max-height: 25rem;
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
