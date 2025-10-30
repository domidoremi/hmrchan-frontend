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

    // 等待CSS样式完全应用
    await new Promise(resolve => requestAnimationFrame(resolve))
    await new Promise(resolve => requestAnimationFrame(resolve))
    await nextTick()

    // 初始化Masonry前验证
    const firstCard = containerRef.value.querySelector(options.itemSelector) as HTMLElement
    if (!firstCard) {
      console.error('[Masonry] No first card found!')
      return
    }

    const containerWidth = containerRef.value.offsetWidth
    const cardWidth = firstCard.offsetWidth
    const computedWidth = window.getComputedStyle(firstCard).width
    
    console.log('[Masonry] ===== Pre-init Check =====')
    console.log('[Masonry] Container width:', containerWidth + 'px')
    console.log('[Masonry] First card CSS width:', computedWidth)
    console.log('[Masonry] First card offsetWidth:', cardWidth + 'px')
    console.log('[Masonry] Card/Container ratio:', (cardWidth / containerWidth * 100).toFixed(1) + '%')
    
    // 如果卡片宽度接近容器宽度（>90%），说明CSS还没应用，等待更久
    if (cardWidth / containerWidth > 0.9) {
      console.warn('[Masonry] ⚠️ Card too wide, waiting for CSS...')
      await new Promise(resolve => setTimeout(resolve, 100))
      const newCardWidth = firstCard.offsetWidth
      console.log('[Masonry] After wait, card width:', newCardWidth + 'px')
    }

    // 计算理论列数
    const finalCardWidth = firstCard.offsetWidth
    const gutter = actualGutter || 0
    const theoreticalCols = Math.floor((containerWidth + gutter) / (finalCardWidth + gutter))
    console.log('[Masonry] Theoretical columns:', theoreticalCols)
    
    if (theoreticalCols < 2) {
      console.error('[Masonry] ❌ Only 1 column detected! This is likely wrong.')
      console.error('[Masonry] Container:', containerWidth, 'Card:', finalCardWidth, 'Gutter:', gutter)
    }

    // 初始化Masonry
    try {
      const masonryOptions = {
        ...options,
        gutter: actualGutter,
        // 如果没有指定columnWidth，使用第一个卡片
        columnWidth: options.columnWidth || options.itemSelector
      }
      
      masonryInstance = new Masonry(containerRef.value, masonryOptions)
      console.log('[Masonry] ✅ Initialized successfully')
      console.log('[Masonry] Gutter:', actualGutter)
      console.log('[Masonry] Options:', masonryOptions)
      
      // 强制立即布局
      await nextTick()
      masonryInstance.layout?.()
      console.log('[Masonry] Initial layout done')
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
    
    if (masonryInstance && containerRef.value) {
      // 禁用过渡动画避免闪烁
      containerRef.value.style.transition = 'none'
      
      // 等待新卡片的图片加载
      const newImages = containerRef.value.querySelectorAll('img')
      const imagePromises = Array.from(newImages).map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) {
              resolve(true)
            } else {
              img.addEventListener('load', () => resolve(true), { once: true })
              img.addEventListener('error', () => resolve(true), { once: true })
              // 超时保护
              setTimeout(() => resolve(true), 2000)
            }
          })
      )
      
      await Promise.all(imagePromises)
      
      // 重新布局
      masonryInstance.reloadItems?.()
      masonryInstance.layout?.()
      
      // 恢复过渡动画
      await nextTick()
      containerRef.value.style.transition = ''
      
      console.log('[Masonry] Items reloaded and layout updated (smooth)')
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
