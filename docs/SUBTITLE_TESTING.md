# 字幕功能测试指南

## 问题诊断

根据后端测试报告，字幕 API 工作正常，但前端可能没有收到字幕数据。以下是诊断步骤：

## 1. 检查后端返回的数据

### 测试帖子详情 API

```bash
curl "https://api.momichan.xyz/api/v1/posts/84c2d1f8-47a8-4309-a297-de83b91772f5"
```

检查响应中的 `media_files` 数组，确认：

- `has_subtitle`: 是否为 `true`
- `subtitle_language`: 默认字幕语言
- `subtitle_format`: 字幕格式（vtt/srt）
- `subtitles`: 字幕数组，包含所有可用语言

### 测试字幕 API

```bash
# 获取默认字幕
curl "https://api.momichan.xyz/api/v1/media/657a8528-090f-40fa-a779-83c5f098bde6/subtitle"

# 获取指定语言字幕
curl "https://api.momichan.xyz/api/v1/media/657a8528-090f-40fa-a779-83c5f098bde6/subtitle?language=en"
curl "https://api.momichan.xyz/api/v1/media/657a8528-090f-40fa-a779-83c5f098bde6/subtitle?language=zh-Hans"
curl "https://api.momichan.xyz/api/v1/media/657a8528-090f-40fa-a779-83c5f098bde6/subtitle?language=zh-Hant"
curl "https://api.momichan.xyz/api/v1/media/657a8528-090f-40fa-a779-83c5f098bde6/subtitle?language=ja"
```

## 2. 前端调试

### 启用调试模式

在 `.env` 文件中设置：

```env
VITE_ENABLE_DEBUG=true
```

### 使用浏览器开发者工具

1. 打开带字幕的视频帖子（例如：`/posts/84c2d1f8-47a8-4309-a297-de83b91772f5`）
2. 打开浏览器控制台（F12）
3. 查看 `[VideoPlayer]` 开头的日志：
   - 原始字幕数据
   - 处理后的字幕轨道
   - 字幕 URL 构建过程

### 使用测试页面

打开 `test-subtitle-api.html` 文件进行快速测试：

```bash
# 在项目根目录启动简单的 HTTP 服务器
python -m http.server 8000
# 或
npx serve .
```

然后访问 `http://localhost:8000/test-subtitle-api.html`

## 3. 常见问题

### 问题 1: 字幕数据为空

**症状**: `normalizedSubtitles` 为空数组

**可能原因**:

- 后端没有返回 `subtitles` 字段
- `subtitles` 字段为 `null` 或空数组
- 字幕数据格式不正确

**解决方案**:

1. 检查 API 响应中的 `media_files[].subtitles`
2. 确认后端返回的字幕数据包含 `language` 字段
3. 查看控制台日志中的 "跳过无效字幕轨道" 警告

### 问题 2: 字幕 URL 404

**症状**: 浏览器网络面板显示字幕请求返回 404

**可能原因**:

- 字幕 URL 构建错误
- `media_id` 提取失败
- 后端字幕文件不存在

**解决方案**:

1. 检查控制台日志中的字幕 URL
2. 手动测试字幕 API 端点
3. 确认视频 `src` 包含正确的 `media_id`

### 问题 3: 字幕格式不支持

**症状**: 字幕文件下载成功但不显示

**可能原因**:

- SRT 格式需要转换为 VTT
- 字幕文件编码问题
- 时间戳格式不正确

**解决方案**:

1. 检查字幕文件格式（VTT 优先）
2. 查看 `ensureVttFallback` 函数是否正常工作
3. 手动下载字幕文件检查内容

## 4. 字幕数据格式

### 后端返回格式（预期）

```json
{
  "media_files": [
    {
      "id": "657a8528-090f-40fa-a779-83c5f098bde6",
      "file_type": "video",
      "has_subtitle": true,
      "subtitle_language": "zh-Hans",
      "subtitle_format": "vtt",
      "subtitles": [
        {
          "language": "zh-Hans",
          "label": "简体中文",
          "format": "vtt"
        },
        {
          "language": "zh-Hant",
          "label": "繁體中文",
          "format": "vtt"
        },
        {
          "language": "en",
          "label": "English",
          "format": "vtt"
        },
        {
          "language": "ja",
          "label": "日本語",
          "format": "vtt"
        }
      ]
    }
  ]
}
```

### 前端处理逻辑

1. **URL 构建**: 如果字幕对象没有 `url` 字段，前端会自动构建：

   ```
   /api/v1/media/{media_id}/subtitle?language={language}
   ```

2. **格式转换**: SRT 格式会自动转换为 VTT（通过 `ensureVttFallback`）

3. **语言选择**:
   - 优先使用用户保存的字幕语言偏好
   - 其次匹配当前界面语言
   - 最后使用第一个可用字幕

## 5. 修复记录

### 2025-02-01: 修复字幕 URL 构建

**问题**: 后端返回的字幕数据可能只包含 `language` 字段，没有完整的 URL

**修复**: 更新 `VideoPlayer.vue` 中的 `normalizeSubtitleSrc` 函数：

- 添加从视频 `src` 提取 `media_id` 的逻辑
- 根据 `language` 自动构建标准字幕 API URL
- 添加调试日志帮助诊断问题

**相关文件**:

- `src/components/ui/VideoPlayer.vue`
- `src/utils/subtitleDebug.ts`

## 6. 下一步

如果问题仍然存在，请：

1. 运行测试页面 `test-subtitle-api.html`
2. 收集浏览器控制台日志
3. 检查网络面板中的 API 请求和响应
4. 提供具体的错误信息和日志

## 7. 相关文档

- 后端字幕 API 文档: `/api/v1/media/{media_id}/subtitle`
- 视频播放器组件: `src/components/ui/VideoPlayer.vue`
- 字幕设置: `src/composables/useVideoSettings.ts`
