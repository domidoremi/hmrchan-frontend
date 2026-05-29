# PWA 图标说明

本目录包含 Progressive Web App (PWA) 所需的各种尺寸图标。

## 图标尺寸要求

### 标准图标 (any purpose)

用于应用图标、启动画面等场景。

| 尺寸    | 用途           | 状态        |
| ------- | -------------- | ----------- |
| 72x72   | Android 小图标 | ⚠️ 需要生成 |
| 96x96   | Android 中图标 | ⚠️ 需要生成 |
| 128x128 | Android 大图标 | ⚠️ 需要生成 |
| 144x144 | Windows 磁贴   | ⚠️ 需要生成 |
| 152x152 | iOS Safari     | ⚠️ 需要生成 |
| 192x192 | Android 标准   | ⚠️ 需要生成 |
| 384x384 | Android 高清   | ⚠️ 需要生成 |
| 512x512 | Android 超高清 | ⚠️ 需要生成 |

### Maskable 图标

用于自适应图标，支持不同形状的遮罩（圆形、圆角矩形等）。

| 尺寸    | 用途               | 状态        |
| ------- | ------------------ | ----------- |
| 192x192 | Android 自适应     | ⚠️ 需要生成 |
| 512x512 | Android 自适应高清 | ⚠️ 需要生成 |

### 快捷方式图标

用于应用快捷方式（shortcuts）。

| 名称                   | 尺寸  | 状态        |
| ---------------------- | ----- | ----------- |
| shortcut-home.png      | 96x96 | ⚠️ 需要生成 |
| shortcut-explore.png   | 96x96 | ⚠️ 需要生成 |
| shortcut-favorites.png | 96x96 | ⚠️ 需要生成 |
| shortcut-settings.png  | 96x96 | ⚠️ 需要生成 |

## 设计要求

### 标准图标 (any)

- **安全区域**: 整个画布可用
- **内容**: 可以占满整个图标
- **背景**: 可以是透明或有颜色
- **格式**: PNG，24位真彩色 + Alpha 通道

### Maskable 图标

- **安全区域**: 中心 80% 区域（留 10% 边距）
- **内容**: 重要内容必须在安全区域内
- **背景**: 必须是不透明的纯色背景
- **格式**: PNG，24位真彩色，不透明

### 设计约束

1. **简洁明了**: 图标必须简单易识别
2. **品牌一致**: 使用品牌色彩和风格
3. **高对比度**: 确保在各种背景下都清晰可见
4. **无文字**: 避免使用小字体文字（除非必要）
5. **矢量优先**: 使用 SVG 作为源文件，导出为 PNG

## 生成图标

### 方法 1: 使用在线工具

推荐使用 [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)

1. 上传一个 512x512 的源图标
2. 选择需要的尺寸
3. 下载生成的图标包

### 方法 2: 使用命令行工具

```bash
# 安装 sharp-cli
npm install -g sharp-cli

# 批量生成不同尺寸
sharp -i source.png -o icon-72x72.png resize 72 72
sharp -i source.png -o icon-96x96.png resize 96 96
sharp -i source.png -o icon-128x128.png resize 128 128
sharp -i source.png -o icon-144x144.png resize 144 144
sharp -i source.png -o icon-152x152.png resize 152 152
sharp -i source.png -o icon-192x192.png resize 192 192
sharp -i source.png -o icon-384x384.png resize 384 384
sharp -i source.png -o icon-512x512.png resize 512 512
```

### 方法 3: 使用 Figma/Sketch/Adobe XD

1. 创建 512x512 的画布
2. 设计图标
3. 导出为多个尺寸的 PNG

## Maskable 图标设计指南

Maskable 图标需要特殊处理：

```
┌─────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← 10% 边距（裁剪风险区域）
│ ▓▓┌─────────────────┐▓▓ │
│ ▓▓│                 │▓▓ │
│ ▓▓│   安全区域 80%   │▓▓ │ ← 重要内容放这里
│ ▓▓│                 │▓▓ │
│ ▓▓└─────────────────┘▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← 10% 边距（裁剪风险区域）
└─────────────────────────┘
```

## 测试图标

### 在线测试

- [Maskable.app](https://maskable.app/) - 测试 maskable 图标
- [PWA Builder](https://www.pwabuilder.com/) - 测试 PWA 配置

### 本地测试

1. 启动开发服务器: `bun run dev`
2. 打开 Chrome DevTools
3. Application → Manifest → 查看图标
4. 使用 Lighthouse 审计 PWA

## 当前状态

✅ 已有文件:

- `icon-183x183.png` (旧版，需要替换)

⚠️ 需要生成:

- 所有标准尺寸图标
- Maskable 图标
- 快捷方式图标

## 参考资料

- [Web App Manifest - MDN](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Maskable Icons](https://web.dev/maskable-icon/)
- [PWA Icons Guidelines](https://web.dev/add-manifest/#icons)
- [Adaptive Icons](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive)
