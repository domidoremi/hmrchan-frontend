<template>
  <div class="pagination">
    <button class="pagination-button" :disabled="currentPage === 1" @click="goToPage(1)">
      <ChevronsLeft :size="18" />
    </button>

    <button
      class="pagination-button"
      :disabled="currentPage === 1"
      @click="goToPage(currentPage - 1)"
    >
      <ChevronLeft :size="18" />
    </button>

    <div class="pagination-pages">
      <button
        v-for="page in visiblePages"
        :key="page"
        class="pagination-page"
        :class="{ active: page === currentPage, ellipsis: page === '...' }"
        :disabled="page === '...'"
        @click="typeof page === 'number' && goToPage(page)"
      >
        {{ page }}
      </button>
    </div>

    <button
      class="pagination-button"
      :disabled="currentPage === totalPages"
      @click="goToPage(currentPage + 1)"
    >
      <ChevronRight :size="18" />
    </button>

    <button
      class="pagination-button"
      :disabled="currentPage === totalPages"
      @click="goToPage(totalPages)"
    >
      <ChevronsRight :size="18" />
    </button>

    <span class="pagination-info">
      {{ $t('common.page') }} {{ safeCurrentPage }} {{ $t('common.of') }} {{ safeTotalPages }}
    </span>
  </div>
</template>

<script setup lang="ts">
/**
 * 分页组件
 *
 * 业务功能：
 * - 提供帖子列表的分页导航功能
 * - 支持首页、尾页、上一页、下一页快速跳转
 * - 智能显示页码，避免页码过多时的显示问题
 *
 * 业务场景：
 * - 用户浏览帖子列表时进行翻页
 * - 快速跳转到第一页或最后一页
 * - 在大量页面中快速导航
 *
 * Props:
 * - currentPage: 当前页码
 * - totalPages: 总页数
 * - maxVisible: 最多显示的页码数量（默认 5）
 *
 * Emits:
 * - change: 页码变化时触发，传递新的页码
 */

import { computed } from 'vue'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'

defineOptions({
  name: 'AppPagination',
})

interface Props {
  /** 当前页码 */
  currentPage: number
  /** 总页数 */
  totalPages: number
  /** 最多显示的页码数量 */
  maxVisible?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxVisible: 5,
})

const emit = defineEmits<{
  /** 页码变化事件 */
  change: [page: number]
}>()

/**
 * 计算可见的页码列表
 * 根据当前页码和总页数，智能显示页码，超出范围时使用省略号
 */
const visiblePages = computed(() => {
  const pages: (number | string)[] = []
  const { currentPage, totalPages, maxVisible } = props

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    const half = Math.floor(maxVisible / 2)
    let start = Math.max(1, currentPage - half)
    const end = Math.min(totalPages, start + maxVisible - 1)

    if (end === totalPages) {
      start = Math.max(1, end - maxVisible + 1)
    }

    if (start > 1) {
      pages.push(1)
      if (start > 2) {
        pages.push('...')
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push('...')
      }
      pages.push(totalPages)
    }
  }

  return pages
})

/**
 * 安全的总页数
 * 避免出现 "1 / 0" 等异常显示
 */
const safeTotalPages = computed(() => {
  return props.totalPages && props.totalPages > 0 ? props.totalPages : 1
})

/**
 * 安全的当前页码
 * 确保页码在有效范围内
 */
const safeCurrentPage = computed(() => {
  const total = safeTotalPages.value
  const current = props.currentPage || 1
  if (current < 1) return 1
  if (current > total) return total
  return current
})

/**
 * 跳转到指定页码
 * @param page - 目标页码
 */
const goToPage = (page: number) => {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('change', page)
  }
}
</script>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  padding: var(--spacing-lg) 0;
}

.pagination-button,
.pagination-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 var(--spacing-sm);
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.pagination-button:hover:not(:disabled),
.pagination-page:hover:not(:disabled):not(.ellipsis) {
  background: var(--glass-bg-light);
  border-color: var(--color-primary);
  color: var(--color-text-primary);
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-page.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  cursor: default;
}

.pagination-page.ellipsis {
  background: transparent;
  border: none;
  cursor: default;
}

.pagination-pages {
  display: flex;
  gap: var(--spacing-xs);
}

.pagination-info {
  margin-left: var(--spacing-md);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

@media (max-width: 768px) {
  .pagination {
    gap: var(--spacing-xs);
  }

  .pagination-info {
    width: 100%;
    text-align: center;
    margin: var(--spacing-sm) 0 0;
  }
}
</style>
