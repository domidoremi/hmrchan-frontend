/**
 * 计数器 Store（示例）
 * Counter Store (Example)
 *
 * 这是一个示例Store，展示了Pinia的基本用法
 * 在生产环境中可以删除此文件
 * v2.0 - 规范化：统一Store结构，添加注释说明
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import logger from '@/utils/logger'

export const useCounterStore = defineStore('counter', () => {
  // 设置日志上下文
  const logContext = { category: 'CounterStore' }

  // ==================== 状态 ====================
  const count = ref(0)

  // ==================== 计算属性 ====================
  const doubleCount = computed(() => count.value * 2)

  // ==================== Actions ====================

  /**
   * 增加计数
   */
  function increment() {
    count.value++
    logger.debug('Counter incremented', { ...logContext, count: count.value })
  }

  /**
   * 减少计数
   */
  function decrement() {
    count.value--
    logger.debug('Counter decremented', { ...logContext, count: count.value })
  }

  /**
   * 重置计数
   */
  function reset() {
    count.value = 0
    logger.debug('Counter reset', logContext)
  }

  return {
    // 状态
    count,

    // 计算属性
    doubleCount,

    // 方法
    increment,
    decrement,
    reset,
  }
})
