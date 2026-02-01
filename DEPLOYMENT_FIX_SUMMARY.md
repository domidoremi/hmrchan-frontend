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

## 相关文档

- `docs/CLOUDFLARE_DEPLOYMENT.md` - 详细部署指南
- `scripts/cloudflare-build.sh` - 构建脚本
- `.npmrc` - npm 配置

## 提交信息

```
fix: 修复 Cloudflare Pages 部署失败问题

- 升级 Vite 到 8.0.0-beta.10 以匹配 vite-plugin-vue-devtools 要求
- 移除 package.json 中的 overrides 配置
- 添加 .npmrc 配置文件作为保险措施
- 添加 .node-version 文件指定 Node.js 22.12.0 版本
- 创建 cloudflare-build.sh 构建脚本
- 更新 wrangler.toml 使用新的构建脚本
- 添加详细的 Cloudflare Pages 部署文档
```
