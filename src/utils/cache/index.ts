/**
 * 四层缓存架构入口
 *
 * 层级说明：
 * 1. HTTP Cache - 浏览器原生缓存，由响应头控制（Cache-Control/ETag）
 * 2. Service Worker + Cache API - 拦截请求，实现离线访问和资源缓存
 * 3. IndexedDB - 结构化数据持久存储（帖子列表/详情）
 * 4. Memory Cache - 运行时内存缓存（最快，但刷新丢失）
 */

export { registerServiceWorker, unregisterServiceWorker } from './swRegister'
export { postCache, type CachedPost, type CachedPostList } from './postCache'
export { memoryCache } from './memoryCache'
