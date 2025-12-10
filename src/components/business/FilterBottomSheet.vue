<template>
  <Teleport to="body">
    <Transition name="bottom-sheet">
      <div
        v-if="isOpen"
        class="bottom-sheet-overlay"
        @click.self="close"
        @touchstart.passive="handleTouchStart"
        @touchmove.passive="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <div
          ref="sheetRef"
          class="bottom-sheet"
          :style="sheetStyle"
          role="dialog"
          aria-modal="true"
          :aria-label="$t('filter.title', 'Filters')"
        >
          <!-- 拖动手柄 -->
          <div class="sheet-handle" @mousedown="startDrag">
            <div class="handle-bar"></div>
          </div>

          <!-- 标题栏 -->
          <div class="sheet-header">
            <h3 class="sheet-title">
              <SlidersHorizontal :size="20" />
              {{ $t('filter.title', '筛选') }}
            </h3>
            <button
              type="button"
              class="close-button"
              :aria-label="$t('common.close')"
              @click="close"
            >
              <X :size="20" />
            </button>
          </div>

          <!-- 筛选内容 -->
          <div class="sheet-content">
            <!-- 排序方式 -->
            <div class="filter-group">
              <label class="filter-group-label">
                <ArrowUpDown :size="16" />
                {{ $t('filter.sortBy') }}
              </label>
              <div class="filter-options">
                <button
                  v-for="option in sortOptions"
                  :key="option.value"
                  type="button"
                  class="filter-option"
                  :class="{ active: localFilters.sort_by === option.value }"
                  @click="localFilters.sort_by = option.value"
                >
                  <component :is="option.icon" :size="16" />
                  {{ $t(option.labelKey) }}
                </button>
              </div>
            </div>

            <!-- 排序方向 -->
            <div v-if="localFilters.sort_by !== 'scraped_at'" class="filter-group">
              <label class="filter-group-label">
                <ArrowUpDown :size="16" />
                {{ $t('common.order', '排序方向') }}
              </label>
              <div class="filter-options filter-options--row">
                <button
                  type="button"
                  class="filter-option"
                  :class="{ active: localFilters.sort_order === 'desc' }"
                  @click="localFilters.sort_order = 'desc'"
                >
                  <ArrowDown :size="16" />
                  {{ $t('filter.descending', '降序') }}
                </button>
                <button
                  type="button"
                  class="filter-option"
                  :class="{ active: localFilters.sort_order === 'asc' }"
                  @click="localFilters.sort_order = 'asc'"
                >
                  <ArrowUp :size="16" />
                  {{ $t('filter.ascending', '升序') }}
                </button>
              </div>
            </div>

            <!-- 媒体筛选 -->
            <div class="filter-group">
              <label class="filter-group-label">
                <ImageIcon :size="16" />
                {{ $t('filter.hasMedia') }}
              </label>
              <div class="filter-options filter-options--row">
                <button
                  type="button"
                  class="filter-option"
                  :class="{ active: localFilters.has_media === undefined }"
                  @click="syncHasMedia(undefined)"
                >
                  {{ $t('common.all', '全部') }}
                </button>
                <button
                  type="button"
                  class="filter-option"
                  :class="{ active: localFilters.has_media === true }"
                  @click="syncHasMedia(true)"
                >
                  <ImageIcon :size="16" />
                  {{ $t('filter.withMedia', '有媒体') }}
                </button>
              </div>
            </div>
          </div>

          <!-- 底部操作 -->
          <div class="sheet-footer">
            <button type="button" class="footer-button reset-button" @click="handleReset">
              <RotateCcw :size="16" />
              {{ $t('common.reset') }}
            </button>
            <button type="button" class="footer-button apply-button" @click="handleApply">
              <Check :size="16" />
              {{ $t('common.apply') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * FilterBottomSheet - 移动端筛选底部抽屉
 *
 * 功能特点：
 * - 底部滑出动画
 * - 手势拖动关闭
 * - 触摸滑动支持
 * - 遮罩点击关闭
 */

import { ref, reactive, computed, watch, type Component } from 'vue'
import {
  X,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  ImageIcon,
  RotateCcw,
  Check,
  Clock,
  CalendarDays,
  Eye,
  Heart,
} from 'lucide-vue-next'
import type { PostListParams } from '@/types'

interface Props {
  /** 是否打开 */
  isOpen: boolean
  /** 当前筛选条件 */
  filters: PostListParams
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  apply: [filters: PostListParams]
  reset: []
}>()

// 排序选项
const sortOptions: { value: string; labelKey: string; icon: Component }[] = [
  { value: 'scraped_at', labelKey: 'filter.latest', icon: Clock },
  { value: 'published_at', labelKey: 'filter.published', icon: CalendarDays },
  { value: 'view_count', labelKey: 'post.views', icon: Eye },
  { value: 'like_count', labelKey: 'post.likes', icon: Heart },
]

// 本地筛选状态（允许局部字段）
const localFilters = reactive<Partial<PostListParams>>({
  sort_by: 'scraped_at',
  sort_order: 'desc',
})

const syncHasMedia = (value: PostListParams['has_media']) => {
  if (typeof value === 'boolean') {
    localFilters.has_media = value
  } else {
    delete localFilters.has_media
  }
}

// 同步外部筛选条件
watch(
  () => props.filters,
  (newFilters) => {
    localFilters.sort_by = newFilters.sort_by || 'scraped_at'
    localFilters.sort_order = newFilters.sort_order || 'desc'
    syncHasMedia(newFilters.has_media)
  },
  { immediate: true },
)

const buildAppliedFilters = (): PostListParams => {
  const result: PostListParams = {
    sort_by: localFilters.sort_by || 'scraped_at',
    sort_order: localFilters.sort_order || 'desc',
  }
  if (typeof localFilters.has_media === 'boolean') {
    result.has_media = localFilters.has_media
  }
  return result
}

// 拖动相关
const translateY = ref(0)
const isDragging = ref(false)
const startY = ref(0)

const sheetStyle = computed(() => ({
  transform: `translateY(${translateY.value}px)`,
}))

const close = () => {
  emit('update:isOpen', false)
}

const handleApply = () => {
  emit('apply', buildAppliedFilters())
  close()
}

const handleReset = () => {
  localFilters.sort_by = 'scraped_at'
  localFilters.sort_order = 'desc'
  delete localFilters.has_media
  emit('reset')
}

// 触摸手势处理
const handleTouchStart = (event: TouchEvent) => {
  const touch = event.touches[0]
  if (!touch) return
  startY.value = touch.clientY
  isDragging.value = true
}

const handleTouchMove = (event: TouchEvent) => {
  if (!isDragging.value) return
  const touch = event.touches[0]
  if (!touch) return
  const deltaY = touch.clientY - startY.value
  if (deltaY > 0) {
    translateY.value = deltaY
  }
}

const handleTouchEnd = () => {
  isDragging.value = false
  if (translateY.value > 100) {
    close()
  }
  translateY.value = 0
}

// 鼠标拖动（桌面端）
const startDrag = (event: MouseEvent) => {
  startY.value = event.clientY
  isDragging.value = true

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging.value) return
    const deltaY = e.clientY - startY.value
    if (deltaY > 0) {
      translateY.value = deltaY
    }
  }

  const onMouseUp = () => {
    isDragging.value = false
    if (translateY.value > 100) {
      close()
    }
    translateY.value = 0
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

// ESC 键关闭
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') close()
      }
      window.addEventListener('keydown', handleEscape)
      return () => window.removeEventListener('keydown', handleEscape)
    }
    return undefined
  },
)
</script>

<style scoped>
.bottom-sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 1050;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bottom-sheet {
  position: relative;
  width: 100%;
  max-width: 500px;
  max-height: 85vh;
  background: var(--color-surface);
  border-radius: 24px 24px 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 -4px 20px rgba(0, 0, 0, 0.15),
    0 -8px 40px rgba(139, 92, 246, 0.1);
  transition: transform 0.2s ease;
}

.sheet-handle {
  display: flex;
  justify-content: center;
  padding: var(--spacing-sm) 0;
  cursor: grab;
}

.sheet-handle:active {
  cursor: grabbing;
}

.handle-bar {
  width: 40px;
  height: 4px;
  background: var(--color-text-tertiary);
  border-radius: var(--radius-full);
  opacity: 0.5;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-bottom: 1px solid var(--glass-border);
}

.sheet-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.sheet-title svg {
  color: var(--color-primary);
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-full);
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: var(--glass-bg);
  color: var(--color-text-primary);
}

.sheet-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.filter-group-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.filter-group-label svg {
  color: var(--color-primary);
}

.filter-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.filter-options--row {
  display: flex;
  gap: var(--spacing-sm);
}

.filter-options--row .filter-option {
  flex: 1;
}

.filter-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-option:hover {
  background: var(--glass-bg);
  border-color: var(--color-primary);
  color: var(--color-text-primary);
}

.filter-option.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.sheet-footer {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border-top: 1px solid var(--glass-border);
  background: var(--color-surface);
}

.footer-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-button {
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  color: var(--color-text-secondary);
}

.reset-button:hover {
  background: var(--glass-bg);
  color: var(--color-text-primary);
}

.apply-button {
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  color: white;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.apply-button:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
}

/* 动画 */
.bottom-sheet-enter-active,
.bottom-sheet-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.bottom-sheet-enter-active .bottom-sheet,
.bottom-sheet-leave-active .bottom-sheet {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.bottom-sheet-enter-from,
.bottom-sheet-leave-to {
  background: rgba(0, 0, 0, 0);
}

.bottom-sheet-enter-from .bottom-sheet,
.bottom-sheet-leave-to .bottom-sheet {
  transform: translateY(100%);
}

/* 安全区域 */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .sheet-footer {
    padding-bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom));
  }
}
</style>
