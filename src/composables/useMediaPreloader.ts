/**
 * 媒体预加载Composable
 * 实现智能预加载策略，预加载下一个/上一个媒体以提升用户体验
 */
import { ref, computed, watch, onUnmounted } from 'vue'
import { hybridCache } from '@/utils/hybridCache'

interface MediaItem {
  url: string
  type: 'image' | 'video'
}

interface PreloadOptions {
  /**
   * 预加载策略
   * - 'next': 只预加载下一个
   * - 'adjacent': 预加载上一个和下一个
   * - 'smart': 基于用户行为智能预加载
   */
  strategy?: 'next' | 'adjacent' | 'smart'
  
  /**
   * 预加载优先级
   * - 'high': 高优先级，立即加载
   * - 'low': 低优先级，空闲时加载
   */
  priority?: 'high' | 'low'
  
  /**
   * 最大预加载数量
   */
  maxPreload?: number
  
  /**
   * 是否启用
   */
  enabled?: boolean
}

export function useMediaPreloader(
  mediaItems: MediaItem[],
  currentIndex: number,
  options: PreloadOptions = {}
) {
  const {
    strategy = 'adjacent',
    priority = 'low',
    maxPreload = 2,
    enabled = true,
  } = options

  const preloadStatus = ref<Map<number, 'pending' | 'loading' | 'loaded' | 'error'>>(new Map())
  const preloadQueue = ref<number[]>([])
  const userBehavior = ref({
    direction: 'forward' as 'forward' | 'backward',
    speed: 0, // 切换速度 (ms)
    lastSwitchTime: Date.now(),
  })

  /**
   * 确定预加载目标
   */
  const getPreloadTargets = (): number[] => {
    const targets: number[] = []
    const maxIndex = mediaItems.length - 1

    if (strategy === 'next') {
      // 只预加载下一个
      if (currentIndex < maxIndex) {
        targets.push(currentIndex + 1)
      }
    } else if (strategy === 'adjacent') {
      // 预加载相邻项
      if (currentIndex > 0) {
        targets.push(currentIndex - 1)
      }
      if (currentIndex < maxIndex) {
        targets.push(currentIndex + 1)
      }
    } else if (strategy === 'smart') {
      // 基于用户行为智能预加载
      const direction = userBehavior.value.direction
      const speed = userBehavior.value.speed

      if (direction === 'forward') {
        // 向前浏览，预加载后续项
        for (let i = 1; i <= maxPreload && currentIndex + i <= maxIndex; i++) {
          targets.push(currentIndex + i)
        }
        // 如果浏览速度慢，也预加载前一个
        if (speed > 1000 && currentIndex > 0) {
          targets.push(currentIndex - 1)
        }
      } else {
        // 向后浏览，预加载前面的项
        for (let i = 1; i <= maxPreload && currentIndex - i >= 0; i++) {
          targets.push(currentIndex - i)
        }
        // 如果浏览速度慢，也预加载后一个
        if (speed > 1000 && currentIndex < maxIndex) {
          targets.push(currentIndex + 1)
        }
      }
    }

    return targets.slice(0, maxPreload)
  }

  /**
   * 预加载媒体
   */
  const preloadMedia = async (index: number) => {
    if (!enabled || index < 0 || index >= mediaItems.length) return
    if (preloadStatus.value.get(index) === 'loading' || preloadStatus.value.get(index) === 'loaded') {
      return
    }

    const media = mediaItems[index]
    if (!media) return

    preloadStatus.value.set(index, 'loading')
    console.log(`[Preloader] 开始预加载媒体 ${index}: ${media.url}`)

    try {
      // 直接预加载到hybridCache（它会处理缓存检查）
      if (media.type === 'image') {
        await preloadImage(media.url, index)
      } else if (media.type === 'video') {
        await preloadVideo(media.url, index)
      }
      
      preloadStatus.value.set(index, 'loaded')
      console.log(`[Preloader] 媒体 ${index} 预加载完成`)
    } catch (error) {
      console.error(`[Preloader] 媒体 ${index} 预加载失败:`, error)
      preloadStatus.value.set(index, 'error')
    }
  }

  /**
   * 预加载图片
   */
  const preloadImage = async (url: string, index: number): Promise<void> => {
    try {
      // 使用hybridCache的preload方法
      await hybridCache.preload([url])
      console.log(`[Preloader] 图片 ${index} 预加载完成`)
    } catch (error) {
      console.warn(`[Preloader] 图片 ${index} 预加载失败:`, error)
      throw error
    }
  }

  /**
   * 预加载视频（预加载元数据）
   */
  const preloadVideo = (url: string, index: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata' // 只预加载元数据，不预加载整个视频
      
      const onLoadedMetadata = () => {
        console.log(`[Preloader] 视频 ${index} 元数据已加载`)
        cleanup()
        resolve()
      }
      
      const onError = () => {
        cleanup()
        reject(new Error(`Failed to preload video: ${url}`))
      }
      
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata)
        video.removeEventListener('error', onError)
        video.src = ''
        video.load()
      }
      
      video.addEventListener('loadedmetadata', onLoadedMetadata)
      video.addEventListener('error', onError)
      video.src = url
      video.load()
    })
  }

  /**
   * 使用requestIdleCallback进行低优先级预加载
   */
  const schedulePreload = (index: number) => {
    if (priority === 'high') {
      preloadMedia(index)
    } else {
      // 使用requestIdleCallback在浏览器空闲时预加载
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => preloadMedia(index), { timeout: 2000 })
      } else {
        // 降级到setTimeout
        setTimeout(() => preloadMedia(index), 100)
      }
    }
  }

  /**
   * 执行预加载队列
   */
  const executePreloadQueue = () => {
    if (!enabled) return

    const targets = getPreloadTargets()
    
    // 过滤掉已经加载或正在加载的
    const newTargets = targets.filter(
      index => !preloadStatus.value.has(index) || 
               preloadStatus.value.get(index) === 'error'
    )

    preloadQueue.value = newTargets
    
    // 依次预加载
    newTargets.forEach((index, i) => {
      // 添加延迟，避免同时预加载太多
      setTimeout(() => schedulePreload(index), i * 100)
    })
  }

  /**
   * 更新用户行为分析
   */
  const updateUserBehavior = (newIndex: number) => {
    const now = Date.now()
    const timeDiff = now - userBehavior.value.lastSwitchTime
    
    userBehavior.value = {
      direction: newIndex > currentIndex ? 'forward' : 'backward',
      speed: timeDiff,
      lastSwitchTime: now,
    }
  }

  /**
   * 监听当前索引变化
   */
  watch(() => currentIndex, (newIndex, oldIndex) => {
    if (newIndex !== oldIndex) {
      updateUserBehavior(newIndex)
      executePreloadQueue()
    }
  }, { immediate: true })

  /**
   * 清理预加载状态
   */
  const clearPreloadStatus = () => {
    preloadStatus.value.clear()
    preloadQueue.value = []
  }

  /**
   * 获取预加载进度
   */
  const preloadProgress = computed(() => {
    const total = preloadQueue.value.length
    if (total === 0) return 100
    
    const loaded = preloadQueue.value.filter(
      index => preloadStatus.value.get(index) === 'loaded'
    ).length
    
    return Math.round((loaded / total) * 100)
  })

  /**
   * 获取某个媒体的预加载状态
   */
  const getPreloadStatus = (index: number) => {
    return preloadStatus.value.get(index) || 'pending'
  }

  // 组件卸载时清理
  onUnmounted(() => {
    clearPreloadStatus()
  })

  return {
    preloadStatus: computed(() => preloadStatus.value),
    preloadQueue: computed(() => preloadQueue.value),
    preloadProgress,
    getPreloadStatus,
    clearPreloadStatus,
    executePreloadQueue,
  }
}
