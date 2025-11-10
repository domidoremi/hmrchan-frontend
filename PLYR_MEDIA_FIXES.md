# Plyr Player and Media API Fixes

## 问题分析 (Issue Analysis)

### 1. ERR_BLOCKED_BY_ORB - 视频无法播放
**根本原因**: 媒体API URL路径不正确，缺少 `/api/v1/` 前缀

**症状**:
- 视频加载失败，出现 `net::ERR_BLOCKED_BY_ORB` 错误
- 实际请求: `https://api.momichan.xyz/media/{id}/stream`
- 正确路径: `https://api.momichan.xyz/api/v1/media/{id}/stream`

**影响范围**:
- 所有视频播放
- 媒体下载
- 缩略图加载
- 字幕文件加载

### 2. Plyr控件重叠/挤压问题
**根本原因**: 响应式布局未充分优化，不同视口下控件尺寸固定

**症状**:
- 在移动设备上控件按钮相互重叠
- 音量滑块被挤压
- 时间显示文字截断
- 全屏按钮与其他按钮重叠

**影响设备**:
- 手机竖屏 (<480px)
- 手机横屏 (480px-768px)
- 平板 (768px-1024px)

### 3. 媒体重复加载问题
**根本原因**: Video元素使用 `:key="currentMedia.url"` 导致每次切换完全remount

**症状**:
- 每次切换媒体都发起新的网络请求
- 即使IndexedDB已缓存，仍然重新加载
- 浪费带宽和加载时间

## 实施的修复 (Implemented Fixes)

### 修复 1: API端点配置更新
**文件**: `frontend/.env.development`

```diff
- VITE_API_ENDPOINT=https://api.momichan.xyz/api
+ VITE_API_ENDPOINT=https://api.momichan.xyz/api/v1
```

**说明**: 更新API端点以匹配后端v1迁移

### 修复 2: 媒体API服务路径修正
**文件**: `frontend/src/api/services.ts`

**变更内容**:
- 导入 `getApiEndpoint` 函数
- 修复所有媒体URL生成方法以包含正确的API版本路径

```typescript
// 修复前
getStreamUrl(mediaId: UUID) {
  return `${getApiBaseUrl()}/media/${mediaId}/stream`
}

// 修复后
getStreamUrl(mediaId: UUID) {
  return `${getApiBaseUrl()}${getApiEndpoint().replace(getApiBaseUrl(), '')}/media/${mediaId}/stream`
}
```

**修复的方法**:
- `getStreamUrl()` - 视频流媒体URL
- `getDownloadUrl()` - 下载URL
- `getThumbnailUrl()` - 缩略图URL
- `getSubtitleUrl()` - 字幕URL

**额外修复**:
- `downloadMedia()` TypeScript类型修正: response已是Blob类型，无需再包装

### 修复 3: Plyr播放器优化
**文件**: `frontend/src/components/ui/MediaViewerPlyr.vue`

#### 3.1 移除不必要的remount
```diff
- <video ref="videoElement" class="plyr-video" playsinline controls :key="currentMedia.url">
+ <video ref="videoElement" class="plyr-video" playsinline controls>
```

**原因**: `:key` 属性导致Vue在URL改变时完全销毁并重建video元素

#### 3.2 动态更新视频源
```typescript
watch(currentIndex, () => {
  // ... 
  if (currentMedia.value.type === 'video') {
    nextTick(() => {
      if (videoElement.value) {
        // 更新video source而不是完全remount
        const source = videoElement.value.querySelector('source')
        if (source) {
          source.src = currentMedia.value.url
          videoElement.value.load()
        }
      }
      initPlyr()
    })
  }
})
```

**优点**:
- 复用现有video元素
- 利用浏览器缓存
- 减少DOM操作
- 更流畅的切换体验

#### 3.3 增强错误处理
```typescript
player.on('ready', () => {
  // 检查视频是否可播放
  if (videoElement.value) {
    videoElement.value.addEventListener('error', () => {
      console.error('[Plyr] 视频加载错误:', {
        error: videoElement.value?.error,
        src: currentMedia.value.url,
      })
      // ORB错误通常是CORS或路径问题
      if (videoElement.value?.error?.code === 4) {
        console.error('[Plyr] 网络错误 - 可能是CORS或URL路径问题')
      }
    })
  }
})
```

**功能**:
- 捕获并记录视频加载错误
- 特别标识网络错误(code 4) - 通常是CORS或URL问题
- 便于调试和问题诊断

#### 3.4 响应式控件布局优化

**桌面端 (>1024px)**:
```css
:deep(.plyr__controls) {
  display: flex !important;
  flex-wrap: nowrap !important;
  gap: 4px !important;
  padding: 10px !important;
  min-height: 50px !important;
}

:deep(.plyr__volume) {
  max-width: 100px !important;
  min-width: 60px !important;
}
```

**平板 (768px-1024px)**:
```css
:deep(.plyr__controls) {
  gap: 3px !important;
  padding: 8px !important;
}

:deep(.plyr__volume) {
  max-width: 80px !important;
  min-width: 50px !important;
}
```

**手机横屏 (480px-768px)**:
```css
:deep(.plyr__controls) {
  gap: 2px !important;
  padding: 6px !important;
  min-height: 44px !important;
}

:deep(.plyr__volume) {
  max-width: 60px !important;
  min-width: 40px !important;
}

:deep(.plyr__control--overlaid) {
  min-width: 60px !important;
  min-height: 60px !important;
}
```

**手机竖屏 (<480px)**:
```css
:deep(.plyr__controls) {
  flex-wrap: wrap !important;
  gap: 4px !important;
  padding: 8px !important;
}

/* 第一行：进度条独占整行 */
:deep(.plyr__progress) {
  order: 1;
  flex: 1 1 100% !important;
  margin-bottom: 4px !important;
}

/* 第二行：其他控件 */
:deep(.plyr__controls__item:not(.plyr__progress)) {
  order: 2;
}
```

**关键改进**:
- 防止控件被`flex-shrink`压缩
- 进度条占据剩余空间
- 时间显示固定宽度防止跳动
- 音量控件限制最大宽度
- 极小屏幕下进度条独占一行

### 修复 4: Lint错误处理
**文件**: `frontend/src/components/ui/MediaViewerPlyr.vue`

```diff
- // @ts-ignore
+ // @ts-expect-error
```

**说明**: 使用更严格的TypeScript忽略指令

**已知警告**: ESLint报告 `t` 未使用是误报，`t` 在template中用于i18n翻译

## 预期效果 (Expected Results)

### 1. 视频播放修复
✅ 视频URL正确指向 `/api/v1/media/{id}/stream`  
✅ 消除 `ERR_BLOCKED_BY_ORB` 错误  
✅ 视频可以正常加载和播放  
✅ 字幕正确加载

### 2. 控件布局优化
✅ 所有视口尺寸下控件无重叠  
✅ 按钮保持适当尺寸，不被挤压  
✅ 进度条和音量滑块正常显示  
✅ 手机竖屏下进度条独占一行，易于操作

### 3. 性能优化
✅ 媒体切换时复用video元素  
✅ 利用浏览器和IndexedDB缓存  
✅ 减少不必要的网络请求  
✅ 更流畅的切换动画

### 4. 调试改进
✅ 详细的错误日志  
✅ ORB错误特别标识  
✅ 便于快速定位问题

## 测试建议 (Testing Recommendations)

### 功能测试
1. **视频播放**
   - 打开包含视频的帖子详情页
   - 验证视频能正常加载和播放
   - 检查控制台无 ORB 错误

2. **媒体切换**
   - 在media viewer中切换多个媒体
   - 验证切换流畅，无卡顿
   - 检查Network标签，确认使用缓存

3. **字幕功能**
   - 播放带字幕的视频
   - 测试字幕开关
   - 验证多语言字幕选择

### 响应式测试
测试设备/分辨率:
- ✅ 桌面 (1920x1080)
- ✅ 平板 (768x1024)
- ✅ iPhone 14 Pro Max (430x932)
- ✅ Samsung Galaxy S20 Ultra (412x915)
- ✅ 手机横屏模式

验证项:
- 所有控件可见且无重叠
- 按钮尺寸适中，易于点击
- 进度条可操作
- 音量滑块可调节

### 性能测试
1. **缓存验证**
   - 打开DevTools Network标签
   - 首次加载视频
   - 切换到其他媒体再切回
   - 验证第二次从缓存加载(disk cache或memory cache)

2. **带宽优化**
   - 限制网络速度(Chrome DevTools - Fast 3G)
   - 测试媒体加载和切换
   - 验证不会重复下载已缓存内容

### 错误处理测试
1. **网络错误**
   - 断开网络连接
   - 尝试加载视频
   - 验证错误提示清晰

2. **无效URL**
   - 模拟错误的媒体ID
   - 验证错误被正确捕获和记录

## 相关文件 (Related Files)

### 配置文件
- `frontend/.env.development` - API端点配置
- `frontend/.env.production` - 生产环境配置(需要相同更新)

### 源代码
- `frontend/src/api/services.ts` - 媒体API服务
- `frontend/src/api/client.ts` - API客户端基础配置
- `frontend/src/utils/url.ts` - URL处理工具
- `frontend/src/components/ui/MediaViewerPlyr.vue` - Plyr视频播放器
- `frontend/src/views/PostDetailPage.vue` - 使用媒体API的页面

### 样式
- `node_modules/plyr/dist/plyr.css` - Plyr基础样式(不建议修改)
- MediaViewerPlyr.vue `<style scoped>` - 自定义响应式样式

## 注意事项 (Notes)

### 生产环境部署
在部署到生产环境前，需要同步更新 `.env.production`:

```bash
# 确保生产环境配置也更新为v1
VITE_API_ENDPOINT=https://api.momichan.xyz/api/v1
```

### 后端兼容性
此修复假设后端已完全迁移到 `/api/v1/` 端点。如果后端仍在使用旧的端点，需要:
1. 等待后端迁移完成
2. 或使用环境变量配置支持两种端点

### 缓存清理
如果用户之前访问过网站，可能需要清理缓存:
- 清空浏览器缓存
- 清空IndexedDB
- 或使用Service Worker强制更新

### TypeScript警告
`MediaViewerPlyr.vue` 中 ESLint 警告 `'t' is assigned a value but never used` 是误报，`t` 函数在Vue template中用于i18n翻译。可以安全忽略。

## 后续优化建议 (Future Improvements)

1. **渐进式加载**
   - 实现视频预加载策略
   - 预加载下一个/上一个媒体

2. **更智能的缓存**
   - 基于用户行为预测
   - LRU缓存策略优化

3. **错误恢复**
   - 自动重试机制
   - 降级到备用源

4. **用户体验**
   - 加载进度指示器
   - 缓冲状态可视化
   - 更友好的错误提示

5. **可访问性**
   - 键盘导航优化
   - 屏幕阅读器支持
   - 高对比度模式

---

**修复日期**: 2025-11-11  
**修复版本**: v2.1.0  
**修复作者**: Cascade AI Assistant
