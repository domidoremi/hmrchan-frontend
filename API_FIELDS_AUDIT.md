# API字段审计报告

## 🔍 后端实际返回 vs 前端期望

### 1. **thumbnail_url 路径问题**

**后端返回**：

```json
{
  "thumbnail_url": "/api/media/d743bcf9-84f3-4b74-a8c6-3192c02cea6e/stream"
}
```

**前端处理**：

```typescript
// src/utils/format/url.ts
export function resolveMediaUrl(url: string): string {
  // 后端返回 "/api/media/xxx"
  // 前端重写为 "/api/v1/media/xxx"
  if (path.startsWith('/api/media/')) {
    return `${apiBaseUrl}/api/v1${path.substring('/api'.length)}`
  }
}
```

**问题**：

- ❌ 后端使用 `/api/media/` (无版本号)
- ❌ 前端重写为 `/api/v1/media/`
- ⚠️ 如果后端没有 `/api/v1/media/` 路由，会404

**解决方案**：

```typescript
// 选项1: 移除路径重写，使用后端返回的路径
if (path.startsWith('/api/media/')) {
  return `${apiBaseUrl}${path}` // 不重写版本号
}

// 选项2: 后端统一使用 /api/v1/media/ 路径
```

---

### 2. **MediaFile字段审计**

**后端实际返回**（从curl结果）：

```json
{
  "id": "ed96f0f0-1494-4f9f-840b-cb5f49fb0378",
  "post_id": "5e3f577f-8897-4ef7-868b-03ad20cd0b8d",
  "file_path": "/hmrchan-data/downloads/...",
  "file_type": "video",
  "file_size": 1448385,
  "width": 720,
  "height": 1280,
  "duration": 11,
  "mime_type": null,
  "thumbnail_path": null,
  "is_downloaded": true,
  "download_url": null, // ← 返回null
  "subtitle_language": null,
  "subtitle_format": null,
  "has_subtitle": false,
  "subtitles": null,
  "created_at": "2025-11-17T18:21:00.285760"
}
```

**前端类型定义**（src/types/index.ts）：

```typescript
export interface MediaFile {
  id: UUID
  post_id: UUID
  file_path: string
  file_type: 'image' | 'video' | 'audio'
  file_size: number
  width: number | null
  height: number | null
  duration: number | null
  mime_type: string | null
  thumbnail_path: string | null
  is_downloaded: boolean
  download_url: string | null    // ✅ 定义正确
  subtitle_language?: string | null
  subtitle_format?: string | null
  has_subtitle?: boolean
  subtitles?: Array<{...}>
  created_at: string
}
```

**使用情况**：

```typescript
// 只有 PostPreviewPanel.vue 使用 download_url
function resolveMedia(media: MediaFile): string {
  if (media.download_url) return resolveMediaUrl(media.download_url)
  if (media.file_path) return resolveMediaUrl(media.file_path) // ← 回退到file_path
  return ''
}

// PhotoSwipeViewer 使用 mediaApi.getStreamUrl(media.id)
const mediaUrl = mediaApi.getStreamUrl(media.id)
// 生成：https://api.momichan.xyz/api/v1/media/{id}/stream
```

**状态**：

- ✅ **download_url为null是正常的**（前端有fallback）
- ✅ file_path用于服务器端存储路径
- ✅ 前端应使用 mediaApi.getStreamUrl(id) 而不是直接使用路径

---

### 3. **弃用字段检查**

**可能的弃用字段**：

- ❌ `download_url` - 后端返回null，前端不依赖
- ⚠️ `file_path` - 服务器路径，前端不应直接使用
- ⚠️ `thumbnail_path` - 后端返回null

**前端应该使用**：

```typescript
// ✅ 正确：使用API端点
mediaApi.getStreamUrl(mediaId) // 流式播放
mediaApi.getThumbnailUrl(mediaId) // 缩略图
mediaApi.getSubtitleUrl(mediaId) // 字幕
mediaApi.getDownloadUrl(mediaId) // 下载

// ❌ 错误：直接使用file_path
resolveMediaUrl(media.file_path)
```

---

### 4. **Service Worker缓存问题**

**问题**：

- SW可能缓存了旧的API响应
- IndexedDB v1缓存缺少media_files

**已修复**：

- ✅ IndexedDB升级到v2（自动清空旧缓存）
- ⏳ SW需要检查缓存策略

---

## 🔧 推荐修复方案

### 优先级1: 确认后端API路径

检查后端是否支持：

```bash
# 测试v1路径
curl https://api.momichan.xyz/api/v1/media/{media_id}/stream

# 测试无版本路径
curl https://api.momichan.xyz/api/media/{media_id}/stream
```

### 优先级2: 修复resolveMediaUrl

如果后端不支持 `/api/v1/media/`：

```typescript
// src/utils/format/url.ts
if (path.startsWith('/api/media/')) {
  return `${apiBaseUrl}${path}` // 移除版本号重写
}
```

### 优先级3: 统一使用mediaApi

全局替换直接使用路径的代码：

```typescript
// ❌ 之前
resolveMediaUrl(media.file_path)

// ✅ 现在
mediaApi.getStreamUrl(media.id)
```

---

## 📊 字段使用统计

| 字段             | 后端返回            | 前端使用        | 状态       |
| ---------------- | ------------------- | --------------- | ---------- |
| `id`             | ✅ UUID             | ✅ 正确使用     | 正常       |
| `file_path`      | ✅ 服务器路径       | ⚠️ 不应直接使用 | 需审计     |
| `file_type`      | ✅ "video"          | ✅ 正确使用     | 正常       |
| `download_url`   | null                | 有fallback      | 正常       |
| `thumbnail_path` | null                | 不常用          | 正常       |
| `thumbnail_url`  | ✅ `/api/media/...` | ⚠️ 路径重写     | **需修复** |
| `media_files`    | ✅ 数组             | ✅ 正确使用     | 正常       |

---

## ✅ 检查清单

- [ ] 确认后端 `/api/media/` vs `/api/v1/media/` 路径
- [ ] 修复 resolveMediaUrl 的路径重写逻辑
- [ ] 审计所有直接使用 file_path 的代码
- [ ] 确保所有媒体URL使用 mediaApi
- [ ] 测试缩略图和视频加载
- [ ] 检查SW缓存策略
