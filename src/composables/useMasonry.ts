import { onMounted, onUnmounted, nextTick, type Ref } from 'vue'
import Masonry from 'masonry-layout'

// 开发环境调试日志
const debug = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log('[Masonry]', ...args)
  }
}

const debugWarn = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.warn('[Masonry]', ...args)
  }
}

const debugError = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.error('[Masonry]', ...args)
  }
}

interface MasonryOptions {
  itemSelector: string
  columnWidth?: number | string
  gutter?: number | (() => number) // 支持函数动态获取gutter
  percentPosition?: boolean
  horizontalOrder?: boolean
  fitWidth?: boolean
}

export function useMasonry(
  containerRef: Ref<HTMLElement | null>,
  options: MasonryOptions = {
    itemSelector: '.post-card',
    gutter: 16,
    percentPosition: true,
    horizontalOrder: false,
    fitWidth: false,
  },
) {
  let masonryInstance: Masonry | null = null
  let isInitializing = false // 初始化状态锁

  const initMasonry = async () => {
    if (isInitializing) {
      debug('Already initializing, skipping...')
      return
    }

    isInitializing = true

    await nextTick()

    // 如果已经初始化，先销毁
    if (masonryInstance) {
      debug('Already initialized, destroying first...')
      destroy()
      await nextTick()
    }

    if (!containerRef.value) {
      debugWarn('Container ref is null')
      isInitializing = false
      return
    }

    // 检查是否有卡片
    const cards = containerRef.value.querySelectorAll(options.itemSelector)
    if (cards.length === 0) {
      debugWarn(`No cards found with selector: ${options.itemSelector}`)
      isInitializing = false
      return
    }

    debug(`Found ${cards.length} cards`)

    // 等待图片加载（带超时保护）
    const images = containerRef.value.querySelectorAll('img')
    debug(`Waiting for ${images.length} images to load...`)

    const imagePromises = Array.from(images).map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) {
            resolve(true)
          } else {
            // 添加超时保护，避免loading="lazy"的图片一直不加载
            const timeout = setTimeout(() => {
              debug('Image load timeout, continuing anyway...')
              resolve(true)
            }, 2000)

            img.addEventListener(
              'load',
              () => {
                clearTimeout(timeout)
                resolve(true)
              },
              { once: true },
            )
            img.addEventListener(
              'error',
              () => {
                clearTimeout(timeout)
                resolve(true)
              },
              { once: true },
            )
          }
        }),
    )

    await Promise.all(imagePromises)
    debug('All images loaded or timed out')

    // 计算实际的gutter值（支持函数）
    const actualGutter = typeof options.gutter === 'function' ? options.gutter() : options.gutter

    // 等待CSS样式完全应用
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await nextTick()

    // 初始化Masonry前验证
    const firstCard = containerRef.value.querySelector(options.itemSelector) as HTMLElement
    if (!firstCard) {
      debugError('No first card found!')
      isInitializing = false
      return
    }

    const containerWidth = containerRef.value.offsetWidth
    const cardWidth = firstCard.offsetWidth
    const computedWidth = window.getComputedStyle(firstCard).width

    debug('===== Pre-init Check =====')
    debug('Container width:', containerWidth + 'px')
    debug('First card CSS width:', computedWidth)
    debug('First card offsetWidth:', cardWidth + 'px')
    debug('Card/Container ratio:', ((cardWidth / containerWidth) * 100).toFixed(1) + '%')
    debug('Window width:', window.innerWidth + 'px')
    debug('Current gutter:', actualGutter + 'px')

    // 如果卡片宽度接近容器宽度（>90%），说明CSS还没应用，等待更久
    if (cardWidth / containerWidth > 0.9) {
      debugWarn('⚠️ Card too wide, waiting for CSS...')
      await new Promise((resolve) => setTimeout(resolve, 300)) // 增加到300ms
      const newCardWidth = firstCard.offsetWidth
      debug('After wait, card width:', newCardWidth + 'px')

      // 再次检查，如果还是太宽，放弃初始化
      if (newCardWidth / containerWidth > 0.9) {
        debugWarn('⚠️ CSS still not applied after wait, aborting initialization')
        debugWarn('Container:', containerWidth, 'Card:', newCardWidth)
        isInitializing = false
        return
      }
    }

    // 计算理论列数
    const finalCardWidth = firstCard.offsetWidth
    const gutter = actualGutter || 0
    const theoreticalCols = Math.floor((containerWidth + gutter) / (finalCardWidth + gutter))
    debug('===== Column Calculation =====')
    debug('Final card width:', finalCardWidth + 'px')
    debug('Gutter:', gutter + 'px')
    debug(
      'Formula: floor((' +
        containerWidth +
        ' + ' +
        gutter +
        ') / (' +
        finalCardWidth +
        ' + ' +
        gutter +
        '))',
    )
    debug('Theoretical columns:', theoreticalCols)

    // 宽容度检测：如果是桌面端但只检测到单列，可能是CSS问题
    if (theoreticalCols < 2) {
      debugWarn('⚠️ Only ' + theoreticalCols + ' column detected!')
      debugWarn('This might be a CSS issue or the window is very narrow')
      debugWarn(
        'Container: ' +
          containerWidth +
          'px, Card: ' +
          finalCardWidth +
          'px, Gutter: ' +
          gutter +
          'px',
      )

      // 如果窗口宽度大于900px但只有单列，强制初始化（可能是CSS计算问题）
      if (window.innerWidth > 900) {
        debugWarn('🛠️ Window is wide enough, forcing initialization anyway...')
      } else {
        debugWarn('⚠️ Window too narrow for multi-column layout, skipping Masonry')
        isInitializing = false
        return
      }
    }

    // 初始化Masonry
    try {
      const masonryOptions = {
        ...options,
        gutter: actualGutter,
        // 如果没有指定columnWidth，使用第一个卡片
        columnWidth: options.columnWidth || options.itemSelector,
      }

      masonryInstance = new Masonry(containerRef.value, masonryOptions)
      debug('✅ Initialized successfully')
      debug('Gutter:', actualGutter)
      debug('Options:', masonryOptions)

      // 强制立即布局
      await nextTick()
      masonryInstance.layout?.()
      debug('Initial layout done')
    } catch (error) {
      debugWarn('⚠️ Failed to initialize Masonry:', error)
    } finally {
      isInitializing = false
    }
  }

  const layout = () => {
    if (masonryInstance) {
      masonryInstance.layout?.()
      debug('Layout updated')
    }
  }

  const reloadItems = async () => {
    await nextTick()

    if (masonryInstance && containerRef.value) {
      // 禁用容器和所有卡片的过渡动画，防止卡片“乱飞”
      const cards = containerRef.value.querySelectorAll(options.itemSelector)
      containerRef.value.style.transition = 'none'
      cards.forEach((card: any) => {
        if (card.style) {
          card.style.transition = 'none'
        }
      })

      // 等待新卡片的图片加载
      const newImages = containerRef.value.querySelectorAll('img')
      const imagePromises = Array.from(newImages).map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) {
              resolve(true)
            } else {
              // 超时保护减少到500ms，加快速度
              const timeout = setTimeout(() => resolve(true), 500)

              img.addEventListener(
                'load',
                () => {
                  clearTimeout(timeout)
                  resolve(true)
                },
                { once: true },
              )
              img.addEventListener(
                'error',
                () => {
                  clearTimeout(timeout)
                  resolve(true)
                },
                { once: true },
              )
            }
          }),
      )

      await Promise.all(imagePromises)

      // 重新布局
      masonryInstance.reloadItems?.()
      masonryInstance.layout?.()

      // 等待布局完成后恢复过渡动画
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 50)) // 稍微延迟

      containerRef.value.style.transition = ''
      cards.forEach((card: any) => {
        if (card.style) {
          card.style.transition = ''
        }
      })

      debug('Items reloaded and layout updated (no animation)')
    }
  }

  const destroy = () => {
    if (masonryInstance) {
      masonryInstance.destroy?.()
      masonryInstance = null
      debug('Destroyed')
    }
  }

  onMounted(() => {
    // 延迟初始化，确保DOM完全渲染和图片开始加载
    debug('Scheduling initialization in 500ms...')
    setTimeout(initMasonry, 500)
  })

  onUnmounted(() => {
    destroy()
  })

  return {
    initMasonry,
    layout,
    reloadItems,
    destroy,
  }
}
