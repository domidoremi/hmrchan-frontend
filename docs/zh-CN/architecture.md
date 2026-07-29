# 前端架构

[返回中文 README](../../README.md) · [English](../en/architecture.md)

## 运行时

- Vue 3 负责渲染与组件生命周期
- Pinia 负责客户端状态
- Vue Router 负责路由准入与视图懒加载
- Vue I18n 负责用户可见语言版本
- Cloudflare Pages Functions 负责同源边缘转发
- Service Worker 负责离线资源与后台协调

浏览器代码使用同源 `/api` 与 `/ws` 路径。上游主机和内部服务身份由边缘层处理。

## 后端合同

后端联调与 OpenAPI 合同维护在后端仓库的以下位置：

- `docs/frontend-integration.md`
- `docs/contracts/README.md`
- `docs/contracts/*.md`
- `docs/contracts/openapi/*.yaml`

前端仓库不保存上述合同副本。出现漂移时，先修复后端真相源，再同步前端类型、适配器与测试。

## CSS 边界

- `src/styles/index.css` 是应用样式唯一入口
- 分层文件承载基础、语义、组件、页面系统、预设、工具类与临时覆盖
- Vue SFC 使用一个 scoped 样式块，跨组件选择器进入分层 CSS
- 主题和页面上下文选择器不进入基础 UI 组件
- `:deep()` 仅用于第三方或生成 DOM
- `!important` 仅用于减少动效、第三方约束和浏览器兼容

## 文档与注释

- 简体中文文档放在根 `README.md` 与 `docs/zh-CN/`
- 英文文档放在 `docs/en/`
- 代码注释使用英文
- 注释记录隐含约束、失败语义和兼容原因
- 清晰流程和明确命名不添加复述式注释
- 用户可见文案保留在 i18n 目录

不为直白代码补充复述式注释。复杂边界必须具备注释与聚焦测试。
