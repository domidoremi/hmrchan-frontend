# MomiChan Next

[简体中文](README.md) · [English](docs/en/README.md)

MomiChan Next 是面向籾山ひめり粉丝的内容站点，以写真选片、动态图集和列表预览为主要浏览方式。

当前为 `next` 分支；主站见 [`main`](https://github.com/domidoremi/hmrchan-frontend/tree/main) 分支。

## 功能

- 动态、图片与视频浏览，支持筛选和搜索。
- 作者资料、活动日历、社区讨论与个人收藏。
- 原生简约、Material 3、Fluent 2、Carbon 四套主题，支持亮色与暗色模式。
- 简体中文、繁体中文、英语和日语，支持字号调整、减弱动效与 PWA 安装。

基于 Vue 3、TypeScript、Vite 和 Pinia。

## 本地开发

使用 Node.js 26.13.1 和 Bun 1.4.4，版本配置见 [`mise.toml`](mise.toml)。

```bash
git clone --branch next https://github.com/domidoremi/hmrchan-frontend.git hmrchan-frontend-next
cd hmrchan-frontend-next
bun install --frozen-lockfile
```

将 [`.env.example`](.env.example) 复制为 `.env.development`。另行启动[配套后端](https://github.com/domidoremi/hmrchan-backend)，默认地址为 `http://127.0.0.1:8000`，可通过 `VITE_API_BASE_URL` 修改。

```bash
bun run dev
```

访问终端输出的本地地址。

## 常用命令

| 命令                  | 用途             |
| --------------------- | ---------------- |
| `bun run type-check`  | 类型检查         |
| `bun run lint:strict` | 代码检查         |
| `bun run test:unit`   | 单元测试         |
| `bun run build`       | 构建至 `dist/`   |
| `bun run preview`     | 本地预览构建产物 |

## 文档

- [前端架构](docs/zh-CN/architecture.md)
- [主题与显示偏好](docs/zh-CN/appearance-presets.md)
- [验证与部署](docs/zh-CN/validation.md)

## 说明

本项目由粉丝维护，与艺人及所属机构无隶属关系。照片及其他媒体内容的权利归各自权利方所有。
