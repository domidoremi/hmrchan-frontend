<template>
  <!-- 搜索栏容器 -->
  <div class="search-bar-container glass-card animated" role="search">
    <Search :size="20" class="search-icon" aria-hidden="true" />
    <input
      v-model="searchQuery"
      type="search"
      :placeholder="$t('search.placeholder')"
      :aria-label="$t('search.placeholder')"
      class="search-input"
      autocomplete="off"
      @keyup.enter="handleSearch"
      @input="handleInput"
    />
    <button
      v-if="searchQuery"
      class="clear-button"
      type="button"
      :aria-label="$t('common.clear')"
      @click="clearSearch"
    >
      <X :size="18" aria-hidden="true" />
    </button>

    <!-- 搜索建议下拉 -->
    <div
      v-if="showSuggestions && suggestions.length > 0"
      class="suggestions-dropdown glass-card"
      role="listbox"
      :aria-label="$t('search.suggestions')"
    >
      <div
        v-for="suggestion in suggestions"
        :key="suggestion.id"
        class="suggestion-item"
        role="option"
        tabindex="0"
        @click="selectSuggestion(suggestion)"
        @keydown.enter="selectSuggestion(suggestion)"
      >
        <Search :size="16" aria-hidden="true" />
        <div>
          <div>{{ suggestion.label }}</div>
          <div v-if="suggestion.subtitle" class="suggestion-subtitle">
            {{ suggestion.subtitle }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 搜索栏组件
 *
 * 业务功能：
 * - 提供全局搜索功能
 * - 支持搜索建议和自动完成
 * - 根据建议类型智能跳转（帖子详情、作者搜索等）
 * - 防抖优化搜索性能
 *
 * 业务场景：
 * - 用户搜索感兴趣的帖子或作者
 * - 快速访问搜索建议中的内容
 * - 实时显示搜索建议提升用户体验
 *
 * Emits:
 * - search: 执行搜索时触发，传递搜索关键词
 */

import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, X } from 'lucide-vue-next'
import { useDebounce } from '@/composables'
import { services } from '@/api/services'
import type { SearchSuggestion } from '@/types'

const router = useRouter()

/** 搜索关键词 */
const searchQuery = ref('')

/** 搜索建议列表 */
const suggestions = ref<SearchSuggestion[]>([])

/** 是否显示搜索建议 */
const showSuggestions = ref(false)

const emit = defineEmits<{
  /** 搜索事件 */
  search: [query: string]
}>()

/**
 * 处理搜索操作
 * 当用户按下回车键或点击搜索按钮时触发
 */
const handleSearch = () => {
  if (searchQuery.value.trim()) {
    showSuggestions.value = false
    emit('search', searchQuery.value)
  }
}

/**
 * 清空搜索
 * 清除搜索关键词和建议列表
 */
const clearSearch = () => {
  searchQuery.value = ''
  suggestions.value = []
  showSuggestions.value = false
}

/**
 * 选择搜索建议
 * 根据建议类型进行不同的跳转操作
 * @param suggestion - 搜索建议对象
 */
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

/**
 * 获取搜索建议
 * 根据搜索关键词异步获取建议列表
 * @param query - 搜索关键词
 */
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

/** 防抖的搜索建议函数（300ms 延迟） */
const debouncedFetchSuggestions = useDebounce(fetchSuggestions, 300)

/**
 * 处理输入事件
 * 触发防抖的搜索建议获取
 */
const handleInput = () => {
  debouncedFetchSuggestions(searchQuery.value)
}

/**
 * 监听搜索关键词变化
 * 当关键词为空时清空建议列表
 */
watch(searchQuery, (newVal) => {
  if (!newVal) {
    suggestions.value = []
    showSuggestions.value = false
  }
})
</script>

<style scoped>
.search-bar-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  transition:
    box-shadow var(--transition-base),
    border-color var(--transition-base);
}

.search-bar-container:focus-within {
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

.suggestion-item:hover,
.suggestion-item:focus {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
  outline: none;
}

.suggestion-subtitle {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
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
