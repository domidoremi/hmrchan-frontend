<template>
  <div class="search-bar glass-card animated">
    <Search :size="20" class="search-icon" />
    <input v-model="searchQuery" type="search" :placeholder="$t('search.placeholder')" class="search-input"
      @keyup.enter="handleSearch" @input="handleInput" />
    <button v-if="searchQuery" class="clear-button" @click="clearSearch">
      <X :size="18" />
    </button>

    <!-- 搜索建议下拉 -->
    <div v-if="showSuggestions && suggestions.length > 0" class="suggestions-dropdown glass-card">
      <div v-for="suggestion in suggestions" :key="suggestion.id" class="suggestion-item"
        @click="selectSuggestion(suggestion)">
        <Search :size="16" />
        <div>
          <div>{{ suggestion.label }}</div>
          <div v-if="suggestion.subtitle">{{ suggestion.subtitle }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, X } from 'lucide-vue-next'
import { debounce } from '@/utils/debounce'
import services from '@/api/services'
import type { SearchSuggestion } from '@/types'

const router = useRouter()
const searchQuery = ref('')
const suggestions = ref<SearchSuggestion[]>([])
const showSuggestions = ref(false)

const emit = defineEmits<{
  search: [query: string]
}>()

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    showSuggestions.value = false
    emit('search', searchQuery.value)
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  suggestions.value = []
  showSuggestions.value = false
}

const selectSuggestion = (suggestion: SearchSuggestion) => {
  searchQuery.value = suggestion.label
  showSuggestions.value = false

  if (suggestion.type === 'post') {
    router.push({ path: `/posts/${suggestion.id}` })
    return
  }

  if (suggestion.type === 'author') {
    router.push({ path: '/search', query: { tab: 'authors', q: suggestion.label } })
    return
  }

  handleSearch()
}

// 防抖搜索建议（300ms防抖，避免频繁触发）
const fetchSuggestions = async (query: string) => {
  if (query.length < 2) {
    suggestions.value = []
    showSuggestions.value = false
    return
  }

  try {
    const response = await services.search.fetchSuggestions(query, {
      type: 'all',
      limit: 10,
    })

    const results = response.results || []

    if (!results.length) {
      suggestions.value = []
      showSuggestions.value = false
      return
    }

    suggestions.value = results
    showSuggestions.value = true
  } catch (error) {
    console.error('[SearchBar] Failed to fetch suggestions:', error)
    suggestions.value = []
    showSuggestions.value = false
  }
}

const debouncedFetchSuggestions = debounce(fetchSuggestions, 300)

const handleInput = () => {
  debouncedFetchSuggestions(searchQuery.value)
}

watch(searchQuery, (newVal) => {
  if (!newVal) {
    suggestions.value = []
    showSuggestions.value = false
  }
})
</script>

<style scoped>
.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  transition: all var(--transition-base);
}

.search-bar:focus-within {
  box-shadow:
    var(--glass-shadow),
    0 0 0 3px rgba(139, 92, 246, 0.1);
}

.search-icon {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text-primary);
  font-size: var(--text-base);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.clear-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.clear-button:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.suggestions-dropdown {
  position: absolute;
  top: calc(100% + var(--spacing-sm));
  left: 0;
  right: 0;
  padding: var(--spacing-sm);
  z-index: var(--z-dropdown);
  max-height: 300px;
  overflow-y: auto;
  animation: slideDown var(--transition-fast);
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.suggestion-item:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
