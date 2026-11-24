# 外观主题

外观设置提供四套设计系统。两站共用配色、明暗模式、文字和交互状态的规则。主站优先组织文章和阅读路径，Next 优先组织写真、成员和活动。

| 主题       | 主站                                                 | Next                                     | 操作与动效                               |
| ---------- | ---------------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| 原生简约   | 标题和正文入口优先，最近动态按单栏阅读               | 宽幅写真接续原帖标题和换照               | 中性表面、细分隔、短位移入场             |
| Material 3 | 色调区分推荐、来源筛选和月历，最近动态采用模块化双栏 | 写真与动态以色调容器分组，默认打开图集   | 填充标记选中状态，按压与进出场有明确反馈 |
| Fluent 2   | 顶部命令分区，阅读流旁保留作者和日程工作区           | 写真和操作并排，动态默认打开列表和预览   | 面板分隔、边缘标记及定向位移             |
| Carbon     | 紧凑的方角索引，行间分隔与交替底色                   | 并列照片接续记录列表，默认打开列表和预览 | 等宽元信息、边线标记、方向扫描           |

原生简约参考 [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) 的内容层级与交互反馈。其他主题的设计参考见 [Material 3](https://m3.material.io/)、[Fluent 2](https://fluent2.microsoft.design/) 和 [Carbon Design System](https://carbondesignsystem.com/)。

## 默认值与保存

主站默认使用原生简约亮色，Next 默认使用 Material 3 暗色。原生简约沿用已保存的主题 ID `apple-native`。显式保存的明暗、字号、动效和有效主题选择优先恢复。首次访问及恢复默认启用完整动效。动态页的显式视图选择通过 URL 保留，切换主题时仍沿用已选择的视图。

| 保存的旧 ID                                                            | 当前 ID               |
| ---------------------------------------------------------------------- | --------------------- |
| `minimal-editorial`、`sketch-doodle`                                   | `apple-native`        |
| `organic-natural`、`material-calm`、`clay-playful`、`biophilic-serene` | `material-expressive` |
| `fluent-soft`                                                          | `fluent-workspace`    |
| `gradient-narrative`                                                   | `carbon-index`        |

`src/config/appearance.ts` 负责旧值读取和主题的默认浏览模式。主题文件定义配色、排版、密度、表面和动效令牌，页面组件保留原内容、筛选、键盘导航与阅读操作。
