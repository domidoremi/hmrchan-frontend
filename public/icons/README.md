# PWA Icon Boundary

本目录保存 Web App Manifest 引用的 PWA 图标、PNG 兼容资源和图标生成器输出。部署资源必须可直接由 `public/` 输出；生成源文件不得放入本目录，除非 manifest 或生成脚本明确引用。

## Required Assets

### Standard Icons

标准图标用于 manifest `icons[].purpose=any`、启动画面和平台图标回退。

| File requirement | Size    | Status  |
| ---------------- | ------- | ------- |
| standard icon    | 72x72   | present |
| standard icon    | 96x96   | present |
| standard icon    | 128x128 | present |
| standard icon    | 144x144 | present |
| standard icon    | 152x152 | present |
| standard icon    | 192x192 | present |
| standard icon    | 384x384 | present |
| standard icon    | 512x512 | present |

### Maskable Icons

Maskable 图标用于 manifest `icons[].purpose=maskable`。重要图形必须落在中心 80% 安全区域内，背景必须不透明。

| File requirement | Size    | Status  |
| ---------------- | ------- | ------- |
| maskable icon    | 192x192 | present |
| maskable icon    | 512x512 | present |

### Shortcut Icons

快捷方式图标用于 manifest `shortcuts[].icons`。

| File                     | Size  | Status  |
| ------------------------ | ----- | ------- |
| `shortcut-home.png`      | 96x96 | present |
| `shortcut-explore.png`   | 96x96 | present |
| `shortcut-favorites.png` | 96x96 | present |
| `shortcut-settings.png`  | 96x96 | present |

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

- `public/manifest.json` uses `sitting-32.webp`, `sitting-96.webp`, `sitting-192.webp`, and `sitting-512.webp` for `purpose=any`.
- `public/manifest.json` uses the opaque `icon-maskable-192x192.png` and `icon-maskable-512x512.png` assets for `purpose=maskable`.
- The standard PNG compatibility set, both maskable PNGs, the Apple touch icon, and all four shortcut PNGs are present at their declared dimensions.
- Shortcut PNGs are generator outputs but are not currently declared in `public/manifest.json`.

## References

- [Web App Manifest - MDN](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Maskable Icons](https://web.dev/maskable-icon/)
- [PWA icons](https://web.dev/add-manifest/#icons)
- [Adaptive Icons](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive)
