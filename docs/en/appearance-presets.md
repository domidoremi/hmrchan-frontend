# Appearance Presets

[简体中文](../zh-CN/appearance-presets.md) · [Back to English README](README.md)

Both editions share four themes and semantic tokens while retaining their own page structure. The main site emphasizes reading, chapters and layered photographs. Next emphasizes search, index previews and spatial scenes. A theme changes composition, typography, surfaces, controls, states and motion without changing routes or data.

New visitors start with Paper on the main site and Spectrum on Next. Valid saved themes remain selected. Full motion is enabled by default and when display settings are reset; explicitly saved system or reduced motion choices are preserved.

| Theme    | Stable ID          | Layout and elements                                                                                                      | Motion                                      |
| -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Paper    | minimal-editorial  | Warm paper, serif reading, ruled sections and rectangular photos; Next retains its index typography and rounded controls | Small vertical drift, measured transitions  |
| Glass    | fluent-soft        | Blue inset panels, rounded controls, separated records and balanced preview columns                                      | Larger vertical drift, soft easing          |
| Nature   | organic-natural    | Green and linen surfaces, asymmetric rectangular frames, generous reading space and line height                          | Slow diagonal drift and slight rotation     |
| Spectrum | gradient-narrative | Violet light, split compositions, a wide leading story and accent edges; Next has a distinct panel contour               | Horizontal drift, light and orbit breathing |

Each theme has light and dark palettes. Accent surfaces use a dedicated foreground token. Home, browse, schedule, community, search, author, reader, authentication, account and settings surfaces share color, focus, border and sizing rules. Text over images uses a separate scrim.

## Implementation

- `src/config/appearance.ts` owns IDs and migration. All four compact palettes load with the global stylesheet; switching requires no CSS request.
- `src/styles/presets/system.css` provides shared and legacy component tokens. The four adjacent palettes define theme differences.
- Journal's `styles/themes.css` and `styles/theme-pages.css` cover composition, component states and lazily loaded pages.
- `styles/home-composition.css` defines the continuous homepage composition, and `styles/home-themes.css` defines theme proportions, contours and motion parameters. `HomeAtmosphere` shares the background across chapters; document progress connects headings, photographs, light and navigation.
- Full, reduced and system motion controls live in display settings. Reduced motion removes continuous movement. Hidden pages and offscreen recommendations pause their animations.
- Mobile layouts preserve content order, touch targets, keyboard focus and larger text. Recommendation covers remain rectangular.

## Stored preference migration

| Previous ID      | Replacement       |
| ---------------- | ----------------- |
| material-calm    | fluent-soft       |
| clay-playful     | fluent-soft       |
| biophilic-serene | organic-natural   |
| sketch-doodle    | minimal-editorial |

Unknown values fall back to the edition's default theme. Color mode, language, reading size and other preferences remain independent. Configuration and settings tests cover the four IDs, migration and malformed values. See the [UI/UX acceptance record](../zh-CN/uiux-acceptance.md) for validation scope and limitations.
