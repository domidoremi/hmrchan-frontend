# Appearance presets

Display settings offer four design systems. Both sites share the color, typography, density, interaction and motion rules. The main site applies them to reading and Next applies them to photographs, members and events.

| Preset         | Main site                                                           | Next                                                                            | Controls and motion                                              |
| -------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Native Minimal | Title-led reading with a single-column recent feed                  | Wide photography followed by the original title and photo controls              | Neutral surfaces, fine dividers and short travel                 |
| Material 3     | Tonal groups for the lead, filters and calendar with a modular feed | Tonal photo groups with gallery as the default view                             | Filled selection, press feedback and responsive transitions      |
| Fluent 2       | Grouped commands and an author and schedule pane beside the feed    | Photography and controls side by side with list and preview as the default view | Panel boundaries, edge indicators and directional motion         |
| Carbon         | A square-edged index with alternating rows                          | A contact sheet followed by a list and preview                                  | Monospaced metadata, selected-row rules and directional exposure |

Native Minimal takes cues on content hierarchy and feedback from the [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/). The other presets draw from [Material 3](https://m3.material.io/), [Fluent 2](https://fluent2.microsoft.design/) and the [Carbon Design System](https://carbondesignsystem.com/).

## Defaults and migration

The main site starts with Native Minimal in light mode. Next starts with Material 3 in dark mode. Native Minimal keeps the stored ID `apple-native`. Saved color, text size, motion and valid preset choices take precedence. Full motion is the initial and reset default. An explicit browse layout stays in the URL when the preset changes.

| Previous stored IDs                                                    | Current ID            |
| ---------------------------------------------------------------------- | --------------------- |
| `minimal-editorial`, `sketch-doodle`                                   | `apple-native`        |
| `organic-natural`, `material-calm`, `clay-playful`, `biophilic-serene` | `material-expressive` |
| `fluent-soft`                                                          | `fluent-workspace`    |
| `gradient-narrative`                                                   | `carbon-index`        |

`src/config/appearance.ts` owns stored-value migration and browse defaults. Preset files supply color, type, density, surface and motion tokens. The same content components provide filtering, keyboard navigation and reading controls.
