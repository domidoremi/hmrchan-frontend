<template>
    <div class="infinite-post-grid">
        <!-- Initial Loading -->
        <div v-if="loading && items.length === 0" class="grid-loading">
            <LoadingSpinner size="lg" :text="$t('common.loading')" />
        </div>

        <!-- Posts Grid -->
        <div v-else-if="items.length > 0" ref="gridContainer" class="posts-grid" v-memo="[items.length]">
            <PostCard v-for="(post, index) in items" :key="post.id" :post="post" :index="index" :show-actions="false"
                :class="{ 'content-visible': useContentVisibility }" />
        </div>

        <!-- Empty State -->
        <div v-else class="grid-empty">
            <slot name="empty">
                <EmptyState icon="image" :title="$t('search.noResults')" :description="$t('search.noResultsDesc')" />
            </slot>
        </div>

        <!-- Load More Indicator -->
        <div v-if="isLoadingMore || (hasMore && items.length > 0)" ref="loadMoreTrigger" class="load-more-trigger">
            <LoadingSpinner v-if="isLoadingMore" size="sm" :text="$t('common.loading')" />
        </div>

        <!-- No More Hint -->
        <div v-if="!hasMore && items.length > 0" class="no-more-hint">
            <p>{{ $t('common.noMore') }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, onActivated } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'

import PostCard from '@/components/business/PostCard.vue'
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner.vue'
import EmptyState from '@/components/ui/empty/EmptyState.vue'

import { useWaterfallLayout } from '@/composables'
import type { Post } from '@/types'

interface Props {
    items: Post[]
    loading?: boolean
    hasMore?: boolean
    isLoadingMore?: boolean
    useWaterfall?: boolean
    useContentVisibility?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
    hasMore: false,
    isLoadingMore: false,
    useWaterfall: true,
    useContentVisibility: true,
})

const emit = defineEmits<{
    loadMore: []
}>()

const gridContainer = ref<HTMLElement | null>(null)
const loadMoreTrigger = ref<HTMLElement | null>(null)
const previousItemCount = ref(0)

// Waterfall Layout
const { updateLayout, smoothUpdateLayout, destroy: destroyLayout } = useWaterfallLayout(gridContainer, {
    columnGap: 16,
    rowGap: 16,
    breakpoints: {
        1400: 4,
        1100: 3,
        769: 2,
        0: 2,
    },
})

// Infinite Scroll via IntersectionObserver
const { stop } = useIntersectionObserver(
    loadMoreTrigger,
    (entries) => {
        const entry = entries[0]
        if (entry && entry.isIntersecting && props.hasMore && !props.isLoadingMore && !props.loading) {
            emit('loadMore')
        }
    },
    {
        rootMargin: '200px', // Preload before reaching bottom
    }
)

// Handle items change
watch(
    () => props.items.length,
    async (newCount, oldCount) => {
        if (newCount === 0) {
            previousItemCount.value = 0
            return
        }

        if (props.useWaterfall) {
            await nextTick()

            // Animate new items
            if (gridContainer.value && newCount > oldCount) {
                const allCards = gridContainer.value.querySelectorAll('.post-card')
                for (let i = oldCount; i < allCards.length; i++) {
                    const card = allCards[i] as HTMLElement
                    card.classList.add('card-entering')
                }
            }

            if (newCount > oldCount) {
                await smoothUpdateLayout()
            } else {
                await updateLayout()
            }

            // Cleanup animation classes
            setTimeout(() => {
                if (gridContainer.value) {
                    const cards = gridContainer.value.querySelectorAll('.post-card.card-entering')
                    cards.forEach(card => card.classList.remove('card-entering'))
                }
            }, 600)
        }

        previousItemCount.value = newCount
    }
)

// Re-layout on activation (keep-alive support)
onActivated(async () => {
    if (props.useWaterfall && gridContainer.value && props.items.length > 0) {
        await nextTick()
        await updateLayout()
    }
})

onMounted(async () => {
    if (props.useWaterfall && props.items.length > 0) {
        await nextTick()
        await updateLayout()
    }
})

onUnmounted(() => {
    stop()
    if (props.useWaterfall) {
        destroyLayout()
    }
})
</script>

<style scoped>
.infinite-post-grid {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
}

.grid-loading {
    display: flex;
    justify-content: center;
    padding: var(--spacing-2xl);
}

.posts-grid {
    width: 100%;
    position: relative;
    min-height: 200px;
}

.grid-empty {
    display: flex;
    justify-content: center;
    padding: var(--spacing-2xl);
}

.load-more-trigger {
    height: 20px;
    margin-top: var(--spacing-lg);
    display: flex;
    justify-content: center;
}

.no-more-hint {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--color-text-tertiary);
    font-size: var(--text-sm);
}

/* Content Visibility Optimization */
.posts-grid :deep(.post-card.content-visible) {
    content-visibility: auto;
    contain-intrinsic-size: 300px;
    /* Estimate height to prevent scroll jumping */
}

/* Animation styles matched with HomePage */
:deep(.post-card) {
    box-sizing: border-box;
    transition: opacity 0.4s ease, transform 0.4s ease, left 0.3s ease, top 0.3s ease;
}

:deep(.post-card.card-entering) {
    animation: cardFadeIn 0.5s ease forwards;
}

@keyframes cardFadeIn {
    from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}
</style>
