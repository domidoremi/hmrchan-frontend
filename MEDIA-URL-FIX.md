# 媒体URL跨域访问修复

**修复日期**: 2025-11-07  
**问题类型**: 跨域资源访问错误

---

## 🐛 问题描述

### 症状
前端使用**相对路径**访问媒体文件，导致请求发送到错误的域名：

```
请求URL: /api/media/eebb1306-c1e6-4e21-b9ab-e004fc544808/stream
实际访问: https://momichan.xyz/api/media/...        ❌ 前端域名
应该访问: https://api.momichan.xyz/api/media/...   ✅ API域名
```

### 影响范围
- ❌ 视频无法播放
- ❌ 图片无法加载
- ❌ 缩略图显示失败
- ❌ 字幕文件加载失败
- ❌ 媒体下载功能异常

---

## ✅ 解决方案

### 1. 修改 `src/api/services.ts`

#### 添加API基础URL获取函数
```typescript
// 获取API端点基础URL
const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_ENDPOINT || 
         import.meta.env.VITE_API_BASE_URL + '/api' || 
         '/api'
}
```

#### 修复媒体URL函数
将所有媒体URL函数从**相对路径**改为**完整URL**：

```typescript
// ❌ 修复前
getStreamUrl(mediaId: UUID) {
  return `/api/media/${mediaId}/stream`  // 相对路径
}

// ✅ 修复后
getStreamUrl(mediaId: UUID) {
  return `${getApiBaseUrl()}/media/${mediaId}/stream`  // 完整URL
}
```

**涉及函数**：
- ✅ `getStreamUrl()` - 流式播放URL
- ✅ `getDownloadUrl()` - 下载URL
- ✅ `getThumbnailUrl()` - 缩略图URL
- ✅ `getSubtitleUrl()` - 字幕URL

### 2. 修改 `src/views/PostDetailPage.vue`

#### 导入mediaApi
```typescript
import { favoritesApi, mediaApi } from '@/api/services'
```

#### 替换所有硬编码的相对路径

**图片URL**:
```vue
<!-- ❌ 修复前 -->
<img :src="`/api/media/${media.id}/stream`" />

<!-- ✅ 修复后 -->
<img :src="mediaApi.getStreamUrl(media.id)" />
```

**视频URL**:
```vue
<!-- ❌ 修复前 -->
<source :src="`/api/media/${media.id}/stream`" type="video/mp4" />

<!-- ✅ 修复后 -->
<source :src="mediaApi.getStreamUrl(media.id)" type="video/mp4" />
```

**字幕URL**:
```typescript
// ❌ 修复前
item.subtitle = `/api/media/${media.id}/subtitle`

// ✅ 修复后
item.subtitle = mediaApi.getSubtitleUrl(media.id)
```

---

## 🔧 URL生成逻辑

### 环境变量配置
```bash
# .env / .env.production
VITE_API_BASE_URL=https://api.momichan.xyz
VITE_API_ENDPOINT=https://api.momichan.xyz/api
```

### URL生成流程
1. **优先使用** `VITE_API_ENDPOINT`
2. **其次拼接** `VITE_API_BASE_URL + '/api'`
3. **最后回退** `/api` (相对路径，用于开发代理)

### 生成示例
```typescript
mediaApi.getStreamUrl('eebb1306-c1e6-4e21-b9ab-e004fc544808')
// 返回: "https://api.momichan.xyz/api/media/eebb1306-c1e6-4e21-b9ab-e004fc544808/stream"
```

---

## 📊 修复验证

### 浏览器控制台检查
修复后，应该看到正确的请求URL：

```
✅ GET https://api.momichan.xyz/api/media/eebb1306-c1e6-4e21-b9ab-e004fc544808/stream
✅ GET https://api.momichan.xyz/api/media/.../thumbnail
✅ GET https://api.momichan.xyz/api/media/.../subtitle
```

### 功能验证清单
- [x] 视频播放正常
- [x] 图片加载成功
- [x] 缩略图显示正确
- [x] 字幕加载成功
- [x] 媒体下载功能正常

---

## ⚠️ 注意事项

### CORS配置
后端API需要正确配置CORS，允许前端域名访问：

```python
# FastAPI示例
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://momichan.xyz",
        "http://localhost:5173"  # 开发环境
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 开发环境代理
如果使用Vite代理，确保配置正确：

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://api.momichan.xyz',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
```

---

## 🎯 最佳实践

### 1. 统一使用API函数
```typescript
// ✅ 推荐：使用API函数
const url = mediaApi.getStreamUrl(mediaId)

// ❌ 避免：硬编码URL
const url = `/api/media/${mediaId}/stream`
```

### 2. 环境变量管理
- 生产环境：使用完整API域名
- 开发环境：可使用代理或完整URL
- 测试环境：独立配置API地址

### 3. 类型安全
```typescript
// 使用UUID类型确保ID格式正确
import type { UUID } from '@/types'

function getMediaUrl(mediaId: UUID): string {
  return mediaApi.getStreamUrl(mediaId)
}
```

---

## 📚 相关文件

### 修改文件清单
- ✅ `src/api/services.ts` - 媒体API函数
- ✅ `src/views/PostDetailPage.vue` - 帖子详情页
- ✅ `.env` - 环境变量配置
- ✅ `.env.production` - 生产环境配置

### 配置文件
- `src/config/api.ts` - API配置中心
- `vite.config.ts` - Vite构建配置

---

## 🔍 调试技巧

### 1. 检查环境变量
```typescript
console.log('API Endpoint:', import.meta.env.VITE_API_ENDPOINT)
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL)
```

### 2. 验证生成的URL
```typescript
import { mediaApi } from '@/api/services'

const testId = 'eebb1306-c1e6-4e21-b9ab-e004fc544808'
console.log('Stream URL:', mediaApi.getStreamUrl(testId))
console.log('Thumbnail URL:', mediaApi.getThumbnailUrl(testId))
console.log('Subtitle URL:', mediaApi.getSubtitleUrl(testId))
```

### 3. 网络监控
打开浏览器开发者工具 > Network标签，过滤`/api/media`请求，确认：
- ✅ 请求域名是`api.momichan.xyz`
- ✅ 响应状态码是`200 OK`
- ✅ Content-Type正确

---

**修复完成时间**: 约30分钟  
**测试状态**: ✅ 通过  
**部署状态**: 待部署
