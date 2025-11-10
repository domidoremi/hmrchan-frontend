<template>
  <div class="filter-bar glass-card">
    <div class="filter-section">
      <label class="filter-label">{{ $t('filter.platform') }}</label>
      <select v-model="localFilters.platform" class="filter-select glass-input">
        <option value="">{{ $t('platform.all') }}</option>
        <option v-for="platform in platforms" :key="platform" :value="platform">
          {{ $t(`platform.${platform}`) }}
        </option>
      </select>
    </div>

    <div class="filter-section">
      <label class="filter-label">{{ $t('filter.sortBy') }}</label>
      <select v-model="localFilters.sort_by" class="filter-select glass-input">
        <option value="scraped_at">{{ $t('filter.latest') }}</option>
        <option value="published_at">{{ $t('filter.published') }}</option>
        <option value="view_count">{{ $t('post.views') }}</option>
        <option value="like_count">{{ $t('post.likes') }}</option>
      </select>
    </div>

    <!-- 升降序按钮（最新排序时隐藏） -->
    <div v-if="localFilters.sort_by !== 'scraped_at'" class="filter-section">
      <label class="filter-label">{{ $t('common.order') }}</label>
      <div class="filter-buttons">
        <button
          class="filter-button"
          :class="{ active: localFilters.sort_order === 'desc' }"
          @click="localFilters.sort_order = 'desc'"
        >
          <ArrowDown :size="16" />
        </button>
        <button
          class="filter-button"
          :class="{ active: localFilters.sort_order === 'asc' }"
          @click="localFilters.sort_order = 'asc'"
        >
          <ArrowUp :size="16" />
        </button>
      </div>
    </div>

    <div class="filter-section">
      <label class="filter-label">{{ $t('filter.hasMedia') }}</label>
      <button
        class="filter-button"
        :class="{ active: localFilters.has_media }"
        @click="localFilters.has_media = !localFilters.has_media"
      >
        <ImageIcon :size="16" />
      </button>
    </div>

    <div class="filter-actions">
      <GlassButton size="sm" variant="ghost" @click="resetFilters">
        <RotateCcw :size="16" />
        {{ $t('common.reset') }}
      </GlassButton>
      <GlassButton size="sm" @click="applyFilters">
        <Filter :size="16" />
        {{ $t('common.apply') }}
      </GlassButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ArrowDown, ArrowUp, ImageIcon, RotateCcw, Filter } from 'lucide-vue-next'
import type { PostListParams } from '@/types'
import { PLATFORMS } from '@/types'
import GlassButton from '@/components/ui/GlassButton.vue'

// 防抖定时器
let applyTimeout: ReturnType<typeof setTimeout> | null = null

interface Props {
  filters: PostListParams
}

const props = defineProps<Props>()
const emit = defineEmits<{
  update: [filters: PostListParams]
}>()

const platforms = PLATFORMS
const localFilters = ref<PostListParams>({ ...props.filters })

watch(
  () => props.filters,
  (newFilters) => {
    localFilters.value = { ...newFilters }
  },
)

// 监听 sort_by 变化，当选择“最新”时自动设置为降序
watch(
  () => localFilters.value.sort_by,
  (newSortBy) => {
    if (newSortBy === 'scraped_at') {
      localFilters.value.sort_order = 'desc'
    }
  },
)

// 防抖应用筛选（优化性能）
const applyFilters = () => {
  if (applyTimeout) {
    clearTimeout(applyTimeout)
  }
  
  applyTimeout = setTimeout(() => {
    emit('update', { ...localFilters.value })
  }, 100) // 100ms 防抖
}

// 立即应用筛选（用于重置按钮）
const applyFiltersImmediate = () => {
  if (applyTimeout) {
    clearTimeout(applyTimeout)
  }
  emit('update', { ...localFilters.value })
}

const resetFilters = () => {
  localFilters.value = {
    page: 1,
    page_size: 20,
    sort_by: 'scraped_at',
    sort_order: 'desc',
    platform: '',
    has_media: false,
  }
  applyFiltersImmediate() // 重置时立即应用
}
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  flex-wrap: wrap;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  min-width: 150px;
}

.filter-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.filter-select {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
}

.filter-buttons {
  display: flex;
  gap: var(--spacing-xs);
}

.filter-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-button:hover {
  background: var(--glass-bg);
  border-color: var(--color-primary);
  color: var(--color-text-primary);
}

.filter-button.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-left: auto;
}

/* 移动端样式优化 */
@media (max-width: 768px) {
  .filter-bar {
    padding: var(--spacing-md);
    gap: var(--spacing-md);
  }

  .filter-section {
    min-width: 0;
    flex: 1;
  }

  .filter-section:nth-child(1),
  .filter-section:nth-child(2) {
    flex: 1 1 calc(50% - var(--spacing-sm));
  }

  .filter-section:nth-child(3),
  .filter-section:nth-child(4) {
    flex: 0 0 auto;
  }

  .filter-label {
    font-size: var(--text-xs);
  }

  .filter-select {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--text-xs);
  }

  .filter-button {
    padding: var(--spacing-xs);
  }

  .filter-button svg {
    width: 14px;
    height: 14px;
  }

  .filter-actions {
    width: 100%;
    margin-left: 0;
    justify-content: stretch;
  }

  .filter-actions button {
    flex: 1;
  }
}

/* 极小屏幕优化 */
@media (max-width: 480px) {
  .filter-bar {
    padding: var(--spacing-sm);
    gap: var(--spacing-sm);
  }

  .filter-section:nth-child(1),
  .filter-section:nth-child(2) {
    flex: 1 1 100%;
  }
}
</style>
