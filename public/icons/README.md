# PWA Icon Boundary

本目录保存 Web App Manifest 引用的 PWA 图标资源。文件必须是可直接由 `public/` 输出的 PNG，生成源文件不得放入本目录，除非 manifest 或生成脚本明确引用。

## Required Assets

### Standard Icons

标准图标用于 manifest `icons[].purpose=any`、启动画面和平台图标回退。

| File requirement | Size    | Status  |
| ---------------- | ------- | ------- |
| standard icon    | 72x72   | missing |
| standard icon    | 96x96   | missing |
| standard icon    | 128x128 | missing |
| standard icon    | 144x144 | missing |
| standard icon    | 152x152 | missing |
| standard icon    | 192x192 | missing |
| standard icon    | 384x384 | missing |
| standard icon    | 512x512 | missing |

### Maskable Icons

Maskable 图标用于 manifest `icons[].purpose=maskable`。重要图形必须落在中心 80% 安全区域内，背景必须不透明。

| File requirement | Size    | Status  |
| ---------------- | ------- | ------- |
| maskable icon    | 192x192 | missing |
| maskable icon    | 512x512 | missing |

### Shortcut Icons

快捷方式图标用于 manifest `shortcuts[].icons`。

| File                     | Size  | Status  |
| ------------------------ | ----- | ------- |
| `shortcut-home.png`      | 96x96 | missing |
| `shortcut-explore.png`   | 96x96 | missing |
| `shortcut-favorites.png` | 96x96 | missing |
| `shortcut-settings.png`  | 96x96 | missing |

## Asset Constraints

### Standard Icon

- Canvas: full canvas is usable.
- Content: may occupy the full icon.
- Background: transparent or opaque background is allowed.
- Format: PNG, 24-bit true color with alpha channel.

### Maskable Icon

- Safe area: center 80% of the canvas.
- Content: required visual content must stay inside the safe area.
- Background: opaque solid background is required.
- Format: PNG, 24-bit true color, no transparency.

### Source Requirements

- Source artwork must be vector or at least 512x512 raster input.
- Small text must not be embedded in icons.
- Generated PNG files must preserve brand color, contrast, and transparent/opaque requirements for the matching purpose.

## Generation

Repository command:

```bash
bun run icons:generate source-icon-512.png
```

The command must generate only the files required by the manifest and must not overwrite unrelated assets. Generated output must be reviewed before commit when icon filenames or manifest references change.

## Validation

Local manifest inspection:

1. Run `bun run dev`.
2. Open Chrome DevTools.
3. Inspect Application -> Manifest.
4. Validate icon paths, purpose values, image dimensions, and transparent/opaque requirements.

Release validation must include the normal repository runner when icon files or manifest references change:

```bash
bun run validate:release --mode local
```

## Current State

Existing file:

- `icon-183x183.png`: legacy asset; replacement requires manifest and cache review.

Missing assets:

- Standard icon sizes listed in this file.
- Maskable icon sizes listed in this file.
- Shortcut icons listed in this file.

## References

- [Web App Manifest - MDN](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Maskable Icons](https://web.dev/maskable-icon/)
- [PWA icons](https://web.dev/add-manifest/#icons)
- [Adaptive Icons](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive)
