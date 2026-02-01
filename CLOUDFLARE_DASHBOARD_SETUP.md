# Cloudflare Pages Dashboard 配置指南

## 🚨 重要提示

Cloudflare Pages 的构建配置**必须在 Dashboard 中设置**，不能在 `wrangler.toml` 中配置。

## 配置步骤

### 1. 登录 Cloudflare Dashboard

访问：https://dash.cloudflare.com/

### 2. 进入 Pages 项目

1. 点击左侧菜单 **Pages**
2. 选择你的项目 **hmrchan-frontend**
3. 点击 **Settings** 标签

### 3. 配置构建设置

进入 **Builds & deployments** 部分：

#### Build configuration

| 设置项                        | 值              |
| ----------------------------- | --------------- |
| **Framework preset**          | None            |
| **Build command**             | `bun run build` |
| **Build output directory**    | `dist`          |
| **Root directory (optional)** | `/`             |

#### 说明

- **Build command**: 使用 `bun run build` 因为项目已升级到 Vite 8.0.0-beta.10
- 如果遇到问题，可以改用 `bash scripts/cloudflare-build.sh`（会自动处理 Bun/npm 兼容）

### 4. 配置环境变量

进入 **Environment variables** 部分：

#### Production 环境变量

点击 **Add variable** 添加以下变量：

| 变量名                    | 值                                  | 说明                         |
| ------------------------- | ----------------------------------- | ---------------------------- |
| `VITE_API_BASE_URL`       | `https://api.momichan.xyz`          | API 基础 URL                 |
| `VITE_API_ENDPOINT`       | `/api/v1`                           | API 端点路径                 |
| `VITE_API_URL`            | `https://api.momichan.xyz/api`      | 完整 API URL                 |
| `VITE_APP_NAME`           | `MomiChan`                          | 应用名称                     |
| `VITE_APP_DESCRIPTION`    | `Image and video content community` | 应用描述                     |
| `VITE_ENABLE_DEBUG`       | `false`                             | 调试模式（生产环境关闭）     |
| `VITE_ENABLE_DEVTOOLS`    | `false`                             | Vue DevTools（生产环境关闭） |
| `VITE_TURNSTILE_SITE_KEY` | `<your-site-key>`                   | Cloudflare Turnstile 密钥    |

#### Preview 环境变量（可选）

可以为 Preview 部署配置不同的值，例如：

- `VITE_ENABLE_DEBUG=true`
- `VITE_ENABLE_DEVTOOLS=true`

### 5. 保存并重新部署

1. 点击 **Save** 保存配置
2. 进入 **Deployments** 标签
3. 点击 **Retry deployment** 重新部署最新的 commit

## 验证部署

### 检查构建日志

1. 进入 **Deployments** 标签
2. 点击最新的部署
3. 查看 **Build logs**

### 预期输出

```
✅ Cloning repository...
✅ Installing dependencies...
✅ Building project...
✅ Deploying to Cloudflare Pages...
```

### 常见问题

#### 问题 1：npm 依赖冲突

**症状**：

```
npm error Could not resolve dependency
```

**解决方案**：

1. 确认 `package.json` 中 Vite 版本为 `8.0.0-beta.10`
2. 确认 `.npmrc` 文件存在
3. 改用构建命令：`bash scripts/cloudflare-build.sh`

#### 问题 2：环境变量未生效

**症状**：运行时 API 请求失败

**解决方案**：

1. 确认所有变量名以 `VITE_` 开头
2. 检查变量值是否正确
3. 重新部署以应用新的环境变量

#### 问题 3：构建超时

**症状**：构建时间超过 20 分钟

**解决方案**：

1. 检查是否有大文件被包含
2. 优化依赖安装
3. 联系 Cloudflare 支持

## Node.js 版本

项目会自动使用 `.node-version` 文件中指定的版本：

```
22.12.0
```

无需在 Dashboard 中手动配置。

## 部署分支

### Production 分支

- **Branch**: `main`
- 自动部署到生产环境
- 使用 Production 环境变量

### Preview 分支

- **Branch**: 所有其他分支
- 自动部署到预览环境
- 使用 Preview 环境变量（如果配置）

## 监控和告警

### 设置告警

1. 进入 **Notifications** 页面
2. 配置以下告警：
   - 构建失败通知
   - 部署成功通知
   - 错误率告警

### 查看日志

- **Build logs**: Deployments > 选择部署 > Build logs
- **Function logs**: Functions 标签 > Real-time logs

## 相关文档

- `wrangler.toml` - Wrangler 配置文件（仅用于 Functions）
- `CLOUDFLARE_BUILD_COMMAND.md` - 构建命令说明
- `docs/CLOUDFLARE_DEPLOYMENT.md` - 详细部署指南
- `DEPLOYMENT_FIX_SUMMARY.md` - 部署问题修复总结

## 支持

如果遇到问题：

1. 查看 [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
2. 检查 [Cloudflare 状态页](https://www.cloudflarestatus.com/)
3. 联系 [Cloudflare 支持](https://cfl.re/3WgEyrH)
