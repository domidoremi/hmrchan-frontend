# Cloudflare Pages 部署指南

## 部署失败问题修复

### 问题：npm 依赖冲突

**错误信息**：

```
npm error Could not resolve dependency:
npm error peer overridden vite@"8.0.0-beta.10" from vite-plugin-vue-devtools@8.0.5
```

**原因**：

- 项目使用 Bun 作为包管理器
- Cloudflare Pages 默认使用 npm
- `vite-plugin-vue-devtools@8.0.5` 期望 `vite@8.0.0-beta.10`，但项目使用 `vite@7.3.1`
- npm 的 peer dependency 检查比 Bun 更严格

### 解决方案

#### 方案 1：使用 npm 构建（已实施）

1. **添加 `.npmrc` 文件**：

   ```
   legacy-peer-deps=true
   ```

   这允许 npm 忽略 peer dependency 冲突。

2. **添加 `.node-version` 文件**：

   ```
   22.12.0
   ```

   指定 Node.js 版本。

3. **创建构建脚本** `scripts/cloudflare-build.sh`：
   - 优先使用 Bun（如果可用）
   - 回退到 npm + `--legacy-peer-deps`

4. **更新 `wrangler.toml`**：
   ```toml
   [build]
   command = "bash scripts/cloudflare-build.sh"
   ```

#### 方案 2：降级 vite-plugin-vue-devtools（备选）

如果方案 1 不工作，可以降级插件版本：

```json
{
  "devDependencies": {
    "vite-plugin-vue-devtools": "^7.5.4"
  }
}
```

#### 方案 3：升级到 Vite 8（未来）

等待 Vite 8 正式发布后升级：

```json
{
  "devDependencies": {
    "vite": "^8.0.0"
  }
}
```

## Cloudflare Pages 配置

### 环境变量

在 Cloudflare Dashboard > Pages > Settings > Environment variables 中配置：

**构建时变量**（Build environment variables）：

- `VITE_API_BASE_URL`: `https://api.momichan.xyz`
- `VITE_API_ENDPOINT`: `/api/v1`
- `VITE_API_URL`: `https://api.momichan.xyz/api`
- `VITE_APP_NAME`: `MomiChan`
- `VITE_APP_DESCRIPTION`: `Image and video content community`
- `VITE_TURNSTILE_SITE_KEY`: `<your-turnstile-site-key>`
- `VITE_ENABLE_DEBUG`: `false`
- `VITE_ENABLE_DEVTOOLS`: `false`

**运行时变量**（已在 `wrangler.toml` 中配置）：

- `API_BASE_URL`: `https://api.momichan.xyz`

### 构建设置

在 Cloudflare Dashboard > Pages > Settings > Builds & deployments：

- **Framework preset**: None
- **Build command**: `bash scripts/cloudflare-build.sh`
- **Build output directory**: `dist`
- **Root directory**: `/`
- **Node.js version**: 22.12.0（自动从 `.node-version` 读取）

### 部署分支

- **Production branch**: `main`
- **Preview branches**: 所有分支

## 本地测试

### 测试构建脚本

```bash
# 模拟 Cloudflare Pages 环境
bash scripts/cloudflare-build.sh
```

### 测试 npm 构建

```bash
# 清理依赖
rm -rf node_modules package-lock.json

# 使用 npm 安装
npm install --legacy-peer-deps

# 构建
npm run build
```

### 预览构建结果

```bash
bun run preview
# 或
npx serve dist
```

## 故障排除

### 问题 1：构建超时

**症状**：构建时间超过 20 分钟

**解决方案**：

1. 检查是否有大文件被包含在构建中
2. 优化依赖安装（使用缓存）
3. 考虑使用 Cloudflare Workers 构建

### 问题 2：环境变量未生效

**症状**：构建成功但运行时 API 请求失败

**解决方案**：

1. 确认环境变量在 Cloudflare Dashboard 中正确配置
2. 检查变量名是否以 `VITE_` 开头（Vite 要求）
3. 重新部署以应用新的环境变量

### 问题 3：Functions 无法访问

**症状**：`/api/*` 路径返回 404

**解决方案**：

1. 确认 `functions/` 目录存在且包含正确的文件
2. 检查 `wrangler.toml` 中的 `pages_build_output_dir` 设置
3. 验证 Functions 文件导出正确的处理函数

### 问题 4：依赖冲突

**症状**：npm install 失败

**解决方案**：

1. 确认 `.npmrc` 文件存在且包含 `legacy-peer-deps=true`
2. 尝试清理缓存：`npm cache clean --force`
3. 检查 `package.json` 中的 `overrides` 配置

## 性能优化

### 1. 启用构建缓存

在 Cloudflare Dashboard 中启用构建缓存可以加快后续部署速度。

### 2. 优化依赖

```bash
# 分析包大小
bun run build -- --mode analyze

# 移除未使用的依赖
bun run knip
```

### 3. 使用 CDN

确保静态资源（图片、字体等）使用 Cloudflare CDN 缓存。

## 监控和日志

### 查看构建日志

1. 进入 Cloudflare Dashboard > Pages > 项目
2. 点击具体的部署
3. 查看 "Build logs" 标签

### 查看运行时日志

1. 进入 Cloudflare Dashboard > Pages > 项目
2. 点击 "Functions" 标签
3. 查看实时日志

### 设置告警

在 Cloudflare Dashboard > Notifications 中配置：

- 构建失败告警
- 部署成功通知
- 错误率告警

## 相关文档

- [Cloudflare Pages 官方文档](https://developers.cloudflare.com/pages/)
- [Wrangler 配置参考](https://developers.cloudflare.com/pages/configuration/wrangler-configuration/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [环境变量配置](https://developers.cloudflare.com/pages/configuration/build-configuration/)
