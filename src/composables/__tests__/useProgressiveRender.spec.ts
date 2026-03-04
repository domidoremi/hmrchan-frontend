import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { useProgressiveRender } from '../useProgressiveRender'

describe('useProgressiveRender', () => {
  it('应支持普通数组输入并按批次递增可见项', () => {
    const { visibleCount, visibleItems, hasMoreToRender, revealNextBatch } = useProgressiveRender(
      [1, 2, 3, 4, 5],
      {
        initialCount: 2,
        batchSize: 2,
      }
    )

    expect(visibleCount.value).toBe(2)
    expect(visibleItems.value).toEqual([1, 2])
    expect(hasMoreToRender.value).toBe(true)

    revealNextBatch()
    expect(visibleCount.value).toBe(4)
    expect(visibleItems.value).toEqual([1, 2, 3, 4])
    expect(hasMoreToRender.value).toBe(true)

    revealNextBatch()
    expect(visibleCount.value).toBe(5)
    expect(visibleItems.value).toEqual([1, 2, 3, 4, 5])
    expect(hasMoreToRender.value).toBe(false)
  })

  it('应支持 Ref<T[]> 输入并在 reset 时回到初始数量', async () => {
    const items = ref([1, 2, 3, 4])
    const { visibleCount, visibleItems, revealNextBatch, reset } = useProgressiveRender(items, {
      initialCount: 2,
      batchSize: 10,
    })

    expect(visibleCount.value).toBe(2)
    revealNextBatch()
    expect(visibleCount.value).toBe(4)

    reset()
    expect(visibleCount.value).toBe(2)
    expect(visibleItems.value).toEqual([1, 2])

    items.value = [1, 2, 3]
    await nextTick()
    expect(visibleCount.value).toBe(2)
    expect(visibleItems.value).toEqual([1, 2])
  })

  it('应支持 getter 输入并在数据长度变化时自动收敛 visibleCount', async () => {
    const source = ref([1, 2, 3, 4])
    const { visibleCount, visibleItems, hasMoreToRender } = useProgressiveRender(
      () => source.value,
      {
        initialCount: 3,
        batchSize: 2,
      }
    )

    expect(visibleCount.value).toBe(3)
    expect(visibleItems.value).toEqual([1, 2, 3])
    expect(hasMoreToRender.value).toBe(true)

    source.value = [1]
    await nextTick()
    expect(visibleCount.value).toBe(1)
    expect(visibleItems.value).toEqual([1])
    expect(hasMoreToRender.value).toBe(false)

    source.value = []
    await nextTick()
    expect(visibleCount.value).toBe(0)
    expect(visibleItems.value).toEqual([])

    source.value = [7, 8, 9, 10]
    await nextTick()
    expect(visibleCount.value).toBe(3)
    expect(visibleItems.value).toEqual([7, 8, 9])
    expect(hasMoreToRender.value).toBe(true)
  })
})
