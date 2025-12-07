<template>
  <div
    ref="filterBarRef"
    class="filter-bar"
    :class="{
      'is-sticky': isSticky,
      'is-mobile': isMobile,
    }"
  >
    <!-- 桌面端布局 -->
    <div v-if="!isMobile" class="filter-bar-desktop">
      <!-- 平台筛选 Tabs -->
      <div class="platform-tabs" role="tablist" :aria-label="$t('filter.platform')">
        <button
          v-for="platform in platformOptions"
          :key="platform.value || 'all'"
          type="button"
          class="platform-tab"
          :class="{
            active: isPlatformActive(platform.value),
            [`platform-${platform.value || 'all'}`]: true,
          }"
          role="tab"
          :aria-selected="isPlatformActive(platform.value)"
          @click="selectPlatform(platform.value)"
        >
          <component :is="platform.icon" :size="16" />
          <span class="tab-label">{{ $t(platform.labelKey) }}</span>
        </button>
      </div>

      <!-- 分隔线 -->
      <div class="filter-divider"></div>

      <!-- 排序下拉 -->
      <div class="sort-dropdown">
        <button
          type="button"
          class="sort-trigger"
          :aria-expanded="sortDropdownOpen"
          @click="sortDropdownOpen = !sortDropdownOpen"
        >
          <component :is="currentSortIcon" :size="16" />
          <span>{{ $t(currentSortLabel) }}</span>
          <ChevronDown :size="14" class="chevron" :class="{ rotated: sortDropdownOpen }" />
        </button>

        <Transition name="dropdown">
          <div v-if="sortDropdownOpen" class="sort-menu" role="menu">
            <button
              v-for="option in sortOptions"
              :key="option.value"
              type="button"
              class="sort-option"
              :class="{ active: localFilters.sort_by === option.value }"
              role="menuitem"
              @click="selectSort(option.value)"
            >
              <component :is="option.icon" :size="16" />
              <span>{{ $t(option.labelKey) }}</span>
              <Check v-if="localFilters.sort_by === option.value" :size="14" class="check-icon" />
            </button>
          </div>
        </Transition>
      </div>

      <!-- 排序方向 -->
      <button
        v-if="localFilters.sort_by !== 'scraped_at'"
        type="button"
        class="order-toggle"
        :aria-label="
          localFilters.sort_order === 'desc' ? $t('filter.descending') : $t('filter.ascending')
        "
        @click="toggleSortOrder"
      >
        <ArrowDown v-if="localFilters.sort_order === 'desc'" :size="16" />
        <ArrowUp v-else :size="16" />
      </button>

      <!-- 媒体筛选 -->
      <button
        type="button"
        class="media-toggle"
        :class="{ active: localFilters.has_media }"
        :aria-pressed="!!localFilters.has_media"
        :aria-label="$t('filter.hasMedia')"
        @click="toggleMediaFilter"
      >
        <ImageIcon :size="16" />
      </button>

      <!-- 重置按钮 -->
      <button
        v-if="hasActiveFilters"
        type="button"
        class="reset-button"
        :aria-label="$t('common.reset')"
        @click="resetFilters"
      >
        <RotateCcw :size="14" />
        <span>{{ $t('common.reset') }}</span>
      </button>
    </div>

    <!-- 移动端布局 -->
    <div v-else class="filter-bar-mobile">
      <!-- 平台滑动 Chips -->
      <div class="platform-scroll" ref="platformScrollRef">
        <div class="platform-chips">
          <button
            v-for="platform in platformOptions"
            :key="platform.value || 'all'"
            type="button"
            class="platform-chip"
            :class="{
              active: isPlatformActive(platform.value),
              [`platform-${platform.value || 'all'}`]: true,
            }"
            @click="selectPlatform(platform.value)"
          >
            <component :is="platform.icon" :size="14" />
            <span>{{ $t(platform.labelKey) }}</span>
          </button>
        </div>
      </div>

      <!-- 筛选按钮 -->
      <button
        type="button"
        class="filter-trigger"
        :class="{ 'has-filters': hasActiveFilters }"
        @click="$emit('openSheet')"
      >
        <SlidersHorizontal :size="18" />
        <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * FilterBar - 重构版筛选栏组件
 *
 * 新特性：
 * - 桌面端：紧凑水平布局，即时生效
 * - 移动端：平台滑动 Chips + 筛选底部抽屉触发
 * - 滚动粘性定位
 * - 现代化视觉设计
 */

import { ref, reactive, computed, watch, onMounted, onUnmounted, type Component } from 'vue'
import {
  ChevronDown,
  ArrowDown,
  ArrowUp,
  ImageIcon,
  RotateCcw,
  Check,
  SlidersHorizontal,
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
import { useResponsive } from '@/composables'

interface Props {
  /** 当前筛选条件 */
  filters: PostListParams
  /** 是否显示粘性效果 */
  sticky?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  sticky: true,
})

const emit = defineEmits<{
  update: [filters: PostListParams]
  openSheet: []
}>()

const { isMobile } = useResponsive()

// Refs
const filterBarRef = ref<HTMLElement | null>(null)
const platformScrollRef = ref<HTMLElement | null>(null)
const sortDropdownOpen = ref(false)
const isSticky = ref(false)

// 本地筛选状态
const localFilters = reactive<PostListParams>({
  sort_by: 'scraped_at',
  sort_order: 'desc',
  platform: undefined,
  has_media: undefined,
})

// 平台选项
const platformOptions: { value: '' | Platform; labelKey: string; icon: Component }[] = [
  { value: '', labelKey: 'platform.all', icon: Globe2 },
  { value: 'youtube', labelKey: 'platform.youtube', icon: Youtube },
  { value: 'twitter', labelKey: 'platform.twitter', icon: Twitter },
  { value: 'tiktok', labelKey: 'platform.tiktok', icon: Music2 },
  { value: 'instagram', labelKey: 'platform.instagram', icon: Instagram },
]

// 排序选项
const sortOptions: { value: string; labelKey: string; icon: Component }[] = [
  { value: 'scraped_at', labelKey: 'filter.latest', icon: Clock },
  { value: 'published_at', labelKey: 'filter.published', icon: CalendarDays },
  { value: 'view_count', labelKey: 'post.views', icon: Eye },
  { value: 'like_count', labelKey: 'post.likes', icon: Heart },
]

// 计算属性
const isPlatformActive = (value: '' | Platform) => {
  if (value === '') return !localFilters.platform
  return localFilters.platform === value
}

const currentSortOption = computed(() => {
  const found = sortOptions.find((opt) => opt.value === localFilters.sort_by)
  return found ?? sortOptions[0]
})

const currentSortIcon = computed(() => currentSortOption.value?.icon ?? Clock)
const currentSortLabel = computed(() => currentSortOption.value?.labelKey ?? 'filter.latest')

const hasActiveFilters = computed(() => {
  return (
    localFilters.platform ||
    localFilters.has_media ||
    localFilters.sort_by !== 'scraped_at' ||
    localFilters.sort_order !== 'desc'
  )
})

const activeFilterCount = computed(() => {
  let count = 0
  if (localFilters.sort_by !== 'scraped_at') count++
  if (localFilters.sort_order !== 'desc') count++
  if (localFilters.has_media) count++
  return count
})

// 方法
const selectPlatform = (value: '' | Platform) => {
  localFilters.platform = value === '' ? undefined : value
  emitUpdate()
}

const selectSort = (value: string) => {
  localFilters.sort_by = value
  sortDropdownOpen.value = false
  if (value === 'scraped_at') {
    localFilters.sort_order = 'desc'
  }
  emitUpdate()
}

const toggleSortOrder = () => {
  localFilters.sort_order = localFilters.sort_order === 'desc' ? 'asc' : 'desc'
  emitUpdate()
}

const toggleMediaFilter = () => {
  localFilters.has_media = localFilters.has_media ? undefined : true
  emitUpdate()
}

const resetFilters = () => {
  localFilters.sort_by = 'scraped_at'
  localFilters.sort_order = 'desc'
  localFilters.platform = undefined
  localFilters.has_media = undefined
  emitUpdate()
}

const emitUpdate = () => {
  emit('update', { ...localFilters, page: 1 })
}

// 同步外部筛选条件
watch(
  () => props.filters,
  (newFilters) => {
    localFilters.sort_by = newFilters.sort_by || 'scraped_at'
    localFilters.sort_order = newFilters.sort_order || 'desc'
    localFilters.platform = newFilters.platform
    localFilters.has_media = newFilters.has_media
  },
  { immediate: true },
)

// 点击外部关闭下拉菜单
const handleClickOutside = (event: MouseEvent) => {
  if (sortDropdownOpen.value) {
    const target = event.target as HTMLElement
    if (!target.closest('.sort-dropdown')) {
      sortDropdownOpen.value = false
    }
  }
}

// 滚动检测粘性状态
const handleScroll = () => {
  if (!props.sticky || !filterBarRef.value) return
  const rect = filterBarRef.value.getBoundingClientRect()
  isSticky.value = rect.top <= 80
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  if (props.sticky) {
    window.addEventListener('scroll', handleScroll, { passive: true })
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.filter-bar {
  position: relative;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-sm) var(--spacing-md);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.filter-bar.is-sticky {
  position: sticky;
  top: calc(var(--navbar-height, 72px) + var(--spacing-md));
  z-index: 100;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.08),
    0 8px 32px rgba(139, 92, 246, 0.1);
}

/* 桌面端布局 */
.filter-bar-desktop {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: nowrap;
}

/* 平台 Tabs */
.platform-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-xl);
}

.platform-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: var(--radius-lg);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.platform-tab:hover:not(.active) {
  color: var(--color-text-primary);
  background: var(--glass-bg);
}

.platform-tab.active {
  color: white;
  background: var(--color-primary);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

/* 平台特定颜色 */
.platform-tab.active.platform-youtube {
  background: var(--color-youtube);
  box-shadow: var(--glow-youtube);
}

.platform-tab.active.platform-twitter {
  background: var(--color-twitter);
  box-shadow: var(--glow-twitter);
}

.platform-tab.active.platform-tiktok {
  background: var(--color-tiktok);
  color: var(--color-tiktok-accent);
  box-shadow: var(--glow-tiktok);
}

.platform-tab.active.platform-instagram {
  background: var(--gradient-instagram);
  box-shadow: var(--glow-instagram);
}

.tab-label {
  display: none;
}

@media (min-width: 1100px) {
  .tab-label {
    display: inline;
  }
}

/* 分隔线 */
.filter-divider {
  width: 1px;
  height: 24px;
  background: var(--glass-border);
  margin: 0 var(--spacing-xs);
}

/* 排序下拉 */
.sort-dropdown {
  position: relative;
}

.sort-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.sort-trigger:hover {
  border-color: var(--color-primary);
  color: var(--color-text-primary);
}

.sort-trigger .chevron {
  transition: transform 0.2s ease;
}

.sort-trigger .chevron.rotated {
  transform: rotate(180deg);
}

.sort-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 180px;
  padding: var(--spacing-xs);
  background: var(--color-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 200;
}

.sort-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sort-option:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.sort-option.active {
  color: var(--color-primary);
  background: rgba(139, 92, 246, 0.08);
}

.sort-option .check-icon {
  margin-left: auto;
  color: var(--color-primary);
}

/* 排序方向切换 */
.order-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.order-toggle:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* 媒体筛选 */
.media-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.media-toggle:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.media-toggle.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

/* 重置按钮 */
.reset-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  margin-left: auto;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-button:hover {
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.08);
}

/* 移动端布局 */
.filter-bar-mobile {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.platform-scroll {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}

.platform-scroll::-webkit-scrollbar {
  display: none;
}

.platform-chips {
  display: flex;
  gap: 8px;
  padding: 4px 0;
}

.platform-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.platform-chip:hover:not(.active) {
  border-color: var(--color-primary);
}

.platform-chip.active {
  color: white;
  background: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

/* 移动端平台特定颜色 */
.platform-chip.active.platform-youtube {
  background: var(--color-youtube);
  border-color: var(--color-youtube);
  box-shadow: var(--glow-youtube);
}

.platform-chip.active.platform-twitter {
  background: var(--color-twitter);
  border-color: var(--color-twitter);
  box-shadow: var(--glow-twitter);
}

.platform-chip.active.platform-tiktok {
  background: var(--color-tiktok);
  border-color: var(--color-tiktok-accent);
  color: var(--color-tiktok-accent);
  box-shadow: var(--glow-tiktok);
}

.platform-chip.active.platform-instagram {
  background: var(--gradient-instagram);
  border-color: transparent;
  box-shadow: var(--glow-instagram);
}

/* 筛选触发按钮 */
.filter-trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.filter-trigger:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.filter-trigger.has-filters {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(139, 92, 246, 0.08);
}

.filter-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: white;
  font-size: 10px;
  font-weight: var(--font-bold);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(139, 92, 246, 0.4);
}

/* 下拉动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 移动端响应式 */
@media (max-width: 768px) {
  .filter-bar {
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-xl);
  }

  .filter-bar.is-sticky {
    top: calc(var(--navbar-height-mobile, 60px) + var(--spacing-sm));
    border-radius: var(--radius-lg);
  }
}
</style>
