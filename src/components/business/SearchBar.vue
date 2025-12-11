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
      class="suggestions-dropdown"
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

import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, X } from 'lucide-vue-next'
import { useDebounceFn } from '@/composables'
import { services } from '@/api/services'
import type { SearchSuggestion } from '@/types'

const router = useRouter()

/** 搜索关键词 */
const searchQuery = ref('')

/** 搜索建议列表 */
const suggestions = ref<SearchSuggestion[]>([])

/** 是否显示搜索建议 */
const showSuggestions = ref(false)

/** 是否已确认搜索（用于阻止延迟的建议显示） */
const searchConfirmed = ref(false)

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
    // 标记已确认搜索，立即关闭建议框并清空建议列表
    searchConfirmed.value = true
    showSuggestions.value = false
    suggestions.value = []
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
  // 标记已确认搜索，关闭建议框
  searchConfirmed.value = true
  searchQuery.value = suggestion.label
  showSuggestions.value = false
  suggestions.value = []

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
  // 如果已确认搜索，不再显示建议
  if (searchConfirmed.value) {
    return
  }

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
const { debounced: debouncedFetchSuggestions } = useDebounceFn(
  (query: unknown) => fetchSuggestions(query as string),
  300,
)

/**
 * 处理输入事件
 * 触发防抖的搜索建议获取
 */
const handleInput = () => {
  // 重置确认标志，允许显示新的建议
  searchConfirmed.value = false
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

/**
 * 点击外部关闭建议下拉框
 */
const handleClickOutside = (event: MouseEvent) => {
  const container = document.querySelector('.search-bar-container')
  if (container && !container.contains(event.target as Node)) {
    showSuggestions.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
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
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  padding: var(--spacing-sm);
  z-index: 1000;
  max-height: 280px;
  overflow-y: auto;
  border-radius: var(--radius-xl);
  /* 使用实色背景确保可读性，兼容暗色/浅色主题 */
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.2),
    0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideDown 0.15s ease-out;
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
