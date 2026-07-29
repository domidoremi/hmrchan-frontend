# Appearance Presets

[简体中文](../zh-CN/appearance-presets.md) · [Back to English README](README.md)

Runtime preset metadata is defined in `src/config/appearance.ts`. This document records the visual direction without duplicating implementation values.

| Preset               | Direction                                               |
| -------------------- | ------------------------------------------------------- |
| `minimal-editorial`  | Quiet editorial pages, wide margins, paper surfaces     |
| `fluent-soft`        | Soft album frames, calm depth, comfortable spacing      |
| `material-calm`      | Structured notebook sections and clear state roles      |
| `organic-natural`    | Linen paper, natural color, grounded motion             |
| `biophilic-serene`   | Airy garden light and restorative spacing               |
| `clay-playful`       | Matte volume, rounded controls, friendly press feedback |
| `sketch-doodle`      | Organized scrapbook lines, notes, and paper details     |
| `gradient-narrative` | Chapter-based stage memories with evening color         |

## Shared Constraints

- Text contrast and interaction state remain clear in every preset
- Presets change presentation without changing route or data behavior
- Motion follows reduced-motion preferences
- Mobile layouts retain readable order and touch targets
- Preset-specific CSS stays under `src/styles/presets/`

The configuration test verifies the eight runtime IDs and their canonical document reference.
