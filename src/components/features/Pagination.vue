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
      {{ $t('common.page') }} {{ currentPage }} {{ $t('common.of') }} {{ totalPages }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'

interface Props {
  currentPage: number
  totalPages: number
  maxVisible?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxVisible: 5,
})

const emit = defineEmits<{
  change: [page: number]
}>()

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
