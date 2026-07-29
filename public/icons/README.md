# PWA Icon Boundary

This directory contains PWA icons referenced by the Web App Manifest, PNG compatibility assets,
and icon generator output. Deployable assets must be emitted directly from `public/`. Source artwork
must stay outside this directory unless the manifest or generator explicitly references it.

## Required Assets

### Standard Icons

Standard icons support manifest `icons[].purpose=any`, splash screens, and platform fallbacks.

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

Maskable icons support manifest `icons[].purpose=maskable`. Important artwork must remain inside the
central 80% safe area and use an opaque background.

| File requirement | Size    | Status  |
| ---------------- | ------- | ------- |
| maskable icon    | 192x192 | present |
| maskable icon    | 512x512 | present |

### Shortcut Icons

Shortcut icons support manifest `shortcuts[].icons`.

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
