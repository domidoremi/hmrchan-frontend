# 📚 缓存系统实现指南

## 🎯 已完成的工作

### 核心模块

1. ✅ **Service Worker** (`public/sw.js`)
   - 三层缓存策略（静态资源、API、媒体）
   - 智能缓存管理（LRU淘汰）
   - 离线支持
   - 自动更新机制

2. ✅ **IndexedDB管理器** (`src/utils/indexedDB.ts`)
   - 类型安全的数据库操作
   - 5个ObjectStore（posts、authors、favorites、media_metadata、offline_queue）
   - 索引优化
   - 自动清理过期数据

3. ✅ **Service Worker管理器** (`src/utils/serviceWorkerManager.ts`)
   - 注册和更新SW
   - 与SW通信
   - 缓存管理接口

4. ✅ **离线队列管理器** (`src/utils/offlineQueue.ts`)
   - 离线操作队列
   - 自动同步
   - 指数退避重试
   - 乐观更新UI

5. ✅ **媒体优化工具** (`src/utils/mediaOptimizer.ts`)
   - 响应式图片
   - 懒加载
   - LQIP生成
   - WebP/AVIF检测

6. ✅ **主应用集成** (`src/main.ts`)
   - 自动初始化所有模块
   - 定期清理任务
   - 错误处理

---

## 🔧 使用指南

### 1. 在组件中使用IndexedDB

#### 保存帖子到本地缓存

```vue
<script setup lang="ts">
import { indexedDB, type Post } from '@/utils/indexedDB'
import { ref } from 'vue'

const posts = ref<Post[]>([])

// 从API获取帖子并缓存
async function loadPosts() {
  try {
    // 1. 先从IndexedDB读取缓存
    const cachedPosts = await indexedDB.getPosts({
      platform: 'twitter',
      limit: 20
    })
    
    if (cachedPosts.length > 0) {
      posts.value = cachedPosts
      console.log('显示缓存数据')
    }

    // 2. 从API获取最新数据
    const response = await fetch('/api/posts')
    const freshPosts = await response.json()

    // 3. 更新缓存
    await indexedDB.savePosts(freshPosts)
    
    // 4. 更新UI
    posts.value = freshPosts
    console.log('显示最新数据')
  } catch (error) {
    console.error('加载失败:', error)
  }
}
</script>
```

#### 收藏功能（带离线支持）

```vue
<script setup lang="ts">
import { indexedDB } from '@/utils/indexedDB'
import { offlineQueue } from '@/utils/offlineQueue'

const userId = 'current_user'

async function toggleFavorite(postId: string) {
  const isFav = await indexedDB.isFavorite(userId, postId)

  if (isFav) {
    // 取消收藏
    await indexedDB.removeFavorite(userId, postId)
    
    // 添加到离线队列（网络恢复后同步）
    await offlineQueue.addAction('unfavorite', { post_id: postId })
  } else {
    // 添加收藏
    await indexedDB.addFavorite({
      post_id: postId,
      user_id: userId,
      created_at: Date.now()
    })
    
    // 添加到离线队列
    await offlineQueue.addAction('favorite', { post_id: postId })
  }

  // UI立即更新（乐观更新）
  console.log('收藏状态已更新')
}

// 获取用户的所有收藏
async function loadFavorites() {
  const favorites = await indexedDB.getFavorites(userId)
  return favorites
}
</script>
```

### 2. 使用媒体优化

#### 响应式图片组件

```vue
<template>
  <div class="image-container">
    <!-- 占位符（LQIP或颜色） -->
    <div 
      v-if="!loaded"
      class="placeholder"
      :style="{ backgroundColor: dominantColor }"
    >
      <img 
        v-if="lqip"
        :src="lqip" 
        class="lqip"
        alt=""
      />
    </div>

    <!-- 实际图片 -->
    <img
      ref="imgRef"
      :data-src="optimizedUrl"
      :data-srcset="srcSet"
      :sizes="sizes"
      :alt="alt"
      class="main-image"
      :class="{ loaded }"
      loading="lazy"
      decoding="async"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { mediaOptimizer } from '@/utils/mediaOptimizer'

interface Props {
  src: string
  alt: string
  sizes?: string
}

const props = withDefaults(defineProps<Props>(), {
  sizes: '(max-width: 768px) 100vw, 50vw'
})

const imgRef = ref<HTMLImageElement>()
const loaded = ref(false)
const lqip = ref('')
const dominantColor = ref('#f0f0f0')

// 生成响应式srcset
const optimizedUrl = mediaOptimizer.getOptimizedUrl(props.src, {
  maxWidth: 1200,
  quality: 85
})

const srcSet = mediaOptimizer.generateSrcSet(props.src, [480, 768, 1024, 1200])

onMounted(async () => {
  // 1. 提取主色调（用于占位符）
  dominantColor.value = await mediaOptimizer.extractDominantColor(props.src)

  // 2. 生成LQIP
  lqip.value = await mediaOptimizer.generateLQIP(props.src)

  // 3. 懒加载实际图片
  if (imgRef.value) {
    cleanup = mediaOptimizer.lazyLoad(imgRef.value, {
      rootMargin: '200px',
      onLoad: () => {
        loaded.value = true
      }
    })
  }
})

let cleanup: (() => void) | undefined

onUnmounted(() => {
  if (cleanup) cleanup()
})
</script>

<style scoped>
.image-container {
  position: relative;
  overflow: hidden;
}

.placeholder {
  position: absolute;
  inset: 0;
  transition: opacity 0.3s;
}

.lqip {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(20px);
  transform: scale(1.1);
}

.main-image {
  width: 100%;
  height: auto;
  opacity: 0;
  transition: opacity 0.3s;
}

.main-image.loaded {
  opacity: 1;
}
</style>
```

### 3. 离线状态显示

#### 网络状态组件

```vue
<template>
  <Transition name="slide-down">
    <div v-if="!isOnline" class="offline-banner">
      <AlertCircle :size="20" />
      <span>你处于离线状态</span>
      <span v-if="pendingActions > 0" class="badge">
        {{ pendingActions }} 个操作待同步
      </span>
      <button 
        v-if="isOnline && pendingActions > 0" 
        @click="syncNow"
        class="sync-button"
      >
        立即同步
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { AlertCircle } from 'lucide-vue-next'
import { offlineQueue } from '@/utils/offlineQueue'

const isOnline = ref(navigator.onLine)
const pendingActions = ref(0)

function updateOnlineStatus() {
  isOnline.value = navigator.onLine
}

async function updateQueueStatus() {
  const status = await offlineQueue.getQueueStatus()
  pendingActions.value = status.pending + status.syncing
}

async function syncNow() {
  try {
    await offlineQueue.manualSync()
    await updateQueueStatus()
  } catch (error) {
    console.error('同步失败:', error)
  }
}

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  
  // 定期更新队列状态
  updateQueueStatus()
  setInterval(updateQueueStatus, 5000)
})
</script>

<style scoped>
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: #ff6b6b;
  color: white;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.sync-button {
  margin-left: auto;
  padding: 6px 16px;
  background: white;
  color: #ff6b6b;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
}
</style>
```

### 4. Service Worker更新提示

```vue
<template>
  <Transition name="fade">
    <div v-if="updateAvailable" class="update-banner">
      <RefreshCw :size="20" />
      <span>有新版本可用</span>
      <button @click="applyUpdate" class="update-button">
        立即更新
      </button>
      <button @click="dismissUpdate" class="dismiss-button">
        稍后
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { swManager } from '@/utils/serviceWorkerManager'

const updateAvailable = ref(false)

function handleUpdate() {
  updateAvailable.value = true
}

async function applyUpdate() {
  await swManager.applyUpdate()
  // SW会触发页面刷新
}

function dismissUpdate() {
  updateAvailable.value = false
}

onMounted(() => {
  window.addEventListener('sw-update-available', handleUpdate)
})
</script>

<style scoped>
.update-banner {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: var(--color-primary);
  color: white;
  padding: 16px 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 9998;
}

.update-button {
  padding: 8px 16px;
  background: white;
  color: var(--color-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.dismiss-button {
  padding: 8px 16px;
  background: transparent;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  cursor: pointer;
}
</style>
```

### 5. 缓存管理页面

```vue
<template>
  <div class="cache-management">
    <h2>缓存管理</h2>

    <!-- 存储使用情况 -->
    <div class="storage-stats">
      <div class="stat-card">
        <h3>IndexedDB</h3>
        <p class="size">{{ idbStats.totalMB }} MB</p>
        <p class="count">{{ idbStats.posts }} 个帖子</p>
      </div>

      <div class="stat-card">
        <h3>Service Worker缓存</h3>
        <p class="size">{{ swCacheSize }} MB</p>
      </div>

      <div class="stat-card">
        <h3>LocalStorage</h3>
        <p class="size">{{ lsStats.usedMB }} MB</p>
        <p class="count">{{ lsStats.keys }} 个键</p>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button @click="clearOldData" class="btn-secondary">
        清理过期数据
      </button>
      <button @click="clearAllCache" class="btn-danger">
        清空所有缓存
      </button>
    </div>

    <!-- 离线队列 -->
    <div class="offline-queue">
      <h3>离线操作队列</h3>
      <p>待同步: {{ queueStatus.pending }} 个</p>
      <p>失败: {{ queueStatus.failed }} 个</p>
      <button 
        @click="syncQueue" 
        :disabled="queueStatus.pending === 0"
        class="btn-primary"
      >
        立即同步
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { indexedDB } from '@/utils/indexedDB'
import { swManager } from '@/utils/serviceWorkerManager'
import { storage } from '@/utils/storageManager'
import { offlineQueue } from '@/utils/offlineQueue'

const idbStats = ref({ totalMB: '0', posts: 0, total: 0 })
const swCacheSize = ref('0')
const lsStats = ref({ usedMB: '0', keys: 0 })
const queueStatus = ref({ pending: 0, syncing: 0, failed: 0 })

async function loadStats() {
  // IndexedDB统计
  idbStats.value = await indexedDB.getStorageSize()

  // SW缓存大小
  const size = await swManager.getCacheSize()
  swCacheSize.value = (size / 1024 / 1024).toFixed(2)

  // LocalStorage统计
  lsStats.value = storage.getUsage()

  // 队列状态
  queueStatus.value = await offlineQueue.getQueueStatus()
}

async function clearOldData() {
  const count = await indexedDB.clearOldPosts(7)
  await swManager.clearOldMedia()
  alert(`已清理 ${count} 个过期帖子`)
  loadStats()
}

async function clearAllCache() {
  if (!confirm('确定要清空所有缓存吗？这将删除所有离线数据。')) {
    return
  }

  await indexedDB.clearAll()
  await swManager.clearCache()
  storage.clear()

  alert('所有缓存已清空')
  loadStats()
}

async function syncQueue() {
  try {
    await offlineQueue.manualSync()
    alert('同步完成')
    loadStats()
  } catch (error) {
    alert('同步失败: ' + error)
  }
}

onMounted(() => {
  loadStats()
})
</script>
```

---

## 🎨 UI组件集成建议

### PostCard组件优化

```vue
<template>
  <div class="post-card" @click="viewPost">
    <!-- 优化后的图片 -->
    <OptimizedImage
      v-if="post.media_urls[0]"
      :src="post.media_urls[0]"
      :alt="post.content"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    />

    <div class="content">
      <p>{{ post.content }}</p>
      
      <!-- 收藏按钮（支持离线） -->
      <button 
        @click.stop="toggleFavorite"
        :class="{ active: isFavorite }"
      >
        <Heart :fill="isFavorite ? 'currentColor' : 'none'" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Heart } from 'lucide-vue-next'
import { indexedDB } from '@/utils/indexedDB'
import { offlineQueue } from '@/utils/offlineQueue'
import OptimizedImage from './OptimizedImage.vue'

const props = defineProps<{
  post: Post
}>()

const isFavorite = ref(false)

// 检查收藏状态
indexedDB.isFavorite('current_user', props.post.id).then(result => {
  isFavorite.value = result
})

async function toggleFavorite() {
  // 乐观更新UI
  isFavorite.value = !isFavorite.value

  try {
    if (isFavorite.value) {
      await indexedDB.addFavorite({
        post_id: props.post.id,
        user_id: 'current_user',
        created_at: Date.now()
      })
      await offlineQueue.addAction('favorite', { post_id: props.post.id })
    } else {
      await indexedDB.removeFavorite('current_user', props.post.id)
      await offlineQueue.addAction('unfavorite', { post_id: props.post.id })
    }
  } catch (error) {
    // 如果失败，回滚UI
    isFavorite.value = !isFavorite.value
    console.error('收藏操作失败:', error)
  }
}
</script>
```

---

## ⚡ 性能优化清单

### 立即优化（高优先级）

- [x] Service Worker 注册
- [x] IndexedDB 数据缓存
- [x] 离线队列实现
- [x] 媒体懒加载

### 短期优化（1-2周）

- [ ] 实现所有组件的IndexedDB集成
- [ ] 添加骨架屏组件
- [ ] 优化图片格式（WebP/AVIF）
- [ ] 实现预加载策略
- [ ] 添加缓存管理UI

### 中期优化（1个月）

- [ ] 智能预加载（基于用户行为）
- [ ] 压缩IndexedDB数据
- [ ] 实现Background Sync API
- [ ] 添加性能监控
- [ ] A/B测试缓存策略

---

## 🐛 调试工具

### Chrome DevTools

```javascript
// 在Console中调试缓存

// 1. 查看IndexedDB
indexedDB.getStorageSize().then(console.log)
indexedDB.getPosts({ limit: 10 }).then(console.log)

// 2. 查看Service Worker缓存
caches.keys().then(console.log)
caches.open('hmrchan-media-v1').then(cache => 
  cache.keys().then(console.log)
)

// 3. 查看离线队列
offlineQueue.getQueueStatus().then(console.log)
```

### 性能测试

```bash
# Lighthouse CLI
npx lighthouse https://your-app.com --view

# 检查缓存命中率
# 在Network面板中过滤 "from ServiceWorker"
```

---

## 📊 性能指标目标

### Core Web Vitals
- **LCP**: < 2.5s ✅
- **FID**: < 100ms ✅  
- **CLS**: < 0.1 ✅

### 自定义指标
- **缓存命中率**: > 80% 
- **首屏时间**: < 2s
- **离线可用率**: > 95%

---

**下一步**: 开始在各个页面组件中集成这些优化功能！
