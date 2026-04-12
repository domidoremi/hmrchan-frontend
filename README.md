# HmrChan Frontend

> 仅供学习与交流使用。

一个基于 Vue 3、TypeScript 和 Vite 的社区前端项目，面向图片 / 视频内容浏览、搜索、互动与个人中心等场景，并包含 PWA 与移动端体验优化。

## 技术栈

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- Vue I18n
- Cloudflare Pages Functions
- Vitest / ESLint / Prettier

## 快速开始

### 环境要求

- Node.js `>=24.11.1 <25`
- Bun `1.3.11`

### 安装与启动

```bash
bun install
cp .env.example .env.development
bun run dev
```

默认开发地址：`http://localhost:5173`

## 环境变量

本项目使用 Vite 环境变量。本地开发通常只需要从 `.env.example` 复制一份：

```bash
cp .env.example .env.development
```

常用变量：

| 变量                      | 说明                     |
| ------------------------- | ------------------------ |
| `VITE_API_BASE_URL`       | 本地开发时的后端代理目标 |
| `VITE_APP_NAME`           | 应用名称                 |
| `VITE_APP_DESCRIPTION`    | 应用描述                 |
| `VITE_ENABLE_DEBUG`       | 是否启用调试日志         |
| `VITE_TURNSTILE_SITE_KEY` | 人机验证站点 key（可选） |

其余构建、安全和实验性开关请直接参考：

- [`.env.example`](./.env.example)
- [`wrangler.toml`](./wrangler.toml)

> 不建议把生产环境地址、账号、密钥或内部流程直接写入 README。

## 常用脚本

```bash
# 开发
bun run dev
bun run build
bun run preview

# 质量检查
bun run lint
bun run lint:strict
bun run format
bun run format:check
bun run type-check

# 测试
bun run test:unit
bun run test:coverage
bun run test:e2e
bun run test:a11y
bun run test:perf
```

如需查看更多脚本，请查看 [`package.json`](./package.json)。

## 项目结构

```text
.
├── src/           # 前端源码
├── public/        # 静态资源与 PWA 资源
├── functions/     # Cloudflare Pages Functions
├── scripts/       # 构建、测试、生成脚本
├── docs/          # 补充文档
├── .env.example   # 本地环境变量示例
├── package.json   # 脚本与依赖定义
└── wrangler.toml  # Cloudflare 配置
```

## 功能概览

- 首页、探索、作者、社区、日程等内容路由
- 登录、注册、个人主页、收藏等用户能力
- 响应式布局与移动端适配
- 国际化支持
- PWA / Service Worker 支持
- 基础性能与可访问性检查流程

## 部署

默认部署方式为 **Cloudflare Pages + Functions**。

基本流程：

1. 执行 `bun run build`
2. 将构建产物目录设置为 `dist`
3. 在部署平台配置所需环境变量
4. 确保 SPA 路由已配置回退到 `index.html`

如果使用其他静态托管平台，也可以直接部署 `dist/` 目录。

## 开发约定

- 提交信息采用 Conventional Commits
- 提交前建议至少执行：

```bash
bun run type-check
bun run test:unit
```

## 相关文档

- [后端真相源入口](./docs/backend-source-of-truth.md)

## License

本项目仅用于个人学习和技术交流。
