/**
 * Media utilities - Unified export
 */

// Image Optimizer
export {
  supportsWebP,
  getOptimizedImageUrl,
  generateSrcSet,
  generateSizes,
  generatePlaceholder,
  preloadImage,
  preloadImages,
  smartPreloadImages,
  getImageDimensions,
  isInViewport,
} from './imageOptimizer'

// Media Optimizer
export { mediaOptimizer } from './mediaOptimizer'

// Preload
export { imagePreloader, videoPreloader, smartPreloader } from './preload'

// Platform-based Caching
export {
  buildMediaStreamUrl,
  buildMediaThumbnailUrl,
  getPlatformCacheDays,
  extractMediaIdFromUrl,
} from './platformCache'
