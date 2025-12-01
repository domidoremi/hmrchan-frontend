<template>
    <nav v-if="totalPages > 1" class="pagination" role="navigation" aria-label="Pagination">
        <!-- 上一页 -->
        <button class="pagination-btn nav-btn" :disabled="currentPage === 1" :aria-label="$t('common.prevPage')"
            @click="goToPage(currentPage - 1)">
            <ChevronLeft :size="18" />
        </button>

        <!-- 页码列表 -->
        <div class="pagination-pages">
            <!-- 第一页 -->
            <button v-if="showFirstPage" class="pagination-btn page-btn" :class="{ active: currentPage === 1 }"
                @click="goToPage(1)">
                1
            </button>

            <!-- 左省略号 -->
            <span v-if="showLeftEllipsis" class="pagination-ellipsis">...</span>

            <!-- 中间页码 -->
            <button v-for="page in visiblePages" :key="page" class="pagination-btn page-btn"
                :class="{ active: page === currentPage }" @click="goToPage(page)">
                {{ page }}
            </button>

            <!-- 右省略号 -->
            <span v-if="showRightEllipsis" class="pagination-ellipsis">...</span>

            <!-- 最后一页 -->
            <button v-if="showLastPage" class="pagination-btn page-btn" :class="{ active: currentPage === totalPages }"
                @click="goToPage(totalPages)">
                {{ totalPages }}
            </button>
        </div>

        <!-- 下一页 -->
        <button class="pagination-btn nav-btn" :disabled="currentPage === totalPages"
            :aria-label="$t('common.nextPage')" @click="goToPage(currentPage + 1)">
            <ChevronRight :size="18" />
        </button>

        <!-- 页码信息 -->
        <span v-if="showInfo" class="pagination-info">
            {{ currentPage }} / {{ totalPages }}
        </span>
    </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

defineOptions({
    name: 'AppPagination',
})

interface Props {
    /** 当前页码 */
    currentPage: number
    /** 总页数 */
    totalPages: number
    /** 可见页码数量（不含首尾） */
    visibleCount?: number
    /** 是否显示页码信息 */
    showInfo?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    visibleCount: 3,
    showInfo: true,
})

const emit = defineEmits<{
    change: [page: number]
}>()

// 计算中间可见的页码
const visiblePages = computed(() => {
    const { currentPage, totalPages, visibleCount } = props
    const pages: number[] = []

    if (totalPages <= visibleCount + 2) {
        // 总页数较少时，显示全部（除首尾）
        for (let i = 2; i < totalPages; i++) {
            pages.push(i)
        }
    } else {
        // 计算中间页码的起止位置
        const half = Math.floor(visibleCount / 2)
        let start = Math.max(2, currentPage - half)
        let end = Math.min(totalPages - 1, currentPage + half)

        // 调整边界
        if (currentPage <= half + 1) {
            end = Math.min(totalPages - 1, visibleCount + 1)
        } else if (currentPage >= totalPages - half) {
            start = Math.max(2, totalPages - visibleCount)
        }

        for (let i = start; i <= end; i++) {
            pages.push(i)
        }
    }

    return pages
})

// 是否显示第一页按钮
const showFirstPage = computed(() => props.totalPages > 1)

// 是否显示最后一页按钮
const showLastPage = computed(() => props.totalPages > 1)

// 是否显示左省略号
const showLeftEllipsis = computed(() => {
    const pages = visiblePages.value
    const firstPage = pages[0]
    return pages.length > 0 && firstPage !== undefined && firstPage > 2
})

// 是否显示右省略号
const showRightEllipsis = computed(() => {
    const pages = visiblePages.value
    const lastPage = pages[pages.length - 1]
    return pages.length > 0 && lastPage !== undefined && lastPage < props.totalPages - 1
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
    padding: var(--spacing-lg) 0;
    flex-wrap: wrap;
}

.pagination-pages {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
}

.pagination-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    height: 40px;
    padding: 0 var(--spacing-sm);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    background: var(--glass-bg);
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled):not(.active) {
    background: var(--glass-bg-hover);
    border-color: var(--color-primary);
    color: var(--color-primary);
}

.pagination-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.pagination-btn.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
    font-weight: var(--font-semibold);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.pagination-ellipsis {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 40px;
    color: var(--color-text-tertiary);
    font-size: var(--text-sm);
    user-select: none;
}

.pagination-info {
    margin-left: var(--spacing-md);
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
}

@media (max-width: 640px) {
    .pagination {
        gap: var(--spacing-xs);
    }

    .pagination-btn {
        min-width: 36px;
        height: 36px;
    }

    .pagination-info {
        width: 100%;
        text-align: center;
        margin: var(--spacing-sm) 0 0 0;
    }
}
</style>
