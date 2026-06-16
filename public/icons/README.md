# PWA Icon Specification

本目录保存 Web App Manifest 引用的 PWA 图标。图标文件不得包含真实账号、头像、邮箱、令牌、内部主机名或其他环境私有数据。

## Required Assets

### Standard Icons

标准图标用于应用图标、启动画面和系统入口。

| File               | Size    | Purpose                         | Status  |
| ------------------ | ------- | ------------------------------- | ------- |
| `icon-72x72.png`   | 72x72   | Android small icon              | missing |
| `icon-96x96.png`   | 96x96   | Android medium icon             | missing |
| `icon-128x128.png` | 128x128 | Android large icon              | missing |
| `icon-144x144.png` | 144x144 | Windows tile                    | missing |
| `icon-152x152.png` | 152x152 | iOS Safari                      | missing |
| `icon-192x192.png` | 192x192 | Android standard icon           | missing |
| `icon-384x384.png` | 384x384 | Android high-density icon       | missing |
| `icon-512x512.png` | 512x512 | Android extra-high-density icon | missing |

### Maskable Icons

Maskable 图标用于自适应图标裁剪。

| File                        | Size    | Purpose                            | Status  |
| --------------------------- | ------- | ---------------------------------- | ------- |
| `icon-maskable-192x192.png` | 192x192 | Android adaptive icon              | missing |
| `icon-maskable-512x512.png` | 512x512 | Android adaptive high-density icon | missing |

### Shortcut Icons

快捷方式图标用于 Web App Manifest `shortcuts`。

| File                     | Size  | Status  |
| ------------------------ | ----- | ------- |
| `shortcut-home.png`      | 96x96 | missing |
| `shortcut-explore.png`   | 96x96 | missing |
| `shortcut-favorites.png` | 96x96 | missing |
| `shortcut-settings.png`  | 96x96 | missing |

## Asset Constraints

Standard icons:

- Format must be PNG.
- Color must be 24-bit true color with alpha channel.
- Transparent or opaque backgrounds are allowed.
- Content is allowed to use the full canvas.

Maskable icons:

- Format must be PNG.
- Background must be opaque.
- Important content must stay inside the center 80% safe area.
- The outer 10% edge on each side is the crop-risk area.

Design constraints:

- Icon geometry must remain simple and recognizable at the smallest target size.
- Color and shape must stay consistent across all generated sizes.
- Contrast must remain readable on light and dark system backgrounds.
- Small text must not be embedded in icon pixels.
- SVG source assets are generation inputs only; manifest outputs must be PNG.

## Generation Policy

Source input:

- Use a `512x512` source image or vector source.
- Keep source files free of environment-specific labels and private data.
- Regenerate all listed sizes in the same batch when the source changes.

Command-line generation uses a local image tool or `bunx sharp-cli`:

```bash
bunx sharp-cli -i source.png -o icon-72x72.png resize 72 72
bunx sharp-cli -i source.png -o icon-96x96.png resize 96 96
bunx sharp-cli -i source.png -o icon-128x128.png resize 128 128
bunx sharp-cli -i source.png -o icon-144x144.png resize 144 144
bunx sharp-cli -i source.png -o icon-152x152.png resize 152 152
bunx sharp-cli -i source.png -o icon-192x192.png resize 192 192
bunx sharp-cli -i source.png -o icon-384x384.png resize 384 384
bunx sharp-cli -i source.png -o icon-512x512.png resize 512 512
```

Maskable safe area:

```text
+-------------------------+
| ####################### | 10% crop-risk area
| ##+-----------------+## |
| ##|                 |## |
| ##|  80% safe area  |## |
| ##|                 |## |
| ##+-----------------+## |
| ####################### | 10% crop-risk area
+-------------------------+
```

## Verification

Local checks:

1. Start the frontend with `bun run dev` when memory policy permits a dev server.
2. Open Chrome DevTools.
3. Check `Application -> Manifest`.
4. Verify every manifest icon resolves with the expected dimensions.

External references:

- [Web App Manifest - MDN](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Maskable Icons](https://web.dev/maskable-icon/)
- [PWA Icons Guidelines](https://web.dev/add-manifest/#icons)
- [Adaptive Icons](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive)

## Current State

Existing legacy file:

- `icon-183x183.png`

Missing outputs:

- All standard icon sizes listed above.
- All maskable icon sizes listed above.
- All shortcut icon sizes listed above.
