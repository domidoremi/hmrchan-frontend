# Cloudflare Pages 构建命令配置

## 重要提示

Cloudflare Pages **不支持**在 `wrangler.toml` 中配置 `[build]` 部分。

构建命令必须在 **Cloudflare Dashboard** 中配置。

## 配置步骤

1. 登录 Cloudflare Dashboard
2. 进入 Pages > 你的项目
3. 点击 **Settings** > **Builds & deployments**
4. 在 **Build configurations** 部分配置：

### 推荐配置

**Build command**:

```bash
bun run build
```

**Build output directory**:

```
dist
```

**Root directory** (optional):

```
/
```

### 备选配置（如果需要 npm 兼容）

**Build command**:

```bash
bash scripts/cloudflare-build.sh
```

这个脚本会：

- 优先使用 Bun（如果可用）
- 回退到 npm（使用 legacy-peer-deps）

## 环境变量

在 **Settings** > **Environment variables** 中配置：

### Production 环境

```
VITE_API_BASE_URL=https://api.momichan.xyz
VITE_API_ENDPOINT=/api/v1
VITE_API_URL=https://api.momichan.xyz/api
VITE_APP_NAME=MomiChan
VITE_APP_DESCRIPTION=Image and video content community
VITE_ENABLE_DEBUG=false
VITE_ENABLE_DEVTOOLS=false
VITE_TURNSTILE_SITE_KEY=<your-key>
```

### Preview 环境（可选）

可以为 Preview 部署配置不同的环境变量。

## Node.js 版本

Cloudflare Pages 会自动从 `.node-version` 文件读取 Node.js 版本：

```
22.12.0
```

## 故障排除

### 问题：构建失败，提示不支持 [build] 配置

**解决方案**：从 `wrangler.toml` 中移除 `[build]` 部分，在 Dashboard 中配置。

### 问题：npm 依赖冲突

**解决方案**：

1. 确保 `package.json` 中 Vite 版本为 `8.0.0-beta.10`
2. 确保 `.npmrc` 文件存在且包含 `legacy-peer-deps=true`
3. 使用构建脚本 `bash scripts/cloudflare-build.sh`

### 问题：环境变量未生效

**解决方案**：

1. 确认变量名以 `VITE_` 开头
2. 在 Dashboard 中正确配置
3. 重新部署

## 相关文档

- [Cloudflare Pages Build Configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Cloudflare Pages Environment Variables](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables)
- `docs/CLOUDFLARE_DEPLOYMENT.md` - 详细部署指南
