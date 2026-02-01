# 字幕功能修复总结

## 问题描述

后端字幕 API 工作正常，但前端视频播放器没有显示字幕。

## 根本原因

后端返回的字幕数据可能只包含 `language` 和 `label` 字段，没有完整的 `url` 字段。前端的 `normalizeSubtitleSrc` 函数无法处理这种情况。

## 解决方案

### 1. 修复 VideoPlayer.vue

更新 `normalizeSubtitleSrc` 函数，添加自动构建字幕 URL 的逻辑：

```typescript
function normalizeSubtitleSrc(track: SubtitleTrack): string | null {
  // 优先使用已有的 URL
  const raw =
    track.url || track.subtitle_url || track.file_path || track.subtitle_path || track.path
  if (raw) {
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
    const apiBaseUrl =
      import.meta.env.VITE_API_ENDPOINT || `${import.meta.env.VITE_API_URL || '/api'}/v1`
    if (raw.startsWith('/')) return `${apiBaseUrl}${raw}`
    return `${apiBaseUrl}/${raw}`
  }

  // 如果没有 URL，根据 language 自动构建
  if (track.language && props.src) {
    const mediaId = extractMediaIdFromSrc(props.src)
    if (mediaId) {
      const apiBaseUrl =
        import.meta.env.VITE_API_ENDPOINT || `${import.meta.env.VITE_API_URL || '/api'}/v1`
      return `${apiBaseUrl}/media/${mediaId}/subtitle?language=${track.language}`
    }
  }

  return null
}

function extractMediaIdFromSrc(src: string): string | null {
  const match = src.match(/\/media\/([0-9a-f-]+)\/stream/i)
  return match?.[1] ?? null
}
```

### 2. 添加调试日志

在 `normalizedSubtitles` computed 中添加调试日志（需要设置 `VITE_ENABLE_DEBUG=true`）：

```typescript
const normalizedSubtitles = computed<NormalizedSubtitleTrack[]>(() => {
  const tracks = props.subtitles ?? []
  if (!tracks.length) {
    if (import.meta.env['VITE_ENABLE_DEBUG'] === 'true') {
      console.log('[VideoPlayer] 没有字幕数据')
    }
    return []
  }

  if (import.meta.env['VITE_ENABLE_DEBUG'] === 'true') {
    console.group('[VideoPlayer] 字幕数据处理')
    console.log('原始字幕数据:', tracks)
  }

  // ... 处理逻辑 ...

  if (import.meta.env['VITE_ENABLE_DEBUG'] === 'true') {
    console.log('处理后的字幕轨道:', result)
    console.groupEnd()
  }

  return result
})
```

### 3. 创建调试工具

新增 `src/utils/subtitleDebug.ts` 提供调试函数：

- `debugSubtitles(subtitles)` - 分析字幕数据结构
- `testSubtitleUrl(mediaId, language)` - 生成测试 URL
- `fetchSubtitleTest(mediaId, language)` - 测试字幕 API

### 4. 创建测试页面

新增 `test-subtitle-api.html` 用于快速测试：

- 测试帖子详情 API
- 测试字幕 API（多语言）
- 内嵌视频播放器测试

## 测试步骤

### 1. 启用调试模式

在 `.env` 文件中添加：

```env
VITE_ENABLE_DEBUG=true
```

### 2. 测试后端 API

```bash
# 测试帖子详情
curl "https://api.momichan.xyz/api/v1/posts/84c2d1f8-47a8-4309-a297-de83b91772f5"

# 测试字幕 API
curl "https://api.momichan.xyz/api/v1/media/657a8528-090f-40fa-a779-83c5f098bde6/subtitle?language=zh-Hans"
```

### 3. 前端测试

1. 运行开发服务器：`bun run dev`
2. 打开测试帖子：`http://localhost:5173/posts/84c2d1f8-47a8-4309-a297-de83b91772f5`
3. 打开浏览器控制台查看调试日志
4. 检查视频播放器是否显示 CC 按钮
5. 点击 CC 按钮选择字幕语言

### 4. 使用测试页面

```bash
# 在项目根目录
python -m http.server 8000
# 或
npx serve .
```

访问 `http://localhost:8000/test-subtitle-api.html`

## 预期结果

1. **控制台日志**：
   - `[VideoPlayer] 字幕数据处理`
   - 显示原始字幕数据和处理后的字幕轨道
   - 每个字幕轨道显示 language、label、src、format

2. **视频播放器**：
   - 右下角显示 CC 按钮
   - 点击 CC 按钮显示可用字幕列表
   - 选择字幕后正常显示

3. **网络请求**：
   - 浏览器网络面板显示字幕请求
   - URL 格式：`/api/v1/media/{media_id}/subtitle?language={language}`
   - 返回 200 状态码和 VTT 内容

## 相关文件

- `src/components/ui/VideoPlayer.vue` - 视频播放器组件（已修复）
- `src/utils/subtitleDebug.ts` - 调试工具（新增）
- `test-subtitle-api.html` - 测试页面（新增）
- `docs/SUBTITLE_TESTING.md` - 详细测试指南（新增）

## 后续建议

1. 如果问题仍然存在，检查后端返回的 `media_files[].subtitles` 数据格式
2. 确认后端字幕文件存在且可访问
3. 检查 CORS 配置是否允许字幕请求
4. 验证字幕文件格式（VTT 优先，SRT 会自动转换）

## 技术细节

### 字幕 API 端点

```
GET /api/v1/media/{media_id}/subtitle
GET /api/v1/media/{media_id}/subtitle?language={language}
```

### 支持的语言代码

- `zh-Hans` - 简体中文
- `zh-Hant` - 繁體中文
- `en` - English
- `ja` - 日本語

### 字幕数据格式

```json
{
  "subtitles": [
    {
      "language": "zh-Hans",
      "label": "简体中文",
      "format": "vtt"
    }
  ]
}
```

前端会自动构建 URL：

```
/api/v1/media/{media_id}/subtitle?language=zh-Hans
```
