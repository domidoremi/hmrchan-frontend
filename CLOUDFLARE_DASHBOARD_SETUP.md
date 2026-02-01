# Cloudflare Pages Dashboard 配置指南

## 🚨 重要提示

1. **构建配置**必须在 Dashboard 中设置（不能在 `wrangler.toml` 中配置）
2. **环境变量**应在 `wrangler.toml` 中管理（Dashboard 仅用于机密）

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

### 4. 环境变量配置

#### ✅ 推荐方式：通过 wrangler.toml

环境变量已在 `wrangler.toml` 中配置，**无需在 Dashboard 中重复添加**。

查看 `wrangler.toml` 文件：

```toml
# 生产环境变量
[env.production.vars]
VITE_API_BASE_URL = "https://api.momichan.xyz"
VITE_API_ENDPOINT = "/api/v1"
VITE_API_URL = "https://api.momichan.xyz/api"
VITE_APP_NAME = "MomiChan"
VITE_APP_DESCRIPTION = "Image and video content community"
VITE_ENABLE_DEBUG = "false"
VITE_ENABLE_DEVTOOLS = "false"

# Preview 环境变量
[env.preview.vars]
VITE_ENABLE_DEBUG = "true"
VITE_ENABLE_DEVTOOLS = "true"
# ... 其他变量
```

#### 🔐 Dashboard 配置（仅用于机密）

**仅用于敏感信息（Secrets）**，例如 API 密钥：

1. 进入 **Environment variables** 部分
2. 点击 **Add variable**
3. 选择 **Type: Secret**
4. 添加敏感变量：

| 变量名                    | 类型   | 说明                      |
| ------------------------- | ------ | ------------------------- |
| `VITE_TURNSTILE_SITE_KEY` | Secret | Cloudflare Turnstile 密钥 |

**重要提示**：

- Dashboard 会显示："此项目的环境变量在通过 wrangler.toml 进行管理"
- 这是正常的，普通变量应该在 `wrangler.toml` 中配置
- 只有敏感信息才需要在 Dashboard 中添加为 Secret

### 5. 保存并重新部署

1. 点击 **Save** 保存配置
2. 如果修改了 `wrangler.toml`，提交并推送到 GitHub
3. Cloudflare Pages 会自动触发新的部署

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

1. 检查 `wrangler.toml` 中的环境变量配置
2. 确认所有变量名以 `VITE_` 开头
3. 提交并推送 `wrangler.toml` 更改
4. 等待自动部署完成

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
- 使用 `[env.production.vars]` 中的环境变量

### Preview 分支

- **Branch**: 所有其他分支
- 自动部署到预览环境
- 使用 `[env.preview.vars]` 中的环境变量

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

- `wrangler.toml` - 环境变量和 Functions 配置
- `CLOUDFLARE_BUILD_COMMAND.md` - 构建命令说明
- `docs/CLOUDFLARE_DEPLOYMENT.md` - 详细部署指南
- `DEPLOYMENT_FIX_SUMMARY.md` - 部署问题修复总结

## 支持

如果遇到问题：

1. 查看 [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
2. 检查 [Cloudflare 状态页](https://www.cloudflarestatus.com/)
3. 联系 [Cloudflare 支持](https://cfl.re/3WgEyrH)
