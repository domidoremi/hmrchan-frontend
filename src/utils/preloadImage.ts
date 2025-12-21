/**
 * 首屏图片预加载工具
 *
 * 动态注入 <link rel="preload"> 提前加载首屏 LCP 图片
 * 减少 LCP 渲染延迟
 */

/**
 * 预加载首张可见图片，改善 LCP
 * @param imageUrl 图片 URL
 */
export function preloadFirstImage(imageUrl: string): void {
  if (!imageUrl || typeof document === 'undefined') return

  // 检查是否已预加载
  const existingPreload = document.querySelector(`link[rel="preload"][href="${imageUrl}"]`)
  if (existingPreload) return

  // 创建 preload link
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.href = imageUrl
  link.fetchPriority = 'high'

  // 注入 head
  document.head.appendChild(link)
}

/**
 * 预加载多张图片（用于首屏多列布局）
 * @param imageUrls 图片 URL 数组
 * @param limit 限制预加载数量（默认 3）
 */
export function preloadImages(imageUrls: string[], limit = 3): void {
  if (!imageUrls.length || typeof document === 'undefined') return

  imageUrls.slice(0, limit).forEach((url) => {
    preloadFirstImage(url)
  })
}
