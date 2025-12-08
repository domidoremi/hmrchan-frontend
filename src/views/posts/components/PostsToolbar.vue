<template>
  <section ref="toolbarRef" class="posts-toolbar" :class="{ 'is-sticky': isSticky }">
    <div class="toolbar-surface">
      <!-- 搜索框 -->
      <div class="search-block">
        <div class="search-field" :class="{ 'is-focused': isSearchFocused }">
          <Search :size="18" class="search-icon" aria-hidden="true" />
          <input
            v-model="localSearchQuery"
            type="text"
            :placeholder="$t('search.placeholder')"
            @input="onSearchInput"
            @focus="isSearchFocused = true"
            @blur="isSearchFocused = false"
            :aria-label="$t('search.placeholder')"
          />
          <Transition name="fade-scale">
            <button
              v-if="localSearchQuery"
              class="clear-btn"
              type="button"
              @click="clearSearch"
              :aria-label="$t('filter.clearAll')"
            >
              <X :size="16" />
            </button>
          </Transition>
        </div>
      </div>

      <!-- 平台筛选 -->
      <PlatformChips
        v-model="localSelectedPlatform"
        :platforms="platforms"
        @change="onPlatformChange"
      />

      <!-- 控制区域 -->
      <div class="toolbar-controls">
        <!-- 排序选择 -->
        <div class="sort-control">
          <SlidersHorizontal :size="16" class="control-icon" aria-hidden="true" />
          <select v-model="localSortBy" class="sort-select" :aria-label="$t('common.sortBy')">
            <option value="latest">{{ $t('filter.latest') }}</option>
            <option value="popular">{{ $t('filter.popular') }}</option>
            <option value="oldest">{{ $t('filter.oldest') }}</option>
          </select>
          <ChevronDown :size="16" class="dropdown-arrow" aria-hidden="true" />
        </div>

        <!-- 视图切换 -->
        <div class="view-toggle" role="group" :aria-label="$t('common.viewMode')">
          <button
            :class="['view-button', { active: localViewMode === 'grid' }]"
            type="button"
            @click="localViewMode = 'grid'"
            :aria-label="$t('viewMode.grid')"
            :aria-pressed="localViewMode === 'grid'"
          >
            <Grid3x3 :size="18" />
          </button>
          <button
            :class="['view-button', { active: localViewMode === 'list' }]"
            type="button"
            @click="localViewMode = 'list'"
            :aria-label="$t('viewMode.compact')"
            :aria-pressed="localViewMode === 'list'"
          >
            <List :size="18" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search, X, SlidersHorizontal, ChevronDown, Grid3x3, List } from 'lucide-vue-next'
import PlatformChips from './PlatformChips.vue'
import { useDebounceFn } from '@/composables'
import type { SortOption, ViewMode, PlatformOption } from '../types'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  /** 搜索关键词 */
  searchQuery: string
  /** 选中的平台 */
  selectedPlatform: string
  /** 排序方式 */
  sortBy: SortOption
  /** 视图模式 */
  viewMode: ViewMode
  /** 平台选项 */
  platforms: PlatformOption[]
  /** 是否sticky状态 */
  isSticky?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSticky: false,
})

const emit = defineEmits<{
  (e: 'update:searchQuery', value: string): void
  (e: 'update:selectedPlatform', value: string): void
  (e: 'update:sortBy', value: SortOption): void
  (e: 'update:viewMode', value: ViewMode): void
  (e: 'search'): void
  (e: 'clearSearch'): void
  (e: 'platformChange', value: string): void
}>()

// ============================================================================
// Refs
// ============================================================================

const toolbarRef = ref<HTMLElement | null>(null)
const isSearchFocused = ref(false)

// ============================================================================
// 本地状态（用于双向绑定）
// ============================================================================

const localSearchQuery = ref(props.searchQuery)
const localSelectedPlatform = ref(props.selectedPlatform)
const localSortBy = ref(props.sortBy)
const localViewMode = ref(props.viewMode)

// ============================================================================
// Watchers - 同步props到本地状态
// ============================================================================

watch(
  () => props.searchQuery,
  (value) => {
    localSearchQuery.value = value
  },
)

watch(
  () => props.selectedPlatform,
  (value) => {
    localSelectedPlatform.value = value
  },
)

watch(
  () => props.sortBy,
  (value) => {
    localSortBy.value = value
  },
)

watch(
  () => props.viewMode,
  (value) => {
    localViewMode.value = value
  },
)

// ============================================================================
// Watchers - 同步本地状态到父组件
// ============================================================================

watch(localSelectedPlatform, (value) => {
  emit('update:selectedPlatform', value)
})

watch(localSortBy, (value) => {
  emit('update:sortBy', value)
})

watch(localViewMode, (value) => {
  emit('update:viewMode', value)
})

// ============================================================================
// Methods
// ============================================================================

/**
 * 防抖搜索
 */
const { debounced: debouncedEmitSearch } = useDebounceFn(() => {
  emit('update:searchQuery', localSearchQuery.value)
  emit('search')
}, 300)

/**
 * 搜索输入处理
 */
const onSearchInput = () => {
  debouncedEmitSearch()
}

/**
 * 清除搜索
 */
const clearSearch = () => {
  localSearchQuery.value = ''
  emit('update:searchQuery', '')
  emit('clearSearch')
}

/**
 * 平台变更处理
 */
const onPlatformChange = (platform: string) => {
  emit('platformChange', platform)
}

// ============================================================================
// Expose
// ============================================================================

defineExpose({
  toolbarRef,
})
</script>

<style scoped>
.posts-toolbar {
  position: sticky;
  top: calc(var(--app-navbar-height, 78px) + 12px);
  z-index: 80;
}

.posts-toolbar.is-sticky .toolbar-surface {
  box-shadow: 0 24px 48px -28px rgba(15, 23, 42, 0.35);
  border-color: rgba(148, 163, 184, 0.24);
}

.toolbar-surface {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  padding: clamp(16px, 2vw, 24px);
  border-radius: clamp(20px, 2.5vw, 28px);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.18);
  backdrop-filter: blur(14px);
  transition:
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

/* ========== 搜索块 ========== */
.search-block {
  flex: 1 1 280px;
}

.search-field {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.search-field.is-focused {
  border-color: rgba(139, 92, 246, 0.5);
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.08);
}

.search-field input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.95rem;
  color: var(--color-text-primary);
  outline: none;
}

.search-field input::placeholder {
  color: var(--color-text-tertiary);
}

.search-icon {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.12);
  color: var(--color-primary);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.clear-btn:hover {
  transform: translateY(-1px);
  background: rgba(139, 92, 246, 0.18);
}

/* ========== 控制区域 ========== */
.toolbar-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.sort-control {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 14px;
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
}

.control-icon {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.sort-select {
  appearance: none;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
  padding-right: 22px;
  cursor: pointer;
}

.sort-select:focus {
  outline: none;
}

.dropdown-arrow {
  position: absolute;
  right: 14px;
  color: var(--color-text-tertiary);
  pointer-events: none;
}

.view-toggle {
  display: inline-flex;
  padding: 4px;
  border-radius: 999px;
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
}

.view-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.view-button.active {
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 12px 24px -14px rgba(139, 92, 246, 0.5);
}

/* ========== 响应式 ========== */
@media (max-width: 1024px) {
  .toolbar-surface {
    gap: 12px;
  }

  .toolbar-controls {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (max-width: 768px) {
  .posts-toolbar {
    top: calc(var(--app-navbar-height, 64px) + 8px);
  }

  .toolbar-controls {
    justify-content: space-between;
    gap: 8px;
  }

  .toolbar-controls .sort-control {
    flex: 1 1 auto;
    min-width: 0;
  }

  .toolbar-controls .view-toggle {
    flex: 0 0 auto;
  }
}

/* ========== 深色模式 ========== */
[data-theme='dark'] .toolbar-surface {
  background: rgba(15, 23, 42, 0.85);
  border-color: rgba(148, 163, 184, 0.18);
}

[data-theme='dark'] .posts-toolbar.is-sticky .toolbar-surface {
  border-color: rgba(139, 92, 246, 0.24);
}

[data-theme='dark'] .search-field {
  background: rgba(17, 24, 39, 0.9);
}

[data-theme='dark'] .sort-control {
  background: rgba(17, 24, 39, 0.9);
}

[data-theme='dark'] .view-toggle {
  background: rgba(17, 24, 39, 0.9);
}

/* ========== 动画 ========== */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
