# 外观预设

[返回中文 README](../../README.md) · [English](../en/appearance-presets.md)

运行时预设元数据定义在 `src/config/appearance.ts`。本文记录视觉方向，不重复实现参数。

| 预设                 | 视觉方向                           |
| -------------------- | ---------------------------------- |
| `minimal-editorial`  | 安静的编辑式页面、宽留白与纸张表面 |
| `fluent-soft`        | 柔和相册边框、克制层次与舒适间距   |
| `material-calm`      | 结构化笔记分区与清晰状态角色       |
| `organic-natural`    | 亚麻纸张、自然色彩与沉稳动效       |
| `biophilic-serene`   | 通透庭园光感与舒展留白             |
| `clay-playful`       | 哑光体积、圆润控件与友好按压反馈   |
| `sketch-doodle`      | 有秩序的剪贴簿线条、批注与纸张细节 |
| `gradient-narrative` | 章节式舞台记忆与夜间色彩           |

## 共同约束

- 所有预设保持清晰的文字对比与交互状态
- 预设只改变表现，不改变路由或数据行为
- 动效遵循减少动效偏好
- 移动布局保持可读顺序与触控尺寸
- 预设专属 CSS 保留在 `src/styles/presets/`

配置测试验证八个运行时 ID 及其规范英文文档引用。
