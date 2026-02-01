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
3. `vite-plugin-vue-devtools@8.0.5` 期望 `vite@8.0.0-beta.10`
4. 项目实际使用 `vite@7.3.1`
5. npm 的 peer dependency 检查比 Bun 更严格，导致安装失败

## 解决方案

### 1. 添加 `.npmrc` 配置

```
legacy-peer-deps=true
```

允许 npm 忽略 peer dependency 冲突。

### 2. 添加 `.node-version` 文件

```
22.12.0
```

明确指定 Node.js 版本，确保构建环境一致。

### 3. 创建智能构建脚本

`scripts/cloudflare-build.sh`：

- 优先检测并使用 Bun（如果可用）
- 回退到 npm + `--legacy-peer-deps`
- 确保在任何环境下都能成功构建

### 4. 更新 Wrangler 配置

```toml
[build]
command = "bash scripts/cloudflare-build.sh"
```

## 文件变更

- ✅ `.npmrc` - npm 配置（新增）
- ✅ `.node-version` - Node.js 版本（新增）
- ✅ `scripts/cloudflare-build.sh` - 构建脚本（新增）
- ✅ `wrangler.toml` - 更新构建命令
- ✅ `docs/CLOUDFLARE_DEPLOYMENT.md` - 部署文档（新增）

## 验证步骤

### 本地测试

```bash
# 测试构建脚本
bash scripts/cloudflare-build.sh

# 测试 npm 构建
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

### Cloudflare Pages 部署

1. 推送代码到 GitHub
2. Cloudflare Pages 自动触发构建
3. 检查构建日志确认成功

## 预期结果

✅ npm 安装成功（使用 legacy-peer-deps）
✅ 构建成功生成 `dist/` 目录
✅ 部署到 Cloudflare Pages
✅ 网站正常访问

## 备选方案

如果当前方案不工作，可以考虑：

### 方案 A：降级 vite-plugin-vue-devtools

```json
{
  "devDependencies": {
    "vite-plugin-vue-devtools": "^7.5.4"
  }
}
```

### 方案 B：升级到 Vite 8（未来）

等待 Vite 8 正式发布后升级。

### 方案 C：移除 devtools 插件

在生产构建中禁用 devtools 插件：

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    vue(),
    // 仅在开发环境启用
    process.env.NODE_ENV === 'development' && vueDevTools(),
  ].filter(Boolean),
})
```

## 相关文档

- `docs/CLOUDFLARE_DEPLOYMENT.md` - 详细部署指南
- `scripts/cloudflare-build.sh` - 构建脚本
- `.npmrc` - npm 配置

## 提交信息

```
fix: 修复 Cloudflare Pages 部署失败问题

- 添加 .npmrc 配置文件，使用 legacy-peer-deps 解决 npm 依赖冲突
- 添加 .node-version 文件指定 Node.js 22.12.0 版本
- 创建 cloudflare-build.sh 构建脚本，优先使用 Bun，回退到 npm
- 更新 wrangler.toml 使用新的构建脚本
- 添加详细的 Cloudflare Pages 部署文档
```

Commit: `5552680`
