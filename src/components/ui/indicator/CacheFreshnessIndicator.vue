<template>
    <Transition name="fade">
        <div v-if="show" class="cache-indicator" :class="`cache-${status}`" :title="tooltipText">
            <Database :size="12" />
            <span class="cache-text">{{ statusText }}</span>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Database } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

interface Props {
    cachedAt?: number | null
    /**
     * 缓存新鲜度阈值（毫秒）
     * - fresh: < 2分钟
     * - stale: 2-5分钟
     * - expired: > 5分钟
     */
    freshThreshold?: number
    staleThreshold?: number
    show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    freshThreshold: 2 * 60 * 1000, // 2分钟
    staleThreshold: 5 * 60 * 1000, // 5分钟
    show: true,
})

const { t } = useI18n()

const status = computed(() => {
    if (!props.cachedAt) return 'none'

    const age = Date.now() - props.cachedAt

    if (age < props.freshThreshold) return 'fresh'
    if (age < props.staleThreshold) return 'stale'
    return 'expired'
})

const statusText = computed(() => {
    if (!props.cachedAt) return ''

    const age = Date.now() - props.cachedAt
    const minutes = Math.floor(age / 60000)

    if (minutes === 0) {
        return t('cache.justNow')
    } else if (minutes < 60) {
        return t('cache.minutesAgo', { minutes })
    } else {
        const hours = Math.floor(minutes / 60)
        return t('cache.hoursAgo', { hours })
    }
})

const tooltipText = computed(() => {
    if (!props.cachedAt) return ''

    const date = new Date(props.cachedAt)
    return t('cache.cachedAt', { time: date.toLocaleString() })
})
</script>

<style scoped>
.cache-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    transition: all 0.2s;
    user-select: none;
}

.cache-text {
    white-space: nowrap;
}

/* Fresh cache (< 2 minutes) */
.cache-fresh {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
    border: 1px solid rgba(34, 197, 94, 0.2);
}

/* Stale cache (2-5 minutes) */
.cache-stale {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.2);
}

/* Expired cache (> 5 minutes) */
.cache-expired {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.2);
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

@media (max-width: 768px) {
    .cache-indicator {
        padding: 3px 6px;
        font-size: 10px;
    }

    .cache-indicator svg {
        width: 10px;
        height: 10px;
    }
}
</style>
