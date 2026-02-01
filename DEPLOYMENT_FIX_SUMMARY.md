# Cloudflare Pages 部署修复总结

## 问题

Cloudflare Pages 部署失败，错误信息：

```
npm error Could not resolve dependency:
npm error peer overridden vite@"8.0.0-beta.10" from vite-plugin-vue-devtools@8.0.5
```

## 根本原因

1. 项目使用 **Bun** 作为包管理器
2. Cloudflare Pages 默认使用 **npm**
3. `package.json` 中存在版本冲突：
   - `devDependencies` 中定义 `vite: "7.3.1"`
   - `overrides` 中强制 `vite-plugin-vue-devtools` 使用 `vite: "8.0.0-beta.10"`
4. Bun 能处理这种 override，但 npm 会报错
5. npm 的 peer dependency 检查比 Bun 更严格

## 解决方案

### 方案 1：统一 Vite 版本（已实施）

直接升级到 Vite 8.0.0-beta.10，移除 overrides 配置：

```json
{
  "devDependencies": {
    "vite": "8.0.0-beta.10",
    "vite-plugin-vue-devtools": "^8.0.5"
  }
}
```

这样 Bun 和 npm 都能正常工作，不需要任何 workaround。

### 方案 2：使用 legacy-peer-deps（备选）

如果不想升级 Vite，可以添加 `.npmrc`：

```
legacy-peer-deps=true
```

允许 npm 忽略 peer dependency 冲突。

## 文件变更

- ✅ `package.json` - 升级 Vite 到 8.0.0-beta.10，移除 overrides
- ✅ `.npmrc` - npm 配置（保险措施，新增）
- ✅ `.node-version` - Node.js 版本（新增）
- ✅ `scripts/cloudflare-build.sh` - 构建脚本（新增）
- ✅ `wrangler.toml` - 更新构建命令
- ✅ `docs/CLOUDFLARE_DEPLOYMENT.md` - 部署文档（新增）

## 验证步骤

### 本地测试

```bash
# 清理依赖
rm -rf node_modules bun.lockb package-lock.json

# 使用 Bun 安装（推荐）
bun install
bun run build

# 或使用 npm 安装
npm install
npm run build
```

### Cloudflare Pages 部署

1. 推送代码到 GitHub
2. Cloudflare Pages 自动触发构建
3. 检查构建日志确认成功

## 预期结果

✅ Bun 和 npm 都能正常安装依赖
✅ 构建成功生成 `dist/` 目录
✅ 部署到 Cloudflare Pages
✅ 网站正常访问

## Vite 8 Beta 注意事项

Vite 8.0.0-beta.10 是测试版本，可能存在以下问题：

1. **API 变更**：部分 API 可能在正式版中改变
2. **插件兼容性**：某些插件可能尚未完全支持
3. **稳定性**：可能存在未发现的 bug

### 如果遇到问题

可以回退到 Vite 7 + legacy-peer-deps：

```json
{
  "devDependencies": {
    "vite": "^7.3.1",
    "vite-plugin-vue-devtools": "^7.5.4"
  }
}
```

或者等待 Vite 8 正式版发布后再升级。

## 后续修复：环境变量继承问题

### 问题发现

根据 [Cloudflare 官方文档](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)，`vars` 是 **non-inheritable key**：

> Non-inheritable keys are configurable at the top-level, but, if any one non-inheritable key is overridden for any environment, **all non-inheritable keys must also be specified in the environment configuration and overridden**.

原配置中：

```toml
[env.production.vars]
VITE_API_BASE_URL = "..."
# ... 其他变量

[vars]
API_BASE_URL = "https://api.momichan.xyz"
```

**问题**：当 `[env.production.vars]` 覆盖了 `vars` 时，顶层的 `[vars]` 中的 `API_BASE_URL` **不会被继承**到 production 环境，导致 Functions 运行时缺少该变量。

### 解决方案

将 `API_BASE_URL` 添加到每个环境配置中：

```toml
[env.production.vars]
# 构建时环境变量
VITE_API_BASE_URL = "https://api.momichan.xyz"
# ... 其他 VITE_ 变量

# Functions 运行时变量
API_BASE_URL = "https://api.momichan.xyz"

[env.preview.vars]
# 构建时环境变量
VITE_API_BASE_URL = "https://api.momichan.xyz"
# ... 其他 VITE_ 变量

# Functions 运行时变量
API_BASE_URL = "https://api.momichan.xyz"
```

移除顶层的 `[vars]` 配置，避免混淆。

### 提交信息

```
fix: 修复 wrangler.toml 环境变量继承问题

- 将 API_BASE_URL 添加到每个环境配置中（production 和 preview）
- 根据 Cloudflare 官方文档，vars 是 non-inheritable key，必须在每个环境中明确定义
- 移除顶层 [vars] 配置，避免混淆
- 更新文档链接为正确的 Functions 配置页面
- 优化注释结构，使配置更清晰
```

## 相关文档

- `docs/CLOUDFLARE_DEPLOYMENT.md` - 详细部署指南
- `CLOUDFLARE_DASHBOARD_SETUP.md` - Dashboard 配置指南
- `CLOUDFLARE_BUILD_COMMAND.md` - 构建命令说明
- `scripts/cloudflare-build.sh` - 构建脚本
- `.npmrc` - npm 配置
- `wrangler.toml` - Cloudflare Pages 配置

## 提交历史

### 第一次修复（2026-02-01）

```
fix: 升级 Vite 到 8.0.0-beta.10 解决部署冲突

- 升级 Vite 到 8.0.0-beta.10 以匹配 vite-plugin-vue-devtools 要求
- 移除 package.json 中的 overrides 配置
- 添加 .npmrc 配置文件作为保险措施
- 添加 .node-version 文件指定 Node.js 22.12.0 版本
- 创建 cloudflare-build.sh 构建脚本
- 从 wrangler.toml 移除 [build] 配置（不支持）
- 在 wrangler.toml 中添加环境变量配置
- 添加详细的 Cloudflare Pages 部署文档
```

### 第二次修复（2026-02-01）

```
fix: 修复 wrangler.toml 环境变量继承问题

- 将 API_BASE_URL 添加到每个环境配置中（production 和 preview）
- 根据 Cloudflare 官方文档，vars 是 non-inheritable key，必须在每个环境中明确定义
- 移除顶层 [vars] 配置，避免混淆
- 更新文档链接为正确的 Functions 配置页面
- 优化注释结构，使配置更清晰
```
