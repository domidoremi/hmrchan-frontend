<script setup lang="ts" generic="T">
/**
 * 虚拟滚动组件
 * 优化长列表性能，只渲染可视区域的元素
 */
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

interface Props {
  items: T[]
  itemHeight: number // 每项固定高度
  bufferSize?: number // 缓冲区大小（上下额外渲染的项数）
  height?: string // 容器高度
}

const props = withDefaults(defineProps<Props>(), {
  bufferSize: 5,
  height: '600px',
})

const emit = defineEmits<{
  scroll: [event: Event]
}>()

const containerRef = ref<HTMLElement>()
const scrollTop = ref(0)
const containerHeight = ref(600)

// 计算可见项的索引范围
const visibleRange = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight)
  const end = Math.ceil((scrollTop.value + containerHeight.value) / props.itemHeight)

  return {
    start: Math.max(0, start - props.bufferSize),
    end: Math.min(props.items.length, end + props.bufferSize),
  }
})

// 可见的项
const visibleItems = computed(() => {
  return props.items.slice(visibleRange.value.start, visibleRange.value.end).map((item, index) => ({
    item,
    index: visibleRange.value.start + index,
  }))
})

// 总高度
const totalHeight = computed(() => props.items.length * props.itemHeight)

// 偏移量
const offsetY = computed(() => visibleRange.value.start * props.itemHeight)

// 滚动处理
const handleScroll = (e: Event) => {
  scrollTop.value = (e.target as HTMLElement).scrollTop
  emit('scroll', e)
}

// 更新容器高度
const updateContainerHeight = () => {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight
  }
}

// 滚动到指定索引
const scrollToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
  if (containerRef.value) {
    containerRef.value.scrollTo({
      top: index * props.itemHeight,
      behavior,
    })
  }
}

// 滚动到顶部
const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
  scrollToIndex(0, behavior)
}

// 滚动到底部
const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
  scrollToIndex(props.items.length - 1, behavior)
}

// 暴露方法
defineExpose({
  scrollToIndex,
  scrollToTop,
  scrollToBottom,
})

onMounted(() => {
  updateContainerHeight()
  window.addEventListener('resize', updateContainerHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateContainerHeight)
})

// 监听items变化，重置滚动
watch(
  () => props.items.length,
  () => {
    if (scrollTop.value > totalHeight.value) {
      scrollTop.value = 0
      if (containerRef.value) {
        containerRef.value.scrollTop = 0
      }
    }
  },
)
</script>

<template>
  <div
    ref="containerRef"
    class="virtual-scroll-container"
    :style="{ height }"
    @scroll="handleScroll"
  >
    <div class="virtual-scroll-spacer" :style="{ height: `${totalHeight}px` }">
      <div class="virtual-scroll-content" :style="{ transform: `translateY(${offsetY}px)` }">
        <div
          v-for="{ item, index } in visibleItems"
          :key="index"
          class="virtual-scroll-item"
          :style="{ height: `${itemHeight}px` }"
          :data-index="index"
        >
          <slot :item="item" :index="index" />
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="items.length === 0" class="virtual-scroll-empty">
      <slot name="empty">
        <p>暂无数据</p>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.virtual-scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.virtual-scroll-spacer {
  position: relative;
}

.virtual-scroll-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  will-change: transform;
}

.virtual-scroll-item {
  overflow: hidden;
}

.virtual-scroll-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-size: 1rem;
}

/* 滚动条样式 */
.virtual-scroll-container::-webkit-scrollbar {
  width: 8px;
}

.virtual-scroll-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.virtual-scroll-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.virtual-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
