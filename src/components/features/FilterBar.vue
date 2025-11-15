<template>
  <div class="filter-bar glass-card">
    <div class="filter-section filter-section--platform">
      <label class="filter-label">{{ $t('filter.platform') }}</label>
      <div class="platform-chips">
        <button v-for="item in platformOptions" :key="item.value || 'all'" type="button" class="filter-chip"
          :class="{ active: isPlatformActive(item.value) }" @click="selectPlatform(item.value)"
          :aria-label="`${$t('filter.platform')}: ${$t(item.labelKey)}`">
          <span class="chip-icon">
            <component :is="item.icon" :size="16" />
          </span>
          <span class="chip-label">{{ $t(item.labelKey) }}</span>
        </button>
      </div>
    </div>

    <div class="filter-section filter-section--sort">
      <label class="filter-label">{{ $t('filter.sortBy') }}</label>
      <div class="sort-chips">
        <button v-for="item in sortOptions" :key="item.value" type="button" class="filter-chip"
          :class="{ active: localFilters.sort_by === item.value }" @click="selectSort(item.value)"
          :aria-label="`${$t('filter.sortBy')}: ${$t(item.labelKey)}`">
          <span class="chip-icon">
            <component :is="item.icon" :size="16" />
          </span>
          <span class="chip-label">{{ $t(item.labelKey) }}</span>
        </button>
      </div>
    </div>

    <!-- 升降序按钮（最新排序时隐藏） -->
    <div v-if="localFilters.sort_by !== 'scraped_at'" class="filter-section">
      <label class="filter-label">{{ $t('common.order') }}</label>
      <div class="filter-buttons">
        <button class="filter-button" :class="{ active: localFilters.sort_order === 'desc' }"
          @click="localFilters.sort_order = 'desc'">
          <ArrowDown :size="16" />
        </button>
        <button class="filter-button" :class="{ active: localFilters.sort_order === 'asc' }"
          @click="localFilters.sort_order = 'asc'">
          <ArrowUp :size="16" />
        </button>
      </div>
    </div>

    <div class="filter-section">
      <label class="filter-label">{{ $t('filter.hasMedia') }}</label>
      <button class="filter-button" :class="{ active: localFilters.has_media }"
        @click="localFilters.has_media = !localFilters.has_media">
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
import { ref, watch, type Component } from 'vue'
import {
  ArrowDown,
  ArrowUp,
  ImageIcon,
  RotateCcw,
  Filter,
  Youtube,
  Twitter,
  Instagram,
  Music2,
  Globe2,
  Clock,
  CalendarDays,
  Eye,
  Heart,
} from 'lucide-vue-next'
import type { PostListParams, Platform } from '@/types'
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

const platformOptions: { value: '' | Platform; labelKey: string; icon: Component }[] = [
  { value: '', labelKey: 'platform.all', icon: Globe2 },
  { value: 'youtube', labelKey: 'platform.youtube', icon: Youtube },
  { value: 'twitter', labelKey: 'platform.twitter', icon: Twitter },
  { value: 'tiktok', labelKey: 'platform.tiktok', icon: Music2 },
  { value: 'instagram', labelKey: 'platform.instagram', icon: Instagram },
]

const sortOptions: { value: 'scraped_at' | 'published_at' | 'view_count' | 'like_count'; labelKey: string; icon: Component }[] = [
  { value: 'scraped_at', labelKey: 'filter.latest', icon: Clock },
  { value: 'published_at', labelKey: 'filter.published', icon: CalendarDays },
  { value: 'view_count', labelKey: 'post.views', icon: Eye },
  { value: 'like_count', labelKey: 'post.likes', icon: Heart },
]

const localFilters = ref<PostListParams>({ ...props.filters })

const isPlatformActive = (value: '' | Platform) => {
  if (value === '') {
    return !localFilters.value.platform
  }
  return localFilters.value.platform === value
}

const selectPlatform = (value: '' | Platform) => {
  localFilters.value.platform = value || ''
}

const selectSort = (value: 'scraped_at' | 'published_at' | 'view_count' | 'like_count') => {
  if (localFilters.value.sort_by === value) return
  localFilters.value.sort_by = value
  // 选择排序方式时，立即应用筛选（带防抖）
  applyFilters()
}

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
  align-items: center;
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

.filter-section--platform {
  flex: 1.5;
  min-width: 240px;
}

.platform-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.filter-chip:hover {
  background: var(--glass-bg);
  border-color: var(--color-primary);
  color: var(--color-text-primary);
}

.filter-chip.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.12),
    0 8px 18px rgba(0, 0, 0, 0.25);
}

.chip-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.chip-label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
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
