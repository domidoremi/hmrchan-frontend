# Appearance Presets / 外观预设

Runtime preset metadata is defined in `src/config/appearance.ts`. This document records the visual direction without duplicating implementation values.

运行时预设元数据定义在 `src/config/appearance.ts`。本文记录视觉方向，不重复实现参数。

| Preset               | English direction                                       | 中文方向                           |
| -------------------- | ------------------------------------------------------- | ---------------------------------- |
| `minimal-editorial`  | Quiet editorial pages, wide margins, paper surfaces     | 安静的编辑式页面、宽留白与纸张表面 |
| `fluent-soft`        | Soft album frames, calm depth, comfortable spacing      | 柔和相册边框、克制层次与舒适间距   |
| `material-calm`      | Structured notebook sections and clear state roles      | 结构化笔记分区与清晰状态角色       |
| `organic-natural`    | Linen paper, natural color, grounded motion             | 亚麻纸张、自然色彩与沉稳动效       |
| `biophilic-serene`   | Airy garden light and restorative spacing               | 通透庭园光感与舒展留白             |
| `clay-playful`       | Matte volume, rounded controls, friendly press feedback | 哑光体积、圆润控件与友好按压反馈   |
| `sketch-doodle`      | Organized scrapbook lines, notes, and paper details     | 有秩序的剪贴簿线条、批注与纸张细节 |
| `gradient-narrative` | Chapter-based stage memories with evening color         | 章节式舞台记忆与夜间色彩           |

## Shared Constraints / 共同约束

- Text contrast and interaction state remain clear in every preset / 所有预设保持清晰的文字对比与交互状态
- Presets change presentation without changing route or data behavior / 预设只改变表现，不改变路由或数据行为
- Motion follows reduced-motion preferences / 动效遵循减少动效偏好
- Mobile layouts retain readable order and touch targets / 移动布局保持可读顺序与触控尺寸
- Preset-specific CSS stays under `src/styles/presets/` / 预设专属 CSS 保留在 `src/styles/presets/`

The configuration test verifies the eight runtime IDs and their canonical document reference.

配置测试验证八个运行时 ID 及其规范文档引用。
