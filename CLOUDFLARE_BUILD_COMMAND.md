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

**说明：**

- Cloudflare Pages 会自动检测 `bun.lock` 并运行 `bun install`
- `bun run build` 会执行完整的构建流程：
  1. 运行 `scripts/update-sw-version.js` 自动更新 Service Worker 版本
  2. 执行 TypeScript 类型检查
  3. 使用 Vite 构建生产版本
- 脚本会自动从 Git 获取 commit hash 和 build number
- **不需要**手动设置 `VITE_GIT_COMMIT` 或其他 Git 相关环境变量

**Build output directory**:

```
dist
```

**Root directory** (optional):

```
/
```

或留空（默认为根目录）

### 备选配置 1：显式安装依赖

**Build command**:

```bash
bun install && bun run build
```

**说明：**

- 显式声明依赖安装步骤
- 虽然 Cloudflare 会自动安装，但这样更清晰
- 适合需要明确控制构建流程的场景

### 备选配置 2：npm 兼容模式（如果 Bun 不可用）

**Build command**:

```bash
bash scripts/cloudflare-build.sh
```

**说明：**
这个脚本会：

- 优先使用 Bun（如果可用）
- 回退到 npm（使用 legacy-peer-deps）
- 适合需要 npm 兼容性的场景

### ❌ 不推荐的配置

```bash
# ❌ 不推荐：手动设置 Git commit 环境变量
bun install && VITE_GIT_COMMIT=$CF_PAGES_COMMIT_SHA bun run build
```

**原因：**

- `VITE_GIT_COMMIT` 环境变量在代码中未被使用
- `update-sw-version.js` 脚本会直接调用 `git` 命令获取 commit 信息
- 这个环境变量设置是多余的，会增加配置复杂度

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
