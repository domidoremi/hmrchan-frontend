# HmrChan Frontend

<p align="center">
  <a href="https://developers.cloudflare.com/pages/"><img alt="Cloudflare Pages" src="https://img.shields.io/badge/Deploy-Cloudflare_Pages-F38020?logo=cloudflare&logoColor=white"></a>
  <a href="docs/zh-CN/validation.md"><img alt="本地发布验证" src="https://img.shields.io/badge/Release-local_validation-2563EB?logo=checkmarx&logoColor=white"></a>
  <a href="https://bun.sh/docs"><img alt="Bun 1.3.11" src="https://img.shields.io/badge/Bun-1.3.11-000000?logo=bun&logoColor=white"></a>
</p>

<p align="center">
  <strong>简体中文</strong> · <a href="docs/en/README.md">English</a>
</p>

HmrChan Frontend 是站点的 Vue 应用，负责公开内容、社区、账号设置、国际化和 PWA 体验。生产站点由 Cloudflare Pages 提供，Pages Functions 通过同源 `/api` 路径转发浏览器 API 请求。

## 技术栈

### 应用

[![Vue 3.6.0 beta.17](https://img.shields.io/badge/Vue-3.6.0--beta.17-42B883?logo=vuedotjs&logoColor=white)](https://vuejs.org/guide/)
[![TypeScript 6.0.3](https://img.shields.io/badge/TypeScript-6.0.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/docs/)
[![Vite 8.1.5](https://img.shields.io/badge/Vite-8.1.5-646CFF?logo=vite&logoColor=white)](https://vite.dev/guide/)
[![Pinia 4.0.2](https://img.shields.io/badge/Pinia-4.0.2-FFD859?logo=pinia&logoColor=111827)](https://pinia.vuejs.org/)
[![Vue Router 5.2.0](https://img.shields.io/badge/Vue_Router-5.2.0-42B883?logo=vuedotjs&logoColor=white)](https://router.vuejs.org/guide/)
[![Vue I18n 12.0.0 alpha.4](https://img.shields.io/badge/Vue_I18n-12.0.0--alpha.4-26A69A?logo=vuedotjs&logoColor=white)](https://vue-i18n.intlify.dev/guide/introduction.html)

### 平台与质量

[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages_%2B_Functions-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/pages/)
[![Vitest 5.0.0 beta.7](https://img.shields.io/badge/Vitest-5.0.0--beta.7-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/guide/)
[![ESLint 10.8.0](https://img.shields.io/badge/ESLint-10.8.0-4B32C3?logo=eslint&logoColor=white)](https://eslint.org/docs/latest/)
[![Prettier 4.0.0 alpha.13](https://img.shields.io/badge/Prettier-4.0.0--alpha.13-F7B93E?logo=prettier&logoColor=111827)](https://prettier.io/docs/)
[![Knip 6.29.0](https://img.shields.io/badge/Knip-6.29.0-EA580C)](https://knip.dev/overview/getting-started)

## 项目范围

| 范围       | 职责                                           |
| ---------- | ---------------------------------------------- |
| 公开体验   | 路由内容、响应式布局、外观预设                 |
| 社区与账号 | 社区页面、认证流程、账号设置                   |
| 浏览器集成 | 同源 API 门面、请求完整性、客户端持久状态      |
| PWA        | Web App Manifest、Service Worker、离线回退     |
| 边缘层     | Cloudflare Pages Functions 与内部 Worker       |
| 交付       | 本地发布门禁、依赖审计、仓库审计与构建产物检查 |

## 仓库结构

```text
src/                 Vue 应用、状态、API 边界与单元测试
functions/           同源 Cloudflare Pages Functions
workers/             内部 Cloudflare Worker
build/               Vite 构建插件
scripts/             构建、审计、维护与发布门禁
public/              静态资源与 PWA 文件
docs/zh-CN/          简体中文文档
docs/en/             English documentation
```

`src/views/` 负责路由页面组合，`src/components/` 与 `src/composables/` 负责可复用界面和交互，`src/api/` 与 `src/services/` 集中管理浏览器集成边界，`src/stores/` 保存跨页面 Pinia 状态。

## 环境要求

| 工具                                                 | 支持版本        |
| ---------------------------------------------------- | --------------- |
| [Bun](https://bun.sh/docs)                           | `1.3.11`        |
| [Node.js](https://nodejs.org/docs/latest-v24.x/api/) | `>=24.14.0 <25` |

`bun.lock` 是唯一依赖锁文件，请勿混用 npm、pnpm 或 Yarn。

## 快速开始

```bash
bun install
cp .env.example .env.development
bun run dev
```

开发服务器默认使用 `http://127.0.0.1:5173`。如需固定其他端口，可运行 `bun run dev -- --port <port>`。

## 常用命令

| 命令                             | 用途                               |
| -------------------------------- | ---------------------------------- |
| `bun run dev`                    | 启动本地开发服务器                 |
| `bun run type-check`             | 检查应用、Functions 与 Worker 类型 |
| `bun run lint:strict`            | 执行严格 lint 与注释语言检查       |
| `bun run test:unit`              | 串行执行单元测试                   |
| `bun run build`                  | 生成生产构建                       |
| `bun run build:security-check`   | 检查构建产物                       |
| `bun run audit:deps`             | 审计依赖漏洞                       |
| `bun run validate:release:local` | 执行本地发布流程                   |

发布模式、证据要求与生产检查以[发布验证文档](docs/zh-CN/validation.md)为准。

## 配置

- 环境变量契约见 `.env.example`
- 浏览器请求默认使用同源 `/api` 门面
- 边缘部署配置位于 `wrangler.toml`
- 禁止提交本地密钥或机器专属路径

## 文档

- [发布验证](docs/zh-CN/validation.md)
- [前端架构](docs/zh-CN/architecture.md)
- [外观预设](docs/zh-CN/appearance-presets.md)
- [English documentation](docs/en/README.md)

## 许可

仓库未声明公开分发许可证，内容仅用于本项目。
