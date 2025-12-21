/**
 * 批量预加载图片工具
 * 用于等待一批图片全部加载完成后再显示，避免渐进式加载导致的 CLS
 */

/**
 * 预加载单张图片
 */
function preloadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}

/**
 * 批量预加载图片，等待全部完成
 * @param urls - 图片 URL 列表（过滤掉 null/undefined）
 * @returns 是否全部成功加载
 */
export async function waitForImages(urls: (string | null | undefined)[]): Promise<boolean> {
  const validUrls = urls.filter((url): url is string => Boolean(url))
  if (validUrls.length === 0) return true

  const results = await Promise.all(validUrls.map(preloadImage))
  return results.every(success => success)
}
