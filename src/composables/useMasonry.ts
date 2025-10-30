import { onMounted, onUnmounted, nextTick, type Ref } from 'vue'
import Masonry from 'masonry-layout'

interface MasonryOptions {
  itemSelector: string
  columnWidth?: number | string
  gutter?: number | (() => number)  // 支持函数动态获取gutter
  percentPosition?: boolean
  horizontalOrder?: boolean
  fitWidth?: boolean
}

export function useMasonry(
  containerRef: Ref<HTMLElement | null>,
  options: MasonryOptions = {
    itemSelector: '.post-card',
    columnWidth: '.post-card',
    gutter: 16,
    percentPosition: true,
    horizontalOrder: false,
    fitWidth: false
  }
) {
  let masonryInstance: Masonry | null = null

  const initMasonry = async () => {
    await nextTick()

    if (!containerRef.value) {
      console.warn('[Masonry] Container ref is null')
      return
    }

    // 检查是否有卡片
    const cards = containerRef.value.querySelectorAll(options.itemSelector)
    if (cards.length === 0) {
      console.warn(`[Masonry] No cards found with selector: ${options.itemSelector}`)
      return
    }

    console.log(`[Masonry] Found ${cards.length} cards`)

    // 等待图片加载
    const images = containerRef.value.querySelectorAll('img')
    console.log(`[Masonry] Waiting for ${images.length} images to load...`)
    
    const imagePromises = Array.from(images).map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) {
            resolve(true)
          } else {
            img.addEventListener('load', () => resolve(true), { once: true })
            img.addEventListener('error', () => resolve(true), { once: true })
          }
        })
    )

    await Promise.all(imagePromises)
    console.log('[Masonry] All images loaded')

    // 计算实际的gutter值（支持函数）
    const actualGutter = typeof options.gutter === 'function' 
      ? options.gutter() 
      : options.gutter

    // 初始化Masonry
    try {
      const masonryOptions = {
        ...options,
        gutter: actualGutter
      }
      masonryInstance = new Masonry(containerRef.value, masonryOptions)
      console.log('[Masonry] ✅ Initialized successfully')
      console.log('[Masonry] Gutter:', actualGutter)
      console.log('[Masonry] Options:', masonryOptions)
    } catch (error) {
      console.error('[Masonry] ❌ Failed to initialize:', error)
    }
  }

  const layout = () => {
    if (masonryInstance) {
      masonryInstance.layout?.()
      console.log('[Masonry] Layout updated')
    }
  }

  const reloadItems = async () => {
    await nextTick()
    if (masonryInstance) {
      masonryInstance.reloadItems?.()
      masonryInstance.layout?.()
      console.log('[Masonry] Items reloaded and layout updated')
    }
  }

  const destroy = () => {
    if (masonryInstance) {
      masonryInstance.destroy?.()
      masonryInstance = null
      console.log('[Masonry] Destroyed')
    }
  }

  onMounted(() => {
    // 延迟初始化，确保DOM完全渲染和图片开始加载
    console.log('[Masonry] Scheduling initialization in 500ms...')
    setTimeout(initMasonry, 500)
  })

  onUnmounted(() => {
    destroy()
  })

  return {
    initMasonry,
    layout,
    reloadItems,
    destroy
  }
}
