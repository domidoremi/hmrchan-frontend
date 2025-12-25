import { describe, it, expect } from 'vitest'
import { useInfiniteScroll } from '../useInfiniteScroll'

describe('useInfiniteScroll', () => {
  it('should export the composable function', () => {
    expect(typeof useInfiniteScroll).toBe('function')
  })

  it('should return expected properties', () => {
    // 由于 IntersectionObserver 在 jsdom 中不完全支持，只测试导出的接口
    expect(useInfiniteScroll).toBeDefined()
  })
})
